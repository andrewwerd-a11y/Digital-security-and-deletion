import type {
  ActionClass,
  ApprovalState,
  ApprovalType,
  Confidence,
  ObjectState,
  ObjectType,
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
  objectType: ObjectType;
  externalRef: string;
  state: ObjectState;
  reviewState: ReviewState;
  preserveState: PreserveState;
  verificationState: VerificationState;
}

export interface RelationshipRecord {
  id: string;
  fromObjectId: string;
  toObjectId: string;
  relationshipType: RelationshipType;
  confidence: Confidence;
}

export interface EvidenceRecord { id: string; objectId: string; sourceSystem: string; }
export interface ClassificationRecord { id: string; objectId: string; risk: Risk; }
export interface RecommendationRecord { id: string; objectId: string; actionClass: ActionClass; }
export interface WorkflowRecord { id: string; type: WorkflowType; state: WorkflowState; }
export interface TaskRecord { id: string; workflowId: string; type: TaskType; state: TaskState; }
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
