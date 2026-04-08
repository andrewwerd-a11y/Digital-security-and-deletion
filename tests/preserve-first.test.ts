import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileVaultStorage } from "../apps/backend/src/vault/fileVault.js";
import { VaultStorageManager } from "../apps/backend/src/vault/vaultStorageManager.js";
import { PreserveFirstService } from "../apps/backend/src/domain/services/preserveFirstService.js";
import type {
  ClassificationRecord,
  CoreObjectRecord,
  RestoreManifestRecord,
  TaskRecord,
  VaultRecord,
  WorkflowRecord
} from "../apps/backend/src/domain/repositories/types.js";
import type {
  ClassificationRepository,
  ObjectRepository,
  RestoreManifestRepository,
  TaskRepository,
  VaultRepository,
  WorkflowRepository
} from "../apps/backend/src/domain/repositories/interfaces.js";

let tempDir = "";
afterEach(async () => { if (tempDir) await rm(tempDir, { recursive: true, force: true }); tempDir = ""; });

class ObjRepo implements ObjectRepository {
  rows = new Map<string, CoreObjectRecord>();
  async create() { throw new Error("unused"); }
  async update(id: string, patch: any) { const u = { ...this.rows.get(id)!, ...patch, updatedAt: new Date() }; this.rows.set(id, u); return u; }
  async getById(id: string) { return this.rows.get(id) ?? null; }
  async search() { return [...this.rows.values()]; }
}
class ClassRepo implements ClassificationRepository {
  rows: ClassificationRecord[] = [];
  async create() { throw new Error("unused"); }
  async listByObject(objectId: string) { return this.rows.filter((r) => r.objectId === objectId); }
}
class WRepo implements WorkflowRepository {
  rows = new Map<string, WorkflowRecord>();
  async create(record: Omit<WorkflowRecord, "id">) { const r={...record,id:`wf-${this.rows.size+1}`}; this.rows.set(r.id,r); return r; }
  async update(id:string, patch:any){ const r={...this.rows.get(id)!,...patch}; this.rows.set(id,r); return r; }
  async getById(id:string){ return this.rows.get(id)??null; }
}
class TRepo implements TaskRepository {
  rows = new Map<string, TaskRecord>();
  async create(record: Omit<TaskRecord, "id">){ const r={...record,id:`t-${this.rows.size+1}`}; this.rows.set(r.id,r); return r; }
  async update(id:string, patch:any){ const r={...this.rows.get(id)!,...patch}; this.rows.set(id,r); return r; }
  async listByWorkflow(workflowId:string){ return [...this.rows.values()].filter(t=>t.workflowId===workflowId); }
}
class VRepo implements VaultRepository {
  rows: VaultRecord[]=[];
  async create(record:any){ const r={...record,id:`v-${this.rows.length+1}`,createdAt:new Date()}; this.rows.push(r); return r; }
  async listAll(){ return this.rows; }
  async listByWorkflow(workflowId:string){ return this.rows.filter(r=>r.workflowId===workflowId); }
  async updateIntegrity(id:string, integrityStatus:string, checksum?:string){ const i=this.rows.findIndex(r=>r.id===id); this.rows[i]={...this.rows[i],integrityStatus,checksum}; return this.rows[i]; }
}
class MRepo implements RestoreManifestRepository {
  rows: RestoreManifestRecord[]=[];
  async create(record:any){ const r={...record,id:`m-${this.rows.length+1}`,createdAt:new Date()}; this.rows.push(r); return r; }
  async getById(id:string){ return this.rows.find(r=>r.id===id)??null; }
}

describe("PreserveFirstService", () => {
  it("evaluates blockers, preserves artifacts, records integrity, and creates manifest", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "vault-"));

    const objRepo = new ObjRepo();
    objRepo.rows.set("o1", {
      id: "o1", branch: "FILES" as any, objectType: "FILE" as any, externalRef: "/tmp/file.txt", displayName: "file.txt",
      state: "NORMALIZED" as any, reviewState: "UNREVIEWED" as any, preserveState: "NOT_STARTED" as any, verificationState: "NOT_VERIFIED" as any,
      confidence: "HIGH" as any, origin: "OBSERVED" as any, provenanceSource: "finding", aliases: [], createdAt: new Date(), updatedAt: new Date()
    });

    const classRepo = new ClassRepo();
    classRepo.rows.push({
      id: "c1", objectId: "o1", risk: "PRESERVE_IMPORTANT" as any, sensitivity: "PRIVATE" as any,
      confidence: "CONFIRMED" as any, preserveFirstBlocker: true, rationale: "important", explanation: "important", createdAt: new Date()
    });

    const service = new PreserveFirstService(
      objRepo,
      classRepo,
      new WRepo(),
      new TRepo(),
      new VRepo(),
      new MRepo(),
      new VaultStorageManager(new FileVaultStorage(tempDir))
    );

    const evalResult = await service.evaluatePreserveFirst(["o1"]);
    expect(evalResult.blockerCount).toBe(1);

    await service.markForPreserve({ objectIds: ["o1"], mode: "snapshot", reason: "test" });
    const start = await service.startPreservation({ objectIds: ["o1"] });
    const verified = await service.verifyPreservedItems(start.workflowId);
    const manifest = await service.generateRestoreManifest(start.workflowId);

    expect(verified.length).toBe(1);
    expect(verified[0].integrityStatus).toBe("VERIFIED");
    expect(manifest.itemCount).toBe(1);
  });
});
