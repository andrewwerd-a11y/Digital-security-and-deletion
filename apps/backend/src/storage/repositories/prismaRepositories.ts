import type {
  ActionRecord,
  ActionRepository,
  ApprovalRecord,
  ApprovalRepository,
  AuditRecord,
  AuditRepository,
  ClassificationRecord,
  ClassificationRepository,
  CoreObjectRecord,
  EvidenceRecord,
  EvidenceRepository,
  ObjectRepository,
  PolicyDecisionRecord,
  PolicyDecisionRepository,
  QueueRecord,
  QueueRepository,
  ReadModelRecord,
  ReadModelRepository,
  RecommendationRecord,
  RecommendationRepository,
  RelationshipRecord,
  RelationshipRepository,
  ReportRecord,
  ReportRepository,
  RestoreManifestRecord,
  RestoreManifestRepository,
  SettingsRecord,
  SettingsRepository,
  TaskRecord,
  TaskRepository,
  VaultRecord,
  VaultRepository,
  VerificationRecord,
  VerificationRepository,
  WorkflowRecord,
  WorkflowRepository
} from "../../domain/repositories/index.js";

class NotImplemented extends Error {
  constructor(repoName: string) {
    super(`${repoName} storage adapter methods are intentionally deferred to later waves.`);
  }
}

export class PrismaObjectRepository implements ObjectRepository {
  async create(record: CoreObjectRecord): Promise<CoreObjectRecord> { return record; }
  async getById(_id: string): Promise<CoreObjectRecord | null> { throw new NotImplemented("ObjectRepository"); }
}

export class PrismaRelationshipRepository implements RelationshipRepository {
  async create(record: RelationshipRecord): Promise<RelationshipRecord> { return record; }
}
export class PrismaEvidenceRepository implements EvidenceRepository { async create(record: EvidenceRecord) { return record; } }
export class PrismaClassificationRepository implements ClassificationRepository { async create(record: ClassificationRecord) { return record; } }
export class PrismaRecommendationRepository implements RecommendationRepository { async create(record: RecommendationRecord) { return record; } }
export class PrismaWorkflowRepository implements WorkflowRepository { async create(record: WorkflowRecord) { return record; } }
export class PrismaTaskRepository implements TaskRepository { async create(record: TaskRecord) { return record; } }
export class PrismaQueueRepository implements QueueRepository { async create(record: QueueRecord) { return record; } }

// Policy decisions and approvals are deliberately separate repositories/paths.
export class PrismaPolicyDecisionRepository implements PolicyDecisionRepository { async create(record: PolicyDecisionRecord) { return record; } }
export class PrismaApprovalRepository implements ApprovalRepository { async create(record: ApprovalRecord) { return record; } }

export class PrismaVaultRepository implements VaultRepository { async create(record: VaultRecord) { return record; } }
export class PrismaRestoreManifestRepository implements RestoreManifestRepository { async create(record: RestoreManifestRecord) { return record; } }
export class PrismaActionRepository implements ActionRepository { async create(record: ActionRecord) { return record; } }
export class PrismaVerificationRepository implements VerificationRepository { async create(record: VerificationRecord) { return record; } }
export class PrismaAuditRepository implements AuditRepository { async create(record: AuditRecord) { return record; } }
export class PrismaReportRepository implements ReportRepository { async create(record: ReportRecord) { return record; } }
export class PrismaReadModelRepository implements ReadModelRepository { async create(record: ReadModelRecord) { return record; } }
export class PrismaSettingsRepository implements SettingsRepository {
  async put(record: SettingsRecord): Promise<SettingsRecord> { return record; }
  async getByKey(_key: string): Promise<SettingsRecord | null> { return null; }
}
