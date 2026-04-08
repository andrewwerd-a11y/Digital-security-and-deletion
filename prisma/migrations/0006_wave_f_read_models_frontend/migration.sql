-- Wave F: read-model projection support
ALTER TABLE "ReadModel" ADD COLUMN "modelKey" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "ReadModel" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "ReadModel" ALTER COLUMN "id" TYPE TEXT USING "id"::TEXT;
CREATE INDEX "ReadModel_modelType_modelKey_idx" ON "ReadModel"("modelType", "modelKey");
