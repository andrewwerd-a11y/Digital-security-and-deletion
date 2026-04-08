import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildRepositoryRegistry } from "../apps/backend/src/storage/repositoryRegistry.js";

describe("foundation artifacts", () => {
  it("exposes all repository families", () => {
    const repos = buildRepositoryRegistry();
    expect(Object.keys(repos)).toHaveLength(20);
  });

  it("contains wave a through wave j migrations", () => {
    const waveA = readFileSync("prisma/migrations/0001_wave_a_foundation/migration.sql", "utf8");
    const waveB = readFileSync("prisma/migrations/0002_wave_b_object_registry_graph/migration.sql", "utf8");
    const waveC = readFileSync("prisma/migrations/0003_wave_c_discovery_pipeline/migration.sql", "utf8");
    const waveD = readFileSync("prisma/migrations/0004_wave_d_normalization_pipeline/migration.sql", "utf8");
    const waveE = readFileSync("prisma/migrations/0005_wave_e_classification_recommendation/migration.sql", "utf8");
    const waveF = readFileSync("prisma/migrations/0006_wave_f_read_models_frontend/migration.sql", "utf8");
    const waveG = readFileSync("prisma/migrations/0007_wave_g_preservation_vault_manifest/migration.sql", "utf8");
    const waveI = readFileSync("prisma/migrations/0008_wave_i_simulation_readiness_policy_approval/migration.sql", "utf8");
    const waveJ = readFileSync("prisma/migrations/0009_wave_j_limited_reviewed_execution/migration.sql", "utf8");
    expect(waveA).toContain("CREATE TABLE \"CoreObject\"");
    expect(waveB).toContain("ALTER TABLE \"CoreObject\"");
    expect(waveB).toContain("CREATE INDEX \"CoreRelationship_relationshipType_idx\"");
    expect(waveC).toContain("CREATE TABLE \"DiscoveryRun\"");
    expect(waveD).toContain("CREATE TABLE \"NormalizationRun\"");
    expect(waveE).toContain("CREATE TYPE \"AnalysisRisk\"");
    expect(waveF).toContain("ALTER TABLE \"ReadModel\" ADD COLUMN \"modelKey\"");
    expect(waveG).toContain("ALTER TABLE \"VaultRecord\"");
    expect(waveI).toContain("CREATE TABLE \"SimulationRecord\"");
    expect(waveJ).toContain("ALTER TABLE \"Action\"");
  });
});
