/**
 * Parallel Review Agents validation tests
 *
 * Verifies that:
 * 1. Parallel review patterns define threshold, grouping, and aggregation
 * 2. Review-code skill references parallel review mode
 * 3. Review-pr skill references parallel review mode
 * 4. Pattern indexes include PTN-PRV entries
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

describe('parallel review agents', () => {
  describe('parallel-review-patterns.md', () => {
    const filePath = join(
      ROOT,
      '.claude/resources/patterns/parallel-review-patterns.md'
    );

    it('should define activation threshold of 8 files', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('8 or more changed files');
    });

    it('should define directory-based file grouping (PTN-PRV-1)', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('PTN-PRV-1');
      expect(content).toMatch(/directory.*group/i);
    });

    it('should define maximum 4 groups rule', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Maximum 4 groups');
    });

    it('should define agent spawn and aggregation (PTN-PRV-2)', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('PTN-PRV-2');
      expect(content).toMatch(/aggregation/i);
    });

    it('should define structured findings format', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Structured Findings Format');
      expect(content).toContain('Severity');
      expect(content).toContain('Fix Complexity');
    });

    it('should define coordinator responsibilities', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Coordinator Responsibilities');
    });

    it('should define brain capture coordination', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Brain Capture Coordination');
      expect(content).toContain('Only the coordinator writes to brain files');
    });

    it('should define backward compatibility', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Backward Compatibility');
    });

    it('should define cross-group analysis', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Cross-Group Analysis');
    });

    it('should define deduplication of cross-cutting concerns', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/[Dd]eduplicate/);
    });
  });

  describe('parallel-review-patterns.mdc', () => {
    const filePath = join(
      ROOT,
      'rules/patterns/parallel-review-patterns.mdc'
    );

    it('should define activation threshold', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('8 or more changed files');
    });

    it('should define PTN-PRV-1 and PTN-PRV-2', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('PTN-PRV-1');
      expect(content).toContain('PTN-PRV-2');
    });

    it('should have YAML frontmatter', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/^---\n/);
      expect(content).toContain('alwaysApply: false');
    });
  });

  describe('review-code-skill.md - parallel mode', () => {
    const filePath = join(
      ROOT,
      '.claude/resources/skills/review-code-skill.md'
    );

    it('should reference parallel review mode', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/parallel review mode/i);
    });

    it('should reference the threshold', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('8 or more changed files');
    });

    it('should reference parallel-review-patterns', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('parallel-review-patterns');
    });

    it('should specify coordinator-only brain capture', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain(
        'Only the coordinator writes to brain files'
      );
    });
  });

  describe('review-code-skill.mdc - parallel mode', () => {
    it('should reference parallel review mode', () => {
      const content = readFileSync(
        join(ROOT, 'rules/skills/review-code-skill.mdc'),
        'utf-8'
      );
      expect(content).toMatch(/parallel review mode/i);
    });
  });

  describe('review-pr-skill.md - parallel mode', () => {
    const filePath = join(
      ROOT,
      '.claude/resources/skills/review-pr-skill.md'
    );

    it('should reference parallel review mode', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/parallel review mode/i);
    });

    it('should reference the threshold', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('8 or more changed files');
    });

    it('should reference parallel-review-patterns', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('parallel-review-patterns');
    });

    it('should mention PR metadata passed to agents', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('PR metadata');
    });
  });

  describe('review-pr-skill.mdc - parallel mode', () => {
    it('should reference parallel review mode', () => {
      const content = readFileSync(
        join(ROOT, 'rules/skills/review-pr-skill.mdc'),
        'utf-8'
      );
      expect(content).toMatch(/parallel review mode/i);
    });
  });

  describe('pattern indexes', () => {
    it('should include PTN-PRV entries in .md index', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/patterns/_index.md'),
        'utf-8'
      );
      expect(content).toContain('PTN-PRV-1');
      expect(content).toContain('PTN-PRV-2');
    });

    it('should include PTN-PRV entries in .mdc index', () => {
      const content = readFileSync(
        join(ROOT, 'rules/patterns/_index.mdc'),
        'utf-8'
      );
      expect(content).toContain('PTN-PRV-1');
      expect(content).toContain('PTN-PRV-2');
    });

    it('should include parallel reviews in quick reference', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/patterns/_index.md'),
        'utf-8'
      );
      expect(content).toContain('PTN-PRV-*');
    });
  });
});
