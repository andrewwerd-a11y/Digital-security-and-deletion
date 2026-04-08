import {
  Confidence,
  EvidenceOriginType,
  ObjectState,
  ObjectType,
  OntologyBranch,
  PreserveState,
  RelationshipType,
  ReviewState,
  VerificationState,
  WorkflowState,
  WorkflowType
} from "@dsd/shared";
import type {
  EvidenceRepository,
  ObjectRepository,
  RelationshipRepository,
  WorkflowRepository
} from "../repositories/interfaces.js";

export class NormalizationService {
  constructor(
    private readonly objectRepository: ObjectRepository,
    private readonly relationshipRepository: RelationshipRepository,
    private readonly evidenceRepository: EvidenceRepository,
    private readonly workflowRepository: WorkflowRepository
  ) {}

  async normalizeDiscoveryRun(discoveryRunId: string) {
    const discoveryRun = await this.evidenceRepository.getDiscoveryRunById(discoveryRunId);
    if (!discoveryRun) {
      throw new Error(`Discovery run not found: ${discoveryRunId}`);
    }

    const findings = await this.evidenceRepository.listDiscoveryFindingsByRun(discoveryRunId);
    const workflow = await this.workflowRepository.create({
      type: WorkflowType.DISCOVERY,
      state: WorkflowState.RUNNING,
      startedAt: new Date()
    });

    const normalizationRun = await this.evidenceRepository.createNormalizationRun({
      discoveryRunId,
      workflowId: workflow.id,
      summary: "Normalization started"
    });

    const normalizedObjectIds: string[] = [];
    const normalizedRelationshipIds: string[] = [];

    for (const finding of findings) {
      const mappedType = this.mapFindingToObjectType(finding.findingType);
      if (!mappedType) {
        await this.evidenceRepository.createUnresolvedCandidate({
          normalizationRunId: normalizationRun.id,
          discoveryFindingId: finding.id,
          reason: `Unmapped finding type: ${finding.findingType}`,
          locator: finding.locator
        });
        continue;
      }

      const existing = (await this.objectRepository.search({ query: finding.locator })).find(
        (objectRecord) => objectRecord.externalRef === finding.locator
      );

      const objectRecord = existing
        ? await this.objectRepository.update(existing.id, {
            displayName: this.deriveDisplayName(finding.locator),
            confidence: Confidence.MEDIUM,
            notes: `Updated by normalization from finding ${finding.id}`
          })
        : await this.objectRepository.create({
            branch: this.mapBranch(mappedType),
            objectType: mappedType,
            externalRef: finding.locator,
            displayName: this.deriveDisplayName(finding.locator),
            state: ObjectState.NORMALIZED,
            reviewState: ReviewState.UNREVIEWED,
            preserveState: PreserveState.NOT_STARTED,
            verificationState: VerificationState.NOT_VERIFIED,
            confidence: Confidence.MEDIUM,
            origin: EvidenceOriginType.OBSERVED,
            provenanceSource: `finding:${finding.id}`,
            notes: `Normalized from finding ${finding.id}`,
            aliases: []
          });

      normalizedObjectIds.push(objectRecord.id);

      const parentLocator = this.extractParentLocator(finding.metadataJson);
      if (parentLocator) {
        const parentObject = await this.findOrCreateParentObject(parentLocator, finding.id);
        const relationship = await this.relationshipRepository.create({
          fromObjectId: parentObject.id,
          toObjectId: objectRecord.id,
          relationshipType: RelationshipType.CONTAINS,
          confidence: Confidence.MEDIUM,
          origin: EvidenceOriginType.OBSERVED,
          provenanceSource: `finding:${finding.id}`,
          notes: `Normalized containment from ${finding.id}`
        });

        normalizedRelationshipIds.push(relationship.id);
      }
    }

    await this.generateDuplicateCandidates(normalizationRun.id, normalizedObjectIds);

    await this.workflowRepository.update(workflow.id, {
      state: WorkflowState.COMPLETED,
      completedAt: new Date()
    });

    const unresolved = await this.evidenceRepository.listUnresolvedCandidates(normalizationRun.id);
    const duplicates = await this.evidenceRepository.listDuplicateCandidates(normalizationRun.id);

    return {
      normalizationRunId: normalizationRun.id,
      normalizedObjectCount: normalizedObjectIds.length,
      normalizedRelationshipCount: normalizedRelationshipIds.length,
      unresolvedCount: unresolved.length,
      duplicateCandidateCount: duplicates.length
    };
  }

  private mapFindingToObjectType(findingType: string): ObjectType | null {
    switch (findingType) {
      case "directory":
      case "directory_entry":
        return ObjectType.FOLDER;
      case "file_entry":
        return ObjectType.FILE;
      case "browser_profile_root":
        return ObjectType.BROWSER_PROFILE;
      case "startup_item":
        return ObjectType.APP;
      default:
        return null;
    }
  }

  private mapBranch(objectType: ObjectType): OntologyBranch {
    if (objectType === ObjectType.BROWSER_PROFILE || objectType === ObjectType.APP) return OntologyBranch.APPS;
    if (objectType === ObjectType.FILE || objectType === ObjectType.FOLDER) return OntologyBranch.FILES;
    return OntologyBranch.UNKNOWN_NEEDS_REVIEW;
  }

  private deriveDisplayName(locator: string): string {
    const parts = locator.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? locator;
  }

  private extractParentLocator(metadataJson: string): string | null {
    try {
      const metadata = JSON.parse(metadataJson) as { parent?: string };
      return metadata.parent ?? null;
    } catch {
      return null;
    }
  }

  private async findOrCreateParentObject(parentLocator: string, findingId: string) {
    const existingParent = (await this.objectRepository.search({ query: parentLocator })).find(
      (item) => item.externalRef === parentLocator
    );
    if (existingParent) {
      return existingParent;
    }

    return this.objectRepository.create({
      branch: OntologyBranch.FILES,
      objectType: ObjectType.FOLDER,
      externalRef: parentLocator,
      displayName: this.deriveDisplayName(parentLocator),
      state: ObjectState.NORMALIZED,
      reviewState: ReviewState.UNREVIEWED,
      preserveState: PreserveState.NOT_STARTED,
      verificationState: VerificationState.NOT_VERIFIED,
      confidence: Confidence.LOW,
      origin: EvidenceOriginType.INFERRED,
      provenanceSource: `parent-finding:${findingId}`,
      notes: `Inferred parent object for finding ${findingId}`,
      aliases: []
    });
  }

  private async generateDuplicateCandidates(normalizationRunId: string, objectIds: string[]) {
    const byName = new Map<string, string[]>();
    for (const objectId of objectIds) {
      const objectRecord = await this.objectRepository.getById(objectId);
      if (!objectRecord) continue;
      const key = objectRecord.displayName.toLowerCase();
      byName.set(key, [...(byName.get(key) ?? []), objectId]);
    }

    for (const ids of byName.values()) {
      if (ids.length < 2) continue;
      await this.evidenceRepository.createDuplicateCandidate({
        normalizationRunId,
        objectAId: ids[0],
        objectBId: ids[1],
        rationale: "Matching normalized display names"
      });
    }
  }
}
