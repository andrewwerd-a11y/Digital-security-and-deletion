import { describe, expect, it } from "vitest";
import { ReportService } from "../apps/backend/src/domain/services/reportService.js";
import { VerificationService } from "../apps/backend/src/domain/services/verificationService.js";
import type {
  ActionRecord,
  AuditRecord,
  ReadModelRecord,
  ReportRecord,
  ResidualRiskRecord,
  VerificationRecord
} from "../apps/backend/src/domain/repositories/types.js";
import type {
  ActionRepository,
  AuditRepository,
  ReadModelRepository,
  ReportRepository,
  ResidualRiskRepository,
  VerificationRepository
} from "../apps/backend/src/domain/repositories/interfaces.js";

class VerificationRepo implements VerificationRepository {
  rows: VerificationRecord[] = [];
  async create(record: Omit<VerificationRecord, "id" | "createdAt">): Promise<VerificationRecord> {
    const created: VerificationRecord = { id: `verify-${this.rows.length + 1}`, createdAt: new Date(), ...record };
    this.rows.push(created);
    return created;
  }
  async listByAction(actionId: string): Promise<VerificationRecord[]> { return this.rows.filter((r) => r.actionId === actionId); }
  async listAll(): Promise<VerificationRecord[]> { return this.rows; }
}

class ReportRepo implements ReportRepository {
  rows: ReportRecord[] = [];
  async create(record: Omit<ReportRecord, "id" | "createdAt">): Promise<ReportRecord> {
    const created: ReportRecord = { id: `report-${this.rows.length + 1}`, createdAt: new Date(), ...record };
    this.rows.push(created);
    return created;
  }
  async listAll(): Promise<ReportRecord[]> { return this.rows; }
  async getById(id: string): Promise<ReportRecord | null> { return this.rows.find((r) => r.id === id) ?? null; }
  async listByType(reportType: string): Promise<ReportRecord[]> { return this.rows.filter((r) => r.reportType === reportType); }
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

class ActionRepo implements ActionRepository {
  rows = new Map<string, ActionRecord>();
  async create(): Promise<ActionRecord> { throw new Error("unused"); }
  async update(): Promise<ActionRecord> { throw new Error("unused"); }
  async getById(id: string): Promise<ActionRecord | null> { return this.rows.get(id) ?? null; }
}

class AuditRepo implements AuditRepository {
  rows: AuditRecord[] = [];
  async create(record: AuditRecord): Promise<AuditRecord> { this.rows.push(record); return record; }
  async listAll(): Promise<AuditRecord[]> { return this.rows; }
}

class ResidualRiskRepo implements ResidualRiskRepository {
  rows: ResidualRiskRecord[] = [];
  async create(record: Omit<ResidualRiskRecord, "id" | "createdAt">): Promise<ResidualRiskRecord> {
    const created: ResidualRiskRecord = { id: `risk-${this.rows.length + 1}`, createdAt: new Date(), ...record };
    this.rows.push(created);
    return created;
  }
  async listByScope(scopeKey: string): Promise<ResidualRiskRecord[]> { return this.rows.filter((r) => r.scopeKey === scopeKey); }
  async listAll(): Promise<ResidualRiskRecord[]> { return this.rows; }
}

describe("Wave K verification and reporting", () => {
  it("creates verification summary with honest not-verifiable visibility", async () => {
    const repo = new VerificationRepo();
    const service = new VerificationService(repo);

    await service.recordOutcome({ actionId: "a1", outcome: "verified_complete", summary: "ok" });
    await service.recordOutcome({ actionId: "a2", outcome: "not_verifiable", reason: "external system unavailable" });

    const summary = await service.getSummary();
    expect(summary.verifiedComplete).toBe(1);
    expect(summary.notVerifiable).toBe(1);
    expect(summary.honestLimitations[0].reason).toContain("external system");
  });

  it("creates and retrieves durable reports", async () => {
    const service = new ReportService(
      new ReportRepo(),
      new ReadModelRepo(),
      new VerificationRepo(),
      new ActionRepo(),
      new AuditRepo(),
      new ResidualRiskRepo()
    );

    const report = await service.createReport({
      reportType: "verification_report",
      title: "Verification Summary",
      summary: "Summary of verification outcomes",
      payload: { total: 1 }
    });

    const listed = await service.listReports();
    const fetched = await service.getReport(report.id);
    expect(listed).toHaveLength(1);
    expect(fetched?.id).toBe(report.id);
  });

  it("handles residual-risk records and generates report workspace models", async () => {
    const verificationRepo = new VerificationRepo();
    const actionRepo = new ActionRepo();
    const auditRepo = new AuditRepo();
    const residualRiskRepo = new ResidualRiskRepo();
    const readModelRepo = new ReadModelRepo();

    actionRepo.rows.set("a1", {
      id: "a1",
      actionClass: "EXECUTE" as any,
      actionType: "queue_mark_completed",
      policyDecisionId: "p1",
      targetIds: ["q1"],
      state: "PARTIAL" as any,
      resultSummary: "partial",
      createdAt: new Date()
    });
    await verificationRepo.create({ actionId: "a1", state: "NOT_VERIFIABLE" as any, reason: "evidence missing" });
    await auditRepo.create({ id: "audit-1", eventType: "ACTION_EXECUTED" });

    const service = new ReportService(
      new ReportRepo(),
      readModelRepo,
      verificationRepo,
      actionRepo,
      auditRepo,
      residualRiskRepo
    );

    const risk = await service.createResidualRisk({ scopeKey: "wf-1", summary: "Token could not be revoked" });
    const risks = await service.listResidualRisks("wf-1");
    expect(risk.status).toBe("open");
    expect(risks).toHaveLength(1);

    const workspace = await service.generateWorkspaceReports();
    expect(Object.keys(workspace)).toEqual(expect.arrayContaining([
      "discovery_summary_report",
      "preservation_summary_report",
      "action_execution_report",
      "readiness_report",
      "rebuild_report",
      "verification_report",
      "residual_risk_report",
      "audit_timeline_report"
    ]));

    const residualModel = await readModelRepo.getByTypeAndKey("residual_risk_report", "default");
    expect(residualModel).not.toBeNull();
  });
});
