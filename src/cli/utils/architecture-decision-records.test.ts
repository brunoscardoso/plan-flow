/**
 * Architecture Decision Records validation tests
 *
 * Verifies that:
 * 1. Brain-capture defines ADR template with Status, Consequences, Scope
 * 2. Brain patterns reference ADR file naming
 * 3. Discovery skill references ADR generation
 * 4. Create-plan skill references ADR references
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

describe('architecture decision records', () => {
  describe('brain-capture.md - ADR template', () => {
    const filePath = join(ROOT, '.claude/resources/core/brain-capture.md');

    it('should define ADR section (3b)', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/architecture decision records/i);
    });

    it('should define ADR file naming with adr- prefix', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('adr-');
    });

    it('should define Status field with valid values', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('proposed');
      expect(content).toContain('accepted');
      expect(content).toContain('superseded');
      expect(content).toContain('deprecated');
    });

    it('should define Consequences section in template', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('## Consequences');
    });

    it('should define Scope tags', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('api-design');
      expect(content).toContain('data-model');
      expect(content).toContain('architecture');
      expect(content).toContain('infrastructure');
      expect(content).toContain('security');
      expect(content).toContain('integration');
    });

    it('should define detection criteria', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/detection criteria/i);
    });
  });

  describe('brain-capture.mdc - ADR template', () => {
    const filePath = join(ROOT, 'rules/core/brain-capture.mdc');

    it('should define ADR section', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/architecture decision records/i);
    });

    it('should define adr- prefix naming', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('adr-');
    });

    it('should define scope tags', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('api-design');
      expect(content).toContain('data-model');
    });
  });

  describe('brain-patterns.md - ADR file naming', () => {
    it('should include ADR in file naming table', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/patterns/brain-patterns.md'),
        'utf-8'
      );
      expect(content).toContain('adr-{kebab-case}');
      expect(content).toContain('[[ADR:');
    });

    it('should document ADR naming rules', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/patterns/brain-patterns.md'),
        'utf-8'
      );
      expect(content).toContain('adr-jwt-over-sessions');
    });
  });

  describe('brain-patterns.mdc - ADR file naming', () => {
    it('should include ADR naming convention', () => {
      const content = readFileSync(
        join(ROOT, 'rules/patterns/brain-patterns.mdc'),
        'utf-8'
      );
      expect(content).toContain('adr-');
    });
  });

  describe('discovery-skill.md - ADR generation', () => {
    it('should reference ADR generation', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/discovery-skill.md'),
        'utf-8'
      );
      expect(content).toMatch(/adr generation/i);
    });

    it('should define detection criteria for ADRs', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/discovery-skill.md'),
        'utf-8'
      );
      expect(content).toMatch(/architectural/i);
      expect(content).toContain('accepted');
    });

    it('should reference brain-capture ADR template', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/discovery-skill.md'),
        'utf-8'
      );
      expect(content).toContain('brain-capture');
    });
  });

  describe('discovery-skill.mdc - ADR generation', () => {
    it('should reference ADR generation', () => {
      const content = readFileSync(
        join(ROOT, 'rules/skills/discovery-skill.mdc'),
        'utf-8'
      );
      expect(content).toMatch(/adr generation/i);
    });
  });

  describe('create-plan-skill.md - ADR references', () => {
    it('should reference ADR references section', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/create-plan-skill.md'),
        'utf-8'
      );
      expect(content).toMatch(/adr references/i);
    });

    it('should describe searching brain/decisions for ADRs', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/create-plan-skill.md'),
        'utf-8'
      );
      expect(content).toContain('flow/brain/decisions/');
    });

    it('should show example ADR reference format', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/skills/create-plan-skill.md'),
        'utf-8'
      );
      expect(content).toContain('[[ADR:');
    });
  });

  describe('create-plan-skill.mdc - ADR references', () => {
    it('should reference ADR references section', () => {
      const content = readFileSync(
        join(ROOT, 'rules/skills/create-plan-skill.mdc'),
        'utf-8'
      );
      expect(content).toMatch(/adr references/i);
    });
  });
});
