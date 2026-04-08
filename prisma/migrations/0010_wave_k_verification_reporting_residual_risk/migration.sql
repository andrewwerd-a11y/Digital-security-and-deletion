-- Wave K: verification, reporting, and residual-risk visibility

ALTER TABLE "Verification"
  ADD COLUMN "summary" TEXT;

ALTER TABLE "Report"
  DROP COLUMN "location",
  ADD COLUMN "title" TEXT NOT NULL DEFAULT 'report',
  ADD COLUMN "summary" TEXT NOT NULL DEFAULT 'generated report',
  ADD COLUMN "payloadRef" TEXT;

CREATE TABLE "ResidualRiskRecord" (
  "id" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "severity" "Risk" NOT NULL,
  "status" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResidualRiskRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResidualRiskRecord_scopeKey_status_idx" ON "ResidualRiskRecord"("scopeKey", "status");
