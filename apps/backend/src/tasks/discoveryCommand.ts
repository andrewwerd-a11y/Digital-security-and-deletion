import { buildRepositoryRegistry } from "../storage/repositoryRegistry.js";
import { DiscoveryOrchestrator } from "../domain/services/discoveryOrchestrator.js";
import { LocalDiscoveryScanner } from "../workflows/discovery/localDiscoveryScanner.js";

async function main() {
  const rootPath = process.argv[2] ?? process.env.HOME ?? ".";
  const scope = process.argv[3] ?? "default";
  const repositories = buildRepositoryRegistry();

  const orchestrator = new DiscoveryOrchestrator(
    repositories.workflowRepository,
    repositories.taskRepository,
    repositories.discoveryRunRepository,
    repositories.discoveryFindingRepository,
    repositories.evidenceRepository,
    new LocalDiscoveryScanner()
  );

  const started = await orchestrator.startLocalDiscovery({ rootPath, scope });
  console.log(JSON.stringify(started, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
