import Fastify from "fastify";
import sensible from "@fastify/sensible";
import {
  ApprovalService,
  ClassificationService,
  DiscoveryOrchestrator,
  ExecutionService,
  NormalizationService,
  ObjectRegistryService,
  PolicyEvaluationService,
  RecommendationService,
  ReadinessService,
  PreserveFirstService,
  ReadModelProjectionService,
  RelationshipGraphService,
  SimulationService
} from "../domain/services/index.js";
import { LocalDiscoveryScanner } from "../workflows/discovery/localDiscoveryScanner.js";
import { buildRepositoryRegistry } from "../storage/repositoryRegistry.js";
import { FileVaultStorage } from "../vault/fileVault.js";
import { VaultStorageManager } from "../vault/vaultStorageManager.js";

export async function buildServer() {
  const app = Fastify({ logger: false });
  await app.register(sensible);

  const repositories = buildRepositoryRegistry();
  const objectRegistryService = new ObjectRegistryService(repositories.objectRepository);
  const relationshipGraphService = new RelationshipGraphService(repositories.relationshipRepository);
  const discoveryOrchestrator = new DiscoveryOrchestrator(
    repositories.workflowRepository,
    repositories.taskRepository,
    repositories.evidenceRepository,
    new LocalDiscoveryScanner()
  );
  const normalizationService = new NormalizationService(
    repositories.objectRepository,
    repositories.relationshipRepository,
    repositories.evidenceRepository,
    repositories.workflowRepository
  );
  const classificationService = new ClassificationService(
    repositories.objectRepository,
    repositories.relationshipRepository,
    repositories.classificationRepository,
    repositories.recommendationRepository
  );
  const recommendationService = new RecommendationService(repositories.recommendationRepository);
  const simulationService = new SimulationService(repositories.simulationRepository);
  const readinessService = new ReadinessService(
    repositories.objectRepository,
    repositories.relationshipRepository,
    repositories.vaultRepository,
    repositories.readinessRepository
  );
  const policyEvaluationService = new PolicyEvaluationService(
    repositories.objectRepository,
    repositories.relationshipRepository,
    repositories.approvalRepository,
    repositories.policyDecisionRepository
  );
  const approvalService = new ApprovalService(repositories.approvalRepository);
  const executionService = new ExecutionService(
    repositories.policyDecisionRepository,
    repositories.approvalRepository,
    repositories.actionRepository,
    repositories.verificationRepository,
    repositories.objectRepository,
    repositories.queueRepository
  );
  const vaultStorageManager = new VaultStorageManager(new FileVaultStorage(process.env.VAULT_ROOT ?? "./vault-data"));
  const preserveFirstService = new PreserveFirstService(
    repositories.objectRepository,
    repositories.classificationRepository,
    repositories.workflowRepository,
    repositories.taskRepository,
    repositories.vaultRepository,
    repositories.restoreManifestRepository,
    vaultStorageManager
  );
  const readModelProjectionService = new ReadModelProjectionService(
    repositories.objectRepository,
    repositories.relationshipRepository,
    repositories.classificationRepository,
    repositories.recommendationRepository,
    repositories.workflowRepository,
    repositories.taskRepository,
    repositories.vaultRepository,
    repositories.restoreManifestRepository,
    repositories.readModelRepository
  );

  app.get("/health", async () => ({ ok: true }));
  app.get("/status", async () => ({
    service: "digital-security-and-deletion-backend",
    datastore: "postgresql",
    repositories: Object.keys(repositories)
  }));

  app.post("/objects", async (request, reply) => {
    const payload = request.body as any;
    const created = await objectRegistryService.createObject(payload);
    return reply.code(201).send(created);
  });

  app.patch("/objects/:id", async (request) => {
    const payload = request.body as any;
    const params = request.params as { id: string };
    return objectRegistryService.updateObject(params.id, payload);
  });

  app.get("/objects/:id", async (request) => {
    const params = request.params as { id: string };
    return objectRegistryService.getObject(params.id);
  });

  app.get("/objects", async (request) => {
    const query = request.query as { branch?: string; type?: string; query?: string };
    return objectRegistryService.searchObjects({
      branch: query.branch as any,
      type: query.type as any,
      query: query.query
    });
  });

  app.post("/relationships", async (request, reply) => {
    const payload = request.body as any;
    const created = await relationshipGraphService.createRelationship(payload);
    return reply.code(201).send(created);
  });

  app.patch("/relationships/:id", async (request) => {
    const payload = request.body as any;
    const params = request.params as { id: string };
    return relationshipGraphService.updateRelationship(params.id, payload);
  });

  app.get("/relationships/:id", async (request) => {
    const params = request.params as { id: string };
    return relationshipGraphService.getRelationship(params.id);
  });

  app.get("/objects/:id/relationships", async (request) => {
    const params = request.params as { id: string };
    return relationshipGraphService.listRelationshipsForObject(params.id);
  });

  app.get("/objects/:id/relationships/dependencies", async (request) => {
    const params = request.params as { id: string };
    const query = request.query as { relationshipType?: string; depth?: string };

    return relationshipGraphService.traverseDependencies(params.id, {
      relationshipType: query.relationshipType as any,
      depth: query.depth ? Number(query.depth) : undefined
    });
  });

  app.get("/objects/:id/relationships/duplicates", async (request) => {
    const params = request.params as { id: string };
    return relationshipGraphService.findDuplicates(params.id);
  });

  app.post("/discovery/start", async (request, reply) => {
    const payload = request.body as { rootPath: string; scope: string };
    const started = await discoveryOrchestrator.startLocalDiscovery(payload);
    return reply.code(202).send(started);
  });

  app.post("/discovery/rescan", async (request, reply) => {
    const payload = request.body as { rootPath: string; scope: string };
    const started = await discoveryOrchestrator.startLocalDiscovery(payload);
    return reply.code(202).send(started);
  });

  app.get("/discovery/workflows/:workflowId/progress", async (request) => {
    const params = request.params as { workflowId: string };
    return discoveryOrchestrator.getDiscoveryProgress(params.workflowId);
  });

  app.get("/discovery/runs/:discoveryRunId/summary", async (request) => {
    const params = request.params as { discoveryRunId: string };
    return discoveryOrchestrator.getDiscoverySummary(params.discoveryRunId);
  });

  app.post("/normalization/start", async (request, reply) => {
    const payload = request.body as { discoveryRunId: string };
    const result = await normalizationService.normalizeDiscoveryRun(payload.discoveryRunId);
    return reply.code(202).send(result);
  });

  app.post("/analysis/objects/:objectId/classify", async (request, reply) => {
    const params = request.params as { objectId: string };
    const output = await classificationService.classifyObject(params.objectId);
    return reply.code(201).send(output);
  });

  app.get("/analysis/objects/:objectId/recommendations", async (request) => {
    const params = request.params as { objectId: string };
    return recommendationService.listRecommendationsForObject(params.objectId);
  });

  app.get("/analysis/objects/:objectId/classifications", async (request) => {
    const params = request.params as { objectId: string };
    return repositories.classificationRepository.listByObject(params.objectId);
  });

  app.get("/api/overview", async () => {
    const model = await readModelProjectionService.projectOverview();
    return JSON.parse(model.payload);
  });

  app.get("/api/tree/branch", async (request) => {
    const query = request.query as { branch: string };
    const model = await readModelProjectionService.projectTreeBranch(query.branch ?? "UNKNOWN_NEEDS_REVIEW");
    return JSON.parse(model.payload);
  });

  app.get("/api/objects/:id/detail", async (request) => {
    const params = request.params as { id: string };
    const model = await readModelProjectionService.projectDetail(params.id);
    return JSON.parse(model.payload);
  });

  app.get("/api/views/:viewName", async (request) => {
    const params = request.params as { viewName: string };
    const model = await readModelProjectionService.projectView(params.viewName);
    return JSON.parse(model.payload);
  });

  app.get("/api/queue", async () => {
    const model = await readModelProjectionService.projectQueueSummary();
    return JSON.parse(model.payload);
  });

  app.get("/api/tasks/progress", async (request) => {
    const query = request.query as { workflowId: string };
    const model = await readModelProjectionService.projectTaskProgress(query.workflowId);
    return JSON.parse(model.payload);
  });

  app.post("/api/preservation/mark", async (request) => {
    const payload = request.body as { objectIds: string[]; mode: string; reason: string; notes?: string };
    return preserveFirstService.markForPreserve(payload);
  });

  app.post("/api/preservation/start", async (request) => {
    const payload = request.body as { objectIds: string[]; modeByObject?: Record<string, string>; label?: string };
    return preserveFirstService.startPreservation(payload);
  });

  app.post("/api/preservation/evaluate", async (request) => {
    const payload = request.body as { objectIds: string[] };
    return preserveFirstService.evaluatePreserveFirst(payload.objectIds);
  });

  app.post("/api/preservation/manifest", async (request) => {
    const payload = request.body as { workflowId: string };
    return preserveFirstService.generateRestoreManifest(payload.workflowId);
  });

  app.post("/api/preservation/verify", async (request) => {
    const payload = request.body as { workflowId: string };
    return preserveFirstService.verifyPreservedItems(payload.workflowId);
  });

  app.post("/api/simulations", async (request, reply) => {
    const payload = request.body as {
      actionCandidateType: string;
      actionType: string;
      targetObjectIds: string[];
      requestedScope: string;
      trustProfile: "STRICT" | "BALANCED" | "PERMISSIVE";
      notes?: string;
    };
    const created = await simulationService.createSimulation(payload);
    return reply.code(201).send(created);
  });

  app.post("/api/policy/evaluate", async (request, reply) => {
    const payload = request.body as {
      actionClass: "READ" | "PRESERVE" | "SIMULATE" | "EXECUTE" | "VERIFY";
      actionType: string;
      targetObjectIds: string[];
      scopeSummary: string;
      workflowId?: string;
      trustProfile: "STRICT" | "BALANCED" | "PERMISSIVE";
    };
    const decision = await policyEvaluationService.evaluate(payload);
    return reply.code(201).send(decision);
  });

  app.post("/api/approvals", async (request, reply) => {
    const payload = request.body as {
      decisionId?: string;
      type: "EXECUTION" | "POLICY_EXCEPTION";
      targetKind: "workflow" | "action" | "queue_item";
      targetId: string;
      approvedScope: string;
      reason?: string;
    };
    const approval = await approvalService.createApproval(payload);
    return reply.code(201).send(approval);
  });

  app.post("/api/actions/execute", async (request, reply) => {
    const payload = request.body as {
      actionCandidateSummary?: string;
      actionType: "queue_mark_completed";
      policyDecisionId: string;
      approvalId?: string;
      explicitTargetList: string[];
      executionConfirmationToken?: string;
    };
    const result = await executionService.execute(payload);
    return reply.code(201).send(result);
  });

  app.get("/api/readiness/:scopeOrWorkflow", async (request) => {
    const params = request.params as { scopeOrWorkflow: string };
    const query = request.query as { targetObjectIds?: string };
    const objectIds = (query.targetObjectIds ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (objectIds.length > 0) {
      const readiness = await readinessService.evaluate({
        scopeKey: params.scopeOrWorkflow,
        workflowId: params.scopeOrWorkflow.startsWith("wf-") ? params.scopeOrWorkflow : undefined,
        targetObjectIds: objectIds
      });
      await readModelProjectionService.projectReadiness(params.scopeOrWorkflow, readiness);
      return readiness;
    }

    const readiness = await readinessService.getLatest(params.scopeOrWorkflow);
    if (readiness) {
      await readModelProjectionService.projectReadiness(params.scopeOrWorkflow, readiness);
    }
    return readiness;
  });

  app.get("/api/vault", async () => {
    const model = await readModelProjectionService.projectVaultSummary();
    return JSON.parse(model.payload);
  });

  app.get("/api/vault/items", async () => repositories.vaultRepository.listAll());

  app.get("/api/restore-manifest/:id", async (request) => {
    const params = request.params as { id: string };
    const model = await readModelProjectionService.projectRestoreManifest(params.id);
    return JSON.parse(model.payload);
  });

  return app;
}
