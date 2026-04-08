import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  Confidence,
  EvidenceOriginType,
  ObjectState,
  ObjectType,
  OntologyBranch,
  PreserveState,
  ReviewState,
  VerificationState
} from "@dsd/shared";
import { ObjectRegistryService } from "../apps/backend/src/domain/services/objectRegistryService.js";
import type { CoreObjectRecord, ObjectSearchQuery } from "../apps/backend/src/domain/repositories/types.js";
import type { ObjectRepository } from "../apps/backend/src/domain/repositories/interfaces.js";

class InMemoryObjectRepository implements ObjectRepository {
  private readonly store = new Map<string, CoreObjectRecord>();

  async create(record: Omit<CoreObjectRecord, "id" | "createdAt" | "updatedAt">): Promise<CoreObjectRecord> {
    const now = new Date();
    const row: CoreObjectRecord = { id: randomUUID(), createdAt: now, updatedAt: now, ...record };
    this.store.set(row.id, row);
    return row;
  }

  async update(id: string, patch: Partial<Omit<CoreObjectRecord, "id" | "createdAt" | "updatedAt">>): Promise<CoreObjectRecord> {
    const current = this.store.get(id);
    if (!current) {
      throw new Error("object not found");
    }

    const next = { ...current, ...patch, updatedAt: new Date() };
    this.store.set(id, next);
    return next;
  }

  async getById(id: string): Promise<CoreObjectRecord | null> {
    return this.store.get(id) ?? null;
  }

  async search(query: ObjectSearchQuery): Promise<CoreObjectRecord[]> {
    return [...this.store.values()].filter((row) => {
      if (query.branch && row.branch !== query.branch) return false;
      if (query.type && row.objectType !== query.type) return false;
      if (query.query) {
        const q = query.query.toLowerCase();
        return row.displayName.toLowerCase().includes(q) || row.externalRef.toLowerCase().includes(q);
      }
      return true;
    });
  }
}

describe("ObjectRegistryService", () => {
  it("creates, updates, and queries canonical objects", async () => {
    const service = new ObjectRegistryService(new InMemoryObjectRepository());

    const created = await service.createObject({
      branch: OntologyBranch.ACCOUNTS,
      objectType: ObjectType.ACCOUNT,
      externalRef: "acc-001",
      displayName: "Primary account",
      state: ObjectState.DISCOVERED,
      reviewState: ReviewState.UNREVIEWED,
      preserveState: PreserveState.NOT_STARTED,
      verificationState: VerificationState.NOT_VERIFIED,
      confidence: Confidence.HIGH,
      origin: EvidenceOriginType.OBSERVED,
      provenanceSource: "manual-test",
      aliases: ["main"]
    });

    expect(created.objectType).toBe(ObjectType.ACCOUNT);

    const updated = await service.updateObject(created.id, {
      notes: "Validated by operator"
    });
    expect(updated.notes).toContain("Validated");

    const queried = await service.searchObjects({ branch: OntologyBranch.ACCOUNTS, type: ObjectType.ACCOUNT });
    expect(queried).toHaveLength(1);
  });
});
