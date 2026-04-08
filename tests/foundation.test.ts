import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildRepositoryRegistry } from "../apps/backend/src/storage/repositoryRegistry.js";

describe("foundation artifacts", () => {
  it("exposes all repository families", () => {
    const repos = buildRepositoryRegistry();
    expect(Object.keys(repos)).toHaveLength(18);
  });

  it("contains first migration and schema groups", () => {
    const migration = readFileSync("prisma/migrations/0001_wave_a_foundation/migration.sql", "utf8");
    expect(migration).toContain("CREATE TABLE \"PolicyDecision\"");
    expect(migration).toContain("CREATE TABLE \"Approval\"");
    expect(migration).toContain("CREATE TABLE \"VaultRecord\"");
  });
});
