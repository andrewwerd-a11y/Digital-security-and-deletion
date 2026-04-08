import {
  PrismaActionRepository,
  PrismaApprovalRepository,
  PrismaAuditRepository,
  PrismaClassificationRepository,
  PrismaDiscoveryFindingRepository,
  PrismaDiscoveryRunRepository,
  PrismaEvidenceRepository,
  PrismaObjectRepository,
  PrismaPolicyDecisionRepository,
  PrismaQueueRepository,
  PrismaReadModelRepository,
  PrismaRecommendationRepository,
  PrismaRelationshipRepository,
  PrismaReportRepository,
  PrismaRestoreManifestRepository,
  PrismaSettingsRepository,
  PrismaTaskRepository,
  PrismaVaultRepository,
  PrismaVerificationRepository,
  PrismaWorkflowRepository
} from "./repositories/prismaRepositories.js";

export function buildRepositoryRegistry() {
  return {
    objectRepository: new PrismaObjectRepository(),
    relationshipRepository: new PrismaRelationshipRepository(),
    discoveryRunRepository: new PrismaDiscoveryRunRepository(),
    discoveryFindingRepository: new PrismaDiscoveryFindingRepository(),
    evidenceRepository: new PrismaEvidenceRepository(),
    classificationRepository: new PrismaClassificationRepository(),
    recommendationRepository: new PrismaRecommendationRepository(),
    workflowRepository: new PrismaWorkflowRepository(),
    taskRepository: new PrismaTaskRepository(),
    queueRepository: new PrismaQueueRepository(),
    policyDecisionRepository: new PrismaPolicyDecisionRepository(),
    approvalRepository: new PrismaApprovalRepository(),
    vaultRepository: new PrismaVaultRepository(),
    restoreManifestRepository: new PrismaRestoreManifestRepository(),
    actionRepository: new PrismaActionRepository(),
    verificationRepository: new PrismaVerificationRepository(),
    auditRepository: new PrismaAuditRepository(),
    reportRepository: new PrismaReportRepository(),
    readModelRepository: new PrismaReadModelRepository(),
    settingsRepository: new PrismaSettingsRepository()
  };
}
