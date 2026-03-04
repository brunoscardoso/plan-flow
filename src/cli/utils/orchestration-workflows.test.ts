/**
 * Orchestration workflow validation tests
 *
 * Verifies that:
 * 1. Workflow definition documents exist and define all 4 workflow types
 * 2. Autopilot mode documents reference all workflow types
 * 3. Flow command supports workflow type arguments
 * 4. Index files have COR-OW entries
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

const WORKFLOW_TYPES = ['feature', 'bugfix', 'refactor', 'security'];

function readFile(path: string): string {
  return readFileSync(path, 'utf-8');
}

describe('orchestration workflows', () => {
  describe('orchestration-workflows.md reference document', () => {
    const docPath = join(
      PACKAGE_ROOT,
      '.claude',
      'resources',
      'core',
      'orchestration-workflows.md'
    );

    it('should exist', () => {
      expect(existsSync(docPath)).toBe(true);
    });

    const content = readFile(docPath);

    it('should define all 4 workflow types', () => {
      for (const type of WORKFLOW_TYPES) {
        expect(content).toContain(`### ${type}`);
      }
    });

    it('should include COR-OW-1 and COR-OW-2 reference codes', () => {
      expect(content).toContain('COR-OW-1');
      expect(content).toContain('COR-OW-2');
    });

    it('should define complexity thresholds for each workflow', () => {
      expect(content).toContain('Complexity threshold');
      // feature and refactor: 3+, bugfix: 1+, security: 2+
      expect(content).toMatch(/feature.*3\+/s);
      expect(content).toMatch(/bugfix.*1\+/s);
      expect(content).toMatch(/security.*2\+/s);
    });

    it('should include input signals for each workflow', () => {
      expect(content).toContain('Input signals');
      // Each workflow should have signal keywords
      expect(content).toContain('"add"');
      expect(content).toContain('"fix"');
      expect(content).toContain('"refactor"');
      expect(content).toContain('"security"');
    });

    it('should define step sequences for each workflow', () => {
      // Feature has 6 steps
      expect(content).toContain('/discovery-plan');
      expect(content).toContain('/create-plan');
      expect(content).toContain('/execute-plan');
      expect(content).toContain('/review-code');
    });

    it('should include workflow selection guide', () => {
      expect(content).toContain('Workflow Selection Guide');
      expect(content).toContain('Priority order');
    });

    it('should include review-code variants table', () => {
      expect(content).toContain('Review-Code Variants');
      expect(content).toContain('Diagnostic');
      expect(content).toContain('Baseline');
      expect(content).toContain('Security audit');
    });
  });

  describe('orchestration-workflows.mdc reference document', () => {
    const docPath = join(
      PACKAGE_ROOT,
      'rules',
      'core',
      'orchestration-workflows.mdc'
    );

    it('should exist', () => {
      expect(existsSync(docPath)).toBe(true);
    });

    const content = readFile(docPath);

    it('should have YAML frontmatter with alwaysApply: false', () => {
      expect(content).toMatch(/^---\n/);
      expect(content).toContain('alwaysApply: false');
    });

    it('should define all 4 workflow types', () => {
      for (const type of WORKFLOW_TYPES) {
        expect(content).toContain(`### ${type}`);
      }
    });

    it('should include COR-OW-1 and COR-OW-2 reference codes', () => {
      expect(content).toContain('COR-OW-1');
      expect(content).toContain('COR-OW-2');
    });
  });

  describe('autopilot-mode.md workflow dispatch', () => {
    const docPath = join(
      PACKAGE_ROOT,
      '.claude',
      'resources',
      'core',
      'autopilot-mode.md'
    );
    const content = readFile(docPath);

    it('should include workflow type detection section', () => {
      expect(content).toContain('Workflow Type Detection');
    });

    it('should reference all workflow types in detection', () => {
      for (const type of WORKFLOW_TYPES) {
        expect(content).toContain(`**${type}**`);
      }
    });

    it('should have separate workflow step sequences', () => {
      expect(content).toContain('Feature Workflow (default)');
      expect(content).toContain('Bugfix Workflow');
      expect(content).toContain('Refactor Workflow');
      expect(content).toContain('Security Workflow');
    });

    it('should reference orchestration-workflows.md', () => {
      expect(content).toContain('orchestration-workflows.md');
    });

    it('should have workflow-aware checkpoints', () => {
      expect(content).toContain('feature, refactor, security');
      expect(content).toContain('all workflows');
      expect(content).toContain('security only');
    });

    it('should exempt bugfix from discovery gate', () => {
      expect(content).toContain('bugfix workflow is exempt');
    });
  });

  describe('autopilot-mode.mdc workflow dispatch', () => {
    const docPath = join(
      PACKAGE_ROOT,
      'rules',
      'core',
      'autopilot-mode.mdc'
    );
    const content = readFile(docPath);

    it('should include workflow type detection section', () => {
      expect(content).toContain('Workflow Type Detection');
    });

    it('should reference all workflow types in detection', () => {
      for (const type of WORKFLOW_TYPES) {
        expect(content).toContain(`**${type}**`);
      }
    });

    it('should have separate workflow step sequences', () => {
      expect(content).toContain('Feature Workflow (default)');
      expect(content).toContain('Bugfix Workflow');
      expect(content).toContain('Refactor Workflow');
      expect(content).toContain('Security Workflow');
    });

    it('should use Cursor command paths (.cursor/commands/)', () => {
      expect(content).toContain('.cursor/commands/');
    });

    it('should have workflow-aware checkpoints', () => {
      expect(content).toContain('feature, refactor, security');
      expect(content).toContain('all workflows');
      expect(content).toContain('security only');
    });
  });

  describe('flow.md command - workflow type support', () => {
    const docPath = join(PACKAGE_ROOT, '.claude', 'commands', 'flow.md');
    const content = readFile(docPath);

    it('should document all workflow types in help', () => {
      for (const type of WORKFLOW_TYPES) {
        expect(content).toContain(type);
      }
    });

    it('should support -enable with workflow type argument', () => {
      expect(content).toContain('-enable [type]');
      expect(content).toContain('-enable <type>');
    });

    it('should document workflow step sequences in help', () => {
      expect(content).toContain('contracts');
      expect(content).toContain('discovery');
      expect(content).toContain('archive');
    });

    it('should show workflow type in -status output', () => {
      expect(content).toContain('Workflow type');
    });

    it('should store workflow type in file content', () => {
      expect(content).toContain('Workflow type in file content');
    });
  });

  describe('index files - COR-OW entries', () => {
    it('_index.md should reference orchestration workflows', () => {
      const content = readFile(
        join(PACKAGE_ROOT, '.claude', 'resources', 'core', '_index.md')
      );
      expect(content).toContain('COR-OW-1');
      expect(content).toContain('COR-OW-2');
      expect(content).toContain('orchestration-workflows.md');
    });

    it('_index.mdc should reference orchestration workflows', () => {
      const content = readFile(
        join(PACKAGE_ROOT, 'rules', 'core', '_index.mdc')
      );
      expect(content).toContain('COR-OW-1');
      expect(content).toContain('COR-OW-2');
      expect(content).toContain('orchestration-workflows.mdc');
    });
  });
});
