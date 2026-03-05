/**
 * Autopilot progress validation tests
 *
 * Verifies that:
 * 1. Progress pattern document exists and defines format
 * 2. Index files have PTN-APR entries
 * 3. Autopilot mode references progress tracking
 * 4. Flow command references progress file cleanup
 * 5. Session-start hook reads autopilot-progress.md
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

const ROOT = findPackageRoot();

describe('autopilot progress', () => {
  describe('autopilot-progress-patterns.md reference document', () => {
    const filePath = join(
      ROOT,
      '.claude/resources/patterns/autopilot-progress-patterns.md'
    );

    it('should exist', () => {
      expect(existsSync(filePath)).toBe(true);
    });

    it('should define PTN-APR-1 progress file format', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('PTN-APR-1');
    });

    it('should define PTN-APR-2 lifecycle rules', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('PTN-APR-2');
    });

    it('should define progress file location', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('flow/state/autopilot-progress.md');
    });

    it('should define step status values', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('done');
      expect(content).toContain('in-progress');
      expect(content).toContain('pending');
      expect(content).toContain('skipped');
    });

    it('should define checkpoint recording', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/checkpoint/i);
      expect(content).toContain('approved');
      expect(content).toContain('rejected');
    });

    it('should define workflow-specific step tables', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/feature.*6 steps/i);
      expect(content).toMatch(/bugfix.*5 steps/i);
      expect(content).toMatch(/refactor.*6 steps/i);
      expect(content).toMatch(/security.*6 steps/i);
    });

    it('should define backward compatibility', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/backward compat/i);
    });
  });

  describe('autopilot-progress-patterns.mdc reference document', () => {
    const filePath = join(
      ROOT,
      'rules/patterns/autopilot-progress-patterns.mdc'
    );

    it('should exist', () => {
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have YAML frontmatter', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/^---\n/);
    });

    it('should define PTN-APR-1 and PTN-APR-2', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('PTN-APR-1');
      expect(content).toContain('PTN-APR-2');
    });
  });

  describe('index files - PTN-APR entries', () => {
    it('patterns _index.md should reference autopilot progress', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/patterns/_index.md'),
        'utf-8'
      );
      expect(content).toContain('PTN-APR-1');
      expect(content).toContain('PTN-APR-2');
    });

    it('patterns _index.mdc should reference autopilot progress', () => {
      const content = readFileSync(
        join(ROOT, 'rules/patterns/_index.mdc'),
        'utf-8'
      );
      expect(content).toContain('PTN-APR-1');
      expect(content).toContain('PTN-APR-2');
    });
  });

  describe('autopilot-mode - progress tracking', () => {
    it('autopilot-mode.md should reference progress tracking', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/core/autopilot-mode.md'),
        'utf-8'
      );
      expect(content).toMatch(/progress tracking/i);
      expect(content).toContain('autopilot-progress.md');
    });

    it('autopilot-mode.mdc should reference progress tracking', () => {
      const content = readFileSync(
        join(ROOT, 'rules/core/autopilot-mode.mdc'),
        'utf-8'
      );
      expect(content).toMatch(/progress tracking/i);
      expect(content).toContain('autopilot-progress.md');
    });

    it('should define when to write progress file', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/core/autopilot-mode.md'),
        'utf-8'
      );
      expect(content).toMatch(/workflow start/i);
      expect(content).toMatch(/step start/i);
      expect(content).toMatch(/step complete/i);
    });

    it('should define when to delete progress file', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/core/autopilot-mode.md'),
        'utf-8'
      );
      expect(content).toMatch(/archive step/i);
      expect(content).toContain('/flow -disable');
    });

    it('should define resumption behavior', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/core/autopilot-mode.md'),
        'utf-8'
      );
      expect(content).toMatch(/resumption/i);
      expect(content).toContain('in-progress');
    });
  });

  describe('flow command - progress file cleanup', () => {
    it('should reference autopilot-progress.md cleanup on disable', () => {
      const content = readFileSync(
        join(ROOT, '.claude/commands/flow.md'),
        'utf-8'
      );
      expect(content).toContain('autopilot-progress.md');
    });

    it('should show progress in status output', () => {
      const content = readFileSync(
        join(ROOT, '.claude/commands/flow.md'),
        'utf-8'
      );
      expect(content).toMatch(/autopilot-progress\.md exists/i);
    });
  });

  describe('session-start hook - progress file reading', () => {
    it('should reference autopilot-progress.md', () => {
      const content = readFileSync(
        join(ROOT, 'scripts/hooks/session-start.cjs'),
        'utf-8'
      );
      expect(content).toContain('autopilot-progress');
    });

    it('should parse feature name from progress file', () => {
      const content = readFileSync(
        join(ROOT, 'scripts/hooks/session-start.cjs'),
        'utf-8'
      );
      expect(content).toContain('featureMatch');
    });

    it('should parse step table for progress', () => {
      const content = readFileSync(
        join(ROOT, 'scripts/hooks/session-start.cjs'),
        'utf-8'
      );
      expect(content).toContain('doneSteps');
      expect(content).toContain('inProgressStep');
    });

    it('should output workflow progress context', () => {
      const content = readFileSync(
        join(ROOT, 'scripts/hooks/session-start.cjs'),
        'utf-8'
      );
      expect(content).toContain('Autopilot workflow in progress');
    });
  });
});
