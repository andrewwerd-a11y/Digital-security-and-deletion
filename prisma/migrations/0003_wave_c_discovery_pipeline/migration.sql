-- Wave C: discovery pipeline and raw evidence persistence
CREATE TYPE "FailureCategory" AS ENUM ('VALIDATION','POLICY','EXTERNAL','INTERNAL');
CREATE TYPE "BlockReason" AS ENUM ('POLICY_BLOCK','APPROVAL_REQUIRED','MISSING_EVIDENCE','DEPENDENCY_UNRESOLVED');

ALTER TABLE "Workflow"
  ADD COLUMN "startedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN "completedAt" TIMESTAMP NULL;

ALTER TABLE "Task"
  ADD COLUMN "progressPercent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "failureCategory" "FailureCategory" NULL,
  ADD COLUMN "blockReason" "BlockReason" NULL,
  ADD COLUMN "errorMessage" TEXT NULL,
  ADD COLUMN "startedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN "completedAt" TIMESTAMP NULL;

CREATE TABLE "DiscoveryRun" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflowId" UUID NOT NULL,
  "scope" TEXT NOT NULL,
  "rootPath" TEXT NOT NULL,
  "summary" TEXT,
  "startedAt" TIMESTAMP NOT NULL,
  "completedAt" TIMESTAMP,
  CONSTRAINT "DiscoveryRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DiscoveryRun_workflowId_idx" ON "DiscoveryRun"("workflowId");

CREATE TABLE "DiscoveryFinding" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "discoveryRunId" UUID NOT NULL,
  "locator" TEXT NOT NULL,
  "findingType" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "metadataJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "DiscoveryFinding_discoveryRunId_fkey" FOREIGN KEY ("discoveryRunId") REFERENCES "DiscoveryRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DiscoveryFinding_discoveryRunId_idx" ON "DiscoveryFinding"("discoveryRunId");

CREATE TABLE "EvidencePayloadRef" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "locator" TEXT NOT NULL,
  "checksum" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "EvidenceRecord" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "discoveryRunId" UUID NOT NULL,
  "discoveryFindingId" UUID,
  "objectId" UUID,
  "sourceSystem" TEXT NOT NULL,
  "locator" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "payloadRefId" UUID,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "EvidenceRecord_discoveryRunId_fkey" FOREIGN KEY ("discoveryRunId") REFERENCES "DiscoveryRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EvidenceRecord_discoveryFindingId_fkey" FOREIGN KEY ("discoveryFindingId") REFERENCES "DiscoveryFinding"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "EvidenceRecord_payloadRefId_fkey" FOREIGN KEY ("payloadRefId") REFERENCES "EvidencePayloadRef"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "EvidenceRecord_discoveryRunId_idx" ON "EvidenceRecord"("discoveryRunId");
CREATE INDEX "EvidenceRecord_discoveryFindingId_idx" ON "EvidenceRecord"("discoveryFindingId");
