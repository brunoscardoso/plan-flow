/**
 * Handoff document validation tests
 *
 * Verifies that:
 * 1. Handoff patterns document exists and defines structure template
 * 2. Index files have PTN-HND entries
 * 3. Skill files reference handoff production/consumption
 * 4. Command files reference handoff production/consumption
 * 5. Autopilot mode references handoff orchestration
 */

import { readFileSync, existsSync } from 'node:fs';
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

const PACKAGE_ROOT = findPackageRoot();

function readFile(path: string): string {
  return readFileSync(path, 'utf-8');
}

describe('handoff documents', () => {
  describe('handoff-patterns.md reference document', () => {
    const docPath = join(
      PACKAGE_ROOT,
      '.claude',
      'resources',
      'patterns',
      'handoff-patterns.md'
    );

    it('should exist', () => {
      expect(existsSync(docPath)).toBe(true);
    });

    const content = readFile(docPath);

    it('should include PTN-HND-1 and PTN-HND-2 reference codes', () => {
      expect(content).toContain('PTN-HND-1');
      expect(content).toContain('PTN-HND-2');
    });

    it('should define handoff document structure template', () => {
      expect(content).toContain('Handoff:');
      expect(content).toContain('Completed Step');
      expect(content).toContain('Key Outputs');
      expect(content).toContain('Focus Guidance');
      expect(content).toContain('Context References');
    });

    it('should define file naming convention', () => {
      expect(content).toContain('handoff_<feature>_<source>_to_<target>.md');
    });

    it('should define plan-aware review fields', () => {
      expect(content).toContain('Plan Alignment Data');
      expect(content).toContain('Planned Files');
      expect(content).toContain('Actually Modified Files');
      expect(content).toContain('Scope Notes');
    });

    it('should define handoff points for all 4 workflow types', () => {
      expect(content).toContain('Feature Workflow');
      expect(content).toContain('Bugfix Workflow');
      expect(content).toContain('Refactor Workflow');
      expect(content).toContain('Security Workflow');
    });

    it('should define production, consumption, and lifecycle rules', () => {
      expect(content).toContain('Production Rules');
      expect(content).toContain('Consumption Rules');
      expect(content).toContain('Lifecycle Rules');
    });

    it('should specify backward compatibility', () => {
      expect(content).toContain('Backward compatible');
    });

    it('should specify auto-archive behavior', () => {
      expect(content).toContain('Auto-archive');
    });
  });

  describe('handoff-patterns.mdc reference document', () => {
    const docPath = join(
      PACKAGE_ROOT,
      'rules',
      'patterns',
      'handoff-patterns.mdc'
    );

    it('should exist', () => {
      expect(existsSync(docPath)).toBe(true);
    });

    const content = readFile(docPath);

    it('should have YAML frontmatter with alwaysApply: false', () => {
      expect(content).toMatch(/^---\n/);
      expect(content).toContain('alwaysApply: false');
    });

    it('should include PTN-HND-1 and PTN-HND-2 reference codes', () => {
      expect(content).toContain('PTN-HND-1');
      expect(content).toContain('PTN-HND-2');
    });
  });

  describe('index files - PTN-HND entries', () => {
    it('patterns _index.md should reference handoff patterns', () => {
      const content = readFile(
        join(PACKAGE_ROOT, '.claude', 'resources', 'patterns', '_index.md')
      );
      expect(content).toContain('PTN-HND-1');
      expect(content).toContain('PTN-HND-2');
      expect(content).toContain('handoff-patterns.md');
    });

    it('patterns _index.mdc should reference handoff patterns', () => {
      const content = readFile(
        join(PACKAGE_ROOT, 'rules', 'patterns', '_index.mdc')
      );
      expect(content).toContain('PTN-HND-1');
      expect(content).toContain('PTN-HND-2');
      expect(content).toContain('handoff-patterns.mdc');
    });
  });

  describe('skill files (.md) - handoff references', () => {
    it('discovery-skill.md should reference handoff production', () => {
      const content = readFile(
        join(PACKAGE_ROOT, '.claude', 'resources', 'skills', 'discovery-skill.md')
      );
      expect(content).toContain('Handoff Production');
      expect(content).toContain('handoff_<feature>_discovery_to_plan.md');
    });

    it('create-plan-skill.md should reference handoff consumption and production', () => {
      const content = readFile(
        join(PACKAGE_ROOT, '.claude', 'resources', 'skills', 'create-plan-skill.md')
      );
      expect(content).toContain('Handoff Consumption');
      expect(content).toContain('Handoff Production');
      expect(content).toContain('handoff_<feature>_plan_to_execute.md');
    });

    it('execute-plan-skill.md should reference handoff consumption and production', () => {
      const content = readFile(
        join(PACKAGE_ROOT, '.claude', 'resources', 'skills', 'execute-plan-skill.md')
      );
      expect(content).toContain('Handoff Consumption');
      expect(content).toContain('Handoff Production');
      expect(content).toContain('handoff_<feature>_execute_to_review.md');
      expect(content).toContain('Plan Alignment Data');
    });

    it('review-code-skill.md should reference plan-aware review consumption', () => {
      const content = readFile(
        join(PACKAGE_ROOT, '.claude', 'resources', 'skills', 'review-code-skill.md')
      );
      expect(content).toContain('Plan-Aware Review');
      expect(content).toContain('Plan Alignment');
      expect(content).toContain('Scope Drift');
    });
  });

  describe('skill files (.mdc) - handoff references', () => {
    it('discovery-skill.mdc should reference handoff production', () => {
      const content = readFile(
        join(PACKAGE_ROOT, 'rules', 'skills', 'discovery-skill.mdc')
      );
      expect(content).toContain('Handoff Production');
      expect(content).toContain('handoff_<feature>_discovery_to_plan.md');
    });

    it('create-plan-skill.mdc should reference handoff consumption and production', () => {
      const content = readFile(
        join(PACKAGE_ROOT, 'rules', 'skills', 'create-plan-skill.mdc')
      );
      expect(content).toContain('Handoff Consumption');
      expect(content).toContain('Handoff Production');
    });

    it('execute-plan-skill.mdc should reference handoff with plan alignment', () => {
      const content = readFile(
        join(PACKAGE_ROOT, 'rules', 'skills', 'execute-plan-skill.mdc')
      );
      expect(content).toContain('Handoff');
      expect(content).toContain('Plan Alignment Data');
    });

    it('review-code-skill.mdc should reference plan-aware review', () => {
      const content = readFile(
        join(PACKAGE_ROOT, 'rules', 'skills', 'review-code-skill.mdc')
      );
      expect(content).toContain('Plan-Aware Review');
    });
  });

  describe('command files - handoff references', () => {
    it('discovery-plan.md should reference handoff production', () => {
      const content = readFile(
        join(PACKAGE_ROOT, '.claude', 'commands', 'discovery-plan.md')
      );
      expect(content).toContain('Handoff Production');
      expect(content).toContain('handoff_<feature>_discovery_to_plan.md');
    });

    it('create-plan.md should reference handoff consumption and production', () => {
      const content = readFile(
        join(PACKAGE_ROOT, '.claude', 'commands', 'create-plan.md')
      );
      expect(content).toContain('Handoff');
      expect(content).toContain('Consumption');
      expect(content).toContain('Production');
    });

    it('execute-plan.md should reference handoff with plan alignment', () => {
      const content = readFile(
        join(PACKAGE_ROOT, '.claude', 'commands', 'execute-plan.md')
      );
      expect(content).toContain('Handoff');
      expect(content).toContain('Plan Alignment Data');
    });

    it('review-code.md should reference plan-aware review', () => {
      const content = readFile(
        join(PACKAGE_ROOT, '.claude', 'commands', 'review-code.md')
      );
      expect(content).toContain('Plan-Aware Review');
      expect(content).toContain('Review Variants');
    });
  });

  describe('autopilot mode - handoff orchestration', () => {
    it('autopilot-mode.md should reference handoff produce/consume at step boundaries', () => {
      const content = readFile(
        join(PACKAGE_ROOT, '.claude', 'resources', 'core', 'autopilot-mode.md')
      );
      expect(content).toContain('Produce handoff');
      expect(content).toContain('Consume handoff');
      // Should archive handoffs
      expect(content).toContain('handoff files');
    });

    it('autopilot-mode.mdc should reference handoff produce/consume at step boundaries', () => {
      const content = readFile(
        join(PACKAGE_ROOT, 'rules', 'core', 'autopilot-mode.mdc')
      );
      expect(content).toContain('Produce handoff');
      expect(content).toContain('Consume handoff');
      expect(content).toContain('handoff files');
    });
  });
});
