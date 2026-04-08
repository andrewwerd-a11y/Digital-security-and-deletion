import { describe, expect, it } from "vitest";
import {
  ApprovalService,
  PolicyEvaluationService,
  ReadinessService,
  SimulationService
} from "../apps/backend/src/domain/services/index.js";
import type {
  ApprovalRecord,
  CoreObjectRecord,
  PolicyDecisionRecord,
  ReadinessRecord,
  RelationshipRecord,
  SimulationRecord,
  VaultRecord
} from "../apps/backend/src/domain/repositories/types.js";
import type {
  ApprovalRepository,
  ObjectRepository,
  PolicyDecisionRepository,
  ReadinessRepository,
  RelationshipRepository,
  SimulationRepository,
  VaultRepository
} from "../apps/backend/src/domain/repositories/interfaces.js";
import { ApprovalState } from "@dsd/shared";

class InMemorySimulationRepository implements SimulationRepository {
  private rows = new Map<string, SimulationRecord>();

  async create(record: Omit<SimulationRecord, "id" | "createdAt">): Promise<SimulationRecord> {
    const created: SimulationRecord = { id: `sim-${this.rows.size + 1}`, createdAt: new Date(), ...record };
    this.rows.set(created.id, created);
    return created;
  }

  async getById(id: string): Promise<SimulationRecord | null> {
    return this.rows.get(id) ?? null;
  }
}

class InMemoryReadinessRepository implements ReadinessRepository {
  rows: ReadinessRecord[] = [];

  async create(record: Omit<ReadinessRecord, "id" | "createdAt">): Promise<ReadinessRecord> {
    const created: ReadinessRecord = { id: `readiness-${this.rows.length + 1}`, createdAt: new Date(), ...record };
    this.rows.push(created);
    return created;
  }

  async getLatestByScope(scopeKey: string): Promise<ReadinessRecord | null> {
    return this.rows.filter((row) => row.scopeKey === scopeKey).slice(-1)[0] ?? null;
  }
}

class InMemoryObjectRepository implements ObjectRepository {
  rows = new Map<string, CoreObjectRecord>();

  async create(): Promise<CoreObjectRecord> { throw new Error("unused"); }
  async update(): Promise<CoreObjectRecord> { throw new Error("unused"); }
  async getById(id: string): Promise<CoreObjectRecord | null> { return this.rows.get(id) ?? null; }
  async search(): Promise<CoreObjectRecord[]> { return [...this.rows.values()]; }
}

class InMemoryRelationshipRepository implements RelationshipRepository {
  rows: RelationshipRecord[] = [];

  async create(): Promise<RelationshipRecord> { throw new Error("unused"); }
  async update(): Promise<RelationshipRecord> { throw new Error("unused"); }
  async getById(): Promise<RelationshipRecord | null> { throw new Error("unused"); }
  async listForObject(objectId: string): Promise<RelationshipRecord[]> {
    return this.rows.filter((row) => row.fromObjectId === objectId || row.toObjectId === objectId);
  }
  async listDependents(objectId: string): Promise<RelationshipRecord[]> {
    return this.rows.filter((row) => row.fromObjectId === objectId && row.relationshipType === "DEPENDS_ON");
  }
  async listDuplicates(): Promise<RelationshipRecord[]> { return []; }
}

class InMemoryVaultRepository implements VaultRepository {
  rows: VaultRecord[] = [];

  async create(record: Omit<VaultRecord, "id" | "createdAt">): Promise<VaultRecord> {
    const created: VaultRecord = { id: `vault-${this.rows.length + 1}`, createdAt: new Date(), ...record };
    this.rows.push(created);
    return created;
  }
  async listAll(): Promise<VaultRecord[]> { return this.rows; }
  async listByWorkflow(workflowId: string): Promise<VaultRecord[]> { return this.rows.filter((row) => row.workflowId === workflowId); }
  async updateIntegrity(): Promise<VaultRecord> { throw new Error("unused"); }
}

class InMemoryPolicyDecisionRepository implements PolicyDecisionRepository {
  rows: PolicyDecisionRecord[] = [];

  async create(record: Omit<PolicyDecisionRecord, "id" | "createdAt">): Promise<PolicyDecisionRecord> {
    const created: PolicyDecisionRecord = { id: `decision-${this.rows.length + 1}`, createdAt: new Date(), ...record };
    this.rows.push(created);
    return created;
  }

  async listByWorkflow(workflowId: string): Promise<PolicyDecisionRecord[]> {
    return this.rows.filter((row) => row.workflowId === workflowId);
  }
}

class InMemoryApprovalRepository implements ApprovalRepository {
  rows: ApprovalRecord[] = [];

  async create(record: Omit<ApprovalRecord, "id" | "createdAt" | "updatedAt">): Promise<ApprovalRecord> {
    const created: ApprovalRecord = {
      id: `approval-${this.rows.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...record
    };
    this.rows.push(created);
    return created;
  }

  async update(id: string, patch: Partial<Pick<ApprovalRecord, "state" | "approvedScope" | "reason">>): Promise<ApprovalRecord> {
    const index = this.rows.findIndex((row) => row.id === id);
    const updated = { ...this.rows[index], ...patch, updatedAt: new Date() };
    this.rows[index] = updated;
    return updated;
  }

  async listByTarget(targetKind: ApprovalRecord["targetKind"], targetId: string): Promise<ApprovalRecord[]> {
    return this.rows.filter((row) => row.targetKind === targetKind && row.targetId === targetId);
  }
}

const baseObject = (id: string): CoreObjectRecord => ({
  id,
  branch: "FILES" as any,
  objectType: "FILE" as any,
  externalRef: `/tmp/${id}`,
  displayName: id,
  state: "READY" as any,
  reviewState: "REVIEWED" as any,
  preserveState: "PRESERVED" as any,
  verificationState: "NOT_VERIFIED" as any,
  confidence: "HIGH" as any,
  origin: "OBSERVED" as any,
  provenanceSource: "test",
  aliases: [],
  createdAt: new Date(),
  updatedAt: new Date()
});

describe("Wave I governance services", () => {
  it("creates and retrieves a simulation record", async () => {
    const simulationService = new SimulationService(new InMemorySimulationRepository());

    const created = await simulationService.createSimulation({
      actionCandidateType: "delete-candidate",
      actionType: "preview-delete",
      targetObjectIds: ["o1", "o2"],
      requestedScope: "workflow:wf-1",
      trustProfile: "BALANCED",
      notes: "dry-run"
    });

    const loaded = await simulationService.getSimulation(created.id);
    expect(loaded?.id).toBe(created.id);
    expect(loaded?.consequenceSummary).toContain("targets=2");
  });

  it("evaluates readiness and persists blocked/ready_with_warnings states", async () => {
    const objects = new InMemoryObjectRepository();
    const relationships = new InMemoryRelationshipRepository();
    const vault = new InMemoryVaultRepository();
    const readinessRepo = new InMemoryReadinessRepository();

    const blocked = baseObject("blocked");
    blocked.preserveState = "NOT_STARTED" as any;
    blocked.reviewState = "UNREVIEWED" as any;
    objects.rows.set("blocked", blocked);

    const dep = baseObject("dependency");
    dep.state = "BLOCKED" as any;
    objects.rows.set("dependency", dep);

    relationships.rows.push({
      id: "rel-1",
      fromObjectId: "blocked",
      toObjectId: "dependency",
      relationshipType: "DEPENDS_ON" as any,
      confidence: "HIGH" as any,
      origin: "OBSERVED" as any,
      provenanceSource: "test",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const service = new ReadinessService(objects, relationships, vault, readinessRepo);
    const blockedResult = await service.evaluate({ scopeKey: "wf-1", workflowId: "wf-1", targetObjectIds: ["blocked"] });
    expect(blockedResult.result).toBe("blocked");
    expect(blockedResult.blockerCount).toBeGreaterThan(0);

    const warned = baseObject("warned");
    warned.reviewState = "UNREVIEWED" as any;
    objects.rows.set("warned", warned);
    await vault.create({
      workflowId: "wf-preserve",
      objectId: "warned",
      path: "/vault/warned.json",
      mode: "snapshot",
      reason: "test",
      integrityStatus: "PRESERVED"
    });

    const warningResult = await service.evaluate({ scopeKey: "scope-2", targetObjectIds: ["warned"] });
    expect(warningResult.result).toBe("ready_with_warnings");
    expect(warningResult.warningCount).toBeGreaterThan(0);
  });

  it("generates durable policy decisions for preserve-first and approval gating", async () => {
    const objects = new InMemoryObjectRepository();
    const relationships = new InMemoryRelationshipRepository();
    const approvals = new InMemoryApprovalRepository();
    const decisions = new InMemoryPolicyDecisionRepository();

    const obj = baseObject("object-1");
    obj.preserveState = "NOT_STARTED" as any;
    objects.rows.set(obj.id, obj);

    const policy = new PolicyEvaluationService(objects, relationships, approvals, decisions);

    const preserveBlocked = await policy.evaluate({
      actionClass: "EXECUTE",
      actionType: "delete",
      targetObjectIds: [obj.id],
      scopeSummary: "single-object-delete",
      workflowId: "wf-policy",
      trustProfile: "BALANCED"
    });
    expect(preserveBlocked.result).toBe("blocked_pending_preservation");

    obj.preserveState = "PRESERVED" as any;
    relationships.rows.push({
      id: "dep-2",
      fromObjectId: obj.id,
      toObjectId: "dep-x",
      relationshipType: "DEPENDS_ON" as any,
      confidence: "HIGH" as any,
      origin: "OBSERVED" as any,
      provenanceSource: "test",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const dependencyBlocked = await policy.evaluate({
      actionClass: "EXECUTE",
      actionType: "delete",
      targetObjectIds: [obj.id],
      scopeSummary: "single-object-delete",
      workflowId: "wf-policy",
      trustProfile: "BALANCED"
    });
    expect(dependencyBlocked.result).toBe("blocked_pending_dependency_resolution");

    relationships.rows = [];

    const approvalBlocked = await policy.evaluate({
      actionClass: "EXECUTE",
      actionType: "delete",
      targetObjectIds: [obj.id],
      scopeSummary: "single-object-delete",
      workflowId: "wf-policy",
      trustProfile: "BALANCED"
    });
    expect(approvalBlocked.result).toBe("blocked_pending_approval");
  });

  it("creates and updates approvals with workflow/action linkage", async () => {
    const approvals = new InMemoryApprovalRepository();
    const service = new ApprovalService(approvals);

    const created = await service.createApproval({
      decisionId: "decision-1",
      type: "EXECUTION",
      targetKind: "workflow",
      targetId: "wf-approve",
      approvedScope: "delete:limited"
    });
    expect(created.state).toBe("PENDING");

    const approved = await service.setApprovalState(created.id, ApprovalState.APPROVED, "approved by reviewer");
    expect(approved.state).toBe("APPROVED");
    expect(approved.reason).toBe("approved by reviewer");
  });
});
