import type {
  ActionRecord,
  ApprovalRecord,
  AuditRecord,
  ClassificationRecord,
  CoreObjectRecord,
  EvidenceRecord,
  ObjectSearchQuery,
  PolicyDecisionRecord,
  QueueRecord,
  ReadModelRecord,
  RecommendationRecord,
  RelationshipRecord,
  RelationshipTraversalQuery,
  ReportRecord,
  RestoreManifestRecord,
  SettingsRecord,
  TaskRecord,
  VaultRecord,
  VerificationRecord,
  WorkflowRecord
} from "./types.js";

export interface ObjectRepository {
  create(record: Omit<CoreObjectRecord, "id" | "createdAt" | "updatedAt">): Promise<CoreObjectRecord>;
  update(id: string, patch: Partial<Omit<CoreObjectRecord, "id" | "createdAt" | "updatedAt">>): Promise<CoreObjectRecord>;
  getById(id: string): Promise<CoreObjectRecord | null>;
  search(query: ObjectSearchQuery): Promise<CoreObjectRecord[]>;
}

export interface RelationshipRepository {
  create(record: Omit<RelationshipRecord, "id" | "createdAt" | "updatedAt">): Promise<RelationshipRecord>;
  update(id: string, patch: Partial<Omit<RelationshipRecord, "id" | "createdAt" | "updatedAt">>): Promise<RelationshipRecord>;
  getById(id: string): Promise<RelationshipRecord | null>;
  listForObject(objectId: string): Promise<RelationshipRecord[]>;
  listDependents(objectId: string, query?: RelationshipTraversalQuery): Promise<RelationshipRecord[]>;
  listDuplicates(objectId: string): Promise<RelationshipRecord[]>;
}

export interface EvidenceRepository {
  create(record: EvidenceRecord): Promise<EvidenceRecord>;
}

export interface ClassificationRepository {
  create(record: ClassificationRecord): Promise<ClassificationRecord>;
}

export interface RecommendationRepository {
  create(record: RecommendationRecord): Promise<RecommendationRecord>;
}

export interface WorkflowRepository {
  create(record: WorkflowRecord): Promise<WorkflowRecord>;
}

export interface TaskRepository {
  create(record: TaskRecord): Promise<TaskRecord>;
}

export interface QueueRepository {
  create(record: QueueRecord): Promise<QueueRecord>;
}

export interface PolicyDecisionRepository {
  create(record: PolicyDecisionRecord): Promise<PolicyDecisionRecord>;
}

export interface ApprovalRepository {
  create(record: ApprovalRecord): Promise<ApprovalRecord>;
}

export interface VaultRepository {
  create(record: VaultRecord): Promise<VaultRecord>;
}

export interface RestoreManifestRepository {
  create(record: RestoreManifestRecord): Promise<RestoreManifestRecord>;
}

export interface ActionRepository {
  create(record: ActionRecord): Promise<ActionRecord>;
}

export interface VerificationRepository {
  create(record: VerificationRecord): Promise<VerificationRecord>;
}

export interface AuditRepository {
  create(record: AuditRecord): Promise<AuditRecord>;
}

export interface ReportRepository {
  create(record: ReportRecord): Promise<ReportRecord>;
}

export interface ReadModelRepository {
  create(record: ReadModelRecord): Promise<ReadModelRecord>;
}

export interface SettingsRepository {
  put(record: SettingsRecord): Promise<SettingsRecord>;
  getByKey(key: string): Promise<SettingsRecord | null>;
}
