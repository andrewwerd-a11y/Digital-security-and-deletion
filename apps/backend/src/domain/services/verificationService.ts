import { VerificationState } from "@dsd/shared";
import type { VerificationRepository } from "../repositories/interfaces.js";

export interface RecordVerificationInput {
  actionId: string;
  outcome: "verified_complete" | "verified_partial" | "failed" | "not_verifiable";
  reason?: string;
  summary?: string;
}

export class VerificationService {
  constructor(private readonly verificationRepository: VerificationRepository) {}

  async recordOutcome(input: RecordVerificationInput) {
    const state = input.outcome === "verified_complete"
      ? VerificationState.VERIFIED
      : input.outcome === "verified_partial"
        ? VerificationState.PARTIAL
        : input.outcome === "failed"
          ? VerificationState.FAILED
          : VerificationState.NOT_VERIFIABLE;

    return this.verificationRepository.create({
      actionId: input.actionId,
      state,
      reason: input.reason ?? null,
      summary: input.summary ?? null
    });
  }

  async getSummary() {
    const rows = await this.verificationRepository.listAll();
    return {
      total: rows.length,
      verifiedComplete: rows.filter((r) => r.state === VerificationState.VERIFIED).length,
      verifiedPartial: rows.filter((r) => r.state === VerificationState.PARTIAL).length,
      failed: rows.filter((r) => r.state === VerificationState.FAILED).length,
      notVerifiable: rows.filter((r) => r.state === VerificationState.NOT_VERIFIABLE).length,
      honestLimitations: rows
        .filter((r) => r.state === VerificationState.NOT_VERIFIABLE)
        .map((r) => ({ actionId: r.actionId, reason: r.reason ?? "unspecified" }))
    };
  }
}
