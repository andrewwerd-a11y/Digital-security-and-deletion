import { describe, expect, it } from "vitest";
import { ReadModelProjectionService } from "../apps/backend/src/domain/services/readModelProjectionService.js";
import type {
  CoreObjectRecord,
  ReadModelRecord,
  RelationshipRecord,
  TaskRecord,
  WorkflowRecord
} from "../apps/backend/src/domain/repositories/types.js";
import type {
  ClassificationRepository,
  ObjectRepository,
  ReadModelRepository,
  RecommendationRepository,
  RelationshipRepository,
  TaskRepository,
  VaultRepository,
  RestoreManifestRepository,
  WorkflowRepository
} from "../apps/backend/src/domain/repositories/interfaces.js";

class RMRepo implements ReadModelRepository {
  private rows = new Map<string, ReadModelRecord>();
  async upsert(record: Omit<ReadModelRecord, "id" | "createdAt">): Promise<ReadModelRecord> {
    const key = `${record.modelType}:${record.modelKey}`;
    const row: ReadModelRecord = { id: key, createdAt: new Date(), ...record };
    this.rows.set(key, row);
    return row;
  }
  async getByTypeAndKey(type: string, key: string) { return this.rows.get(`${type}:${key}`) ?? null; }
  async listByType(type: string) { return [...this.rows.values()].filter((r) => r.modelType === type); }
}

const obj: CoreObjectRecord = {
  id: "o1", branch: "FILES" as any, objectType: "FILE" as any, externalRef: "ref", displayName: "file",
  state: "READY" as any, reviewState: "UNREVIEWED" as any, preserveState: "NOT_STARTED" as any, verificationState: "NOT_VERIFIED" as any,
  confidence: "HIGH" as any, origin: "OBSERVED" as any, provenanceSource: "finding", aliases: [], createdAt: new Date(), updatedAt: new Date()
};

class ObjRepo implements ObjectRepository { async create(){throw new Error("n")} async update(){throw new Error("n")} async getById(){return obj} async search(){return [obj]} }
class RelRepo implements RelationshipRepository { async create(){throw new Error("n")} async update(){throw new Error("n")} async getById(){return null} async listForObject(){return [] as RelationshipRecord[]} async listDependents(){return []} async listDuplicates(){return []} }
class ClassRepo implements ClassificationRepository { async create(){throw new Error("n")} async listByObject(){return []} }
class RecRepo implements RecommendationRepository { async create(){throw new Error("n")} async listByObject(){return []} }
class WRepo implements WorkflowRepository { async create(){throw new Error("n")} async update(){throw new Error("n")} async getById(){return { id:"w1", type:"DISCOVERY" as any, state:"RUNNING" as any, startedAt:new Date() } as WorkflowRecord } }
class TRepo implements TaskRepository { async create(){throw new Error("n")} async update(){throw new Error("n")} async listByWorkflow(){return [] as TaskRecord[]} }
class VRepo implements VaultRepository { async create(){throw new Error("n")} async listAll(){return []} async listByWorkflow(){return []} async updateIntegrity(){throw new Error("n")} }
class MRepo implements RestoreManifestRepository { async create(){throw new Error("n")} async getById(){return null} }

describe("ReadModelProjectionService", () => {
  it("projects overview, tree, detail, views and progress", async () => {
    const rm = new RMRepo();
    const svc = new ReadModelProjectionService(new ObjRepo(), new RelRepo(), new ClassRepo(), new RecRepo(), new WRepo(), new TRepo(), new VRepo(), new MRepo(), rm);

    expect(JSON.parse((await svc.projectOverview()).payload).totalObjects).toBe(1);
    expect(JSON.parse((await svc.projectTreeBranch("FILES")).payload).branch).toBe("FILES");
    expect(JSON.parse((await svc.projectDetail("o1")).payload).object.id).toBe("o1");
    expect(JSON.parse((await svc.projectView("unknown")).payload).viewName).toBe("unknown");
    expect(JSON.parse((await svc.projectQueueSummary()).payload).pending).toBe(0);
    expect(JSON.parse((await svc.projectTaskProgress("w1")).payload).workflow.id).toBe("w1");
  });
});
