/**
 * Iterative Discovery validation tests
 *
 * Verifies that:
 * 1. Discovery skill defines refinement loop (Step 9)
 * 2. Discovery skill defines max 3 rounds
 * 3. Discovery skill defines refinement history section
 * 4. Discovery command references refinement in Step 5
 * 5. Discovery patterns define refinement rules
 * 6. Both .md and .mdc files have matching content
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function findPackageRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    try {
      const pkg = JSON.parse(
        readFileSync(join(dir, 'package.json'), 'utf-8')
      );
      if (pkg.name === 'planflow-ai') return dir;
    } catch {
      // not found, keep walking up
    }
    dir = dirname(dir);
  }
  throw new Error('Could not find package root');
}

const ROOT = findPackageRoot();

describe('iterative discovery', () => {
  describe('discovery-skill.md - refinement loop', () => {
    const filePath = join(
      ROOT,
      '.claude/resources/skills/discovery-skill.md'
    );

    it('should define Step 9: Refinement Loop', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/Step 9.*Refinement Loop/i);
    });

    it('should define max 3 refinement rounds', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/[Mm]aximum 3 refinement rounds/);
    });

    it('should define Refinement History section template', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Refinement History');
    });

    it('should define accept refinement feedback substep', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/9\.1.*Accept Refinement Feedback/);
    });

    it('should define follow-up questions substep', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/9\.2.*Ask Follow-Up Questions/);
    });

    it('should define update document substep', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/9\.3.*Update Discovery Document/);
    });

    it('should define re-present document substep', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/9\.4.*Re-Present Document/);
    });

    it('should define round limit substep', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/9\.5.*Round Limit/);
    });

    it('should skip refinement in autopilot mode', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/autopilot.*[Ss]kip/i);
    });

    it('should mark re-asked questions as Refined', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('[Refined]');
    });

    it('should have Step 10: Knowledge Capture (renumbered)', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/Step 10.*Knowledge Capture/i);
    });
  });

  describe('discovery-skill.mdc - refinement loop', () => {
    const filePath = join(ROOT, 'rules/skills/discovery-skill.mdc');

    it('should define Step 9: Refinement Loop', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/Step 9.*Refinement Loop/i);
    });

    it('should define max 3 refinement rounds', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/[Mm]aximum 3 refinement rounds/);
    });

    it('should define Refinement History section', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Refinement History');
    });

    it('should mark re-asked questions as Refined', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('[Refined]');
    });
  });

  describe('discovery-plan.md - refinement wiring', () => {
    const filePath = join(ROOT, '.claude/commands/discovery-plan.md');

    it('should mention iterative refinement in help WORKFLOW', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/iterative refinement/i);
    });

    it('should describe refinement loop in Step 5', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/Refinement Loop.*when.*Refine discovery.*selected/is);
    });

    it('should track refinement round count with max 3', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/max 3/i);
    });

    it('should remove refine option after 3 rounds', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/refined 3 times|3 refinement rounds/i);
    });

    it('should reference Step 9 of the discovery skill', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/Step 9.*Refinement/i);
    });
  });

  describe('discovery-patterns.md - refinement rules', () => {
    const filePath = join(
      ROOT,
      '.claude/resources/patterns/discovery-patterns.md'
    );

    it('should define refinement loop rules', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/Refinement Loop Rules/i);
    });

    it('should define allowed refinement patterns', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Update the discovery document in-place');
    });

    it('should define forbidden refinement patterns', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/More than 3 refinement rounds/);
    });

    it('should include refinement history template', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Refinement History');
      expect(content).toContain('Areas Refined');
    });

    it('should forbid exceeding refinement round limit', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/DON'T Exceed Refinement Round Limit/);
    });

    it('should forbid creating new versions for refinements', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/DON'T Create New Versions for Refinements/);
    });

    it('should forbid re-asking all questions', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/DON'T Re-Ask All Questions During Refinement/);
    });
  });

  describe('discovery-patterns.mdc - refinement rules', () => {
    const filePath = join(ROOT, 'rules/patterns/discovery-patterns.mdc');

    it('should define refinement loop rules', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/Refinement Loop Rules/i);
    });

    it('should forbid exceeding refinement round limit', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/DON'T Exceed Refinement Round Limit/);
    });

    it('should include refinement history template', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Refinement History');
    });
  });
});
