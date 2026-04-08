-- Wave E: classification, recommendation, explanation
CREATE TYPE "AnalysisConfidence" AS ENUM ('CONFIRMED','INFERRED','SUSPECTED','UNKNOWN');
CREATE TYPE "AnalysisSensitivity" AS ENUM ('PUBLIC','LOW_SENSITIVITY','PRIVATE','SENSITIVE','CRITICAL');
CREATE TYPE "AnalysisRisk" AS ENUM ('INFORMATIONAL','CLUTTER','PRESERVE_IMPORTANT','PRIVACY_RISK','SECURITY_RISK','CRITICAL_DEPENDENCY');
CREATE TYPE "RecommendationIntent" AS ENUM (
  'KEEP','KEEP_AND_MIGRATE','ARCHIVE','ARCHIVE_BEFORE_REMOVAL','REVIEW','REVOKE_FIRST','DELETE_LATER','REPLACE',
  'DISCONNECT_BEFORE_DELETE','EXCLUDE_FROM_RESTORE','SAFE_TO_REMOVE_LATER','UNKNOWN'
);

ALTER TABLE "Classification"
  ADD COLUMN "sensitivity" "AnalysisSensitivity" NOT NULL DEFAULT 'LOW_SENSITIVITY',
  ADD COLUMN "confidence" "AnalysisConfidence" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "preserveFirstBlocker" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "rationale" TEXT NOT NULL DEFAULT 'pending rationale',
  ADD COLUMN "explanation" TEXT NOT NULL DEFAULT 'pending explanation';

ALTER TABLE "Classification"
  ALTER COLUMN "risk" TYPE "AnalysisRisk" USING (
    CASE
      WHEN "risk"::TEXT = 'CRITICAL' THEN 'CRITICAL_DEPENDENCY'
      WHEN "risk"::TEXT = 'HIGH' THEN 'SECURITY_RISK'
      WHEN "risk"::TEXT = 'MEDIUM' THEN 'PRIVACY_RISK'
      WHEN "risk"::TEXT = 'LOW' THEN 'INFORMATIONAL'
      ELSE 'INFORMATIONAL'
    END
  )::"AnalysisRisk";

CREATE INDEX "Classification_objectId_idx" ON "Classification"("objectId");

ALTER TABLE "Recommendation"
  ADD COLUMN "intent" "RecommendationIntent" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "preserveFirstBlocker" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "rationale" TEXT NOT NULL DEFAULT 'pending rationale',
  ADD COLUMN "explanation" TEXT NOT NULL DEFAULT 'pending explanation';

UPDATE "Recommendation"
SET "intent" = CASE
  WHEN "actionClass"::TEXT = 'PRESERVE' THEN 'ARCHIVE_BEFORE_REMOVAL'
  WHEN "actionClass"::TEXT = 'VERIFY' THEN 'REVIEW'
  WHEN "actionClass"::TEXT = 'EXECUTE' THEN 'DELETE_LATER'
  ELSE 'KEEP'
END;

CREATE INDEX "Recommendation_objectId_idx" ON "Recommendation"("objectId");
