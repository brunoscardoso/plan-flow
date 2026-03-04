/**
 * Agent profile validation tests
 *
 * Verifies that:
 * 1. All command files have an AGENT_PROFILE header
 * 2. All referenced profiles are valid (read-only, write-restricted, full-access)
 * 3. Command-to-profile mapping is consistent with agent-profiles.md
 * 4. All skill files have a Tool Access section referencing a profile
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve package root (3 levels up from src/cli/utils/)
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

const VALID_PROFILES = ['read-only', 'write-restricted', 'full-access'];

const EXPECTED_COMMAND_PROFILES: Record<string, string> = {
  'discovery-plan.md': 'read-only',
  'create-plan.md': 'read-only',
  'create-contract.md': 'read-only',
  'review-code.md': 'read-only',
  'review-pr.md': 'read-only',
  'brain.md': 'write-restricted',
  'learn.md': 'write-restricted',
  'flow.md': 'write-restricted',
  'execute-plan.md': 'full-access',
  'setup.md': 'full-access',
  'write-tests.md': 'full-access',
};

const EXPECTED_SKILL_PROFILES: Record<string, string> = {
  'discovery-skill': 'read-only',
  'create-plan-skill': 'read-only',
  'create-contract-skill': 'read-only',
  'review-code-skill': 'read-only',
  'review-pr-skill': 'read-only',
  'brain-skill': 'write-restricted',
  'learn-skill': 'write-restricted',
  'execute-plan-skill': 'full-access',
  'setup-skill': 'full-access',
  'write-tests-skill': 'full-access',
};

function getCommandFiles(): string[] {
  const dir = join(PACKAGE_ROOT, '.claude', 'commands');
  return readdirSync(dir).filter((f) => f.endsWith('.md'));
}

function getSkillFiles(format: 'md' | 'mdc'): string[] {
  const dir =
    format === 'md'
      ? join(PACKAGE_ROOT, '.claude', 'resources', 'skills')
      : join(PACKAGE_ROOT, 'rules', 'skills');
  return readdirSync(dir).filter(
    (f) => f.endsWith(`.${format}`) && !f.startsWith('_')
  );
}

function readFile(path: string): string {
  return readFileSync(path, 'utf-8');
}

function extractProfile(content: string): string | null {
  const match = content.match(/\*\*AGENT_PROFILE:\s*([\w-]+)\*\*/);
  return match ? match[1] : null;
}

function extractSkillProfile(content: string): string | null {
  const match = content.match(
    /\*\*(read-only|write-restricted|full-access)\*\*\s*agent profile/
  );
  return match ? match[1] : null;
}

describe('agent profiles', () => {
  describe('agent-profiles.md reference document', () => {
    const profilePath = join(
      PACKAGE_ROOT,
      '.claude',
      'resources',
      'core',
      'agent-profiles.md'
    );
    const content = readFile(profilePath);

    it('should define all 3 profiles', () => {
      for (const profile of VALID_PROFILES) {
        expect(content).toContain(`### ${profile}`);
      }
    });

    it('should include COR-AG-1 and COR-AG-2 reference codes', () => {
      expect(content).toContain('COR-AG-1');
      expect(content).toContain('COR-AG-2');
    });

    it('should include command mapping table', () => {
      for (const cmd of Object.keys(EXPECTED_COMMAND_PROFILES)) {
        const cmdName = cmd.replace('.md', '');
        expect(content).toContain(`/${cmdName}`);
      }
    });
  });

  describe('agent-profiles.mdc reference document', () => {
    const profilePath = join(
      PACKAGE_ROOT,
      'rules',
      'core',
      'agent-profiles.mdc'
    );
    const content = readFile(profilePath);

    it('should have YAML frontmatter with alwaysApply: false', () => {
      expect(content).toMatch(/^---\n/);
      expect(content).toContain('alwaysApply: false');
    });

    it('should define all 3 profiles', () => {
      for (const profile of VALID_PROFILES) {
        expect(content).toContain(`### ${profile}`);
      }
    });
  });

  describe('command files - AGENT_PROFILE headers', () => {
    const commandFiles = getCommandFiles();

    it('should have all 11 expected command files', () => {
      expect(commandFiles.length).toBe(11);
    });

    for (const [file, expectedProfile] of Object.entries(
      EXPECTED_COMMAND_PROFILES
    )) {
      it(`${file} should have AGENT_PROFILE: ${expectedProfile}`, () => {
        const content = readFile(
          join(PACKAGE_ROOT, '.claude', 'commands', file)
        );
        const profile = extractProfile(content);
        expect(profile).toBe(expectedProfile);
      });
    }

    it('every command file should have a valid AGENT_PROFILE', () => {
      for (const file of commandFiles) {
        const content = readFile(
          join(PACKAGE_ROOT, '.claude', 'commands', file)
        );
        const profile = extractProfile(content);
        expect(profile).not.toBeNull();
        expect(VALID_PROFILES).toContain(profile);
      }
    });
  });

  describe('skill files (.md) - Tool Access sections', () => {
    const skillFiles = getSkillFiles('md');

    it('should have all 10 expected skill files', () => {
      expect(skillFiles.length).toBe(10);
    });

    for (const [skillName, expectedProfile] of Object.entries(
      EXPECTED_SKILL_PROFILES
    )) {
      it(`${skillName}.md should reference ${expectedProfile} profile`, () => {
        const content = readFile(
          join(
            PACKAGE_ROOT,
            '.claude',
            'resources',
            'skills',
            `${skillName}.md`
          )
        );
        expect(content).toContain('## Tool Access');
        const profile = extractSkillProfile(content);
        expect(profile).toBe(expectedProfile);
      });
    }
  });

  describe('skill files (.mdc) - Tool Access sections', () => {
    const skillFiles = getSkillFiles('mdc');

    it('should have all 10 expected skill files', () => {
      expect(skillFiles.length).toBe(10);
    });

    for (const [skillName, expectedProfile] of Object.entries(
      EXPECTED_SKILL_PROFILES
    )) {
      it(`${skillName}.mdc should reference ${expectedProfile} profile`, () => {
        const content = readFile(
          join(PACKAGE_ROOT, 'rules', 'skills', `${skillName}.mdc`)
        );
        expect(content).toContain('## Tool Access');
        const profile = extractSkillProfile(content);
        expect(profile).toBe(expectedProfile);
      });
    }
  });

  describe('index files - COR-AG entries', () => {
    it('_index.md should reference agent profiles', () => {
      const content = readFile(
        join(PACKAGE_ROOT, '.claude', 'resources', 'core', '_index.md')
      );
      expect(content).toContain('COR-AG-1');
      expect(content).toContain('COR-AG-2');
      expect(content).toContain('agent-profiles.md');
    });

    it('_index.mdc should reference agent profiles', () => {
      const content = readFile(
        join(PACKAGE_ROOT, 'rules', 'core', '_index.mdc')
      );
      expect(content).toContain('COR-AG-1');
      expect(content).toContain('COR-AG-2');
      expect(content).toContain('agent-profiles.mdc');
    });
  });
});
