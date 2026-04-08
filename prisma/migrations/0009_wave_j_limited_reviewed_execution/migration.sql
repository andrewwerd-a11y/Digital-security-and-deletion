-- Wave J: limited reviewed execution

ALTER TYPE "VerificationState" ADD VALUE IF NOT EXISTS 'PENDING_VERIFICATION';
ALTER TYPE "VerificationState" ADD VALUE IF NOT EXISTS 'VERIFICATION_NOT_REQUIRED';

ALTER TABLE "Action"
  DROP COLUMN "objectId",
  ADD COLUMN "actionType" TEXT NOT NULL DEFAULT 'queue_mark_completed',
  ADD COLUMN "actionCandidateSummary" TEXT,
  ADD COLUMN "policyDecisionId" TEXT NOT NULL DEFAULT 'policy-missing',
  ADD COLUMN "approvalId" TEXT,
  ADD COLUMN "targetIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "state" "TaskState" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "resultSummary" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "errorMessage" TEXT,
  ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "Verification"
  ADD COLUMN "reason" TEXT;
