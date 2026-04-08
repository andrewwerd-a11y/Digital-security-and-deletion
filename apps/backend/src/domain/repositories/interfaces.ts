import type {
  ActionRecord,
  ApprovalRecord,
  AuditRecord,
  ClassificationRecord,
  CoreObjectRecord,
  DiscoveryFindingRecord,
  DiscoveryRunRecord,
  NormalizationRunRecord,
  EvidenceRecord,
  DuplicateCandidateRecord,
  ObjectSearchQuery,
  PolicyDecisionRecord,
  QueueRecord,
  ReadModelRecord,
  ReadinessRecord,
  ResidualRiskRecord,
  RecommendationRecord,
  RelationshipRecord,
  RelationshipTraversalQuery,
  ReportRecord,
  RestoreManifestRecord,
  SettingsRecord,
  SimulationRecord,
  TaskRecord,
  UnresolvedCandidateRecord,
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
  create(record: Omit<EvidenceRecord, "id" | "createdAt">): Promise<EvidenceRecord>;
  listByDiscoveryRun(discoveryRunId: string): Promise<EvidenceRecord[]>;
  createDiscoveryRun(record: Omit<DiscoveryRunRecord, "id">): Promise<DiscoveryRunRecord>;
  updateDiscoveryRun(id: string, patch: Partial<Omit<DiscoveryRunRecord, "id" | "workflowId">>): Promise<DiscoveryRunRecord>;
  getDiscoveryRunById(id: string): Promise<DiscoveryRunRecord | null>;
  createDiscoveryFinding(record: Omit<DiscoveryFindingRecord, "id" | "createdAt">): Promise<DiscoveryFindingRecord>;
  listDiscoveryFindingsByRun(discoveryRunId: string): Promise<DiscoveryFindingRecord[]>;
  createNormalizationRun(record: Omit<NormalizationRunRecord, "id" | "createdAt">): Promise<NormalizationRunRecord>;
  createUnresolvedCandidate(record: Omit<UnresolvedCandidateRecord, "id" | "createdAt">): Promise<UnresolvedCandidateRecord>;
  listUnresolvedCandidates(normalizationRunId: string): Promise<UnresolvedCandidateRecord[]>;
  createDuplicateCandidate(record: Omit<DuplicateCandidateRecord, "id" | "createdAt">): Promise<DuplicateCandidateRecord>;
  listDuplicateCandidates(normalizationRunId: string): Promise<DuplicateCandidateRecord[]>;
}

export interface ClassificationRepository {
  create(record: Omit<ClassificationRecord, "id" | "createdAt">): Promise<ClassificationRecord>;
  listByObject(objectId: string): Promise<ClassificationRecord[]>;
}

export interface RecommendationRepository {
  create(record: Omit<RecommendationRecord, "id" | "createdAt">): Promise<RecommendationRecord>;
  listByObject(objectId: string): Promise<RecommendationRecord[]>;
}

export interface WorkflowRepository {
  create(record: Omit<WorkflowRecord, "id">): Promise<WorkflowRecord>;
  update(id: string, patch: Partial<Omit<WorkflowRecord, "id">>): Promise<WorkflowRecord>;
  getById(id: string): Promise<WorkflowRecord | null>;
}

export interface TaskRepository {
  create(record: Omit<TaskRecord, "id">): Promise<TaskRecord>;
  update(id: string, patch: Partial<Omit<TaskRecord, "id" | "workflowId" | "type">>): Promise<TaskRecord>;
  listByWorkflow(workflowId: string): Promise<TaskRecord[]>;
}

export interface QueueRepository {
  create(record: QueueRecord): Promise<QueueRecord>;
  getById(id: string): Promise<QueueRecord | null>;
  update(id: string, patch: Partial<Pick<QueueRecord, "state" | "blockReason" | "detail">>): Promise<QueueRecord>;
}

export interface PolicyDecisionRepository {
  create(record: Omit<PolicyDecisionRecord, "id" | "createdAt">): Promise<PolicyDecisionRecord>;
  listByWorkflow(workflowId: string): Promise<PolicyDecisionRecord[]>;
  getById(id: string): Promise<PolicyDecisionRecord | null>;
}

export interface ApprovalRepository {
  create(record: Omit<ApprovalRecord, "id" | "createdAt" | "updatedAt">): Promise<ApprovalRecord>;
  update(id: string, patch: Partial<Pick<ApprovalRecord, "state" | "approvedScope" | "reason">>): Promise<ApprovalRecord>;
  listByTarget(targetKind: ApprovalRecord["targetKind"], targetId: string): Promise<ApprovalRecord[]>;
  getById(id: string): Promise<ApprovalRecord | null>;
}

export interface SimulationRepository {
  create(record: Omit<SimulationRecord, "id" | "createdAt">): Promise<SimulationRecord>;
  getById(id: string): Promise<SimulationRecord | null>;
}

export interface ReadinessRepository {
  create(record: Omit<ReadinessRecord, "id" | "createdAt">): Promise<ReadinessRecord>;
  getLatestByScope(scopeKey: string): Promise<ReadinessRecord | null>;
}

export interface VaultRepository {
  create(record: Omit<VaultRecord, "id" | "createdAt">): Promise<VaultRecord>;
  listAll(): Promise<VaultRecord[]>;
  listByWorkflow(workflowId: string): Promise<VaultRecord[]>;
  updateIntegrity(id: string, integrityStatus: string, checksum?: string): Promise<VaultRecord>;
}

export interface RestoreManifestRepository {
  create(record: Omit<RestoreManifestRecord, "id" | "createdAt">): Promise<RestoreManifestRecord>;
  getById(id: string): Promise<RestoreManifestRecord | null>;
}

export interface ActionRepository {
  create(record: Omit<ActionRecord, "id" | "createdAt">): Promise<ActionRecord>;
  update(id: string, patch: Partial<Pick<ActionRecord, "state" | "resultSummary" | "errorMessage" | "completedAt">>): Promise<ActionRecord>;
  getById(id: string): Promise<ActionRecord | null>;
}

export interface VerificationRepository {
  create(record: Omit<VerificationRecord, "id" | "createdAt">): Promise<VerificationRecord>;
  listByAction(actionId: string): Promise<VerificationRecord[]>;
  listAll(): Promise<VerificationRecord[]>;
}

export interface AuditRepository {
  create(record: AuditRecord): Promise<AuditRecord>;
  listAll(): Promise<AuditRecord[]>;
}

export interface ReportRepository {
  create(record: Omit<ReportRecord, "id" | "createdAt">): Promise<ReportRecord>;
  listAll(): Promise<ReportRecord[]>;
  getById(id: string): Promise<ReportRecord | null>;
  listByType(reportType: string): Promise<ReportRecord[]>;
}

export interface ResidualRiskRepository {
  create(record: Omit<ResidualRiskRecord, "id" | "createdAt">): Promise<ResidualRiskRecord>;
  listByScope(scopeKey: string): Promise<ResidualRiskRecord[]>;
  listAll(): Promise<ResidualRiskRecord[]>;
}

export interface ReadModelRepository {
  upsert(record: Omit<ReadModelRecord, "id" | "createdAt">): Promise<ReadModelRecord>;
  getByTypeAndKey(modelType: string, modelKey: string): Promise<ReadModelRecord | null>;
  listByType(modelType: string): Promise<ReadModelRecord[]>;
}

export interface SettingsRepository {
  put(record: SettingsRecord): Promise<SettingsRecord>;
  getByKey(key: string): Promise<SettingsRecord | null>;
}
