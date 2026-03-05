/**
 * Auto Security Review validation tests
 *
 * Verifies that:
 * 1. Execute-plan skill defines auto security scan step 7.8
 * 2. Handoff patterns include security scan results field
 * 3. Orchestration workflows reference auto security scan
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

describe('auto security review', () => {
  describe('execute-plan-skill.md - auto security scan', () => {
    const filePath = join(
      ROOT,
      '.claude/resources/skills/execute-plan-skill.md'
    );

    it('should define step 7.8 auto security scan', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/step 7\.8.*auto security scan/i);
    });

    it('should reference PTN-SEC-1 patterns', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('PTN-SEC-1');
    });

    it('should scan only changed files', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('git diff');
    });

    it('should add security line to verification report', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/Security:.*PASS.*WARN/);
    });

    it('should be non-blocking', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/[Nn]on-[Bb]locking/);
    });

    it('should include handoff integration', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Auto Security Scan Results');
    });

    it('should never show actual secret values', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/[Nn]ever show.*values|[Vv]alues are NOT shown/);
    });
  });

  describe('execute-plan-skill.mdc - auto security scan', () => {
    it('should define auto security scan step', () => {
      const content = readFileSync(
        join(ROOT, 'rules/skills/execute-plan-skill.mdc'),
        'utf-8'
      );
      expect(content).toMatch(/auto security scan/i);
    });

    it('should reference PTN-SEC-1', () => {
      const content = readFileSync(
        join(ROOT, 'rules/skills/execute-plan-skill.mdc'),
        'utf-8'
      );
      expect(content).toContain('PTN-SEC-1');
    });
  });

  describe('handoff-patterns.md - security scan results', () => {
    const filePath = join(
      ROOT,
      '.claude/resources/patterns/handoff-patterns.md'
    );

    it('should include auto security scan results section', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Auto Security Scan Results');
    });

    it('should define PASS and WARN statuses', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('PASS');
      expect(content).toContain('WARN');
    });

    it('should be backward compatible when absent', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/backward compatible/i);
    });
  });

  describe('handoff-patterns.mdc - security scan results', () => {
    it('should include auto security scan results', () => {
      const content = readFileSync(
        join(ROOT, 'rules/patterns/handoff-patterns.mdc'),
        'utf-8'
      );
      expect(content).toContain('Auto Security Scan Results');
    });
  });

  describe('orchestration-workflows.md - auto security scan', () => {
    const filePath = join(
      ROOT,
      '.claude/resources/core/orchestration-workflows.md'
    );

    it('should reference auto security scan', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/auto security scan/i);
    });

    it('should mention all workflows', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/all workflows/i);
    });

    it('should reference Step 7.8', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Step 7.8');
    });

    it('should mention security workflow Step 5 integration', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/step 5.*security.*verification/i);
    });
  });

  describe('orchestration-workflows.mdc - auto security scan', () => {
    it('should reference auto security scan', () => {
      const content = readFileSync(
        join(ROOT, 'rules/core/orchestration-workflows.mdc'),
        'utf-8'
      );
      expect(content).toMatch(/auto security scan/i);
    });
  });
});
