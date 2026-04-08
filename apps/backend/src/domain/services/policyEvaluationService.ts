import {
  BlockReason,
  PolicyDecisionOutcome,
  PreserveState,
  RelationshipType,
  TrustProfile,
  type ActionClass
} from "@dsd/shared";
import type {
  ApprovalRepository,
  ObjectRepository,
  PolicyDecisionRepository,
  RelationshipRepository
} from "../repositories/interfaces.js";
import type { PolicyDecisionRecord } from "../repositories/types.js";

export interface EvaluatePolicyInput {
  actionClass: ActionClass;
  actionType: string;
  targetObjectIds: string[];
  scopeSummary: string;
  workflowId?: string;
  trustProfile: TrustProfile;
}

export class PolicyEvaluationService {
  constructor(
    private readonly objectRepository: ObjectRepository,
    private readonly relationshipRepository: RelationshipRepository,
    private readonly approvalRepository: ApprovalRepository,
    private readonly policyDecisionRepository: PolicyDecisionRepository
  ) {}

  async evaluate(input: EvaluatePolicyInput): Promise<PolicyDecisionRecord> {
    const blockers: BlockReason[] = [];
    let hasReviewRequired = false;

    for (const objectId of input.targetObjectIds) {
      const record = await this.objectRepository.getById(objectId);
      if (!record) {
        return this.persistDecision(input, PolicyDecisionOutcome.FORBIDDEN, `target object not found: ${objectId}`);
      }

      if (record.preserveState !== PreserveState.PRESERVED) {
        blockers.push(BlockReason.MISSING_EVIDENCE);
      }

      if (record.reviewState !== "REVIEWED") {
        hasReviewRequired = true;
      }

      const dependencies = await this.relationshipRepository.listDependents(objectId, {
        relationshipType: RelationshipType.DEPENDS_ON,
        depth: 1
      });
      if (dependencies.length > 0) {
        blockers.push(BlockReason.DEPENDENCY_UNRESOLVED);
      }
    }

    if (blockers.includes(BlockReason.MISSING_EVIDENCE)) {
      return this.persistDecision(input, PolicyDecisionOutcome.BLOCKED_PENDING_PRESERVATION, "preserve-first gating active");
    }

    if (blockers.includes(BlockReason.DEPENDENCY_UNRESOLVED)) {
      return this.persistDecision(input, PolicyDecisionOutcome.BLOCKED_PENDING_DEPENDENCY_RESOLUTION, "dependency resolution required");
    }

    const workflowApprovals = input.workflowId
      ? await this.approvalRepository.listByTarget("workflow", input.workflowId)
      : [];
    const hasActiveApproval = workflowApprovals.some((row) => row.state === "APPROVED");

    if (!hasActiveApproval && input.actionClass === "EXECUTE") {
      return this.persistDecision(input, PolicyDecisionOutcome.BLOCKED_PENDING_APPROVAL, "approval required before execution");
    }

    if (input.trustProfile === TrustProfile.STRICT && input.actionClass === "EXECUTE") {
      return this.persistDecision(input, PolicyDecisionOutcome.ALLOWED_WITH_ADDITIONAL_PREREQUISITES, "strict trust requires additional prerequisites");
    }

    if (hasReviewRequired) {
      return this.persistDecision(input, PolicyDecisionOutcome.ALLOWED_WITH_REVIEW, "review required before unsafe advancement");
    }

    return this.persistDecision(input, PolicyDecisionOutcome.ALLOWED, "policy checks passed");
  }

  private async persistDecision(
    input: EvaluatePolicyInput,
    outcome: PolicyDecisionOutcome,
    rationale: string
  ): Promise<PolicyDecisionRecord> {
    return this.policyDecisionRepository.create({
      workflowId: input.workflowId ?? null,
      actionClass: input.actionClass,
      actionType: input.actionType,
      targetObjectIds: input.targetObjectIds,
      scopeSummary: input.scopeSummary,
      trustProfile: input.trustProfile,
      result: outcome,
      rationale
    });
  }
}
