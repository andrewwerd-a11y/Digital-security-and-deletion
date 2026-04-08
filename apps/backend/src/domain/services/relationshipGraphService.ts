import type { RelationshipRepository } from "../repositories/interfaces.js";
import type { RelationshipRecord, RelationshipTraversalQuery } from "../repositories/types.js";

export class RelationshipGraphService {
  constructor(private readonly relationshipRepository: RelationshipRepository) {}

  async createRelationship(
    input: Omit<RelationshipRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<RelationshipRecord> {
    return this.relationshipRepository.create(input);
  }

  async updateRelationship(
    relationshipId: string,
    patch: Partial<Omit<RelationshipRecord, "id" | "createdAt" | "updatedAt">>
  ): Promise<RelationshipRecord> {
    return this.relationshipRepository.update(relationshipId, patch);
  }

  async getRelationship(relationshipId: string): Promise<RelationshipRecord | null> {
    return this.relationshipRepository.getById(relationshipId);
  }

  async listRelationshipsForObject(objectId: string): Promise<RelationshipRecord[]> {
    return this.relationshipRepository.listForObject(objectId);
  }

  async traverseDependencies(objectId: string, query?: RelationshipTraversalQuery): Promise<RelationshipRecord[]> {
    return this.relationshipRepository.listDependents(objectId, query);
  }

  async findDuplicates(objectId: string): Promise<RelationshipRecord[]> {
    return this.relationshipRepository.listDuplicates(objectId);
  }
}
