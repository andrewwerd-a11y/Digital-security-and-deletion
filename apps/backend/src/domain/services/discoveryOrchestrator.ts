import { TaskState, TaskType, WorkflowState, WorkflowType } from "@dsd/shared";
import type {
  EvidenceRepository,
  TaskRepository,
  WorkflowRepository
} from "../repositories/interfaces.js";
import { LocalDiscoveryScanner } from "../../workflows/discovery/localDiscoveryScanner.js";

export interface StartDiscoveryInput {
  rootPath: string;
  scope: string;
}

export class DiscoveryOrchestrator {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly taskRepository: TaskRepository,
    private readonly evidenceRepository: EvidenceRepository,
    private readonly scanner: LocalDiscoveryScanner
  ) {}

  async startLocalDiscovery(input: StartDiscoveryInput) {
    const startedAt = new Date();

    const workflow = await this.workflowRepository.create({
      type: WorkflowType.DISCOVERY,
      state: WorkflowState.RUNNING,
      startedAt
    });

    const task = await this.taskRepository.create({
      workflowId: workflow.id,
      type: TaskType.DISCOVER,
      state: TaskState.RUNNING,
      progressPercent: 0,
      startedAt
    });

    const run = await this.evidenceRepository.createDiscoveryRun({
      workflowId: workflow.id,
      rootPath: input.rootPath,
      scope: input.scope,
      startedAt
    });

    try {
      const findings = await this.scanner.scan(input.rootPath, input.scope);
      for (const finding of findings) {
        const createdFinding = await this.evidenceRepository.createDiscoveryFinding({
          discoveryRunId: run.id,
          locator: finding.locator,
          findingType: finding.findingType,
          summary: finding.summary,
          metadataJson: JSON.stringify(finding.metadata)
        });

        await this.evidenceRepository.create({
          discoveryRunId: run.id,
          discoveryFindingId: createdFinding.id,
          sourceSystem: "local.discovery",
          locator: finding.locator,
          summary: finding.summary,
          payloadRef: finding.locator
        });
      }

      const completedAt = new Date();
      await this.taskRepository.update(task.id, {
        state: TaskState.COMPLETED,
        progressPercent: 100,
        completedAt
      });
      await this.workflowRepository.update(workflow.id, {
        state: WorkflowState.COMPLETED,
        completedAt
      });
      await this.evidenceRepository.updateDiscoveryRun(run.id, {
        summary: `Discovery completed with ${findings.length} findings`,
        completedAt
      });
    } catch (error) {
      await this.taskRepository.update(task.id, {
        state: TaskState.FAILED,
        progressPercent: 100,
        errorMessage: error instanceof Error ? error.message : "unknown discovery error",
        completedAt: new Date()
      });
      await this.workflowRepository.update(workflow.id, {
        state: WorkflowState.FAILED,
        completedAt: new Date()
      });
      throw error;
    }

    return {
      workflowId: workflow.id,
      taskId: task.id,
      discoveryRunId: run.id
    };
  }

  async getDiscoveryProgress(workflowId: string) {
    const workflow = await this.workflowRepository.getById(workflowId);
    const tasks = await this.taskRepository.listByWorkflow(workflowId);

    return { workflow, tasks };
  }

  async getDiscoverySummary(discoveryRunId: string) {
    const run = await this.evidenceRepository.getDiscoveryRunById(discoveryRunId);
    const findings = await this.evidenceRepository.listDiscoveryFindingsByRun(discoveryRunId);
    const evidence = await this.evidenceRepository.listByDiscoveryRun(discoveryRunId);

    return {
      run,
      findingCount: findings.length,
      evidenceCount: evidence.length,
      findings: findings.slice(0, 20)
    };
  }
}
