import type { ObjectRepository } from "../repositories/interfaces.js";
import type { CoreObjectRecord, ObjectSearchQuery } from "../repositories/types.js";

export class ObjectRegistryService {
  constructor(private readonly objectRepository: ObjectRepository) {}

  async createObject(input: Omit<CoreObjectRecord, "id" | "createdAt" | "updatedAt">): Promise<CoreObjectRecord> {
    return this.objectRepository.create(input);
  }

  async updateObject(
    objectId: string,
    patch: Partial<Omit<CoreObjectRecord, "id" | "createdAt" | "updatedAt">>
  ): Promise<CoreObjectRecord> {
    return this.objectRepository.update(objectId, patch);
  }

  async getObject(objectId: string): Promise<CoreObjectRecord | null> {
    return this.objectRepository.getById(objectId);
  }

  async searchObjects(query: ObjectSearchQuery): Promise<CoreObjectRecord[]> {
    return this.objectRepository.search(query);
  }
}
