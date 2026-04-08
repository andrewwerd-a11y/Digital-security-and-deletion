import Fastify from "fastify";
import sensible from "@fastify/sensible";
import {
  DiscoveryOrchestrator,
  ObjectRegistryService,
  RelationshipGraphService
} from "../domain/services/index.js";
import { LocalDiscoveryScanner } from "../workflows/discovery/localDiscoveryScanner.js";
import { buildRepositoryRegistry } from "../storage/repositoryRegistry.js";

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

  return app;
}
