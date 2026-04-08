import type { RecommendationRepository } from "../repositories/interfaces.js";

export class RecommendationService {
  constructor(private readonly recommendationRepository: RecommendationRepository) {}

  async listRecommendationsForObject(objectId: string) {
    return this.recommendationRepository.listByObject(objectId);
  }
}
