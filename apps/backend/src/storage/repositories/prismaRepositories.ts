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

function toCoreObjectRecord(row: any): CoreObjectRecord {
  return {
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
  };
}

function toRelationshipRecord(row: any): RelationshipRecord {
  return {
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
  };
}

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

  async update(
    id: string,
    patch: Partial<Omit<CoreObjectRecord, "id" | "createdAt" | "updatedAt">>
  ): Promise<CoreObjectRecord> {
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

  async update(
    id: string,
    patch: Partial<Omit<RelationshipRecord, "id" | "createdAt" | "updatedAt">>
  ): Promise<RelationshipRecord> {
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
      where: {
        OR: [{ fromObjectId: objectId }, { toObjectId: objectId }]
      },
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
  async getByKey(_key: string): Promise<SettingsRecord | null> { throw new NotImplemented("SettingsRepository"); }
}
