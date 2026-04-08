import { ApprovalState } from "@dsd/shared";
import type { ApprovalRepository } from "../repositories/interfaces.js";
import type { ApprovalRecord } from "../repositories/types.js";

export interface CreateApprovalInput {
  decisionId?: string;
  type: ApprovalRecord["type"];
  targetKind: ApprovalRecord["targetKind"];
  targetId: string;
  approvedScope: string;
  reason?: string;
}

export class ApprovalService {
  constructor(private readonly approvalRepository: ApprovalRepository) {}

  async createApproval(input: CreateApprovalInput): Promise<ApprovalRecord> {
    return this.approvalRepository.create({
      decisionId: input.decisionId ?? null,
      type: input.type,
      state: ApprovalState.PENDING,
      targetKind: input.targetKind,
      targetId: input.targetId,
      approvedScope: input.approvedScope,
      reason: input.reason ?? null
    });
  }

  async setApprovalState(approvalId: string, state: ApprovalState, reason?: string): Promise<ApprovalRecord> {
    return this.approvalRepository.update(approvalId, {
      state,
      reason
    });
  }
}
