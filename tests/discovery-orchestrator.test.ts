import { describe, expect, it } from "vitest";
import { TaskState, TaskType, WorkflowState, WorkflowType } from "@dsd/shared";
import { DiscoveryOrchestrator } from "../apps/backend/src/domain/services/discoveryOrchestrator.js";
import type {
  DiscoveryFindingRecord,
  DiscoveryRunRecord,
  EvidenceRecord,
  TaskRecord,
  WorkflowRecord
} from "../apps/backend/src/domain/repositories/types.js";
import type {
  EvidenceRepository,
  TaskRepository,
  WorkflowRepository
} from "../apps/backend/src/domain/repositories/interfaces.js";

class InMemoryWorkflowRepository implements WorkflowRepository {
  private records = new Map<string, WorkflowRecord>();
  async create(record: Omit<WorkflowRecord, "id">): Promise<WorkflowRecord> {
    const created = { ...record, id: `wf-${this.records.size + 1}` };
    this.records.set(created.id, created);
    return created;
  }
  async update(id: string, patch: Partial<Omit<WorkflowRecord, "id">>): Promise<WorkflowRecord> {
    const current = this.records.get(id)!;
    const updated = { ...current, ...patch };
    this.records.set(id, updated);
    return updated;
  }
  async getById(id: string): Promise<WorkflowRecord | null> { return this.records.get(id) ?? null; }
}

class InMemoryTaskRepository implements TaskRepository {
  private records = new Map<string, TaskRecord>();
  async create(record: Omit<TaskRecord, "id">): Promise<TaskRecord> {
    const created = { ...record, id: `task-${this.records.size + 1}` };
    this.records.set(created.id, created);
    return created;
  }
  async update(id: string, patch: Partial<Omit<TaskRecord, "id" | "workflowId" | "type">>): Promise<TaskRecord> {
    const current = this.records.get(id)!;
    const updated = { ...current, ...patch };
    this.records.set(id, updated);
    return updated;
  }
  async listByWorkflow(workflowId: string): Promise<TaskRecord[]> {
    return [...this.records.values()].filter((task) => task.workflowId === workflowId);
  }
}

class InMemoryEvidenceRepository implements EvidenceRepository {
  private evidence = new Map<string, EvidenceRecord>();
  private runs = new Map<string, DiscoveryRunRecord>();
  private findings = new Map<string, DiscoveryFindingRecord>();

  async create(record: Omit<EvidenceRecord, "id" | "createdAt">): Promise<EvidenceRecord> {
    const created: EvidenceRecord = { ...record, id: `evidence-${this.evidence.size + 1}`, createdAt: new Date() };
    this.evidence.set(created.id, created);
    return created;
  }

  async listByDiscoveryRun(discoveryRunId: string): Promise<EvidenceRecord[]> {
    return [...this.evidence.values()].filter((e) => e.discoveryRunId === discoveryRunId);
  }

  async createDiscoveryRun(record: Omit<DiscoveryRunRecord, "id">): Promise<DiscoveryRunRecord> {
    const created = { ...record, id: `run-${this.runs.size + 1}` };
    this.runs.set(created.id, created);
    return created;
  }

  async updateDiscoveryRun(id: string, patch: Partial<Omit<DiscoveryRunRecord, "id" | "workflowId">>): Promise<DiscoveryRunRecord> {
    const current = this.runs.get(id)!;
    const updated = { ...current, ...patch };
    this.runs.set(id, updated);
    return updated;
  }

  async getDiscoveryRunById(id: string): Promise<DiscoveryRunRecord | null> {
    return this.runs.get(id) ?? null;
  }

  async createDiscoveryFinding(record: Omit<DiscoveryFindingRecord, "id" | "createdAt">): Promise<DiscoveryFindingRecord> {
    const created = { ...record, id: `finding-${this.findings.size + 1}`, createdAt: new Date() };
    this.findings.set(created.id, created);
    return created;
  }

  async listDiscoveryFindingsByRun(discoveryRunId: string): Promise<DiscoveryFindingRecord[]> {
    return [...this.findings.values()].filter((f) => f.discoveryRunId === discoveryRunId);
  }
}

describe("DiscoveryOrchestrator", () => {
  it("creates discovery run, findings, evidence, and progress records", async () => {
    const orchestrator = new DiscoveryOrchestrator(
      new InMemoryWorkflowRepository(),
      new InMemoryTaskRepository(),
      new InMemoryEvidenceRepository(),
      { scan: async () => [{ locator: "/tmp/a", findingType: "directory", summary: "ok", metadata: { size: 1 } }] }
    );

    const started = await orchestrator.startLocalDiscovery({ rootPath: "/tmp", scope: "local" });
    expect(started.workflowId).toBeDefined();

    const progress = await orchestrator.getDiscoveryProgress(started.workflowId);
    expect(progress.workflow?.state).toBe(WorkflowState.COMPLETED);
    expect(progress.tasks[0].state).toBe(TaskState.COMPLETED);

    const summary = await orchestrator.getDiscoverySummary(started.discoveryRunId);
    expect(summary.findingCount).toBe(1);
    expect(summary.evidenceCount).toBe(1);
  });

  it("keeps failure visible in task and workflow states", async () => {
    const orchestrator = new DiscoveryOrchestrator(
      new InMemoryWorkflowRepository(),
      new InMemoryTaskRepository(),
      new InMemoryEvidenceRepository(),
      { scan: async () => { throw new Error("scan failed"); } }
    );

    await expect(orchestrator.startLocalDiscovery({ rootPath: "/tmp", scope: "local" })).rejects.toThrow("scan failed");
    const progress = await orchestrator.getDiscoveryProgress("wf-1");
    expect(progress.workflow?.state).toBe(WorkflowState.FAILED);
    expect(progress.tasks[0].state).toBe(TaskState.FAILED);
  });

  it("records expected workflow/task types", async () => {
    const orchestrator = new DiscoveryOrchestrator(
      new InMemoryWorkflowRepository(),
      new InMemoryTaskRepository(),
      new InMemoryEvidenceRepository(),
      { scan: async () => [] }
    );

    await orchestrator.startLocalDiscovery({ rootPath: "/tmp", scope: "local" });
    const progress = await orchestrator.getDiscoveryProgress("wf-1");
    expect(progress.workflow?.type).toBe(WorkflowType.DISCOVERY);
    expect(progress.tasks[0].type).toBe(TaskType.DISCOVER);
  });
});
