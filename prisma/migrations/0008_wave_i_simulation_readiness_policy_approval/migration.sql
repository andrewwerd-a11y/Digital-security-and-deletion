-- Wave I: simulation, readiness, policy evaluation, and approval capture

CREATE TYPE "PolicyDecisionOutcome" AS ENUM (
  'allowed',
  'allowed_with_review',
  'allowed_with_additional_prerequisites',
  'blocked_pending_preservation',
  'blocked_pending_dependency_resolution',
  'blocked_pending_approval',
  'blocked_by_policy',
  'forbidden'
);

CREATE TYPE "ReadinessResult" AS ENUM ('ready', 'ready_with_warnings', 'blocked');

ALTER TABLE "QueueItem"
  ADD COLUMN "queueType" TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN "blockReason" "BlockReason",
  ADD COLUMN "detail" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PolicyDecision"
  DROP COLUMN "objectId",
  DROP COLUMN "result",
  ALTER COLUMN "rationale" SET NOT NULL,
  ADD COLUMN "workflowId" TEXT,
  ADD COLUMN "actionClass" "ActionClass" NOT NULL DEFAULT 'SIMULATE',
  ADD COLUMN "actionType" TEXT NOT NULL DEFAULT 'preview',
  ADD COLUMN "targetObjectIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "scopeSummary" TEXT NOT NULL DEFAULT 'scope-not-provided',
  ADD COLUMN "trustProfile" TEXT NOT NULL DEFAULT 'BALANCED',
  ADD COLUMN "resultV2" "PolicyDecisionOutcome" NOT NULL DEFAULT 'blocked_by_policy';

ALTER TABLE "Approval"
  ALTER COLUMN "decisionId" DROP NOT NULL,
  ADD COLUMN "targetKind" TEXT NOT NULL DEFAULT 'workflow',
  ADD COLUMN "targetId" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "approvedScope" TEXT NOT NULL DEFAULT 'unspecified',
  ADD COLUMN "reason" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "SimulationRecord" (
  "id" TEXT NOT NULL,
  "actionCandidateType" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "targetObjectIds" TEXT[] NOT NULL,
  "requestedScope" TEXT NOT NULL,
  "trustProfile" TEXT NOT NULL,
  "notes" TEXT,
  "consequenceSummary" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SimulationRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReadinessRecord" (
  "id" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "workflowId" TEXT,
  "result" "ReadinessResult" NOT NULL,
  "blockerCount" INTEGER NOT NULL,
  "warningCount" INTEGER NOT NULL,
  "blockersJson" TEXT NOT NULL,
  "warningsJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReadinessRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PolicyDecision_workflowId_idx" ON "PolicyDecision"("workflowId");
CREATE INDEX "Approval_targetKind_targetId_idx" ON "Approval"("targetKind", "targetId");
CREATE INDEX "ReadinessRecord_scopeKey_createdAt_idx" ON "ReadinessRecord"("scopeKey", "createdAt");

UPDATE "PolicyDecision" SET "resultV2" =
  CASE
    WHEN "rationale" ILIKE '%approval%' THEN 'blocked_pending_approval'::"PolicyDecisionOutcome"
    WHEN "rationale" ILIKE '%preserv%' THEN 'blocked_pending_preservation'::"PolicyDecisionOutcome"
    WHEN "rationale" ILIKE '%deny%' THEN 'forbidden'::"PolicyDecisionOutcome"
    ELSE 'allowed_with_review'::"PolicyDecisionOutcome"
  END;

ALTER TABLE "PolicyDecision" DROP COLUMN "result";
ALTER TABLE "PolicyDecision" RENAME COLUMN "resultV2" TO "result";
