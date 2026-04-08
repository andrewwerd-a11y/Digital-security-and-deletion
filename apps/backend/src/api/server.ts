import Fastify from "fastify";
import sensible from "@fastify/sensible";
import { buildRepositoryRegistry } from "../storage/repositoryRegistry.js";

export async function buildServer() {
  const app = Fastify({ logger: false });
  await app.register(sensible);

  const repositories = buildRepositoryRegistry();

  app.get("/health", async () => ({ ok: true }));
  app.get("/status", async () => ({
    service: "digital-security-and-deletion-backend",
    datastore: "postgresql",
    repositories: Object.keys(repositories)
  }));

  return app;
}
