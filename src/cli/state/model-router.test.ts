/**
 * Tests for model router
 */

import { calculateModelTiers } from './model-router.js';
import type { PlanPhase } from './types.js';

function makePhase(number: number, complexity: number): PlanPhase {
  return { number, name: `Phase ${number}`, complexity, dependencies: [], tasks: [] };
}

describe('calculateModelTiers', () => {
  it('should return empty array when model routing is disabled', () => {
    const phases = [makePhase(1, 5), makePhase(2, 8)];
    const tiers = calculateModelTiers(phases, false);
    expect(tiers).toEqual([]);
  });

  it('should map complexity 0-3 to fast/haiku', () => {
    const phases = [makePhase(1, 0), makePhase(2, 2), makePhase(3, 3)];
    const tiers = calculateModelTiers(phases, true);

    for (const tier of tiers) {
      expect(tier.tier).toBe('fast');
      expect(tier.model).toBe('haiku');
    }
  });

  it('should map complexity 4-5 to standard/sonnet', () => {
    const phases = [makePhase(1, 4), makePhase(2, 5)];
    const tiers = calculateModelTiers(phases, true);

    for (const tier of tiers) {
      expect(tier.tier).toBe('standard');
      expect(tier.model).toBe('sonnet');
    }
  });

  it('should map complexity 6-10 to powerful/opus', () => {
    const phases = [makePhase(1, 6), makePhase(2, 8), makePhase(3, 10)];
    const tiers = calculateModelTiers(phases, true);

    for (const tier of tiers) {
      expect(tier.tier).toBe('powerful');
      expect(tier.model).toBe('opus');
    }
  });

  it('should handle mixed complexities', () => {
    const phases = [
      makePhase(1, 2),
      makePhase(2, 5),
      makePhase(3, 9),
    ];

    const tiers = calculateModelTiers(phases, true);
    expect(tiers).toHaveLength(3);
    expect(tiers[0]).toEqual({ phase: 1, complexity: 2, tier: 'fast', model: 'haiku' });
    expect(tiers[1]).toEqual({ phase: 2, complexity: 5, tier: 'standard', model: 'sonnet' });
    expect(tiers[2]).toEqual({ phase: 3, complexity: 9, tier: 'powerful', model: 'opus' });
  });

  it('should return empty array for empty phases with routing enabled', () => {
    const tiers = calculateModelTiers([], true);
    expect(tiers).toEqual([]);
  });
});
