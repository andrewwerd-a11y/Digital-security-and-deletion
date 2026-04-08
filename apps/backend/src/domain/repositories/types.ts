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
  PolicyDecisionOutcome,
  PreserveState,
  ReadinessResult,
  RelationshipType,
  ReviewState,
  AnalysisConfidence,
  AnalysisRisk,
  AnalysisSensitivity,
  RecommendationIntent,
  Risk,
  TaskState,
  TaskType,
  VerificationState,
  WorkflowState,
  WorkflowType,
  TrustProfile
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


export interface NormalizationRunRecord {
  id: string;
  discoveryRunId: string;
  workflowId: string;
  summary: string;
  createdAt: Date;
}

export interface UnresolvedCandidateRecord {
  id: string;
  normalizationRunId: string;
  discoveryFindingId: string;
  reason: string;
  locator: string;
  createdAt: Date;
}

export interface DuplicateCandidateRecord {
  id: string;
  normalizationRunId: string;
  objectAId: string;
  objectBId: string;
  rationale: string;
  createdAt: Date;
}

export interface ClassificationRecord {
  id: string;
  objectId: string;
  risk: AnalysisRisk;
  sensitivity: AnalysisSensitivity;
  confidence: AnalysisConfidence;
  preserveFirstBlocker: boolean;
  rationale: string;
  explanation: string;
  createdAt: Date;
}

export interface RecommendationRecord {
  id: string;
  objectId: string;
  intent: RecommendationIntent;
  preserveFirstBlocker: boolean;
  rationale: string;
  explanation: string;
  createdAt: Date;
}

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

export interface QueueRecord {
  id: string;
  queueType: string;
  taskId: string;
  state: TaskState;
  blockReason?: BlockReason | null;
  detail?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskAttemptRecord {
  id: string;
  taskId: string;
  attemptNumber: number;
  resultState: TaskState;
  message?: string | null;
  createdAt: Date;
}

export interface BlockerRecord {
  id: string;
  ownerType: string;
  ownerId: string;
  reason: BlockReason;
  detail?: string | null;
  resolved: boolean;
  createdAt: Date;
}
export interface SimulationRecord {
  id: string;
  actionCandidateType: string;
  actionType: string;
  targetObjectIds: string[];
  requestedScope: string;
  trustProfile: TrustProfile;
  notes?: string | null;
  consequenceSummary: string;
  createdAt: Date;
}
export interface ReadinessRecord {
  id: string;
  scopeKey: string;
  workflowId?: string | null;
  result: ReadinessResult;
  blockerCount: number;
  warningCount: number;
  blockersJson: string;
  warningsJson: string;
  createdAt: Date;
}
export interface PolicyDecisionRecord {
  id: string;
  workflowId?: string | null;
  actionClass: ActionClass;
  actionType: string;
  targetObjectIds: string[];
  scopeSummary: string;
  trustProfile: TrustProfile;
  result: PolicyDecisionOutcome;
  rationale: string;
  createdAt: Date;
}
export interface ApprovalRecord {
  id: string;
  decisionId?: string | null;
  type: ApprovalType;
  state: ApprovalState;
  targetKind: "workflow" | "action" | "queue_item";
  targetId: string;
  approvedScope: string;
  reason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface VaultRecord {
  id: string;
  workflowId: string;
  objectId: string;
  path: string;
  mode: string;
  reason: string;
  notes?: string | null;
  integrityStatus: string;
  checksum?: string | null;
  createdAt: Date;
}

export interface RestoreManifestRecord {
  id: string;
  workflowId: string;
  summary: string;
  validationStatus: string;
  itemCount: number;
  createdAt: Date;
}
export interface ActionRecord { id: string; objectId: string; actionClass: ActionClass; }
export interface VerificationRecord { id: string; actionId: string; state: VerificationState; }
export interface AuditRecord { id: string; eventType: string; }
export interface ReportRecord { id: string; reportType: string; }
export interface ReadModelRecord { id: string; modelType: string; modelKey: string; payload: string; createdAt: Date; }
export interface SettingsRecord { id: string; key: string; value: string; }
