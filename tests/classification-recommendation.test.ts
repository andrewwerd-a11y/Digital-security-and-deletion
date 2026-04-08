import { describe, expect, it } from "vitest";
import {
  AnalysisConfidence,
  AnalysisRisk,
  AnalysisSensitivity,
  RecommendationIntent,
  RelationshipType
} from "@dsd/shared";
import { ClassificationService } from "../apps/backend/src/domain/services/classificationService.js";
import type {
  ClassificationRecord,
  CoreObjectRecord,
  RecommendationRecord,
  RelationshipRecord
} from "../apps/backend/src/domain/repositories/types.js";
import type {
  ClassificationRepository,
  ObjectRepository,
  RecommendationRepository,
  RelationshipRepository
} from "../apps/backend/src/domain/repositories/interfaces.js";

class ObjRepo implements ObjectRepository {
  constructor(private row: CoreObjectRecord) {}
  async create() { throw new Error("unused"); }
  async update() { throw new Error("unused"); }
  async getById(id: string) { return id === this.row.id ? this.row : null; }
  async search() { return [this.row]; }
}

class RelRepo implements RelationshipRepository {
  constructor(private rows: RelationshipRecord[]) {}
  async create() { throw new Error("unused"); }
  async update() { throw new Error("unused"); }
  async getById() { return null; }
  async listForObject() { return this.rows; }
  async listDependents() { return []; }
  async listDuplicates() { return []; }
}

class ClassRepo implements ClassificationRepository {
  rows: ClassificationRecord[] = [];
  async create(record: Omit<ClassificationRecord, "id" | "createdAt">): Promise<ClassificationRecord> {
    const row = { ...record, id: `cls-${this.rows.length + 1}`, createdAt: new Date() };
    this.rows.push(row);
    return row;
  }
  async listByObject() { return this.rows; }
}

class RecRepo implements RecommendationRepository {
  rows: RecommendationRecord[] = [];
  async create(record: Omit<RecommendationRecord, "id" | "createdAt">): Promise<RecommendationRecord> {
    const row = { ...record, id: `rec-${this.rows.length + 1}`, createdAt: new Date() };
    this.rows.push(row);
    return row;
  }
  async listByObject() { return this.rows; }
}

describe("ClassificationService", () => {
  it("persists classification, recommendation, and explanations", async () => {
    const baseObject = {
      id: "o1",
      branch: "ACCOUNTS",
      objectType: "ACCOUNT",
      externalRef: "acct",
      displayName: "Primary Account",
      state: "NORMALIZED",
      reviewState: "UNREVIEWED",
      preserveState: "NOT_STARTED",
      verificationState: "NOT_VERIFIED",
      confidence: "HIGH",
      origin: "OBSERVED",
      provenanceSource: "finding:1",
      aliases: [],
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as CoreObjectRecord;

    const service = new ClassificationService(
      new ObjRepo(baseObject),
      new RelRepo([]),
      new ClassRepo(),
      new RecRepo()
    );

    const output = await service.classifyObject("o1");
    expect(output.classification.risk).toBe(AnalysisRisk.PRIVACY_RISK);
    expect(output.classification.sensitivity).toBe(AnalysisSensitivity.SENSITIVE);
    expect(output.classification.confidence).toBe(AnalysisConfidence.CONFIRMED);
    expect(output.recommendation.intent).toBe(RecommendationIntent.REVIEW);
    expect(output.classification.explanation.length).toBeGreaterThan(10);
  });

  it("surfaces preserve-first blocker for dependency-heavy objects", async () => {
    const obj = {
      id: "o2",
      branch: "APPS",
      objectType: "APP",
      externalRef: "app",
      displayName: "App",
      state: "NORMALIZED",
      reviewState: "UNREVIEWED",
      preserveState: "NOT_STARTED",
      verificationState: "NOT_VERIFIED",
      confidence: "HIGH",
      origin: "OBSERVED",
      provenanceSource: "finding:2",
      aliases: [],
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as CoreObjectRecord;

    const rel = {
      id: "r1",
      fromObjectId: "o2",
      toObjectId: "o3",
      relationshipType: RelationshipType.DEPENDS_ON,
      confidence: "HIGH",
      origin: "OBSERVED",
      provenanceSource: "finding:2",
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as RelationshipRecord;

    const output = await new ClassificationService(new ObjRepo(obj), new RelRepo([rel]), new ClassRepo(), new RecRepo()).classifyObject("o2");
    expect(output.classification.preserveFirstBlocker).toBe(true);
    expect(output.recommendation.intent).toBe(RecommendationIntent.DISCONNECT_BEFORE_DELETE);
  });
});
