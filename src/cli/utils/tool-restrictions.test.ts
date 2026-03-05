/**
 * Tool restrictions per phase validation tests
 *
 * Verifies that:
 * 1. Plan templates document the Access field
 * 2. Agent profiles document phase-level access
 * 3. Create-plan skill references access level assignment
 * 4. Execute-plan skill references access enforcement and verification checks
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

describe('tool restrictions per phase', () => {
  describe('plan templates - Access field', () => {
    it('plans-templates.md should document the Access field', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/patterns/plans-templates.md'),
        'utf-8'
      );
      expect(content).toContain('**Access**: full-access');
    });

    it('plans-templates.mdc should document the Access field', () => {
      const content = readFileSync(
        join(ROOT, 'rules/patterns/plans-templates.mdc'),
        'utf-8'
      );
      expect(content).toContain('**Access**: full-access');
    });

    it('plans-templates.md should document access levels table', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/patterns/plans-templates.md'),
        'utf-8'
      );
      expect(content).toMatch(/phase access levels/i);
      expect(content).toContain('full-access');
      expect(content).toContain('read-only');
    });

    it('plans-templates.mdc should document access levels table', () => {
      const content = readFileSync(
        join(ROOT, 'rules/patterns/plans-templates.mdc'),
        'utf-8'
      );
      expect(content).toMatch(/phase access levels/i);
    });
  });

  describe('agent profiles - phase-level access', () => {
    it('agent-profiles.md should have Phase-Level Access section', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/core/agent-profiles.md'),
        'utf-8'
      );
      expect(content).toMatch(/phase-level access/i);
    });

    it('agent-profiles.mdc should have Phase-Level Access section', () => {
      const content = readFileSync(
        join(ROOT, 'rules/core/agent-profiles.mdc'),
        'utf-8'
      );
      expect(content).toMatch(/phase-level access/i);
    });

    it('should document full-access and read-only phase access', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/core/agent-profiles.md'),
        'utf-8'
      );
      expect(content).toContain('full-access');
      expect(content).toContain('read-only');
    });

    it('should mention backward compatibility', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/core/agent-profiles.md'),
        'utf-8'
      );
      expect(content).toMatch(/backward compat/i);
    });

    it('should mention high-complexity verification', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/core/agent-profiles.md'),
        'utf-8'
      );
      expect(content).toMatch(/high-complexity.*verif/i);
    });
  });

  describe('create-plan skill - access level assignment', () => {
    it('create-plan-skill.md should reference phase access level assignment', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/create-plan-skill.md'),
        'utf-8'
      );
      expect(content).toMatch(/phase access level assignment/i);
    });

    it('create-plan-skill.mdc should reference phase access level assignment', () => {
      const content = readFileSync(
        join(ROOT, 'rules/skills/create-plan-skill.mdc'),
        'utf-8'
      );
      expect(content).toMatch(/phase access level assignment/i);
    });

    it('should define auto-assignment rules', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/create-plan-skill.md'),
        'utf-8'
      );
      expect(content).toMatch(/auto-assignment/i);
      expect(content).toContain('full-access');
      expect(content).toContain('read-only');
    });

    it('should list read-only trigger keywords', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/create-plan-skill.md'),
        'utf-8'
      );
      expect(content).toContain('review');
      expect(content).toContain('audit');
      expect(content).toContain('analysis');
    });
  });

  describe('execute-plan skill - access enforcement', () => {
    it('execute-plan-skill.md should reference phase access enforcement', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/execute-plan-skill.md'),
        'utf-8'
      );
      expect(content).toMatch(/phase access enforcement/i);
    });

    it('execute-plan-skill.mdc should reference phase access enforcement', () => {
      const content = readFileSync(
        join(ROOT, 'rules/skills/execute-plan-skill.mdc'),
        'utf-8'
      );
      expect(content).toMatch(/phase access enforcement/i);
    });

    it('should describe parsing the Access field', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/execute-plan-skill.md'),
        'utf-8'
      );
      expect(content).toContain('**Access**: full-access');
      expect(content).toContain('**Access**: read-only');
    });

    it('should mention backward compatibility default', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/execute-plan-skill.md'),
        'utf-8'
      );
      expect(content).toMatch(/default.*full-access/i);
    });
  });

  describe('execute-plan skill - high-complexity verification', () => {
    it('execute-plan-skill.md should reference high-complexity verification check', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/execute-plan-skill.md'),
        'utf-8'
      );
      expect(content).toMatch(/high-complexity verification/i);
    });

    it('execute-plan-skill.mdc should reference high-complexity verification check', () => {
      const content = readFileSync(
        join(ROOT, 'rules/skills/execute-plan-skill.mdc'),
        'utf-8'
      );
      expect(content).toMatch(/high-complexity verification/i);
    });

    it('should mention complexity threshold of 7', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/execute-plan-skill.md'),
        'utf-8'
      );
      expect(content).toMatch(/complexity.*[≥7]|7/);
    });

    it('should describe scope drift detection', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/execute-plan-skill.md'),
        'utf-8'
      );
      expect(content).toMatch(/scope drift/i);
    });

    it('should specify non-blocking behavior', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/execute-plan-skill.md'),
        'utf-8'
      );
      expect(content).toMatch(/not block/i);
    });
  });
});
