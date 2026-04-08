import { prisma } from "../prisma.js";
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
  UnresolvedCandidateRecord,
  NormalizationRunRecord,
  DiscoveryFindingRecord,
  DiscoveryRunRecord,
  DuplicateCandidateRecord,
  EvidenceRecord,
  EvidenceRepository,
  ObjectRepository,
  ObjectSearchQuery,
  PolicyDecisionRecord,
  PolicyDecisionRepository,
  QueueRecord,
  QueueRepository,
  ReadModelRecord,
  ReadModelRepository,
  ReadinessRecord,
  ReadinessRepository,
  RecommendationRecord,
  RecommendationRepository,
  RelationshipRecord,
  RelationshipRepository,
  RelationshipTraversalQuery,
  ReportRecord,
  ReportRepository,
  RestoreManifestRecord,
  RestoreManifestRepository,
  SettingsRecord,
  SettingsRepository,
  SimulationRecord,
  SimulationRepository,
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

const toCoreObjectRecord = (row: any): CoreObjectRecord => ({
  id: row.id,
  branch: row.branch,
  objectType: row.objectType,
  externalRef: row.externalRef,
  displayName: row.displayName,
  state: row.objectState,
  reviewState: row.reviewState,
  preserveState: row.preserveState,
  verificationState: row.verificationState,
  confidence: row.confidence,
  origin: row.origin,
  provenanceSource: row.provenanceSource,
  notes: row.notes,
  aliases: row.aliases,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const toRelationshipRecord = (row: any): RelationshipRecord => ({
  id: row.id,
  fromObjectId: row.fromObjectId,
  toObjectId: row.toObjectId,
  relationshipType: row.relationshipType,
  confidence: row.confidence,
  origin: row.origin,
  provenanceSource: row.provenanceSource,
  notes: row.notes,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const toWorkflowRecord = (row: any): WorkflowRecord => ({
  id: row.id,
  type: row.type,
  state: row.state,
  startedAt: row.startedAt,
  completedAt: row.completedAt
});

const toTaskRecord = (row: any): TaskRecord => ({
  id: row.id,
  workflowId: row.workflowId,
  type: row.type,
  state: row.state,
  progressPercent: row.progressPercent,
  failureCategory: row.failureCategory,
  blockReason: row.blockReason,
  errorMessage: row.errorMessage,
  startedAt: row.startedAt,
  completedAt: row.completedAt
});

const toSimulationRecord = (row: any): SimulationRecord => ({
  id: row.id,
  actionCandidateType: row.actionCandidateType,
  actionType: row.actionType,
  targetObjectIds: row.targetObjectIds,
  requestedScope: row.requestedScope,
  trustProfile: row.trustProfile,
  notes: row.notes,
  consequenceSummary: row.consequenceSummary,
  createdAt: row.createdAt
});

const toReadinessRecord = (row: any): ReadinessRecord => ({
  id: row.id,
  scopeKey: row.scopeKey,
  workflowId: row.workflowId,
  result: row.result,
  blockerCount: row.blockerCount,
  warningCount: row.warningCount,
  blockersJson: row.blockersJson,
  warningsJson: row.warningsJson,
  createdAt: row.createdAt
});

const toDiscoveryRunRecord = (row: any): DiscoveryRunRecord => ({
  id: row.id,
  workflowId: row.workflowId,
  scope: row.scope,
  rootPath: row.rootPath,
  summary: row.summary,
  startedAt: row.startedAt,
  completedAt: row.completedAt
});

const toDiscoveryFindingRecord = (row: any): DiscoveryFindingRecord => ({
  id: row.id,
  discoveryRunId: row.discoveryRunId,
  locator: row.locator,
  findingType: row.findingType,
  summary: row.summary,
  metadataJson: row.metadataJson,
  createdAt: row.createdAt
});

const toNormalizationRunRecord = (row: any): NormalizationRunRecord => ({
  id: row.id,
  discoveryRunId: row.discoveryRunId,
  workflowId: row.workflowId,
  summary: row.summary,
  createdAt: row.createdAt
});

const toUnresolvedCandidateRecord = (row: any): UnresolvedCandidateRecord => ({
  id: row.id,
  normalizationRunId: row.normalizationRunId,
  discoveryFindingId: row.discoveryFindingId,
  reason: row.reason,
  locator: row.locator,
  createdAt: row.createdAt
});

const toDuplicateCandidateRecord = (row: any): DuplicateCandidateRecord => ({
  id: row.id,
  normalizationRunId: row.normalizationRunId,
  objectAId: row.objectAId,
  objectBId: row.objectBId,
  rationale: row.rationale,
  createdAt: row.createdAt
});

const toEvidenceRecord = (row: any): EvidenceRecord => ({
  id: row.id,
  discoveryRunId: row.discoveryRunId,
  objectId: row.objectId,
  discoveryFindingId: row.discoveryFindingId,
  sourceSystem: row.sourceSystem,
  locator: row.locator,
  summary: row.summary,
  payloadRef: row.payloadRef?.locator ?? null,
  createdAt: row.createdAt
});

export class PrismaObjectRepository implements ObjectRepository {
  async create(record: Omit<CoreObjectRecord, "id" | "createdAt" | "updatedAt">): Promise<CoreObjectRecord> {
    const created = await prisma.coreObject.create({
      data: {
        branch: record.branch,
        objectType: record.objectType,
        externalRef: record.externalRef,
        displayName: record.displayName,
        objectState: record.state,
        reviewState: record.reviewState,
        preserveState: record.preserveState,
        verificationState: record.verificationState,
        confidence: record.confidence,
        origin: record.origin,
        provenanceSource: record.provenanceSource,
        notes: record.notes ?? null,
        aliases: record.aliases
      }
    });
    return toCoreObjectRecord(created);
  }

  async update(id: string, patch: Partial<Omit<CoreObjectRecord, "id" | "createdAt" | "updatedAt">>): Promise<CoreObjectRecord> {
    const updated = await prisma.coreObject.update({
      where: { id },
      data: {
        branch: patch.branch,
        objectType: patch.objectType,
        externalRef: patch.externalRef,
        displayName: patch.displayName,
        objectState: patch.state,
        reviewState: patch.reviewState,
        preserveState: patch.preserveState,
        verificationState: patch.verificationState,
        confidence: patch.confidence,
        origin: patch.origin,
        provenanceSource: patch.provenanceSource,
        notes: patch.notes,
        aliases: patch.aliases
      }
    });

    return toCoreObjectRecord(updated);
  }

  async getById(id: string): Promise<CoreObjectRecord | null> {
    const found = await prisma.coreObject.findUnique({ where: { id } });
    return found ? toCoreObjectRecord(found) : null;
  }

  async search(query: ObjectSearchQuery): Promise<CoreObjectRecord[]> {
    const rows = await prisma.coreObject.findMany({
      where: {
        branch: query.branch,
        objectType: query.type,
        OR: query.query
          ? [
              { displayName: { contains: query.query, mode: "insensitive" } },
              { externalRef: { contains: query.query, mode: "insensitive" } },
              { notes: { contains: query.query, mode: "insensitive" } }
            ]
          : undefined
      },
      orderBy: { createdAt: "desc" }
    });

    return rows.map(toCoreObjectRecord);
  }
}

export class PrismaRelationshipRepository implements RelationshipRepository {
  async create(record: Omit<RelationshipRecord, "id" | "createdAt" | "updatedAt">): Promise<RelationshipRecord> {
    const created = await prisma.coreRelationship.create({
      data: {
        fromObjectId: record.fromObjectId,
        toObjectId: record.toObjectId,
        relationshipType: record.relationshipType,
        confidence: record.confidence,
        origin: record.origin,
        provenanceSource: record.provenanceSource,
        notes: record.notes ?? null
      }
    });
    return toRelationshipRecord(created);
  }

  async update(id: string, patch: Partial<Omit<RelationshipRecord, "id" | "createdAt" | "updatedAt">>): Promise<RelationshipRecord> {
    const updated = await prisma.coreRelationship.update({
      where: { id },
      data: {
        fromObjectId: patch.fromObjectId,
        toObjectId: patch.toObjectId,
        relationshipType: patch.relationshipType,
        confidence: patch.confidence,
        origin: patch.origin,
        provenanceSource: patch.provenanceSource,
        notes: patch.notes
      }
    });

    return toRelationshipRecord(updated);
  }

  async getById(id: string): Promise<RelationshipRecord | null> {
    const found = await prisma.coreRelationship.findUnique({ where: { id } });
    return found ? toRelationshipRecord(found) : null;
  }

  async listForObject(objectId: string): Promise<RelationshipRecord[]> {
    const rows = await prisma.coreRelationship.findMany({
      where: { OR: [{ fromObjectId: objectId }, { toObjectId: objectId }] },
      orderBy: { createdAt: "desc" }
    });

    return rows.map(toRelationshipRecord);
  }

  async listDependents(objectId: string, query?: RelationshipTraversalQuery): Promise<RelationshipRecord[]> {
    const rows = await prisma.coreRelationship.findMany({
      where: {
        OR: [{ fromObjectId: objectId }, { toObjectId: objectId }],
        relationshipType: query?.relationshipType
      },
      orderBy: { createdAt: "desc" },
      take: query?.depth ? Math.max(query.depth, 1) * 50 : undefined
    });

    return rows.map(toRelationshipRecord);
  }

  async listDuplicates(objectId: string): Promise<RelationshipRecord[]> {
    const rows = await prisma.coreRelationship.findMany({
      where: {
        relationshipType: "DUPLICATES",
        OR: [{ fromObjectId: objectId }, { toObjectId: objectId }]
      }
    });

    return rows.map(toRelationshipRecord);
  }
}

export class PrismaEvidenceRepository implements EvidenceRepository {
  async create(record: Omit<EvidenceRecord, "id" | "createdAt">): Promise<EvidenceRecord> {
    const payloadRef = record.payloadRef
      ? await prisma.evidencePayloadRef.create({ data: { locator: record.payloadRef } })
      : null;

    const created = await prisma.evidenceRecord.create({
      data: {
        discoveryRunId: record.discoveryRunId,
        discoveryFindingId: record.discoveryFindingId ?? null,
        objectId: record.objectId ?? null,
        sourceSystem: record.sourceSystem,
        locator: record.locator,
        summary: record.summary,
        payloadRefId: payloadRef?.id ?? null
      },
      include: { payloadRef: true }
    });

    return toEvidenceRecord(created);
  }

  async listByDiscoveryRun(discoveryRunId: string): Promise<EvidenceRecord[]> {
    const rows = await prisma.evidenceRecord.findMany({
      where: { discoveryRunId },
      include: { payloadRef: true },
      orderBy: { createdAt: "asc" }
    });

    return rows.map(toEvidenceRecord);
  }

  async createDiscoveryRun(record: Omit<DiscoveryRunRecord, "id">): Promise<DiscoveryRunRecord> {
    const created = await prisma.discoveryRun.create({
      data: {
        workflowId: record.workflowId,
        scope: record.scope,
        rootPath: record.rootPath,
        summary: record.summary ?? null,
        startedAt: record.startedAt,
        completedAt: record.completedAt ?? null
      }
    });

    return toDiscoveryRunRecord(created);
  }

  async updateDiscoveryRun(id: string, patch: Partial<Omit<DiscoveryRunRecord, "id" | "workflowId">>): Promise<DiscoveryRunRecord> {
    const updated = await prisma.discoveryRun.update({
      where: { id },
      data: {
        scope: patch.scope,
        rootPath: patch.rootPath,
        summary: patch.summary,
        startedAt: patch.startedAt,
        completedAt: patch.completedAt
      }
    });

    return toDiscoveryRunRecord(updated);
  }

  async getDiscoveryRunById(id: string): Promise<DiscoveryRunRecord | null> {
    const found = await prisma.discoveryRun.findUnique({ where: { id } });
    return found ? toDiscoveryRunRecord(found) : null;
  }

  async createDiscoveryFinding(record: Omit<DiscoveryFindingRecord, "id" | "createdAt">): Promise<DiscoveryFindingRecord> {
    const created = await prisma.discoveryFinding.create({
      data: {
        discoveryRunId: record.discoveryRunId,
        locator: record.locator,
        findingType: record.findingType,
        summary: record.summary,
        metadataJson: record.metadataJson
      }
    });

    return toDiscoveryFindingRecord(created);
  }

  async listDiscoveryFindingsByRun(discoveryRunId: string): Promise<DiscoveryFindingRecord[]> {
    const rows = await prisma.discoveryFinding.findMany({ where: { discoveryRunId }, orderBy: { createdAt: "asc" } });
    return rows.map(toDiscoveryFindingRecord);
  }

  async createNormalizationRun(record: Omit<NormalizationRunRecord, "id" | "createdAt">): Promise<NormalizationRunRecord> {
    const created = await prisma.normalizationRun.create({ data: record });
    return toNormalizationRunRecord(created);
  }

  async createUnresolvedCandidate(record: Omit<UnresolvedCandidateRecord, "id" | "createdAt">): Promise<UnresolvedCandidateRecord> {
    const created = await prisma.unresolvedCandidate.create({ data: record });
    return toUnresolvedCandidateRecord(created);
  }

  async listUnresolvedCandidates(normalizationRunId: string): Promise<UnresolvedCandidateRecord[]> {
    const rows = await prisma.unresolvedCandidate.findMany({ where: { normalizationRunId }, orderBy: { createdAt: "asc" } });
    return rows.map(toUnresolvedCandidateRecord);
  }

  async createDuplicateCandidate(record: Omit<DuplicateCandidateRecord, "id" | "createdAt">): Promise<DuplicateCandidateRecord> {
    const created = await prisma.duplicateCandidate.create({ data: record });
    return toDuplicateCandidateRecord(created);
  }

  async listDuplicateCandidates(normalizationRunId: string): Promise<DuplicateCandidateRecord[]> {
    const rows = await prisma.duplicateCandidate.findMany({ where: { normalizationRunId }, orderBy: { createdAt: "asc" } });
    return rows.map(toDuplicateCandidateRecord);
  }
}

export class PrismaWorkflowRepository implements WorkflowRepository {
  async create(record: Omit<WorkflowRecord, "id">): Promise<WorkflowRecord> {
    const created = await prisma.workflow.create({
      data: {
        type: record.type,
        state: record.state,
        startedAt: record.startedAt,
        completedAt: record.completedAt ?? null
      }
    });
    return toWorkflowRecord(created);
  }

  async update(id: string, patch: Partial<Omit<WorkflowRecord, "id">>): Promise<WorkflowRecord> {
    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        type: patch.type,
        state: patch.state,
        startedAt: patch.startedAt,
        completedAt: patch.completedAt
      }
    });
    return toWorkflowRecord(updated);
  }

  async getById(id: string): Promise<WorkflowRecord | null> {
    const found = await prisma.workflow.findUnique({ where: { id } });
    return found ? toWorkflowRecord(found) : null;
  }
}

export class PrismaTaskRepository implements TaskRepository {
  async create(record: Omit<TaskRecord, "id">): Promise<TaskRecord> {
    const created = await prisma.task.create({
      data: {
        workflowId: record.workflowId,
        type: record.type,
        state: record.state,
        progressPercent: record.progressPercent,
        failureCategory: record.failureCategory ?? null,
        blockReason: record.blockReason ?? null,
        errorMessage: record.errorMessage ?? null,
        startedAt: record.startedAt,
        completedAt: record.completedAt ?? null
      }
    });

    return toTaskRecord(created);
  }

  async update(id: string, patch: Partial<Omit<TaskRecord, "id" | "workflowId" | "type">>): Promise<TaskRecord> {
    const updated = await prisma.task.update({
      where: { id },
      data: {
        state: patch.state,
        progressPercent: patch.progressPercent,
        failureCategory: patch.failureCategory,
        blockReason: patch.blockReason,
        errorMessage: patch.errorMessage,
        startedAt: patch.startedAt,
        completedAt: patch.completedAt
      }
    });

    return toTaskRecord(updated);
  }

  async listByWorkflow(workflowId: string): Promise<TaskRecord[]> {
    const rows = await prisma.task.findMany({ where: { workflowId }, orderBy: { createdAt: "asc" } });
    return rows.map(toTaskRecord);
  }
}

export class PrismaClassificationRepository implements ClassificationRepository {
  async create(record: Omit<ClassificationRecord, "id" | "createdAt">): Promise<ClassificationRecord> {
    const created = await prisma.classification.create({ data: record });
    return {
      id: created.id,
      objectId: created.objectId,
      risk: created.risk,
      sensitivity: created.sensitivity,
      confidence: created.confidence,
      preserveFirstBlocker: created.preserveFirstBlocker,
      rationale: created.rationale,
      explanation: created.explanation,
      createdAt: created.createdAt
    };
  }

  async listByObject(objectId: string): Promise<ClassificationRecord[]> {
    const rows = await prisma.classification.findMany({ where: { objectId }, orderBy: { createdAt: "desc" } });
    return rows.map((row) => ({
      id: row.id,
      objectId: row.objectId,
      risk: row.risk,
      sensitivity: row.sensitivity,
      confidence: row.confidence,
      preserveFirstBlocker: row.preserveFirstBlocker,
      rationale: row.rationale,
      explanation: row.explanation,
      createdAt: row.createdAt
    }));
  }
}

export class PrismaRecommendationRepository implements RecommendationRepository {
  async create(record: Omit<RecommendationRecord, "id" | "createdAt">): Promise<RecommendationRecord> {
    const created = await prisma.recommendation.create({ data: record });
    return {
      id: created.id,
      objectId: created.objectId,
      intent: created.intent,
      preserveFirstBlocker: created.preserveFirstBlocker,
      rationale: created.rationale,
      explanation: created.explanation,
      createdAt: created.createdAt
    };
  }

  async listByObject(objectId: string): Promise<RecommendationRecord[]> {
    const rows = await prisma.recommendation.findMany({ where: { objectId }, orderBy: { createdAt: "desc" } });
    return rows.map((row) => ({
      id: row.id,
      objectId: row.objectId,
      intent: row.intent,
      preserveFirstBlocker: row.preserveFirstBlocker,
      rationale: row.rationale,
      explanation: row.explanation,
      createdAt: row.createdAt
    }));
  }
}
export class PrismaQueueRepository implements QueueRepository {
  async create(record: QueueRecord): Promise<QueueRecord> {
    const row = await prisma.queueItem.create({
      data: {
        id: record.id,
        taskId: record.taskId,
        queueType: record.queueType,
        state: record.state,
        blockReason: record.blockReason ?? null,
        detail: record.detail ?? null
      }
    });

    return {
      id: row.id,
      queueType: row.queueType,
      taskId: row.taskId,
      state: row.state,
      blockReason: row.blockReason,
      detail: row.detail,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}

// Policy decisions and approvals are deliberately separate repositories/paths.
export class PrismaPolicyDecisionRepository implements PolicyDecisionRepository {
  async create(record: Omit<PolicyDecisionRecord, "id" | "createdAt">): Promise<PolicyDecisionRecord> {
    const row = await prisma.policyDecision.create({ data: record });
    return {
      id: row.id,
      workflowId: row.workflowId,
      actionClass: row.actionClass,
      actionType: row.actionType,
      targetObjectIds: row.targetObjectIds,
      scopeSummary: row.scopeSummary,
      trustProfile: row.trustProfile,
      result: row.result,
      rationale: row.rationale,
      createdAt: row.createdAt
    };
  }

  async listByWorkflow(workflowId: string): Promise<PolicyDecisionRecord[]> {
    const rows = await prisma.policyDecision.findMany({ where: { workflowId }, orderBy: { createdAt: "desc" } });
    return rows.map((row) => ({
      id: row.id,
      workflowId: row.workflowId,
      actionClass: row.actionClass,
      actionType: row.actionType,
      targetObjectIds: row.targetObjectIds,
      scopeSummary: row.scopeSummary,
      trustProfile: row.trustProfile,
      result: row.result,
      rationale: row.rationale,
      createdAt: row.createdAt
    }));
  }
}

export class PrismaApprovalRepository implements ApprovalRepository {
  async create(record: Omit<ApprovalRecord, "id" | "createdAt" | "updatedAt">): Promise<ApprovalRecord> {
    const row = await prisma.approval.create({ data: record });
    return {
      id: row.id,
      decisionId: row.decisionId,
      type: row.type,
      state: row.state,
      targetKind: row.targetKind as ApprovalRecord["targetKind"],
      targetId: row.targetId,
      approvedScope: row.approvedScope,
      reason: row.reason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async update(id: string, patch: Partial<Pick<ApprovalRecord, "state" | "approvedScope" | "reason">>): Promise<ApprovalRecord> {
    const row = await prisma.approval.update({ where: { id }, data: patch });
    return {
      id: row.id,
      decisionId: row.decisionId,
      type: row.type,
      state: row.state,
      targetKind: row.targetKind as ApprovalRecord["targetKind"],
      targetId: row.targetId,
      approvedScope: row.approvedScope,
      reason: row.reason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async listByTarget(targetKind: ApprovalRecord["targetKind"], targetId: string): Promise<ApprovalRecord[]> {
    const rows = await prisma.approval.findMany({ where: { targetKind, targetId }, orderBy: { createdAt: "desc" } });
    return rows.map((row) => ({
      id: row.id,
      decisionId: row.decisionId,
      type: row.type,
      state: row.state,
      targetKind: row.targetKind as ApprovalRecord["targetKind"],
      targetId: row.targetId,
      approvedScope: row.approvedScope,
      reason: row.reason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }
}

export class PrismaSimulationRepository implements SimulationRepository {
  async create(record: Omit<SimulationRecord, "id" | "createdAt">): Promise<SimulationRecord> {
    const row = await prisma.simulationRecord.create({ data: record });
    return toSimulationRecord(row);
  }

  async getById(id: string): Promise<SimulationRecord | null> {
    const row = await prisma.simulationRecord.findUnique({ where: { id } });
    return row ? toSimulationRecord(row) : null;
  }
}

export class PrismaReadinessRepository implements ReadinessRepository {
  async create(record: Omit<ReadinessRecord, "id" | "createdAt">): Promise<ReadinessRecord> {
    const row = await prisma.readinessRecord.create({ data: record });
    return toReadinessRecord(row);
  }

  async getLatestByScope(scopeKey: string): Promise<ReadinessRecord | null> {
    const row = await prisma.readinessRecord.findFirst({ where: { scopeKey }, orderBy: { createdAt: "desc" } });
    return row ? toReadinessRecord(row) : null;
  }
}

export class PrismaVaultRepository implements VaultRepository {
  async create(record: Omit<VaultRecord, "id" | "createdAt">): Promise<VaultRecord> {
    const row = await prisma.vaultRecord.create({
      data: {
        workflowId: record.workflowId,
        objectId: record.objectId,
        vaultPath: record.path,
        mode: record.mode,
        reason: record.reason,
        notes: record.notes ?? null,
        integrityStatus: record.integrityStatus,
        checksum: record.checksum ?? null
      }
    });
    return {
      id: row.id,
      workflowId: row.workflowId,
      objectId: row.objectId,
      path: row.vaultPath,
      mode: row.mode,
      reason: row.reason,
      notes: row.notes,
      integrityStatus: row.integrityStatus,
      checksum: row.checksum,
      createdAt: row.createdAt
    };
  }

  async listAll(): Promise<VaultRecord[]> {
    const rows = await prisma.vaultRecord.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) => ({
      id: row.id,
      workflowId: row.workflowId,
      objectId: row.objectId,
      path: row.vaultPath,
      mode: row.mode,
      reason: row.reason,
      notes: row.notes,
      integrityStatus: row.integrityStatus,
      checksum: row.checksum,
      createdAt: row.createdAt
    }));
  }

  async listByWorkflow(workflowId: string): Promise<VaultRecord[]> {
    return (await this.listAll()).filter((item) => item.workflowId === workflowId);
  }

  async updateIntegrity(id: string, integrityStatus: string, checksum?: string): Promise<VaultRecord> {
    const row = await prisma.vaultRecord.update({ where: { id }, data: { integrityStatus, checksum } });
    return {
      id: row.id,
      workflowId: row.workflowId,
      objectId: row.objectId,
      path: row.vaultPath,
      mode: row.mode,
      reason: row.reason,
      notes: row.notes,
      integrityStatus: row.integrityStatus,
      checksum: row.checksum,
      createdAt: row.createdAt
    };
  }
}

export class PrismaRestoreManifestRepository implements RestoreManifestRepository {
  async create(record: Omit<RestoreManifestRecord, "id" | "createdAt">): Promise<RestoreManifestRecord> {
    const row = await prisma.restoreManifest.create({
      data: {
        workflowId: record.workflowId,
        summary: record.summary,
        validationStatus: record.validationStatus,
        itemCount: record.itemCount
      }
    });

    return {
      id: row.id,
      workflowId: row.workflowId,
      summary: row.summary,
      validationStatus: row.validationStatus,
      itemCount: row.itemCount,
      createdAt: row.createdAt
    };
  }

  async getById(id: string): Promise<RestoreManifestRecord | null> {
    const row = await prisma.restoreManifest.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      workflowId: row.workflowId,
      summary: row.summary,
      validationStatus: row.validationStatus,
      itemCount: row.itemCount,
      createdAt: row.createdAt
    };
  }
}
export class PrismaActionRepository implements ActionRepository { async create(record: ActionRecord) { return record; } }
export class PrismaVerificationRepository implements VerificationRepository { async create(record: VerificationRecord) { return record; } }
export class PrismaAuditRepository implements AuditRepository { async create(record: AuditRecord) { return record; } }
export class PrismaReportRepository implements ReportRepository { async create(record: ReportRecord) { return record; } }
export class PrismaReadModelRepository implements ReadModelRepository {
  async upsert(record: Omit<ReadModelRecord, "id" | "createdAt">): Promise<ReadModelRecord> {
    const row = await prisma.readModel.upsert({
      where: { id: `${record.modelType}:${record.modelKey}` },
      update: { payload: record.payload, modelType: record.modelType, modelKey: record.modelKey },
      create: { id: `${record.modelType}:${record.modelKey}`, modelType: record.modelType, modelKey: record.modelKey, payload: record.payload }
    });

    return {
      id: row.id,
      modelType: row.modelType,
      modelKey: row.modelKey,
      payload: row.payload,
      createdAt: row.createdAt
    };
  }

  async getByTypeAndKey(modelType: string, modelKey: string): Promise<ReadModelRecord | null> {
    const row = await prisma.readModel.findUnique({ where: { id: `${modelType}:${modelKey}` } });
    if (!row) return null;
    return { id: row.id, modelType: row.modelType, modelKey: row.modelKey, payload: row.payload, createdAt: row.createdAt };
  }

  async listByType(modelType: string): Promise<ReadModelRecord[]> {
    const rows = await prisma.readModel.findMany({ where: { modelType }, orderBy: { createdAt: "desc" } });
    return rows.map((row) => ({ id: row.id, modelType: row.modelType, modelKey: row.modelKey, payload: row.payload, createdAt: row.createdAt }));
  }
}
export class PrismaSettingsRepository implements SettingsRepository {
  async put(record: SettingsRecord): Promise<SettingsRecord> { return record; }
  async getByKey(_key: string): Promise<SettingsRecord | null> { throw new NotImplemented("SettingsRepository"); }
}
