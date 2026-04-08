-- Wave D: normalization pipeline persistence
CREATE TABLE "NormalizationRun" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "discoveryRunId" UUID NOT NULL,
  "workflowId" UUID NOT NULL,
  "summary" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "NormalizationRun_discoveryRunId_fkey" FOREIGN KEY ("discoveryRunId") REFERENCES "DiscoveryRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "NormalizationRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "NormalizationRun_discoveryRunId_idx" ON "NormalizationRun"("discoveryRunId");
CREATE INDEX "NormalizationRun_workflowId_idx" ON "NormalizationRun"("workflowId");

CREATE TABLE "UnresolvedCandidate" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "normalizationRunId" UUID NOT NULL,
  "discoveryFindingId" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "locator" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "UnresolvedCandidate_normalizationRunId_fkey" FOREIGN KEY ("normalizationRunId") REFERENCES "NormalizationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UnresolvedCandidate_discoveryFindingId_fkey" FOREIGN KEY ("discoveryFindingId") REFERENCES "DiscoveryFinding"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "UnresolvedCandidate_normalizationRunId_idx" ON "UnresolvedCandidate"("normalizationRunId");

CREATE TABLE "DuplicateCandidate" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "normalizationRunId" UUID NOT NULL,
  "objectAId" UUID NOT NULL,
  "objectBId" UUID NOT NULL,
  "rationale" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "DuplicateCandidate_normalizationRunId_fkey" FOREIGN KEY ("normalizationRunId") REFERENCES "NormalizationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DuplicateCandidate_objectAId_fkey" FOREIGN KEY ("objectAId") REFERENCES "CoreObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DuplicateCandidate_objectBId_fkey" FOREIGN KEY ("objectBId") REFERENCES "CoreObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DuplicateCandidate_normalizationRunId_idx" ON "DuplicateCandidate"("normalizationRunId");
