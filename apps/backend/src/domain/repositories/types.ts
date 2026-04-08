import type {
  ActionClass,
  ApprovalState,
  ApprovalType,
  BlockReason,
  Confidence,
  EvidenceOriginType,
  FailureCategory,
  ObjectState,
  ObjectType,
  OntologyBranch,
  PolicyDecisionResult,
  PreserveState,
  RelationshipType,
  ReviewState,
  Risk,
  TaskState,
  TaskType,
  VerificationState,
  WorkflowState,
  WorkflowType
} from "@dsd/shared";

export interface CoreObjectRecord {
  id: string;
  branch: OntologyBranch;
  objectType: ObjectType;
  externalRef: string;
  displayName: string;
  state: ObjectState;
  reviewState: ReviewState;
  preserveState: PreserveState;
  verificationState: VerificationState;
  confidence: Confidence;
  origin: EvidenceOriginType;
  provenanceSource: string;
  notes?: string | null;
  aliases: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RelationshipRecord {
  id: string;
  fromObjectId: string;
  toObjectId: string;
  relationshipType: RelationshipType;
  confidence: Confidence;
  origin: EvidenceOriginType;
  provenanceSource: string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ObjectSearchQuery {
  branch?: OntologyBranch;
  type?: ObjectType;
  query?: string;
}

export interface RelationshipTraversalQuery {
  relationshipType?: RelationshipType;
  depth?: number;
}

export interface DiscoveryRunRecord {
  id: string;
  workflowId: string;
  scope: string;
  rootPath: string;
  summary?: string | null;
  startedAt: Date;
  completedAt?: Date | null;
}

export interface DiscoveryFindingRecord {
  id: string;
  discoveryRunId: string;
  locator: string;
  findingType: string;
  summary: string;
  metadataJson: string;
  createdAt: Date;
}

export interface EvidenceRecord {
  id: string;
  discoveryRunId: string;
  objectId?: string | null;
  discoveryFindingId?: string | null;
  sourceSystem: string;
  locator: string;
  summary: string;
  payloadRef?: string | null;
  createdAt: Date;
}

export interface ClassificationRecord { id: string; objectId: string; risk: Risk; }
export interface RecommendationRecord { id: string; objectId: string; actionClass: ActionClass; }

export interface WorkflowRecord {
  id: string;
  type: WorkflowType;
  state: WorkflowState;
  startedAt: Date;
  completedAt?: Date | null;
}

export interface TaskRecord {
  id: string;
  workflowId: string;
  type: TaskType;
  state: TaskState;
  progressPercent: number;
  failureCategory?: FailureCategory | null;
  blockReason?: BlockReason | null;
  errorMessage?: string | null;
  startedAt: Date;
  completedAt?: Date | null;
}

export interface QueueRecord { id: string; taskId: string; state: TaskState; }
export interface PolicyDecisionRecord { id: string; objectId: string; result: PolicyDecisionResult; }
export interface ApprovalRecord { id: string; decisionId: string; type: ApprovalType; state: ApprovalState; }
export interface VaultRecord { id: string; objectId: string; path: string; }
export interface RestoreManifestRecord { id: string; vaultRecordId: string; }
export interface ActionRecord { id: string; objectId: string; actionClass: ActionClass; }
export interface VerificationRecord { id: string; actionId: string; state: VerificationState; }
export interface AuditRecord { id: string; eventType: string; }
export interface ReportRecord { id: string; reportType: string; }
export interface ReadModelRecord { id: string; modelType: string; }
export interface SettingsRecord { id: string; key: string; value: string; }
