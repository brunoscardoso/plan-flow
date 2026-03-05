/**
 * Eval-Driven Development validation tests
 *
 * Verifies that:
 * 1. Plan templates define Evals field in phase template
 * 2. Plan patterns include eval writing guidelines
 * 3. Execute-plan skill defines Step 5.5 for eval execution
 * 4. Create-plan skill generates evals per phase
 * 5. Both .md and .mdc files have matching content
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

describe('eval-driven development', () => {
  describe('plans-templates.md - eval format', () => {
    const filePath = join(
      ROOT,
      '.claude/resources/patterns/plans-templates.md'
    );

    it('should define Evals field in phase template', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/\*\*Evals\*\*/);
    });

    it('should define completed eval format with pass markers', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('✅');
      expect(content).toContain('❌');
    });

    it('should define pass@k format', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/pass@/);
      expect(content).toMatch(/k=\d/);
    });

    it('should note evals are optional per phase', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/[Oo]ptional.*per phase/);
    });

    it('should include eval writing guidelines', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/concrete.*verifiable/i);
    });
  });

  describe('plans-templates.mdc - eval format', () => {
    const filePath = join(ROOT, 'rules/patterns/plans-templates.mdc');

    it('should define Evals field in phase template', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/\*\*Evals\*\*/);
    });

    it('should define completed eval format with pass markers', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('✅');
      expect(content).toContain('❌');
    });
  });

  describe('plans-patterns.md - eval rules', () => {
    const filePath = join(
      ROOT,
      '.claude/resources/patterns/plans-patterns.md'
    );

    it('should include Evals in phase structure fields', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/Evals.*[Oo]ptional.*testable.*assertions/);
    });

    it('should forbid vague evals', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/DON'T Write Vague Evals/);
    });
  });

  describe('plans-patterns.mdc - eval rules', () => {
    const filePath = join(ROOT, 'rules/patterns/plans-patterns.mdc');

    it('should forbid vague evals', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/DON'T Write Vague Evals/);
    });
  });

  describe('execute-plan-skill.md - eval execution', () => {
    const filePath = join(
      ROOT,
      '.claude/resources/skills/execute-plan-skill.md'
    );

    it('should define Step 5.5 for eval execution', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/Step 5\.5.*Run Phase Evals/i);
    });

    it('should define pass@k tracking', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/pass@/);
    });

    it('should define max 3 eval retry attempts', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/[Mm]aximum 3 attempts/);
    });

    it('should add Evals line to verification report', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/Evals:.*passed.*pass@k/);
    });

    it('should define eval_result audit event', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('eval_result');
    });

    it('should be backward compatible when no evals defined', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/[Bb]ackward compatible/);
    });
  });

  describe('execute-plan-skill.mdc - eval execution', () => {
    const filePath = join(ROOT, 'rules/skills/execute-plan-skill.mdc');

    it('should define Step 5.5 for eval execution', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/Step 5\.5.*Run Phase Evals/i);
    });

    it('should define eval_result audit event', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('eval_result');
    });

    it('should add Evals line to verification report', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/Evals:.*passed.*pass@k/);
    });
  });

  describe('create-plan-skill.md - eval generation', () => {
    const filePath = join(
      ROOT,
      '.claude/resources/skills/create-plan-skill.md'
    );

    it('should instruct generating evals per phase', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/[Gg]enerate 1-5.*eval/);
    });

    it('should skip evals for trivial phases', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/[Ss]kip evals.*trivial|complexity <= 2/);
    });

    it('should link AC- criteria to evals', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/AC-.*acceptance criteria/i);
    });
  });

  describe('create-plan-skill.mdc - eval generation', () => {
    const filePath = join(ROOT, 'rules/skills/create-plan-skill.mdc');

    it('should instruct generating evals per phase', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/[Gg]enerate 1-5.*eval/);
    });
  });
});
