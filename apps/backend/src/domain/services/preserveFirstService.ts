import { PreserveState, TaskState, TaskType, WorkflowState, WorkflowType } from "@dsd/shared";
import type {
  ClassificationRepository,
  ObjectRepository,
  RestoreManifestRepository,
  TaskRepository,
  VaultRepository,
  WorkflowRepository
} from "../repositories/interfaces.js";
import { VaultStorageManager } from "../../vault/vaultStorageManager.js";

export class PreserveFirstService {
  constructor(
    private readonly objectRepository: ObjectRepository,
    private readonly classificationRepository: ClassificationRepository,
    private readonly workflowRepository: WorkflowRepository,
    private readonly taskRepository: TaskRepository,
    private readonly vaultRepository: VaultRepository,
    private readonly restoreManifestRepository: RestoreManifestRepository,
    private readonly vaultStorageManager: VaultStorageManager
  ) {}

  async evaluatePreserveFirst(objectIds: string[]) {
    const blockers: Array<{ objectId: string; reason: string }> = [];
    for (const objectId of objectIds) {
      const classifications = await this.classificationRepository.listByObject(objectId);
      const hasBlocker = classifications.some((c) => c.preserveFirstBlocker);
      const preserved = (await this.vaultRepository.listAll()).some((item) => item.objectId === objectId);

      if (hasBlocker && !preserved) {
        blockers.push({ objectId, reason: "Preserve-first blocker: high-risk object not yet preserved" });
      }
    }
    return { blockers, blockerCount: blockers.length };
  }

  async markForPreserve(input: { objectIds: string[]; mode: string; reason: string; notes?: string }) {
    for (const objectId of input.objectIds) {
      await this.objectRepository.update(objectId, { preserveState: PreserveState.IN_PROGRESS, notes: input.notes });
    }
    return { markedObjectIds: input.objectIds, mode: input.mode };
  }

  async startPreservation(input: { objectIds: string[]; modeByObject?: Record<string, string>; label?: string }) {
    const workflow = await this.workflowRepository.create({
      type: WorkflowType.PRESERVATION,
      state: WorkflowState.RUNNING,
      startedAt: new Date()
    });
    const task = await this.taskRepository.create({
      workflowId: workflow.id,
      type: TaskType.PRESERVE,
      state: TaskState.RUNNING,
      progressPercent: 0,
      startedAt: new Date()
    });

    for (const objectId of input.objectIds) {
      const objectRecord = await this.objectRepository.getById(objectId);
      if (!objectRecord) continue;

      const content = JSON.stringify({ objectId, externalRef: objectRecord.externalRef, label: input.label ?? "default" });
      const relativePath = `${workflow.id}/${objectId}.json`;
      const artifact = await this.vaultStorageManager.preserveTextArtifact(relativePath, content);

      await this.vaultRepository.create({
        workflowId: workflow.id,
        objectId,
        path: artifact.fullPath,
        mode: input.modeByObject?.[objectId] ?? "snapshot",
        reason: "preserve-first",
        integrityStatus: "PRESERVED",
        checksum: artifact.checksum
      });

      await this.objectRepository.update(objectId, { preserveState: PreserveState.PRESERVED });
    }

    await this.taskRepository.update(task.id, { state: TaskState.COMPLETED, progressPercent: 100, completedAt: new Date() });
    await this.workflowRepository.update(workflow.id, { state: WorkflowState.COMPLETED, completedAt: new Date() });

    return { workflowId: workflow.id, taskId: task.id };
  }

  async generateRestoreManifest(workflowId: string) {
    const items = await this.vaultRepository.listByWorkflow(workflowId);
    const summary = `Restore manifest for workflow ${workflowId}`;
    return this.restoreManifestRepository.create({
      workflowId,
      summary,
      validationStatus: "PENDING",
      itemCount: items.length
    });
  }

  async verifyPreservedItems(workflowId: string) {
    const items = await this.vaultRepository.listByWorkflow(workflowId);
    for (const item of items) {
      const result = await this.vaultStorageManager.verifyArtifact(item.path, item.checksum ?? undefined);
      await this.vaultRepository.updateIntegrity(item.id, result.status, result.checksum);
    }
    return this.vaultRepository.listByWorkflow(workflowId);
  }
}
