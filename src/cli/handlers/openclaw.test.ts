/**
 * Tests for OpenClaw handler
 */

import {
  mkdirSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initOpenClaw } from './openclaw';

function createTempDir(): string {
  const dir = join(tmpdir(), `plan-flow-openclaw-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe('initOpenClaw', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should copy skill files preserving directory structure', async () => {
    const result = await initOpenClaw(tempDir, { force: false });

    const skillsDir = join(tempDir, 'skills', 'plan-flow');
    expect(existsSync(skillsDir)).toBe(true);

    // Should have the root SKILL.md
    expect(existsSync(join(skillsDir, 'SKILL.md'))).toBe(true);

    // Should have sub-skill directories
    expect(existsSync(join(skillsDir, 'setup', 'SKILL.md'))).toBe(true);

    expect(result.created.length).toBeGreaterThan(0);
  });

  it('should skip existing files without --force', async () => {
    // First install
    await initOpenClaw(tempDir, { force: false });

    // Second install
    const result = await initOpenClaw(tempDir, { force: false });

    expect(result.skipped.length).toBeGreaterThan(0);
    expect(result.created).toHaveLength(0);
  });
});
