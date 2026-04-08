import {
  PrismaActionRepository,
  PrismaApprovalRepository,
  PrismaAuditRepository,
  PrismaClassificationRepository,
  PrismaEvidenceRepository,
  PrismaObjectRepository,
  PrismaPolicyDecisionRepository,
  PrismaQueueRepository,
  PrismaReadModelRepository,
  PrismaReadinessRepository,
  PrismaRecommendationRepository,
  PrismaResidualRiskRepository,
  PrismaRelationshipRepository,
  PrismaReportRepository,
  PrismaRestoreManifestRepository,
  PrismaSettingsRepository,
  PrismaSimulationRepository,
  PrismaTaskRepository,
  PrismaVaultRepository,
  PrismaVerificationRepository,
  PrismaWorkflowRepository
} from "./repositories/prismaRepositories.js";

export function buildRepositoryRegistry() {
  return {
    objectRepository: new PrismaObjectRepository(),
    relationshipRepository: new PrismaRelationshipRepository(),
    evidenceRepository: new PrismaEvidenceRepository(),
    classificationRepository: new PrismaClassificationRepository(),
    recommendationRepository: new PrismaRecommendationRepository(),
    workflowRepository: new PrismaWorkflowRepository(),
    taskRepository: new PrismaTaskRepository(),
    queueRepository: new PrismaQueueRepository(),
    policyDecisionRepository: new PrismaPolicyDecisionRepository(),
    approvalRepository: new PrismaApprovalRepository(),
    simulationRepository: new PrismaSimulationRepository(),
    readinessRepository: new PrismaReadinessRepository(),
    vaultRepository: new PrismaVaultRepository(),
    restoreManifestRepository: new PrismaRestoreManifestRepository(),
    actionRepository: new PrismaActionRepository(),
    verificationRepository: new PrismaVerificationRepository(),
    auditRepository: new PrismaAuditRepository(),
    reportRepository: new PrismaReportRepository(),
    residualRiskRepository: new PrismaResidualRiskRepository(),
    readModelRepository: new PrismaReadModelRepository(),
    settingsRepository: new PrismaSettingsRepository()
  };
}
