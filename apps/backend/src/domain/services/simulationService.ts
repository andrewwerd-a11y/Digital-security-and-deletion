import { TrustProfile } from "@dsd/shared";
import type { SimulationRecord } from "../repositories/types.js";
import type { SimulationRepository } from "../repositories/interfaces.js";

export interface CreateSimulationInput {
  actionCandidateType: string;
  actionType: string;
  targetObjectIds: string[];
  requestedScope: string;
  trustProfile: TrustProfile;
  notes?: string;
}

export class SimulationService {
  constructor(private readonly simulationRepository: SimulationRepository) {}

  async createSimulation(input: CreateSimulationInput): Promise<SimulationRecord> {
    const consequenceSummary = [
      `candidate=${input.actionCandidateType}`,
      `action=${input.actionType}`,
      `targets=${input.targetObjectIds.length}`,
      `scope=${input.requestedScope}`,
      `trust=${input.trustProfile}`
    ].join("; ");

    return this.simulationRepository.create({
      actionCandidateType: input.actionCandidateType,
      actionType: input.actionType,
      targetObjectIds: input.targetObjectIds,
      requestedScope: input.requestedScope,
      trustProfile: input.trustProfile,
      notes: input.notes ?? null,
      consequenceSummary
    });
  }

  async getSimulation(simulationId: string): Promise<SimulationRecord | null> {
    return this.simulationRepository.getById(simulationId);
  }
}
