import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Confidence, EvidenceOriginType, RelationshipType } from "@dsd/shared";
import { RelationshipGraphService } from "../apps/backend/src/domain/services/relationshipGraphService.js";
import type { RelationshipRecord, RelationshipTraversalQuery } from "../apps/backend/src/domain/repositories/types.js";
import type { RelationshipRepository } from "../apps/backend/src/domain/repositories/interfaces.js";

class InMemoryRelationshipRepository implements RelationshipRepository {
  private readonly store = new Map<string, RelationshipRecord>();

  async create(record: Omit<RelationshipRecord, "id" | "createdAt" | "updatedAt">): Promise<RelationshipRecord> {
    const now = new Date();
    const row: RelationshipRecord = { id: randomUUID(), createdAt: now, updatedAt: now, ...record };
    this.store.set(row.id, row);
    return row;
  }

  async update(id: string, patch: Partial<Omit<RelationshipRecord, "id" | "createdAt" | "updatedAt">>): Promise<RelationshipRecord> {
    const current = this.store.get(id);
    if (!current) {
      throw new Error("relationship not found");
    }

    const next = { ...current, ...patch, updatedAt: new Date() };
    this.store.set(id, next);
    return next;
  }

  async getById(id: string): Promise<RelationshipRecord | null> {
    return this.store.get(id) ?? null;
  }

  async listForObject(objectId: string): Promise<RelationshipRecord[]> {
    return [...this.store.values()].filter((row) => row.fromObjectId === objectId || row.toObjectId === objectId);
  }

  async listDependents(objectId: string, query?: RelationshipTraversalQuery): Promise<RelationshipRecord[]> {
    return [...this.store.values()].filter((row) => {
      const related = row.fromObjectId === objectId || row.toObjectId === objectId;
      const typeMatch = !query?.relationshipType || query.relationshipType === row.relationshipType;
      return related && typeMatch;
    });
  }

  async listDuplicates(objectId: string): Promise<RelationshipRecord[]> {
    return [...this.store.values()].filter(
      (row) =>
        row.relationshipType === RelationshipType.DUPLICATES &&
        (row.fromObjectId === objectId || row.toObjectId === objectId)
    );
  }
}

describe("RelationshipGraphService", () => {
  it("creates and queries typed relationships", async () => {
    const service = new RelationshipGraphService(new InMemoryRelationshipRepository());
    const created = await service.createRelationship({
      fromObjectId: "object-a",
      toObjectId: "object-b",
      relationshipType: RelationshipType.DEPENDS_ON,
      confidence: Confidence.MEDIUM,
      origin: EvidenceOriginType.INFERRED,
      provenanceSource: "rule-engine"
    });

    expect(created.relationshipType).toBe(RelationshipType.DEPENDS_ON);

    const list = await service.traverseDependencies("object-a", { relationshipType: RelationshipType.DEPENDS_ON });
    expect(list).toHaveLength(1);
  });
});
