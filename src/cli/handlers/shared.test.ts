/**
 * Tests for shared handler
 */

import {
  mkdirSync,
  existsSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initShared } from './shared';

function createTempDir(): string {
  const dir = join(tmpdir(), `plan-flow-shared-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

const EXPECTED_SUBDIRS = [
  'archive',
  'contracts',
  'discovery',
  'plans',
  'references',
  'reviewed-code',
  'reviewed-pr',
];

describe('initShared', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should create full flow/ directory structure with .gitkeep files', async () => {
    const result = await initShared(tempDir, { force: false }, ['claude']);

    for (const subdir of EXPECTED_SUBDIRS) {
      const dir = join(tempDir, 'flow', subdir);
      expect(existsSync(dir)).toBe(true);
      expect(existsSync(join(dir, '.gitkeep'))).toBe(true);
    }

    expect(result.created.length).toBeGreaterThan(0);

    // Should also create .gitignore
    expect(existsSync(join(tempDir, '.gitignore'))).toBe(true);
  });

  it('should skip existing directories', async () => {
    // First install
    await initShared(tempDir, { force: false }, ['claude']);

    // Second install
    const result = await initShared(tempDir, { force: false }, ['claude']);

    // All flow dirs + .gitignore should be skipped
    expect(result.skipped.length).toBe(EXPECTED_SUBDIRS.length + 1);
    expect(result.created).toHaveLength(0);
  });
});

describe('gitignore management', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should create .gitignore with plan-flow entries when none exists', async () => {
    await initShared(tempDir, { force: false }, ['claude']);

    const gitignore = readFileSync(join(tempDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('# >>> plan-flow');
    expect(gitignore).toContain('# <<< plan-flow');
    expect(gitignore).toContain('flow/');
    expect(gitignore).toContain('.claude/commands/');
    expect(gitignore).toContain('.claude/rules/');
  });

  it('should include platform-specific entries based on selected platforms', async () => {
    await initShared(tempDir, { force: false }, ['cursor', 'openclaw']);

    const gitignore = readFileSync(join(tempDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('rules/');
    expect(gitignore).toContain('skills/plan-flow/');
    // Should not contain Claude-specific entries
    expect(gitignore).not.toContain('.claude/commands/');
    expect(gitignore).not.toContain('.claude/rules/');
  });

  it('should include all platform entries when all platforms selected', async () => {
    await initShared(tempDir, { force: false }, ['claude', 'cursor', 'openclaw', 'codex']);

    const gitignore = readFileSync(join(tempDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.claude/commands/');
    expect(gitignore).toContain('.claude/rules/');
    expect(gitignore).toContain('rules/');
    expect(gitignore).toContain('skills/plan-flow/');
    expect(gitignore).toContain('.agents/skills/plan-flow/');
  });

  it('should always include shared entries regardless of platform', async () => {
    await initShared(tempDir, { force: false }, ['cursor']);

    const gitignore = readFileSync(join(tempDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('flow/');
    expect(gitignore).toContain('.plan-flow.yml');
    expect(gitignore).toContain('.plan.flow.env');
  });

  it('should append to existing .gitignore without overwriting', async () => {
    const existingContent = 'node_modules/\ndist/\n';
    writeFileSync(join(tempDir, '.gitignore'), existingContent, 'utf-8');

    await initShared(tempDir, { force: false }, ['claude']);

    const gitignore = readFileSync(join(tempDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('node_modules/');
    expect(gitignore).toContain('dist/');
    expect(gitignore).toContain('# >>> plan-flow');
    expect(gitignore).toContain('flow/');
  });

  it('should not duplicate entries on second install', async () => {
    await initShared(tempDir, { force: false }, ['claude']);
    const result = await initShared(tempDir, { force: false }, ['claude']);

    const gitignore = readFileSync(join(tempDir, '.gitignore'), 'utf-8');
    const markerCount = (gitignore.match(/# >>> plan-flow/g) || []).length;
    expect(markerCount).toBe(1);
    expect(result.skipped).toContain(join(tempDir, '.gitignore'));
  });

  it('should update entries with --force when markers exist', async () => {
    // First install with claude only
    await initShared(tempDir, { force: false }, ['claude']);

    // Second install with cursor too, using force
    await initShared(tempDir, { force: true }, ['claude', 'cursor']);

    const gitignore = readFileSync(join(tempDir, '.gitignore'), 'utf-8');
    const markerCount = (gitignore.match(/# >>> plan-flow/g) || []).length;
    expect(markerCount).toBe(1);
    expect(gitignore).toContain('rules/');
    expect(gitignore).toContain('.claude/commands/');
  });
});
