import type { PlanPhase, ModelTier, ModelTierLevel } from './types.js';

/**
 * Map a complexity score to a model tier and model name.
 *
 * - 0-3  -> fast     (haiku)
 * - 4-5  -> standard (sonnet)
 * - 6-10 -> powerful (opus)
 */
function complexityToTier(complexity: number): { tier: ModelTierLevel; model: string } {
  if (complexity <= 3) {
    return { tier: 'fast', model: 'haiku' };
  }
  if (complexity <= 5) {
    return { tier: 'standard', model: 'sonnet' };
  }
  return { tier: 'powerful', model: 'opus' };
}

/**
 * Calculate model tiers for each plan phase based on complexity scores.
 *
 * Returns an empty array when model routing is disabled.
 */
export function calculateModelTiers(
  phases: PlanPhase[],
  modelRoutingEnabled: boolean,
): ModelTier[] {
  if (!modelRoutingEnabled) {
    return [];
  }

  return phases.map((phase) => {
    const { tier, model } = complexityToTier(phase.complexity);
    return {
      phase: phase.number,
      complexity: phase.complexity,
      tier,
      model,
    };
  });
}
