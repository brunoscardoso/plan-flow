/**
 * Tests for Claude Code handler
 */

import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the prompts module to avoid interactive stdin in tests
jest.unstable_mockModule(resolve(__dirname, '../utils/prompts'), () => ({
  askLegacyFilesAction: jest.fn<() => Promise<string>>().mockResolvedValue('keep'),
  selectPlatforms: jest.fn<() => Promise<string[]>>().mockResolvedValue(['claude']),
}));

const { initClaude } = await import('./claude');
const { getPackageRoot } = await import('../utils/files');

function createTempDir(): string {
  const dir = join(tmpdir(), `plan-flow-claude-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe('initClaude', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should copy commands to .claude/commands/', async () => {
    const result = await initClaude(tempDir, { force: false });

    const commandsDir = join(tempDir, '.claude', 'commands');
    expect(existsSync(commandsDir)).toBe(true);

    // Should have created some files
    expect(result.created.length).toBeGreaterThan(0);

    // Check that a known command file was copied
    const setupCmd = join(commandsDir, 'setup.md');
    expect(existsSync(setupCmd)).toBe(true);
  });

  it('should copy rules and resources preserving subdirectory structure', async () => {
    const result = await initClaude(tempDir, { force: false });

    const rulesDir = join(tempDir, '.claude', 'rules');
    expect(existsSync(rulesDir)).toBe(true);
    expect(existsSync(join(rulesDir, 'core'))).toBe(true);

    // Resources are in .claude/resources/ (v2 layout)
    const resourcesDir = join(tempDir, '.claude', 'resources');
    expect(existsSync(resourcesDir)).toBe(true);
    expect(existsSync(join(resourcesDir, 'patterns'))).toBe(true);
  });

  it('should create CLAUDE.md from template when none exists', async () => {
    await initClaude(tempDir, { force: false });

    const claudeMd = join(tempDir, 'CLAUDE.md');
    expect(existsSync(claudeMd)).toBe(true);

    const content = readFileSync(claudeMd, 'utf-8');
    expect(content).toContain('<!-- plan-flow-start -->');
    expect(content).toContain('<!-- plan-flow-end -->');
    expect(content).toContain('Plan-Flow');
  });

  it('should append plan-flow section to existing CLAUDE.md without duplicating', async () => {
    const claudeMd = join(tempDir, 'CLAUDE.md');
    writeFileSync(claudeMd, '# My Project\n\nExisting content here.\n');

    await initClaude(tempDir, { force: false });

    const content = readFileSync(claudeMd, 'utf-8');
    expect(content).toContain('# My Project');
    expect(content).toContain('Existing content here.');
    expect(content).toContain('<!-- plan-flow-start -->');
    expect(content).toContain('<!-- plan-flow-end -->');
  });

  it('should not duplicate plan-flow section if already present', async () => {
    const claudeMd = join(tempDir, 'CLAUDE.md');
    writeFileSync(
      claudeMd,
      '# My Project\n\n<!-- plan-flow-start -->\nOld content\n<!-- plan-flow-end -->\n'
    );

    const result = await initClaude(tempDir, { force: false });

    const content = readFileSync(claudeMd, 'utf-8');
    // Should have skipped
    expect(result.skipped.some((f) => f.endsWith('CLAUDE.md'))).toBe(true);
    // Content should be unchanged
    expect(content).toContain('Old content');
  });

  it('should update plan-flow section with --force', async () => {
    const claudeMd = join(tempDir, 'CLAUDE.md');
    writeFileSync(
      claudeMd,
      '# My Project\n\n<!-- plan-flow-start -->\nOld content\n<!-- plan-flow-end -->\n'
    );

    const result = await initClaude(tempDir, { force: true });

    const content = readFileSync(claudeMd, 'utf-8');
    expect(result.updated.some((f) => f.endsWith('CLAUDE.md'))).toBe(true);
    // Should no longer contain old content (replaced with template)
    expect(content).not.toContain('Old content');
    expect(content).toContain('<!-- plan-flow-start -->');
    expect(content).toContain('<!-- plan-flow-end -->');
  });

  it('should skip existing command files without --force', async () => {
    // First install
    await initClaude(tempDir, { force: false });

    // Second install
    const result = await initClaude(tempDir, { force: false });

    // All files should be skipped
    expect(result.skipped.length).toBeGreaterThan(0);
    expect(result.created).toHaveLength(0);
  });

  describe('cost tracking hooks', () => {
    it('should copy hook scripts to .claude/hooks/', async () => {
      await initClaude(tempDir, { force: false });

      const hooksDir = join(tempDir, '.claude', 'hooks');
      expect(existsSync(hooksDir)).toBe(true);
      expect(existsSync(join(hooksDir, 'cost-tracker.cjs'))).toBe(true);
      expect(existsSync(join(hooksDir, 'cost-display.cjs'))).toBe(true);
      expect(existsSync(join(hooksDir, 'session-summary.cjs'))).toBe(true);
    });

    it('should register hooks in .claude/settings.json', async () => {
      await initClaude(tempDir, { force: false });

      const settingsPath = join(tempDir, '.claude', 'settings.json');
      expect(existsSync(settingsPath)).toBe(true);

      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      expect(settings.hooks).toBeDefined();
      expect(settings.hooks.Stop).toBeDefined();
      expect(settings.hooks.SessionEnd).toBeDefined();

      // Verify Stop hook is async
      const stopHook = settings.hooks.Stop[0].hooks[0];
      expect(stopHook.command).toBe('.claude/hooks/cost-tracker.cjs');
      expect(stopHook.async).toBe(true);

      // Verify SessionEnd hook
      const sessionHook = settings.hooks.SessionEnd[0].hooks[0];
      expect(sessionHook.command).toBe('.claude/hooks/session-summary.cjs');
    });

    it('should preserve existing hooks in settings.json', async () => {
      // Create settings with existing hooks
      mkdirSync(join(tempDir, '.claude'), { recursive: true });
      writeFileSync(
        join(tempDir, '.claude', 'settings.json'),
        JSON.stringify({
          hooks: {
            Stop: [{
              hooks: [{ type: 'command', command: 'my-custom-hook.sh' }],
            }],
          },
          otherSetting: true,
        }, null, 2),
        'utf-8'
      );

      await initClaude(tempDir, { force: false });

      const settings = JSON.parse(
        readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
      );

      // Existing hook + cost-tracker + cost-display = 3
      expect(settings.hooks.Stop.length).toBe(3);
      expect(settings.hooks.Stop[0].hooks[0].command).toBe('my-custom-hook.sh');
      expect(settings.hooks.Stop[1].hooks[0].command).toBe('.claude/hooks/cost-tracker.cjs');
      expect(settings.hooks.Stop[2].hooks[0].command).toBe('.claude/hooks/cost-display.cjs');

      // Other settings preserved
      expect(settings.otherSetting).toBe(true);
    });

    it('should not duplicate hooks on repeated init', async () => {
      await initClaude(tempDir, { force: false });
      await initClaude(tempDir, { force: false });

      const settings = JSON.parse(
        readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
      );

      // Should have exactly 2 Stop hooks (cost-tracker + cost-display) and 1 SessionEnd
      expect(settings.hooks.Stop.length).toBe(2);
      expect(settings.hooks.SessionEnd.length).toBe(1);
    });
  });
});
