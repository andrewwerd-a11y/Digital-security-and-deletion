import { PolicyDecisionOutcome, PreserveState, TaskState, VerificationState } from "@dsd/shared";
import type {
  ActionRepository,
  ApprovalRepository,
  ObjectRepository,
  PolicyDecisionRepository,
  QueueRepository,
  VerificationRepository
} from "../repositories/interfaces.js";

export interface ExecuteActionInput {
  actionCandidateSummary?: string;
  actionType: "queue_mark_completed";
  policyDecisionId: string;
  approvalId?: string;
  explicitTargetList: string[];
  executionConfirmationToken?: string;
}

export class ExecutionService {
  constructor(
    private readonly policyDecisionRepository: PolicyDecisionRepository,
    private readonly approvalRepository: ApprovalRepository,
    private readonly actionRepository: ActionRepository,
    private readonly verificationRepository: VerificationRepository,
    private readonly objectRepository: ObjectRepository,
    private readonly queueRepository: QueueRepository
  ) {}

  async execute(input: ExecuteActionInput) {
    if (input.explicitTargetList.length === 0) {
      throw new Error("explicit target list is required");
    }

    const policyDecision = await this.policyDecisionRepository.getById(input.policyDecisionId);
    if (!policyDecision) {
      throw new Error("policy decision not found");
    }

    if (!policyDecision.targetObjectIds.every((id) => input.explicitTargetList.includes(id))) {
      throw new Error("explicit target list must include all policy decision targets");
    }

    const allowedOutcomes = new Set([
      PolicyDecisionOutcome.ALLOWED,
      PolicyDecisionOutcome.ALLOWED_WITH_REVIEW,
      PolicyDecisionOutcome.ALLOWED_WITH_ADDITIONAL_PREREQUISITES
    ]);

    if (!allowedOutcomes.has(policyDecision.result)) {
      const blockedAction = await this.actionRepository.create({
        actionClass: policyDecision.actionClass,
        actionType: input.actionType,
        actionCandidateSummary: input.actionCandidateSummary ?? null,
        policyDecisionId: input.policyDecisionId,
        approvalId: input.approvalId ?? null,
        targetIds: input.explicitTargetList,
        state: TaskState.BLOCKED,
        resultSummary: `blocked by policy outcome: ${policyDecision.result}`,
        errorMessage: `policy-blocked:${policyDecision.result}`,
        completedAt: new Date()
      });

      await this.verificationRepository.create({
        actionId: blockedAction.id,
        state: VerificationState.VERIFICATION_NOT_REQUIRED,
        reason: "execution blocked"
      });

      return blockedAction;
    }

    if (policyDecision.actionClass === "EXECUTE") {
      if (!input.approvalId) {
        throw new Error("approval id is required for execute action class");
      }
      const approval = await this.approvalRepository.getById(input.approvalId);
      if (!approval || approval.state !== "APPROVED") {
        throw new Error("approved approval record is required");
      }
    }

    const highRisk = policyDecision.result === PolicyDecisionOutcome.ALLOWED_WITH_ADDITIONAL_PREREQUISITES;
    if (highRisk && input.executionConfirmationToken !== "CONFIRM_EXECUTION") {
      throw new Error("execution confirmation token required for high-risk reviewed action");
    }

    for (const objectId of policyDecision.targetObjectIds) {
      const objectRecord = await this.objectRepository.getById(objectId);
      if (!objectRecord || objectRecord.preserveState !== PreserveState.PRESERVED) {
        throw new Error(`preserve-first requirement unsatisfied for object ${objectId}`);
      }
    }

    const actionRecord = await this.actionRepository.create({
      actionClass: policyDecision.actionClass,
      actionType: input.actionType,
      actionCandidateSummary: input.actionCandidateSummary ?? null,
      policyDecisionId: input.policyDecisionId,
      approvalId: input.approvalId ?? null,
      targetIds: input.explicitTargetList,
      state: TaskState.RUNNING,
      resultSummary: "execution started",
      errorMessage: null,
      completedAt: null
    });

    let successCount = 0;
    for (const queueId of input.explicitTargetList) {
      const queue = await this.queueRepository.getById(queueId);
      if (!queue) {
        continue;
      }
      await this.queueRepository.update(queueId, { state: TaskState.COMPLETED, detail: "completed by reviewed execution" });
      successCount += 1;
    }

    const finalState = successCount === input.explicitTargetList.length
      ? TaskState.COMPLETED
      : successCount === 0
        ? TaskState.FAILED
        : TaskState.PARTIAL;

    const finishedAction = await this.actionRepository.update(actionRecord.id, {
      state: finalState,
      resultSummary: `processed ${successCount}/${input.explicitTargetList.length} queue targets`,
      errorMessage: finalState === TaskState.FAILED ? "no target queue entries found" : null,
      completedAt: new Date()
    });

    await this.verificationRepository.create({
      actionId: finishedAction.id,
      state: finalState === TaskState.COMPLETED
        ? VerificationState.PENDING_VERIFICATION
        : VerificationState.VERIFICATION_NOT_REQUIRED,
      reason: finalState === TaskState.COMPLETED ? "awaiting post-action verification" : "execution incomplete"
    });

    return finishedAction;
  }
}
