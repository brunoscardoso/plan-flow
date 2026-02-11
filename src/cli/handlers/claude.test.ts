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
import { initClaude } from './claude';
import { getPackageRoot } from '../utils/files';

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

  it('should copy rules preserving subdirectory structure', async () => {
    const result = await initClaude(tempDir, { force: false });

    const rulesDir = join(tempDir, '.claude', 'rules');
    expect(existsSync(rulesDir)).toBe(true);

    // Check subdirectories are preserved
    expect(existsSync(join(rulesDir, 'core'))).toBe(true);
    expect(existsSync(join(rulesDir, 'patterns'))).toBe(true);
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
});
