import { TaskState, TaskType, WorkflowState, WorkflowType } from "@dsd/shared";
import type {
  QueueRepository,
  ReadModelRepository,
  RestoreManifestRepository,
  TaskRepository,
  VaultRepository,
  WorkflowRepository
} from "../repositories/interfaces.js";

const FOUNDATIONAL_RECONNECT = [
  "primary_email",
  "password_manager",
  "authenticator_setup",
  "cloud_account",
  "business_critical_identity_accounts"
];

const DEFERRED_RECONNECT = [
  "dormant_retail_accounts",
  "low_value_saas_accounts",
  "entertainment_accounts",
  "old_forum_social_accounts"
];

export class RebuildService {
  constructor(
    private readonly restoreManifestRepository: RestoreManifestRepository,
    private readonly vaultRepository: VaultRepository,
    private readonly readModelRepository: ReadModelRepository,
    private readonly workflowRepository: WorkflowRepository,
    private readonly taskRepository: TaskRepository,
    private readonly queueRepository: QueueRepository
  ) {}

  async generatePlan(manifestId: string, excludedItemIds: string[] = []) {
    const manifest = await this.restoreManifestRepository.getById(manifestId);
    if (!manifest) {
      throw new Error("restore manifest not found");
    }

    const vaultItems = await this.vaultRepository.listByWorkflow(manifest.workflowId);

    const blockedOrExcluded = vaultItems
      .filter((item) => {
        const lower = `${item.path} ${item.reason} ${item.notes ?? ""}`.toLowerCase();
        const flagged = [
          "credential",
          "cache",
          "extension",
          "retired",
          "duplicate",
          "sync",
          "export",
          "temp",
          "junk",
          "inactive",
          "vendor"
        ].some((token) => lower.includes(token));
        return excludedItemIds.includes(item.id) || flagged;
      })
      .map((item) => ({
        id: item.id,
        objectId: item.objectId,
        reason: excludedItemIds.includes(item.id) ? "user_excluded" : "safety_flagged"
      }));

    const included = vaultItems.filter((item) => !blockedOrExcluded.some((b) => b.id === item.id));

    const plan = {
      manifestId,
      workflowId: manifest.workflowId,
      appReinstallQueue: included.filter((i) => i.mode.includes("app")).map((i) => i.objectId),
      folderRecreationPlan: included.filter((i) => i.path.includes("/")).map((i) => i.path.split("/").slice(0, -1).join("/")),
      preservedFileRestoreQueue: included.map((i) => i.id),
      accountReconnectQueue: included.map((i) => i.objectId),
      browserRebuildQueue: included.filter((i) => i.path.toLowerCase().includes("browser")).map((i) => i.objectId),
      blockedItemExclusionList: blockedOrExcluded,
      reconnectSequencing: {
        foundationalFirst: FOUNDATIONAL_RECONNECT,
        deferred: DEFERRED_RECONNECT
      },
      caveats: [
        "No universal automation promise: platform/device-specific steps may require manual completion.",
        "Blocked and excluded items remain excluded from execution queues.",
        "Unverifiable restore claims must remain explicitly marked in validation outputs."
      ]
    };

    await this.readModelRepository.upsert({
      modelType: "rebuild_plan",
      modelKey: manifestId,
      payload: JSON.stringify(plan)
    });

    return plan;
  }

  async startRebuild(manifestId: string, excludedItemIds: string[] = []) {
    const plan = await this.generatePlan(manifestId, excludedItemIds);
    const workflow = await this.workflowRepository.create({
      type: WorkflowType.EXECUTION,
      state: WorkflowState.RUNNING,
      startedAt: new Date()
    });

    const task = await this.taskRepository.create({
      workflowId: workflow.id,
      type: TaskType.VERIFY,
      state: TaskState.RUNNING,
      progressPercent: 0,
      startedAt: new Date()
    });

    const queueIds: string[] = [];
    for (const itemId of plan.preservedFileRestoreQueue) {
      const queueId = `${workflow.id}:${itemId}`;
      queueIds.push(queueId);
      await this.queueRepository.create({
        id: queueId,
        queueType: "rebuild_restore",
        taskId: task.id,
        state: TaskState.PENDING,
        detail: "queued from manifest-backed rebuild plan",
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    const state = plan.blockedItemExclusionList.length > 0 ? WorkflowState.PARTIAL : WorkflowState.COMPLETED;
    const taskState = plan.blockedItemExclusionList.length > 0 ? TaskState.PARTIAL : TaskState.COMPLETED;

    await this.taskRepository.update(task.id, {
      state: taskState,
      progressPercent: queueIds.length === 0 ? 0 : 100,
      blockReason: plan.blockedItemExclusionList.length > 0 ? "DEPENDENCY_UNRESOLVED" as any : undefined,
      completedAt: new Date()
    });
    await this.workflowRepository.update(workflow.id, {
      state,
      completedAt: new Date()
    });

    return { workflowId: workflow.id, taskId: task.id, queueIds, excludedCount: plan.blockedItemExclusionList.length };
  }

  async validatePostRestore(manifestId: string, validatedItemIds: string[], unverifiableItemIds: string[]) {
    const planModel = await this.readModelRepository.getByTypeAndKey("rebuild_plan", manifestId);
    const plan = planModel ? JSON.parse(planModel.payload) : await this.generatePlan(manifestId);

    const total = plan.preservedFileRestoreQueue.length;
    const verified = validatedItemIds.filter((id) => plan.preservedFileRestoreQueue.includes(id)).length;
    const unverifiable = unverifiableItemIds.filter((id) => plan.preservedFileRestoreQueue.includes(id)).length;
    const failed = Math.max(total - verified - unverifiable, 0);

    const summary = {
      manifestId,
      total,
      verifiedComplete: verified,
      verifiedPartial: failed > 0 && verified > 0 ? 1 : 0,
      failed,
      notVerifiable: unverifiable,
      excludedItems: plan.blockedItemExclusionList,
      notes: [
        "Validation does not claim certainty where checks could not be completed.",
        "Excluded and blocked items were not restored by design."
      ]
    };

    await this.readModelRepository.upsert({
      modelType: "post_restore_validation",
      modelKey: manifestId,
      payload: JSON.stringify(summary)
    });

    return summary;
  }
}
