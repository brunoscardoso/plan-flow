/**
 * Security Scan on /setup validation tests
 *
 * Verifies that:
 * 1. Security scan patterns define secret detection, library inventory, posture levels
 * 2. Setup skill references security scan step
 * 3. Setup command references security scan
 * 4. Pattern indexes include PTN-SEC entries
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

describe('security scan on setup', () => {
  describe('security-scan-patterns.md', () => {
    const filePath = join(
      ROOT,
      '.claude/resources/patterns/security-scan-patterns.md'
    );

    it('should define secret detection patterns (PTN-SEC-1)', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('PTN-SEC-1');
      expect(content).toContain('API_KEY');
      expect(content).toContain('PRIVATE_KEY');
    });

    it('should define AWS credential pattern', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('AKIA');
    });

    it('should define exclusions for false positive reduction', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('process.env');
      expect(content).toMatch(/false positive/i);
    });

    it('should define .env hygiene checks', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('.gitignore');
      expect(content).toContain('.env.example');
    });

    it('should prohibit reading .env contents', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/[Nn]ever read.*\.env.*contents/);
    });

    it('should define security library inventory (PTN-SEC-2)', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('PTN-SEC-2');
      expect(content).toContain('Authentication');
      expect(content).toContain('Password Hashing');
      expect(content).toContain('Input Validation');
      expect(content).toContain('Security Headers');
      expect(content).toContain('Rate Limiting');
    });

    it('should list known security libraries', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('next-auth');
      expect(content).toContain('bcryptjs');
      expect(content).toContain('helmet');
      expect(content).toContain('zod');
    });

    it('should define posture levels (PTN-SEC-3)', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('PTN-SEC-3');
      expect(content).toContain('Good');
      expect(content).toContain('Caution');
      expect(content).toContain('Risk');
    });

    it('should define security baseline output format', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Security Baseline');
      expect(content).toContain('Posture');
      expect(content).toContain('Secrets Scan');
    });

    it('should never display secret values in warnings', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/[Nn]ot displayed/i);
    });
  });

  describe('security-scan-patterns.mdc', () => {
    const filePath = join(
      ROOT,
      'rules/patterns/security-scan-patterns.mdc'
    );

    it('should define PTN-SEC-1, PTN-SEC-2, PTN-SEC-3', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('PTN-SEC-1');
      expect(content).toContain('PTN-SEC-2');
      expect(content).toContain('PTN-SEC-3');
    });

    it('should have YAML frontmatter', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/^---\n/);
      expect(content).toContain('alwaysApply: false');
    });
  });

  describe('setup-skill.md - security scan step', () => {
    const filePath = join(
      ROOT,
      '.claude/resources/skills/setup-skill.md'
    );

    it('should reference security scan step 3.5', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/step 3\.5.*security scan/i);
    });

    it('should reference security-scan-patterns', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('security-scan-patterns');
    });

    it('should define secret detection substep', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Secret Detection');
    });

    it('should define .env hygiene substep', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('.env Hygiene');
    });

    it('should define security library inventory substep', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Security Library Inventory');
    });

    it('should define posture assessment substep', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Posture Assessment');
    });
  });

  describe('setup-skill.mdc - security scan step', () => {
    it('should reference security scan step', () => {
      const content = readFileSync(
        join(ROOT, 'rules/skills/setup-skill.mdc'),
        'utf-8'
      );
      expect(content).toMatch(/step 3\.5.*security scan/i);
    });
  });

  describe('setup.md command - security scan mention', () => {
    const filePath = join(ROOT, '.claude/commands/setup.md');

    it('should mention security scan in workflow', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/security scan/i);
    });

    it('should mention security in detects section', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/Security.*secrets/i);
    });
  });

  describe('pattern indexes', () => {
    it('should include PTN-SEC entries in .md index', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/patterns/_index.md'),
        'utf-8'
      );
      expect(content).toContain('PTN-SEC-1');
      expect(content).toContain('PTN-SEC-2');
      expect(content).toContain('PTN-SEC-3');
    });

    it('should include PTN-SEC entries in .mdc index', () => {
      const content = readFileSync(
        join(ROOT, 'rules/patterns/_index.mdc'),
        'utf-8'
      );
      expect(content).toContain('PTN-SEC-1');
      expect(content).toContain('PTN-SEC-2');
      expect(content).toContain('PTN-SEC-3');
    });

    it('should include security scan in quick reference', () => {
      const content = readFileSync(
        join(ROOT, '.claude/resources/patterns/_index.md'),
        'utf-8'
      );
      expect(content).toContain('PTN-SEC-*');
    });
  });
});
