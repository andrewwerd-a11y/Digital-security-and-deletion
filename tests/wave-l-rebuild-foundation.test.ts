import { describe, expect, it } from "vitest";
import { RebuildService } from "../apps/backend/src/domain/services/rebuildService.js";
import type {
  QueueRecord,
  ReadModelRecord,
  RestoreManifestRecord,
  TaskRecord,
  VaultRecord,
  WorkflowRecord
} from "../apps/backend/src/domain/repositories/types.js";
import type {
  QueueRepository,
  ReadModelRepository,
  RestoreManifestRepository,
  TaskRepository,
  VaultRepository,
  WorkflowRepository
} from "../apps/backend/src/domain/repositories/interfaces.js";

class ManifestRepo implements RestoreManifestRepository {
  row: RestoreManifestRecord | null = null;
  async create(record: Omit<RestoreManifestRecord, "id" | "createdAt">): Promise<RestoreManifestRecord> {
    this.row = { id: "manifest-1", createdAt: new Date(), ...record };
    return this.row;
  }
  async getById(id: string): Promise<RestoreManifestRecord | null> {
    return this.row?.id === id ? this.row : null;
  }
}

class VaultRepo implements VaultRepository {
  rows: VaultRecord[] = [];
  async create(record: Omit<VaultRecord, "id" | "createdAt">): Promise<VaultRecord> {
    const created = { id: `vault-${this.rows.length + 1}`, createdAt: new Date(), ...record };
    this.rows.push(created);
    return created;
  }
  async listAll(): Promise<VaultRecord[]> { return this.rows; }
  async listByWorkflow(workflowId: string): Promise<VaultRecord[]> { return this.rows.filter((r) => r.workflowId === workflowId); }
  async updateIntegrity(): Promise<VaultRecord> { throw new Error("unused"); }
}

class ReadModelRepo implements ReadModelRepository {
  rows = new Map<string, ReadModelRecord>();
  async upsert(record: Omit<ReadModelRecord, "id" | "createdAt">): Promise<ReadModelRecord> {
    const id = `${record.modelType}:${record.modelKey}`;
    const created = { id, createdAt: new Date(), ...record };
    this.rows.set(id, created);
    return created;
  }
  async getByTypeAndKey(modelType: string, modelKey: string): Promise<ReadModelRecord | null> {
    return this.rows.get(`${modelType}:${modelKey}`) ?? null;
  }
  async listByType(modelType: string): Promise<ReadModelRecord[]> { return [...this.rows.values()].filter((r) => r.modelType === modelType); }
}

class WorkflowRepo implements WorkflowRepository {
  rows: WorkflowRecord[] = [];
  async create(record: Omit<WorkflowRecord, "id">): Promise<WorkflowRecord> {
    const created = { id: `wf-${this.rows.length + 1}`, ...record };
    this.rows.push(created);
    return created;
  }
  async update(id: string, patch: Partial<Omit<WorkflowRecord, "id">>): Promise<WorkflowRecord> {
    const i = this.rows.findIndex((r) => r.id === id);
    this.rows[i] = { ...this.rows[i], ...patch };
    return this.rows[i];
  }
  async getById(id: string): Promise<WorkflowRecord | null> { return this.rows.find((r) => r.id === id) ?? null; }
}

class TaskRepo implements TaskRepository {
  rows: TaskRecord[] = [];
  async create(record: Omit<TaskRecord, "id">): Promise<TaskRecord> {
    const created = { id: `task-${this.rows.length + 1}`, ...record };
    this.rows.push(created);
    return created;
  }
  async update(id: string, patch: Partial<Omit<TaskRecord, "id" | "workflowId" | "type">>): Promise<TaskRecord> {
    const i = this.rows.findIndex((r) => r.id === id);
    this.rows[i] = { ...this.rows[i], ...patch };
    return this.rows[i];
  }
  async listByWorkflow(workflowId: string): Promise<TaskRecord[]> { return this.rows.filter((r) => r.workflowId === workflowId); }
}

class QueueRepo implements QueueRepository {
  rows: QueueRecord[] = [];
  async create(record: QueueRecord): Promise<QueueRecord> { this.rows.push(record); return record; }
  async getById(id: string): Promise<QueueRecord | null> { return this.rows.find((r) => r.id === id) ?? null; }
  async update(id: string, patch: Partial<Pick<QueueRecord, "state" | "blockReason" | "detail">>): Promise<QueueRecord> {
    const i = this.rows.findIndex((r) => r.id === id);
    this.rows[i] = { ...this.rows[i], ...patch, updatedAt: new Date() };
    return this.rows[i];
  }
}

describe("Wave L rebuild foundation", () => {
  it("builds manifest-backed plan with reconnect sequencing and blocked exclusions", async () => {
    const manifestRepo = new ManifestRepo();
    const manifest = await manifestRepo.create({ workflowId: "wf-preserve", summary: "manifest", validationStatus: "PENDING", itemCount: 3 });
    const vaultRepo = new VaultRepo();
    await vaultRepo.create({ workflowId: "wf-preserve", objectId: "obj-1", path: "/apps/browser/profile.json", mode: "app_snapshot", reason: "safe", integrityStatus: "PRESERVED" });
    await vaultRepo.create({ workflowId: "wf-preserve", objectId: "obj-2", path: "/tmp/exported-credential.csv", mode: "file", reason: "contains credential export", integrityStatus: "PRESERVED" });

    const service = new RebuildService(
      manifestRepo,
      vaultRepo,
      new ReadModelRepo(),
      new WorkflowRepo(),
      new TaskRepo(),
      new QueueRepo()
    );

    const plan = await service.generatePlan(manifest.id, []);
    expect(plan.reconnectSequencing.foundationalFirst[0]).toBe("primary_email");
    expect(plan.blockedItemExclusionList.length).toBe(1);
    expect(plan.caveats[0]).toContain("No universal automation promise");
  });

  it("orchestrates rebuild tasks and keeps excluded items visible", async () => {
    const manifestRepo = new ManifestRepo();
    const manifest = await manifestRepo.create({ workflowId: "wf-preserve", summary: "manifest", validationStatus: "PENDING", itemCount: 2 });
    const vaultRepo = new VaultRepo();
    await vaultRepo.create({ workflowId: "wf-preserve", objectId: "obj-1", path: "/files/doc.txt", mode: "file", reason: "safe", integrityStatus: "PRESERVED" });
    await vaultRepo.create({ workflowId: "wf-preserve", objectId: "obj-2", path: "/files/tmp.txt", mode: "file", reason: "temporary junk", integrityStatus: "PRESERVED" });

    const queueRepo = new QueueRepo();
    const service = new RebuildService(
      manifestRepo,
      vaultRepo,
      new ReadModelRepo(),
      new WorkflowRepo(),
      new TaskRepo(),
      queueRepo
    );

    const started = await service.startRebuild(manifest.id, []);
    expect(started.queueIds.length).toBe(1);
    expect(started.excludedCount).toBe(1);
  });

  it("produces post-restore validation summary with honest unverifiable caveats", async () => {
    const manifestRepo = new ManifestRepo();
    const manifest = await manifestRepo.create({ workflowId: "wf-preserve", summary: "manifest", validationStatus: "PENDING", itemCount: 1 });
    const vaultRepo = new VaultRepo();
    const item = await vaultRepo.create({ workflowId: "wf-preserve", objectId: "obj-1", path: "/files/doc.txt", mode: "file", reason: "safe", integrityStatus: "PRESERVED" });

    const readModelRepo = new ReadModelRepo();
    const service = new RebuildService(
      manifestRepo,
      vaultRepo,
      readModelRepo,
      new WorkflowRepo(),
      new TaskRepo(),
      new QueueRepo()
    );

    await service.generatePlan(manifest.id);
    const summary = await service.validatePostRestore(manifest.id, [], [item.id]);
    expect(summary.notVerifiable).toBe(1);
    expect(summary.notes[0]).toContain("does not claim certainty");

    const model = await readModelRepo.getByTypeAndKey("post_restore_validation", manifest.id);
    expect(model).not.toBeNull();
  });
});
