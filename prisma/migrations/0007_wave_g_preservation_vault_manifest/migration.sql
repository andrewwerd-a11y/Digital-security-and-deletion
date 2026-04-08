-- Wave G: preservation vault and restore manifest foundation
ALTER TABLE "VaultRecord"
  ADD COLUMN "workflowId" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'snapshot',
  ADD COLUMN "reason" TEXT NOT NULL DEFAULT 'preserve-first',
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "integrityStatus" TEXT NOT NULL DEFAULT 'PRESERVED',
  ADD COLUMN "checksum" TEXT;
CREATE INDEX "VaultRecord_workflowId_idx" ON "VaultRecord"("workflowId");
CREATE INDEX "VaultRecord_objectId_idx" ON "VaultRecord"("objectId");

ALTER TABLE "RestoreManifest" DROP COLUMN "vaultRecordId", DROP COLUMN "manifestPath";
ALTER TABLE "RestoreManifest"
  ADD COLUMN "workflowId" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN "summary" TEXT NOT NULL DEFAULT 'restore manifest',
  ADD COLUMN "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "itemCount" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "RestoreManifest_workflowId_idx" ON "RestoreManifest"("workflowId");
