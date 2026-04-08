import { PreserveState, ReadinessResult, RelationshipType } from "@dsd/shared";
import type {
  ObjectRepository,
  ReadinessRepository,
  RelationshipRepository,
  VaultRepository
} from "../repositories/interfaces.js";
import type { ReadinessRecord } from "../repositories/types.js";

export interface EvaluateReadinessInput {
  scopeKey: string;
  workflowId?: string;
  targetObjectIds: string[];
}

export class ReadinessService {
  constructor(
    private readonly objectRepository: ObjectRepository,
    private readonly relationshipRepository: RelationshipRepository,
    private readonly vaultRepository: VaultRepository,
    private readonly readinessRepository: ReadinessRepository
  ) {}

  async evaluate(input: EvaluateReadinessInput): Promise<ReadinessRecord> {
    const blockers: string[] = [];
    const warnings: string[] = [];
    const vaultItems = await this.vaultRepository.listAll();

    for (const objectId of input.targetObjectIds) {
      const objectRecord = await this.objectRepository.getById(objectId);
      if (!objectRecord) {
        blockers.push(`missing-object:${objectId}`);
        continue;
      }

      const hasVaultProof = vaultItems.some((row) => row.objectId === objectId);
      if (objectRecord.preserveState !== PreserveState.PRESERVED && !hasVaultProof) {
        blockers.push(`preservation-required:${objectId}`);
      }

      const dependencies = await this.relationshipRepository.listDependents(objectId, {
        relationshipType: RelationshipType.DEPENDS_ON,
        depth: 1
      });

      for (const dependency of dependencies) {
        const dependencyRecord = await this.objectRepository.getById(dependency.toObjectId);
        if (!dependencyRecord || dependencyRecord.state === "BLOCKED") {
          blockers.push(`dependency-unresolved:${objectId}->${dependency.toObjectId}`);
        }
      }

      if (objectRecord.reviewState !== "REVIEWED") {
        warnings.push(`review-required:${objectId}`);
      }
    }

    const result = blockers.length > 0
      ? ReadinessResult.BLOCKED
      : warnings.length > 0
        ? ReadinessResult.READY_WITH_WARNINGS
        : ReadinessResult.READY;

    return this.readinessRepository.create({
      scopeKey: input.scopeKey,
      workflowId: input.workflowId ?? null,
      result,
      blockerCount: blockers.length,
      warningCount: warnings.length,
      blockersJson: JSON.stringify(blockers),
      warningsJson: JSON.stringify(warnings)
    });
  }

  async getLatest(scopeKey: string): Promise<ReadinessRecord | null> {
    return this.readinessRepository.getLatestByScope(scopeKey);
  }
}
