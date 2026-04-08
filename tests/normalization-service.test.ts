import { describe, expect, it } from "vitest";
import {
  Confidence,
  EvidenceOriginType,
  ObjectState,
  ObjectType,
  OntologyBranch,
  PreserveState,
  RelationshipType,
  ReviewState,
  VerificationState,
  WorkflowState,
  WorkflowType
} from "@dsd/shared";
import { NormalizationService } from "../apps/backend/src/domain/services/normalizationService.js";
import type {
  CoreObjectRecord,
  DiscoveryFindingRecord,
  DiscoveryRunRecord,
  DuplicateCandidateRecord,
  EvidenceRecord,
  NormalizationRunRecord,
  RelationshipRecord,
  UnresolvedCandidateRecord,
  WorkflowRecord
} from "../apps/backend/src/domain/repositories/types.js";
import type {
  EvidenceRepository,
  ObjectRepository,
  RelationshipRepository,
  WorkflowRepository
} from "../apps/backend/src/domain/repositories/interfaces.js";

class MemoryObjectRepo implements ObjectRepository {
  private rows = new Map<string, CoreObjectRecord>();
  async create(record: Omit<CoreObjectRecord, "id" | "createdAt" | "updatedAt">): Promise<CoreObjectRecord> {
    const now = new Date();
    const created = { ...record, id: `obj-${this.rows.size + 1}`, createdAt: now, updatedAt: now };
    this.rows.set(created.id, created);
    return created;
  }
  async update(id: string, patch: Partial<Omit<CoreObjectRecord, "id" | "createdAt" | "updatedAt">>): Promise<CoreObjectRecord> {
    const current = this.rows.get(id)!;
    const updated = { ...current, ...patch, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }
  async getById(id: string): Promise<CoreObjectRecord | null> { return this.rows.get(id) ?? null; }
  async search(query: { query?: string; type?: ObjectType; branch?: OntologyBranch }): Promise<CoreObjectRecord[]> {
    return [...this.rows.values()].filter((row) => {
      if (query.query && !row.externalRef.includes(query.query) && !row.displayName.includes(query.query)) return false;
      if (query.type && row.objectType !== query.type) return false;
      if (query.branch && row.branch !== query.branch) return false;
      return true;
    });
  }
}

class MemoryRelationshipRepo implements RelationshipRepository {
  rows: RelationshipRecord[] = [];
  async create(record: Omit<RelationshipRecord, "id" | "createdAt" | "updatedAt">): Promise<RelationshipRecord> {
    const now = new Date();
    const created = { ...record, id: `rel-${this.rows.length + 1}`, createdAt: now, updatedAt: now };
    this.rows.push(created);
    return created;
  }
  async update(): Promise<RelationshipRecord> { throw new Error("not used"); }
  async getById(): Promise<RelationshipRecord | null> { return null; }
  async listForObject(): Promise<RelationshipRecord[]> { return []; }
  async listDependents(): Promise<RelationshipRecord[]> { return []; }
  async listDuplicates(): Promise<RelationshipRecord[]> { return []; }
}

class MemoryWorkflowRepo implements WorkflowRepository {
  rows = new Map<string, WorkflowRecord>();
  async create(record: Omit<WorkflowRecord, "id">): Promise<WorkflowRecord> {
    const created = { ...record, id: `wf-${this.rows.size + 1}` };
    this.rows.set(created.id, created);
    return created;
  }
  async update(id: string, patch: Partial<Omit<WorkflowRecord, "id">>): Promise<WorkflowRecord> {
    const updated = { ...this.rows.get(id)!, ...patch };
    this.rows.set(id, updated);
    return updated;
  }
  async getById(id: string): Promise<WorkflowRecord | null> { return this.rows.get(id) ?? null; }
}

class MemoryEvidenceRepo implements EvidenceRepository {
  run: DiscoveryRunRecord = { id: "run-1", workflowId: "wf-discovery", scope: "local", rootPath: "/tmp", startedAt: new Date() };
  findings: DiscoveryFindingRecord[] = [];
  unresolved: UnresolvedCandidateRecord[] = [];
  duplicates: DuplicateCandidateRecord[] = [];
  async create(record: Omit<EvidenceRecord, "id" | "createdAt">): Promise<EvidenceRecord> { return { ...record, id: "ev-1", createdAt: new Date() }; }
  async listByDiscoveryRun(): Promise<EvidenceRecord[]> { return []; }
  async createDiscoveryRun(): Promise<DiscoveryRunRecord> { return this.run; }
  async updateDiscoveryRun(id: string): Promise<DiscoveryRunRecord> { return this.run; }
  async getDiscoveryRunById(id: string): Promise<DiscoveryRunRecord | null> { return id === this.run.id ? this.run : null; }
  async createDiscoveryFinding(): Promise<DiscoveryFindingRecord> { throw new Error("not used"); }
  async listDiscoveryFindingsByRun(): Promise<DiscoveryFindingRecord[]> { return this.findings; }
  async createNormalizationRun(record: Omit<NormalizationRunRecord, "id" | "createdAt">): Promise<NormalizationRunRecord> {
    return { ...record, id: "norm-1", createdAt: new Date() };
  }
  async createUnresolvedCandidate(record: Omit<UnresolvedCandidateRecord, "id" | "createdAt">): Promise<UnresolvedCandidateRecord> {
    const row = { ...record, id: `un-${this.unresolved.length + 1}`, createdAt: new Date() };
    this.unresolved.push(row);
    return row;
  }
  async listUnresolvedCandidates(): Promise<UnresolvedCandidateRecord[]> { return this.unresolved; }
  async createDuplicateCandidate(record: Omit<DuplicateCandidateRecord, "id" | "createdAt">): Promise<DuplicateCandidateRecord> {
    const row = { ...record, id: `dup-${this.duplicates.length + 1}`, createdAt: new Date() };
    this.duplicates.push(row);
    return row;
  }
  async listDuplicateCandidates(): Promise<DuplicateCandidateRecord[]> { return this.duplicates; }
}

describe("NormalizationService", () => {
  it("maps findings to canonical objects and relationships", async () => {
    const objects = new MemoryObjectRepo();
    const relationships = new MemoryRelationshipRepo();
    const evidence = new MemoryEvidenceRepo();
    evidence.findings = [
      {
        id: "f-1",
        discoveryRunId: "run-1",
        locator: "/tmp/Documents",
        findingType: "directory",
        summary: "directory",
        metadataJson: JSON.stringify({}) ,
        createdAt: new Date()
      },
      {
        id: "f-2",
        discoveryRunId: "run-1",
        locator: "/tmp/Documents/file.txt",
        findingType: "file_entry",
        summary: "file",
        metadataJson: JSON.stringify({ parent: "/tmp/Documents" }),
        createdAt: new Date()
      }
    ];

    const service = new NormalizationService(objects, relationships, evidence, new MemoryWorkflowRepo());
    const result = await service.normalizeDiscoveryRun("run-1");

    expect(result.normalizedObjectCount).toBeGreaterThanOrEqual(2);
    expect(result.normalizedRelationshipCount).toBe(1);
    expect(relationships.rows[0].relationshipType).toBe(RelationshipType.CONTAINS);
  });

  it("keeps ambiguous findings unresolved", async () => {
    const evidence = new MemoryEvidenceRepo();
    evidence.findings = [{
      id: "f-unknown",
      discoveryRunId: "run-1",
      locator: "/tmp/unknown",
      findingType: "weird_type",
      summary: "unknown",
      metadataJson: "{}",
      createdAt: new Date()
    }];

    const service = new NormalizationService(new MemoryObjectRepo(), new MemoryRelationshipRepo(), evidence, new MemoryWorkflowRepo());
    const result = await service.normalizeDiscoveryRun("run-1");

    expect(result.unresolvedCount).toBe(1);
  });

  it("generates duplicate candidates for matching names", async () => {
    const evidence = new MemoryEvidenceRepo();
    evidence.findings = [
      { id: "a", discoveryRunId: "run-1", locator: "/tmp/A/file.txt", findingType: "file_entry", summary: "a", metadataJson: "{}", createdAt: new Date() },
      { id: "b", discoveryRunId: "run-1", locator: "/tmp/B/file.txt", findingType: "file_entry", summary: "b", metadataJson: "{}", createdAt: new Date() }
    ];

    const service = new NormalizationService(new MemoryObjectRepo(), new MemoryRelationshipRepo(), evidence, new MemoryWorkflowRepo());
    const result = await service.normalizeDiscoveryRun("run-1");

    expect(result.duplicateCandidateCount).toBe(1);
  });
});
