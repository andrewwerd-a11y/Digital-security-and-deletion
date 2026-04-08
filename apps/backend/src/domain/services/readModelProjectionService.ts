import type {
  ClassificationRepository,
  ObjectRepository,
  ReadModelRepository,
  RecommendationRepository,
  RelationshipRepository,
  RestoreManifestRepository,
  TaskRepository,
  VaultRepository,
  WorkflowRepository
} from "../repositories/interfaces.js";

export class ReadModelProjectionService {
  constructor(
    private readonly objectRepository: ObjectRepository,
    private readonly relationshipRepository: RelationshipRepository,
    private readonly classificationRepository: ClassificationRepository,
    private readonly recommendationRepository: RecommendationRepository,
    private readonly workflowRepository: WorkflowRepository,
    private readonly taskRepository: TaskRepository,
    private readonly vaultRepository: VaultRepository,
    private readonly restoreManifestRepository: RestoreManifestRepository,
    private readonly readModelRepository: ReadModelRepository
  ) {}

  async projectOverview() {
    const objects = await this.objectRepository.search({});
    const overview = {
      totalObjects: objects.length,
      byBranch: objects.reduce<Record<string, number>>((acc, row) => {
        acc[row.branch] = (acc[row.branch] ?? 0) + 1;
        return acc;
      }, {})
    };

    return this.readModelRepository.upsert({
      modelType: "overview",
      modelKey: "default",
      payload: JSON.stringify(overview)
    });
  }

  async projectTreeBranch(branch: string) {
    const objects = await this.objectRepository.search({ branch: branch as any });
    const relationships = (await Promise.all(objects.map((obj) => this.relationshipRepository.listForObject(obj.id)))).flat();

    return this.readModelRepository.upsert({
      modelType: "tree_branch",
      modelKey: branch,
      payload: JSON.stringify({ branch, objects, relationships })
    });
  }

  async projectDetail(objectId: string) {
    const object = await this.objectRepository.getById(objectId);
    const relationships = await this.relationshipRepository.listForObject(objectId);
    const classifications = await this.classificationRepository.listByObject(objectId);
    const recommendations = await this.recommendationRepository.listByObject(objectId);

    return this.readModelRepository.upsert({
      modelType: "detail",
      modelKey: objectId,
      payload: JSON.stringify({ object, relationships, classifications, recommendations })
    });
  }

  async projectView(viewName: string) {
    const objects = await this.objectRepository.search({});
    let filtered = objects;

    if (viewName === "unknown") {
      filtered = objects.filter((o) => o.objectType === "UNKNOWN_OBJECT");
    }

    return this.readModelRepository.upsert({
      modelType: "alternate_view",
      modelKey: viewName,
      payload: JSON.stringify({ viewName, objects: filtered })
    });
  }

  async projectQueueSummary() {
    return this.readModelRepository.upsert({
      modelType: "queue",
      modelKey: "default",
      payload: JSON.stringify({ pending: 0, running: 0, blocked: 0 })
    });
  }

  async projectTaskProgress(workflowId: string) {
    const workflow = await this.workflowRepository.getById(workflowId);
    const tasks = await this.taskRepository.listByWorkflow(workflowId);

    return this.readModelRepository.upsert({
      modelType: "task_progress",
      modelKey: workflowId,
      payload: JSON.stringify({ workflow, tasks })
    });
  }

  async projectResetReadiness() {
    const objects = await this.objectRepository.search({});
    return this.readModelRepository.upsert({
      modelType: "reset_readiness",
      modelKey: "default",
      payload: JSON.stringify({ readyObjectCount: objects.filter((o) => o.state === "READY").length })
    });
  }

  async projectVaultSummary() {
    const items = await this.vaultRepository.listAll();
    return this.readModelRepository.upsert({
      modelType: "vault",
      modelKey: "default",
      payload: JSON.stringify({ itemCount: items.length, failedCount: items.filter((i) => i.integrityStatus === "FAILED").length })
    });
  }

  async projectRestoreManifest(manifestId: string) {
    const manifest = await this.restoreManifestRepository.getById(manifestId);
    return this.readModelRepository.upsert({
      modelType: "restore_manifest",
      modelKey: manifestId,
      payload: JSON.stringify({ manifest })
    });
  }

  async projectReportSummary() {
    return this.readModelRepository.upsert({
      modelType: "report",
      modelKey: "default",
      payload: JSON.stringify({ availableReports: 0 })
    });
  }
}
