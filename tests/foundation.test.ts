import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildRepositoryRegistry } from "../apps/backend/src/storage/repositoryRegistry.js";

describe("foundation artifacts", () => {
  it("exposes all repository families", () => {
    const repos = buildRepositoryRegistry();
    expect(Object.keys(repos)).toHaveLength(18);
  });

  it("contains wave a, wave b, and wave c migrations", () => {
    const waveA = readFileSync("prisma/migrations/0001_wave_a_foundation/migration.sql", "utf8");
    const waveB = readFileSync("prisma/migrations/0002_wave_b_object_registry_graph/migration.sql", "utf8");
    const waveC = readFileSync("prisma/migrations/0003_wave_c_discovery_pipeline/migration.sql", "utf8");
    expect(waveA).toContain("CREATE TABLE \"CoreObject\"");
    expect(waveB).toContain("ALTER TABLE \"CoreObject\"");
    expect(waveB).toContain("CREATE INDEX \"CoreRelationship_relationshipType_idx\"");
    expect(waveC).toContain("CREATE TABLE \"DiscoveryRun\"");
  });
});
