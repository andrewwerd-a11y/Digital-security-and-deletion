import { describe, expect, it } from "vitest";
import { ExecutionService } from "../apps/backend/src/domain/services/executionService.js";
import type {
  ActionRecord,
  ApprovalRecord,
  CoreObjectRecord,
  PolicyDecisionRecord,
  QueueRecord,
  VerificationRecord
} from "../apps/backend/src/domain/repositories/types.js";
import type {
  ActionRepository,
  ApprovalRepository,
  ObjectRepository,
  PolicyDecisionRepository,
  QueueRepository,
  VerificationRepository
} from "../apps/backend/src/domain/repositories/interfaces.js";

class ObjectRepo implements ObjectRepository {
  rows = new Map<string, CoreObjectRecord>();
  async create(): Promise<CoreObjectRecord> { throw new Error("unused"); }
  async update(): Promise<CoreObjectRecord> { throw new Error("unused"); }
  async getById(id: string): Promise<CoreObjectRecord | null> { return this.rows.get(id) ?? null; }
  async search(): Promise<CoreObjectRecord[]> { return [...this.rows.values()]; }
}

class QueueRepo implements QueueRepository {
  rows = new Map<string, QueueRecord>();

  async create(record: QueueRecord): Promise<QueueRecord> { this.rows.set(record.id, record); return record; }
  async getById(id: string): Promise<QueueRecord | null> { return this.rows.get(id) ?? null; }
  async update(id: string, patch: Partial<Pick<QueueRecord, "state" | "blockReason" | "detail">>): Promise<QueueRecord> {
    const updated = { ...this.rows.get(id)!, ...patch, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }
}

class PolicyRepo implements PolicyDecisionRepository {
  rows = new Map<string, PolicyDecisionRecord>();
  async create(record: Omit<PolicyDecisionRecord, "id" | "createdAt">): Promise<PolicyDecisionRecord> {
    const created: PolicyDecisionRecord = { id: `policy-${this.rows.size + 1}`, createdAt: new Date(), ...record };
    this.rows.set(created.id, created);
    return created;
  }
  async listByWorkflow(workflowId: string): Promise<PolicyDecisionRecord[]> { return [...this.rows.values()].filter((r) => r.workflowId === workflowId); }
  async getById(id: string): Promise<PolicyDecisionRecord | null> { return this.rows.get(id) ?? null; }
}

class ApprovalRepo implements ApprovalRepository {
  rows = new Map<string, ApprovalRecord>();
  async create(record: Omit<ApprovalRecord, "id" | "createdAt" | "updatedAt">): Promise<ApprovalRecord> {
    const created: ApprovalRecord = { id: `approval-${this.rows.size + 1}`, createdAt: new Date(), updatedAt: new Date(), ...record };
    this.rows.set(created.id, created);
    return created;
  }
  async update(id: string, patch: Partial<Pick<ApprovalRecord, "state" | "approvedScope" | "reason">>): Promise<ApprovalRecord> {
    const updated = { ...this.rows.get(id)!, ...patch, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }
  async listByTarget(targetKind: ApprovalRecord["targetKind"], targetId: string): Promise<ApprovalRecord[]> {
    return [...this.rows.values()].filter((r) => r.targetKind === targetKind && r.targetId === targetId);
  }
  async getById(id: string): Promise<ApprovalRecord | null> { return this.rows.get(id) ?? null; }
}

class ActionRepo implements ActionRepository {
  rows = new Map<string, ActionRecord>();

  async create(record: Omit<ActionRecord, "id" | "createdAt">): Promise<ActionRecord> {
    const created: ActionRecord = { id: `action-${this.rows.size + 1}`, createdAt: new Date(), ...record };
    this.rows.set(created.id, created);
    return created;
  }

  async update(id: string, patch: Partial<Pick<ActionRecord, "state" | "resultSummary" | "errorMessage" | "completedAt">>): Promise<ActionRecord> {
    const updated = { ...this.rows.get(id)!, ...patch };
    this.rows.set(id, updated);
    return updated;
  }

  async getById(id: string): Promise<ActionRecord | null> { return this.rows.get(id) ?? null; }
}

class VerificationRepo implements VerificationRepository {
  rows: VerificationRecord[] = [];
  async create(record: Omit<VerificationRecord, "id" | "createdAt">): Promise<VerificationRecord> {
    const created: VerificationRecord = { id: `verify-${this.rows.length + 1}`, createdAt: new Date(), ...record };
    this.rows.push(created);
    return created;
  }
}

const object = (id: string, preserved = true): CoreObjectRecord => ({
  id,
  branch: "FILES" as any,
  objectType: "FILE" as any,
  externalRef: id,
  displayName: id,
  state: "READY" as any,
  reviewState: "REVIEWED" as any,
  preserveState: preserved ? "PRESERVED" : "NOT_STARTED" as any,
  verificationState: "NOT_VERIFIED" as any,
  confidence: "HIGH" as any,
  origin: "OBSERVED" as any,
  provenanceSource: "test",
  aliases: [],
  createdAt: new Date(),
  updatedAt: new Date()
});

describe("Wave J limited reviewed execution", () => {
  const setup = () => {
    const policyRepo = new PolicyRepo();
    const approvalRepo = new ApprovalRepo();
    const actionRepo = new ActionRepo();
    const verificationRepo = new VerificationRepo();
    const objectRepo = new ObjectRepo();
    const queueRepo = new QueueRepo();

    const service = new ExecutionService(policyRepo, approvalRepo, actionRepo, verificationRepo, objectRepo, queueRepo);
    return { policyRepo, approvalRepo, actionRepo, verificationRepo, objectRepo, queueRepo, service };
  };

  it("executes allowed path and marks verification pending", async () => {
    const { policyRepo, approvalRepo, objectRepo, queueRepo, verificationRepo, service } = setup();
    objectRepo.rows.set("obj-1", object("obj-1", true));

    await queueRepo.create({ id: "q-1", queueType: "execution", taskId: "t-1", state: "PENDING" as any, createdAt: new Date(), updatedAt: new Date() });

    const policy = await policyRepo.create({
      workflowId: "wf-1",
      actionClass: "EXECUTE" as any,
      actionType: "queue_mark_completed",
      targetObjectIds: ["obj-1"],
      scopeSummary: "queue completion",
      trustProfile: "BALANCED" as any,
      result: "allowed" as any,
      rationale: "approved"
    });

    const approval = await approvalRepo.create({
      decisionId: policy.id,
      type: "EXECUTION" as any,
      state: "APPROVED" as any,
      targetKind: "workflow",
      targetId: "wf-1",
      approvedScope: "queue completion"
    });

    const result = await service.execute({
      actionType: "queue_mark_completed",
      policyDecisionId: policy.id,
      approvalId: approval.id,
      explicitTargetList: ["q-1"],
      actionCandidateSummary: "queue completion candidate"
    });

    expect(result.state).toBe("COMPLETED");
    expect(verificationRepo.rows[0].state).toBe("PENDING_VERIFICATION");
  });

  it("blocks execution when policy outcome is blocked", async () => {
    const { policyRepo, objectRepo, verificationRepo, service } = setup();
    objectRepo.rows.set("obj-1", object("obj-1", true));

    const policy = await policyRepo.create({
      workflowId: "wf-2",
      actionClass: "EXECUTE" as any,
      actionType: "queue_mark_completed",
      targetObjectIds: ["obj-1"],
      scopeSummary: "queue completion",
      trustProfile: "BALANCED" as any,
      result: "blocked_pending_approval" as any,
      rationale: "approval missing"
    });

    const result = await service.execute({
      actionType: "queue_mark_completed",
      policyDecisionId: policy.id,
      explicitTargetList: ["q-missing"]
    });

    expect(result.state).toBe("BLOCKED");
    expect(verificationRepo.rows[0].state).toBe("VERIFICATION_NOT_REQUIRED");
  });

  it("fails when approval is missing for EXECUTE class", async () => {
    const { policyRepo, objectRepo, service } = setup();
    objectRepo.rows.set("obj-1", object("obj-1", true));

    const policy = await policyRepo.create({
      workflowId: "wf-3",
      actionClass: "EXECUTE" as any,
      actionType: "queue_mark_completed",
      targetObjectIds: ["obj-1"],
      scopeSummary: "queue completion",
      trustProfile: "BALANCED" as any,
      result: "allowed" as any,
      rationale: "ok"
    });

    await expect(service.execute({
      actionType: "queue_mark_completed",
      policyDecisionId: policy.id,
      explicitTargetList: ["q-1"]
    })).rejects.toThrow(/approval id is required/i);
  });

  it("fails when preserve-first is unsatisfied", async () => {
    const { policyRepo, approvalRepo, objectRepo, service } = setup();
    objectRepo.rows.set("obj-1", object("obj-1", false));

    const policy = await policyRepo.create({
      workflowId: "wf-4",
      actionClass: "EXECUTE" as any,
      actionType: "queue_mark_completed",
      targetObjectIds: ["obj-1"],
      scopeSummary: "queue completion",
      trustProfile: "BALANCED" as any,
      result: "allowed" as any,
      rationale: "ok"
    });

    const approval = await approvalRepo.create({
      decisionId: policy.id,
      type: "EXECUTION" as any,
      state: "APPROVED" as any,
      targetKind: "workflow",
      targetId: "wf-4",
      approvedScope: "queue completion"
    });

    await expect(service.execute({
      actionType: "queue_mark_completed",
      policyDecisionId: policy.id,
      approvalId: approval.id,
      explicitTargetList: ["q-1"]
    })).rejects.toThrow(/preserve-first requirement unsatisfied/i);
  });

  it("persists partial/failure outcomes", async () => {
    const { policyRepo, approvalRepo, objectRepo, queueRepo, verificationRepo, service } = setup();
    objectRepo.rows.set("obj-1", object("obj-1", true));

    await queueRepo.create({ id: "q-1", queueType: "execution", taskId: "t-1", state: "PENDING" as any, createdAt: new Date(), updatedAt: new Date() });

    const policy = await policyRepo.create({
      workflowId: "wf-5",
      actionClass: "EXECUTE" as any,
      actionType: "queue_mark_completed",
      targetObjectIds: ["obj-1"],
      scopeSummary: "queue completion",
      trustProfile: "BALANCED" as any,
      result: "allowed" as any,
      rationale: "ok"
    });

    const approval = await approvalRepo.create({
      decisionId: policy.id,
      type: "EXECUTION" as any,
      state: "APPROVED" as any,
      targetKind: "workflow",
      targetId: "wf-5",
      approvedScope: "queue completion"
    });

    const partial = await service.execute({
      actionType: "queue_mark_completed",
      policyDecisionId: policy.id,
      approvalId: approval.id,
      explicitTargetList: ["q-1", "q-2"]
    });

    expect(partial.state).toBe("PARTIAL");
    expect(verificationRepo.rows.at(-1)?.state).toBe("VERIFICATION_NOT_REQUIRED");

    const failed = await service.execute({
      actionType: "queue_mark_completed",
      policyDecisionId: policy.id,
      approvalId: approval.id,
      explicitTargetList: ["q-unknown"]
    });

    expect(failed.state).toBe("FAILED");
  });
});
