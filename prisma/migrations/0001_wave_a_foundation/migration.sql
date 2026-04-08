CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Wave A foundation migration (PostgreSQL)
CREATE TYPE "ObjectType" AS ENUM ('DEVICE','ACCOUNT','APP','FILE','CLOUD_STORAGE','EMAIL','CONTACT','PAYMENT_SUBSCRIPTION','SECURITY_ACCESS','BACKUP_ARCHIVE','UNKNOWN_REVIEW');
CREATE TYPE "RelationshipType" AS ENUM ('OWNS','USES','CONNECTED_TO','DEPENDS_ON','STORED_IN','AUTHENTICATES_WITH');
CREATE TYPE "Confidence" AS ENUM ('LOW','MEDIUM','HIGH');
CREATE TYPE "ObjectState" AS ENUM ('DISCOVERED','NORMALIZED','NEEDS_REVIEW','READY','BLOCKED');
CREATE TYPE "ReviewState" AS ENUM ('UNREVIEWED','IN_REVIEW','REVIEWED','REJECTED');
CREATE TYPE "PreserveState" AS ENUM ('NOT_STARTED','IN_PROGRESS','PRESERVED','FAILED');
CREATE TYPE "VerificationState" AS ENUM ('NOT_VERIFIED','IN_PROGRESS','VERIFIED','PARTIAL','FAILED','NOT_VERIFIABLE');
CREATE TYPE "Risk" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE "ActionClass" AS ENUM ('READ','PRESERVE','SIMULATE','EXECUTE','VERIFY');
CREATE TYPE "WorkflowType" AS ENUM ('DISCOVERY','PRESERVATION','READINESS','EXECUTION','REPORTING');
CREATE TYPE "WorkflowState" AS ENUM ('PENDING','RUNNING','BLOCKED','COMPLETED','FAILED','PARTIAL');
CREATE TYPE "TaskType" AS ENUM ('DISCOVER','CLASSIFY','PRESERVE','EVALUATE_POLICY','APPROVE','VERIFY');
CREATE TYPE "TaskState" AS ENUM ('PENDING','RUNNING','BLOCKED','COMPLETED','FAILED','PARTIAL');
CREATE TYPE "PolicyDecisionResult" AS ENUM ('ALLOW','DENY','REQUIRE_APPROVAL');
CREATE TYPE "ApprovalType" AS ENUM ('EXECUTION','POLICY_EXCEPTION');
CREATE TYPE "ApprovalState" AS ENUM ('PENDING','APPROVED','REJECTED','EXPIRED');

CREATE TABLE "CoreObject" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "objectType" "ObjectType" NOT NULL,
  "externalRef" TEXT NOT NULL,
  "objectState" "ObjectState" NOT NULL,
  "reviewState" "ReviewState" NOT NULL,
  "preserveState" "PreserveState" NOT NULL,
  "verificationState" "VerificationState" NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "CoreRelationship" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "fromObjectId" UUID NOT NULL,
  "toObjectId" UUID NOT NULL,
  "relationshipType" "RelationshipType" NOT NULL,
  "confidence" "Confidence" NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "SourceEvidence" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "objectId" UUID NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "path" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "Classification" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "objectId" UUID NOT NULL,
  "risk" "Risk" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "Recommendation" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "objectId" UUID NOT NULL,
  "actionClass" "ActionClass" NOT NULL,
  "summary" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "Workflow" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" "WorkflowType" NOT NULL,
  "state" "WorkflowState" NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "Task" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflowId" UUID NOT NULL,
  "type" "TaskType" NOT NULL,
  "state" "TaskState" NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "QueueItem" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "taskId" UUID NOT NULL,
  "state" "TaskState" NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "PolicyDecision" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "objectId" UUID NOT NULL,
  "result" "PolicyDecisionResult" NOT NULL,
  "rationale" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "Approval" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "decisionId" UUID NOT NULL,
  "type" "ApprovalType" NOT NULL,
  "state" "ApprovalState" NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "VaultRecord" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "objectId" UUID NOT NULL,
  "vaultPath" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "RestoreManifest" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "vaultRecordId" UUID NOT NULL,
  "manifestPath" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "Action" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "objectId" UUID NOT NULL,
  "actionClass" "ActionClass" NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "Verification" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actionId" UUID NOT NULL,
  "verificationState" "VerificationState" NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "AuditEvent" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "eventType" TEXT NOT NULL,
  "payload" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "Report" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reportType" TEXT NOT NULL,
  "location" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "ReadModel" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "modelType" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE "Setting" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
