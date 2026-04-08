-- Wave B: canonical object registry and relationship graph
CREATE TYPE "OntologyBranch" AS ENUM (
  'DEVICES','ACCOUNTS','APPS','FILES','CLOUD_STORAGE','EMAIL','CONTACTS',
  'PAYMENTS_SUBSCRIPTIONS','SECURITY_ACCESS','BACKUPS_ARCHIVES','UNKNOWN_NEEDS_REVIEW'
);

CREATE TYPE "ObjectTypeV2" AS ENUM (
  'DEVICE','ACCOUNT','APP','FILE','FOLDER','BROWSER_PROFILE','SUBSCRIPTION','CREDENTIAL_REFERENCE',
  'SESSION_OR_TOKEN_REFERENCE','RECOVERY_METHOD','BACKUP_OR_ARCHIVE','PAYMENT_SOURCE','CLOUD_CONTAINER','UNKNOWN_OBJECT'
);

CREATE TYPE "RelationshipTypeV2" AS ENUM (
  'OWNS','CONTAINS','AUTHENTICATES','RECOVERS','BILLS','SYNCS','DEPENDS_ON','DUPLICATES',
  'BACKS_UP','LINKED_TO','INSTALLED_ON','EXPORTED_FROM','IMPORTED_TO','SHARED_WITH','UNKNOWN_RELATION'
);

CREATE TYPE "EvidenceOriginType" AS ENUM ('OBSERVED', 'INFERRED');

ALTER TABLE "CoreObject"
  ADD COLUMN "branch" "OntologyBranch" NOT NULL DEFAULT 'UNKNOWN_NEEDS_REVIEW',
  ADD COLUMN "displayName" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "confidence" "Confidence" NOT NULL DEFAULT 'LOW',
  ADD COLUMN "origin" "EvidenceOriginType" NOT NULL DEFAULT 'OBSERVED',
  ADD COLUMN "provenanceSource" TEXT NOT NULL DEFAULT 'migration',
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE "CoreRelationship"
  ADD COLUMN "origin" "EvidenceOriginType" NOT NULL DEFAULT 'OBSERVED',
  ADD COLUMN "provenanceSource" TEXT NOT NULL DEFAULT 'migration',
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TYPE "ObjectType" RENAME TO "ObjectTypeLegacy";
ALTER TYPE "RelationshipType" RENAME TO "RelationshipTypeLegacy";
ALTER TYPE "ObjectTypeV2" RENAME TO "ObjectType";
ALTER TYPE "RelationshipTypeV2" RENAME TO "RelationshipType";

ALTER TABLE "CoreObject"
  ALTER COLUMN "objectType" TYPE "ObjectType" USING (
    CASE
      WHEN "objectType"::TEXT = 'CLOUD_STORAGE' THEN 'CLOUD_CONTAINER'
      WHEN "objectType"::TEXT = 'PAYMENT_SUBSCRIPTION' THEN 'SUBSCRIPTION'
      WHEN "objectType"::TEXT = 'SECURITY_ACCESS' THEN 'CREDENTIAL_REFERENCE'
      WHEN "objectType"::TEXT = 'BACKUP_ARCHIVE' THEN 'BACKUP_OR_ARCHIVE'
      WHEN "objectType"::TEXT = 'UNKNOWN_REVIEW' THEN 'UNKNOWN_OBJECT'
      ELSE "objectType"::TEXT
    END
  )::"ObjectType";

ALTER TABLE "CoreRelationship"
  ALTER COLUMN "relationshipType" TYPE "RelationshipType" USING (
    CASE
      WHEN "relationshipType"::TEXT = 'USES' THEN 'LINKED_TO'
      WHEN "relationshipType"::TEXT = 'CONNECTED_TO' THEN 'LINKED_TO'
      WHEN "relationshipType"::TEXT = 'STORED_IN' THEN 'CONTAINS'
      WHEN "relationshipType"::TEXT = 'AUTHENTICATES_WITH' THEN 'AUTHENTICATES'
      ELSE "relationshipType"::TEXT
    END
  )::"RelationshipType";

DROP TYPE "ObjectTypeLegacy";
DROP TYPE "RelationshipTypeLegacy";

CREATE INDEX "CoreObject_branch_objectType_idx" ON "CoreObject"("branch", "objectType");
CREATE INDEX "CoreObject_displayName_idx" ON "CoreObject"("displayName");
CREATE INDEX "CoreObject_externalRef_idx" ON "CoreObject"("externalRef");
CREATE INDEX "CoreRelationship_fromObjectId_idx" ON "CoreRelationship"("fromObjectId");
CREATE INDEX "CoreRelationship_toObjectId_idx" ON "CoreRelationship"("toObjectId");
CREATE INDEX "CoreRelationship_relationshipType_idx" ON "CoreRelationship"("relationshipType");

ALTER TABLE "CoreRelationship"
  ADD CONSTRAINT "CoreRelationship_fromObjectId_fkey" FOREIGN KEY ("fromObjectId") REFERENCES "CoreObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CoreRelationship_toObjectId_fkey" FOREIGN KEY ("toObjectId") REFERENCES "CoreObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
