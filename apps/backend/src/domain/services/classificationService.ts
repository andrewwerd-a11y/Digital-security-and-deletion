import {
  AnalysisConfidence,
  AnalysisRisk,
  AnalysisSensitivity,
  ObjectType,
  RecommendationIntent
} from "@dsd/shared";
import type {
  ClassificationRepository,
  ObjectRepository,
  RecommendationRepository,
  RelationshipRepository
} from "../repositories/interfaces.js";

export class ClassificationService {
  constructor(
    private readonly objectRepository: ObjectRepository,
    private readonly relationshipRepository: RelationshipRepository,
    private readonly classificationRepository: ClassificationRepository,
    private readonly recommendationRepository: RecommendationRepository
  ) {}

  async classifyObject(objectId: string) {
    const objectRecord = await this.objectRepository.getById(objectId);
    if (!objectRecord) {
      throw new Error(`Object not found: ${objectId}`);
    }

    const relationships = await this.relationshipRepository.listForObject(objectId);
    const hasDependencies = relationships.length > 0;

    const sensitivity = this.mapSensitivity(objectRecord.objectType);
    const risk = this.mapRisk(objectRecord.objectType, hasDependencies);
    const confidence = objectRecord.origin === "OBSERVED" ? AnalysisConfidence.CONFIRMED : AnalysisConfidence.INFERRED;
    const preserveFirstBlocker = risk === AnalysisRisk.PRESERVE_IMPORTANT || risk === AnalysisRisk.CRITICAL_DEPENDENCY;

    const rationale = `Derived from object type ${objectRecord.objectType} and ${relationships.length} linked relationship(s).`;
    const explanation = `${objectRecord.displayName} is classified as ${risk} with ${sensitivity} sensitivity (${confidence}).`;

    const classification = await this.classificationRepository.create({
      objectId,
      risk,
      sensitivity,
      confidence,
      preserveFirstBlocker,
      rationale,
      explanation
    });

    const recommendation = await this.recommendationRepository.create({
      objectId,
      intent: this.mapIntent(risk),
      preserveFirstBlocker,
      rationale: `Recommendation derived from risk ${risk}.`,
      explanation: `Suggested intent is ${this.mapIntent(risk)} for ${objectRecord.displayName}.`
    });

    return { classification, recommendation };
  }

  private mapSensitivity(objectType: ObjectType): AnalysisSensitivity {
    if ([ObjectType.CREDENTIAL_REFERENCE, ObjectType.SESSION_OR_TOKEN_REFERENCE].includes(objectType)) return AnalysisSensitivity.CRITICAL;
    if ([ObjectType.ACCOUNT, ObjectType.PAYMENT_SOURCE].includes(objectType)) return AnalysisSensitivity.SENSITIVE;
    if ([ObjectType.FILE, ObjectType.FOLDER, ObjectType.BROWSER_PROFILE].includes(objectType)) return AnalysisSensitivity.PRIVATE;
    return AnalysisSensitivity.LOW_SENSITIVITY;
  }

  private mapRisk(objectType: ObjectType, hasDependencies: boolean): AnalysisRisk {
    if (hasDependencies) return AnalysisRisk.CRITICAL_DEPENDENCY;
    if ([ObjectType.CREDENTIAL_REFERENCE, ObjectType.SESSION_OR_TOKEN_REFERENCE].includes(objectType)) return AnalysisRisk.SECURITY_RISK;
    if ([ObjectType.ACCOUNT, ObjectType.PAYMENT_SOURCE].includes(objectType)) return AnalysisRisk.PRIVACY_RISK;
    if ([ObjectType.BACKUP_OR_ARCHIVE].includes(objectType)) return AnalysisRisk.PRESERVE_IMPORTANT;
    if ([ObjectType.FILE, ObjectType.FOLDER].includes(objectType)) return AnalysisRisk.CLUTTER;
    return AnalysisRisk.INFORMATIONAL;
  }

  private mapIntent(risk: AnalysisRisk): RecommendationIntent {
    switch (risk) {
      case AnalysisRisk.SECURITY_RISK:
        return RecommendationIntent.REVOKE_FIRST;
      case AnalysisRisk.PRIVACY_RISK:
        return RecommendationIntent.REVIEW;
      case AnalysisRisk.PRESERVE_IMPORTANT:
        return RecommendationIntent.ARCHIVE_BEFORE_REMOVAL;
      case AnalysisRisk.CRITICAL_DEPENDENCY:
        return RecommendationIntent.DISCONNECT_BEFORE_DELETE;
      case AnalysisRisk.CLUTTER:
        return RecommendationIntent.SAFE_TO_REMOVE_LATER;
      default:
        return RecommendationIntent.KEEP;
    }
  }
}
