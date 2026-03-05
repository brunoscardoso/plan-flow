/**
 * Audit trail validation tests
 *
 * Verifies that:
 * 1. Audit trail reference document exists and defines all event types
 * 2. Index files have COR-AUD entries
 * 3. Skill files reference audit logging
 * 4. Agent profiles include flow/audit.log in writable dirs
 * 5. Autopilot mode mentions audit trail
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

describe('audit trail', () => {
  describe('audit-trail.md reference document', () => {
    const filePath = join(ROOT, '.claude/resources/core/audit-trail.md');

    it('should exist', () => {
      expect(existsSync(filePath)).toBe(true);
    });

    it('should define COR-AUD-1 event types section', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('COR-AUD-1');
    });

    it('should define COR-AUD-2 integration rules section', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('COR-AUD-2');
    });

    const eventTypes = [
      'command_start',
      'command_end',
      'phase_start',
      'phase_end',
      'file_created',
      'file_modified',
      'file_deleted',
      'verification',
      'error',
      'checkpoint',
    ];

    it.each(eventTypes)('should define %s event type', (eventType) => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain(eventType);
    });

    it('should specify JSONL format', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/JSONL|JSON Lines/);
    });

    it('should specify append-only behavior', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content.toLowerCase()).toContain('append');
    });

    it('should specify flow/audit.log as file location', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('flow/audit.log');
    });

    it('should specify that audit log is NOT archived', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/not archived/i);
    });
  });

  describe('audit-trail.mdc reference document', () => {
    const filePath = join(ROOT, 'rules/core/audit-trail.mdc');

    it('should exist', () => {
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have YAML frontmatter', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/^---\n/);
    });

    it('should define all event types', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('command_start');
      expect(content).toContain('phase_start');
      expect(content).toContain('verification');
      expect(content).toContain('checkpoint');
    });
  });

  describe('index files - COR-AUD entries', () => {
    it('should have COR-AUD entries in .claude/resources/core/_index.md', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/core/_index.md'),
        'utf-8'
      );
      expect(content).toContain('COR-AUD-1');
      expect(content).toContain('COR-AUD-2');
    });

    it('should have COR-AUD entries in rules/core/_index.mdc', () => {
      const content = readFileSync(
        join(ROOT, 'rules/core/_index.mdc'),
        'utf-8'
      );
      expect(content).toContain('COR-AUD-1');
      expect(content).toContain('COR-AUD-2');
    });
  });

  describe('skill files (.md) - audit trail references', () => {
    const skills = [
      'execute-plan-skill.md',
      'discovery-skill.md',
      'create-plan-skill.md',
      'review-code-skill.md',
      'setup-skill.md',
    ];

    it.each(skills)('%s should reference audit trail', (skill) => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills', skill),
        'utf-8'
      );
      expect(content).toMatch(/audit trail/i);
    });

    it('execute-plan-skill.md should reference phase and file events', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/execute-plan-skill.md'),
        'utf-8'
      );
      expect(content).toContain('phase_start');
      expect(content).toContain('verification');
    });

    it.each(['discovery-skill.md', 'create-plan-skill.md', 'review-code-skill.md'])(
      '%s should reference command_start and command_end',
      (skill) => {
        const content = readFileSync(
          join(ROOT, '.claude/resources/skills', skill),
          'utf-8'
        );
        expect(content).toContain('command_start');
        expect(content).toContain('command_end');
      }
    );
  });

  describe('skill files (.mdc) - audit trail references', () => {
    const skills = [
      'execute-plan-skill.mdc',
      'discovery-skill.mdc',
      'create-plan-skill.mdc',
      'review-code-skill.mdc',
      'setup-skill.mdc',
    ];

    it.each(skills)('%s should reference audit trail', (skill) => {
      const content = readFileSync(
        join(ROOT, 'rules/skills', skill),
        'utf-8'
      );
      expect(content).toMatch(/audit trail/i);
    });
  });

  describe('agent profiles - flow/audit.log in writable dirs', () => {
    it('agent-profiles.md should include flow/audit.log in writable dirs', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/core/agent-profiles.md'),
        'utf-8'
      );
      expect(content).toContain('flow/audit.log');
    });

    it('agent-profiles.mdc should include flow/audit.log in writable dirs', () => {
      const content = readFileSync(
        join(ROOT, 'rules/core/agent-profiles.mdc'),
        'utf-8'
      );
      expect(content).toContain('flow/audit.log');
    });

    it('should include flow/audit.log for read-only profile', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/core/agent-profiles.md'),
        'utf-8'
      );
      // The read-only section should mention audit.log
      const readOnlySection = content.split('### write-restricted')[0];
      expect(readOnlySection).toContain('flow/audit.log');
    });

    it('should include flow/audit.log for write-restricted profile', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/core/agent-profiles.md'),
        'utf-8'
      );
      // The write-restricted section
      const sections = content.split('### ');
      const writeRestricted = sections.find((s) => s.startsWith('write-restricted'));
      expect(writeRestricted).toContain('flow/audit.log');
    });
  });

  describe('autopilot mode - audit trail awareness', () => {
    it('autopilot-mode.md should mention audit trail', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/core/autopilot-mode.md'),
        'utf-8'
      );
      expect(content).toMatch(/audit trail/i);
    });

    it('autopilot-mode.mdc should mention audit trail', () => {
      const content = readFileSync(
        join(ROOT, 'rules/core/autopilot-mode.mdc'),
        'utf-8'
      );
      expect(content).toMatch(/audit trail/i);
    });

    it('should note that flow/audit.log is NOT archived', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/core/autopilot-mode.md'),
        'utf-8'
      );
      expect(content).toContain('flow/audit.log');
      expect(content).toMatch(/not.*archived/i);
    });
  });
});
