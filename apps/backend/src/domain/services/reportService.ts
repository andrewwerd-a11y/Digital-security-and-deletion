import { Risk } from "@dsd/shared";
import type {
  ActionRepository,
  AuditRepository,
  ReadModelRepository,
  ReportRepository,
  ResidualRiskRepository,
  VerificationRepository
} from "../repositories/interfaces.js";

export class ReportService {
  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly readModelRepository: ReadModelRepository,
    private readonly verificationRepository: VerificationRepository,
    private readonly actionRepository: ActionRepository,
    private readonly auditRepository: AuditRepository,
    private readonly residualRiskRepository: ResidualRiskRepository
  ) {}

  async createReport(input: { reportType: string; title: string; summary: string; payload: unknown }) {
    const payloadRef = `${input.reportType}:${Date.now()}`;
    const report = await this.reportRepository.create({
      reportType: input.reportType,
      title: input.title,
      summary: input.summary,
      payloadRef
    });

    await this.readModelRepository.upsert({
      modelType: input.reportType,
      modelKey: report.id,
      payload: JSON.stringify(input.payload)
    });

    return report;
  }

  async generateWorkspaceReports() {
    const verifications = await this.verificationRepository.listAll();
    const audits = await this.auditRepository.listAll();
    const residualRisks = await this.residualRiskRepository.listAll();

    const actionIds = Array.from(new Set(verifications.map((v) => v.actionId)));
    const actions = (await Promise.all(actionIds.map((id) => this.actionRepository.getById(id)))).filter(Boolean);

    const models: Record<string, unknown> = {
      discovery_summary_report: { summary: "Discovery records available", auditEvents: audits.length },
      preservation_summary_report: { summary: "Preservation summary generated from authoritative records" },
      action_execution_report: {
        totalActions: actions.length,
        states: actions.reduce<Record<string, number>>((acc, action) => {
          acc[action!.state] = (acc[action!.state] ?? 0) + 1;
          return acc;
        }, {})
      },
      readiness_report: { summary: "Readiness derived from preserved records" },
      rebuild_report: { summary: "Rebuild steps tracked by action and verification truth" },
      verification_report: {
        total: verifications.length,
        notVerifiable: verifications.filter((v) => v.state === "NOT_VERIFIABLE").length
      },
      residual_risk_report: {
        total: residualRisks.length,
        open: residualRisks.filter((r) => r.status === "open").length,
        items: residualRisks
      },
      audit_timeline_report: {
        events: audits.map((event) => ({ eventType: event.eventType, createdAt: (event as any).createdAt ?? null }))
      }
    };

    await Promise.all(Object.entries(models).map(([modelType, payload]) => this.readModelRepository.upsert({
      modelType,
      modelKey: "default",
      payload: JSON.stringify(payload)
    })));

    return models;
  }

  async listReports() {
    return this.reportRepository.listAll();
  }

  async getReport(reportId: string) {
    return this.reportRepository.getById(reportId);
  }

  async createResidualRisk(input: { scopeKey: string; summary: string; detail?: string; severity?: Risk }) {
    return this.residualRiskRepository.create({
      scopeKey: input.scopeKey,
      severity: input.severity ?? Risk.MEDIUM,
      status: "open",
      summary: input.summary,
      detail: input.detail ?? null
    });
  }

  async listResidualRisks(scopeKey?: string) {
    return scopeKey ? this.residualRiskRepository.listByScope(scopeKey) : this.residualRiskRepository.listAll();
  }

  async getAuditTimeline() {
    return this.auditRepository.listAll();
  }
}
