/**
 * Tests for Codex CLI handler
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
import { initCodex } from './codex';

function createTempDir(): string {
  const dir = join(tmpdir(), `plan-flow-codex-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe('initCodex', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should copy skill files to .agents/skills/plan-flow/', async () => {
    const result = await initCodex(tempDir, { force: false });

    const skillsDir = join(tempDir, '.agents', 'skills', 'plan-flow');
    expect(existsSync(skillsDir)).toBe(true);

    // Should have the root SKILL.md
    expect(existsSync(join(skillsDir, 'SKILL.md'))).toBe(true);

    // Should have sub-skill directories
    expect(existsSync(join(skillsDir, 'setup', 'SKILL.md'))).toBe(true);

    expect(result.created.length).toBeGreaterThan(0);
  });

  it('should create AGENTS.md from template when none exists', async () => {
    await initCodex(tempDir, { force: false });

    const agentsMd = join(tempDir, 'AGENTS.md');
    expect(existsSync(agentsMd)).toBe(true);

    const content = readFileSync(agentsMd, 'utf-8');
    expect(content).toContain('<!-- plan-flow-start -->');
    expect(content).toContain('<!-- plan-flow-end -->');
    expect(content).toContain('Plan-Flow');
  });

  it('should append plan-flow section to existing AGENTS.md without duplicating', async () => {
    const agentsMd = join(tempDir, 'AGENTS.md');
    writeFileSync(agentsMd, '# My Project\n\nExisting content here.\n');

    await initCodex(tempDir, { force: false });

    const content = readFileSync(agentsMd, 'utf-8');
    expect(content).toContain('# My Project');
    expect(content).toContain('Existing content here.');
    expect(content).toContain('<!-- plan-flow-start -->');
    expect(content).toContain('<!-- plan-flow-end -->');
  });

  it('should not duplicate plan-flow section if already present', async () => {
    const agentsMd = join(tempDir, 'AGENTS.md');
    writeFileSync(
      agentsMd,
      '# My Project\n\n<!-- plan-flow-start -->\nOld content\n<!-- plan-flow-end -->\n'
    );

    const result = await initCodex(tempDir, { force: false });

    const content = readFileSync(agentsMd, 'utf-8');
    // Should have skipped
    expect(result.skipped.some((f) => f.endsWith('AGENTS.md'))).toBe(true);
    // Content should be unchanged
    expect(content).toContain('Old content');
  });

  it('should update plan-flow section with --force', async () => {
    const agentsMd = join(tempDir, 'AGENTS.md');
    writeFileSync(
      agentsMd,
      '# My Project\n\n<!-- plan-flow-start -->\nOld content\n<!-- plan-flow-end -->\n'
    );

    const result = await initCodex(tempDir, { force: true });

    const content = readFileSync(agentsMd, 'utf-8');
    expect(result.updated.some((f) => f.endsWith('AGENTS.md'))).toBe(true);
    // Should no longer contain old content (replaced with template)
    expect(content).not.toContain('Old content');
    expect(content).toContain('<!-- plan-flow-start -->');
    expect(content).toContain('<!-- plan-flow-end -->');
  });

  it('should skip existing skill files without --force', async () => {
    // First install
    await initCodex(tempDir, { force: false });

    // Second install
    const result = await initCodex(tempDir, { force: false });

    // All files should be skipped
    expect(result.skipped.length).toBeGreaterThan(0);
    expect(result.created).toHaveLength(0);
  });

  it('should overwrite existing files with --force', async () => {
    // First install
    await initCodex(tempDir, { force: false });

    // Second install with force
    const result = await initCodex(tempDir, { force: true });

    expect(result.updated.length).toBeGreaterThan(0);
  });
});
