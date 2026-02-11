/**
 * Tests for Cursor handler
 */

import {
  mkdirSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initCursor } from './cursor';

function createTempDir(): string {
  const dir = join(tmpdir(), `plan-flow-cursor-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe('initCursor', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should copy cursor rules (.mdc files)', async () => {
    const result = await initCursor(tempDir, { force: false });

    const rulesDir = join(tempDir, 'rules');
    expect(existsSync(rulesDir)).toBe(true);

    // Should have copied rule files
    expect(result.created.length).toBeGreaterThan(0);
  });

  it('should preserve subdirectory structure in rules/', async () => {
    await initCursor(tempDir, { force: false });

    const rulesDir = join(tempDir, 'rules');
    expect(existsSync(join(rulesDir, 'core'))).toBe(true);
    expect(existsSync(join(rulesDir, 'patterns'))).toBe(true);
  });

  it('should skip existing files without --force', async () => {
    // First install
    await initCursor(tempDir, { force: false });

    // Second install
    const result = await initCursor(tempDir, { force: false });

    expect(result.skipped.length).toBeGreaterThan(0);
    expect(result.created).toHaveLength(0);
  });

  it('should overwrite existing files with --force', async () => {
    // First install
    await initCursor(tempDir, { force: false });

    // Second install with force
    const result = await initCursor(tempDir, { force: true });

    expect(result.updated.length).toBeGreaterThan(0);
    expect(result.created).toHaveLength(0);
  });
});
