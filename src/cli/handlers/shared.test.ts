/**
 * Tests for shared handler
 */

import {
  mkdirSync,
  existsSync,
  rmSync,
  readFileSync,
  writeFileSync,
  lstatSync,
  readlinkSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir, homedir } from 'node:os';
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
  'brain',
  'brain/features',
  'brain/errors',
  'brain/decisions',
  'brain/sessions',
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

  it('should skip existing directories on second install', async () => {
    // First install
    await initShared(tempDir, { force: false }, ['claude']);

    // Second install
    const result = await initShared(tempDir, { force: false }, ['claude']);

    // Skipped items include: flow subdirs + .gitignore + vault symlink
    expect(result.skipped.length).toBeGreaterThanOrEqual(EXPECTED_SUBDIRS.length + 1);
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
    expect(gitignore).toContain('.claude/');
    expect(gitignore).toContain('CLAUDE.md');
  });

  it('should include platform-specific entries based on selected platforms', async () => {
    await initShared(tempDir, { force: false }, ['cursor', 'openclaw']);

    const gitignore = readFileSync(join(tempDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.cursor/');
    expect(gitignore).toContain('skills/plan-flow/');
    // Should not contain Claude-specific entries
    expect(gitignore).not.toContain('.claude/');
    expect(gitignore).not.toContain('CLAUDE.md');
  });

  it('should include all platform entries when all platforms selected', async () => {
    await initShared(tempDir, { force: false }, ['claude', 'cursor', 'openclaw', 'codex']);

    const gitignore = readFileSync(join(tempDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.claude/');
    expect(gitignore).toContain('CLAUDE.md');
    expect(gitignore).toContain('.cursor/');
    expect(gitignore).toContain('skills/plan-flow/');
    expect(gitignore).toContain('.agents/');
    expect(gitignore).toContain('AGENTS.md');
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
    expect(gitignore).toContain('.cursor/');
    expect(gitignore).toContain('.claude/');
  });
});

describe('vault registration', () => {
  let tempDir: string;
  const vaultDir = join(homedir(), 'plan-flow', 'brain');

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
    // Clean up vault symlink for this temp project
    const projectName = tempDir.split('/').pop() || '';
    const linkPath = join(vaultDir, 'projects', projectName);
    try {
      rmSync(linkPath, { force: true });
    } catch {
      // Ignore
    }
  });

  it('should create vault directory structure', async () => {
    await initShared(tempDir, { force: false }, ['claude']);

    expect(existsSync(vaultDir)).toBe(true);
    expect(existsSync(join(vaultDir, 'patterns'))).toBe(true);
    expect(existsSync(join(vaultDir, 'projects'))).toBe(true);
  });

  it('should create symlink from vault to project brain', async () => {
    await initShared(tempDir, { force: false }, ['claude']);

    const projectName = tempDir.split('/').pop() || '';
    const linkPath = join(vaultDir, 'projects', projectName);

    expect(existsSync(linkPath)).toBe(true);
    const stat = lstatSync(linkPath);
    expect(stat.isSymbolicLink()).toBe(true);

    const target = readlinkSync(linkPath, 'utf-8');
    expect(target).toBe(join(resolve(tempDir), 'flow', 'brain'));
  });

  it('should create vault index with project entry', async () => {
    await initShared(tempDir, { force: false }, ['claude']);

    const indexPath = join(vaultDir, 'index.md');
    expect(existsSync(indexPath)).toBe(true);

    const content = readFileSync(indexPath, 'utf-8');
    const projectName = tempDir.split('/').pop() || '';
    expect(content).toContain(`[[${projectName}]]`);
  });

  it('should skip symlink on second install', async () => {
    await initShared(tempDir, { force: false }, ['claude']);
    const result = await initShared(tempDir, { force: false }, ['claude']);

    const projectName = tempDir.split('/').pop() || '';
    const linkPath = join(vaultDir, 'projects', projectName);
    expect(result.skipped).toContain(linkPath);
  });
});

describe('legacy artifact scanning', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
    // Clean up vault symlink
    const vaultDir = join(homedir(), 'plan-flow', 'brain');
    const projectName = tempDir.split('/').pop() || '';
    const linkPath = join(vaultDir, 'projects', projectName);
    try {
      rmSync(linkPath, { force: true });
    } catch {
      // Ignore
    }
  });

  it('should create brain entries from existing plans', async () => {
    // Create a legacy plan
    const plansDir = join(tempDir, 'flow', 'plans');
    mkdirSync(plansDir, { recursive: true });
    writeFileSync(
      join(plansDir, 'plan_user_auth_v1.md'),
      '# Plan: User Authentication\n\nSome content here.\n',
      'utf-8'
    );

    await initShared(tempDir, { force: false }, ['claude']);

    const brainFeature = join(tempDir, 'flow', 'brain', 'features', 'user-auth.md');
    expect(existsSync(brainFeature)).toBe(true);

    const content = readFileSync(brainFeature, 'utf-8');
    expect(content).toContain('[[user-auth]]');
    expect(content).toContain('[[plan_user_auth_v1]]');
  });

  it('should create brain entries from existing discovery docs', async () => {
    const discoveryDir = join(tempDir, 'flow', 'discovery');
    mkdirSync(discoveryDir, { recursive: true });
    writeFileSync(
      join(discoveryDir, 'discovery_dark_mode_v1.md'),
      '# Discovery: Dark Mode\n\nRequirements for dark mode.\n',
      'utf-8'
    );

    await initShared(tempDir, { force: false }, ['claude']);

    const brainFeature = join(tempDir, 'flow', 'brain', 'features', 'dark-mode.md');
    expect(existsSync(brainFeature)).toBe(true);

    const content = readFileSync(brainFeature, 'utf-8');
    expect(content).toContain('[[dark-mode]]');
    expect(content).toContain('[[discovery_dark_mode_v1]]');
  });

  it('should mark archived artifacts as archived', async () => {
    const archiveDir = join(tempDir, 'flow', 'archive');
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(
      join(archiveDir, 'plan_old_feature_v1.md'),
      '# Plan: Old Feature\n\nCompleted.\n',
      'utf-8'
    );

    await initShared(tempDir, { force: false }, ['claude']);

    const brainFeature = join(tempDir, 'flow', 'brain', 'features', 'old-feature.md');
    expect(existsSync(brainFeature)).toBe(true);

    const content = readFileSync(brainFeature, 'utf-8');
    expect(content).toContain('**Status**: archived');
  });

  it('should update brain index with discovered features', async () => {
    const plansDir = join(tempDir, 'flow', 'plans');
    mkdirSync(plansDir, { recursive: true });
    writeFileSync(
      join(plansDir, 'plan_api_v1.md'),
      '# Plan: API Integration\n\nContent.\n',
      'utf-8'
    );

    await initShared(tempDir, { force: false }, ['claude']);

    const indexPath = join(tempDir, 'flow', 'brain', 'index.md');
    expect(existsSync(indexPath)).toBe(true);

    const content = readFileSync(indexPath, 'utf-8');
    expect(content).toContain('api');
  });

  it('should skip existing brain entries without --force', async () => {
    const plansDir = join(tempDir, 'flow', 'plans');
    mkdirSync(plansDir, { recursive: true });
    writeFileSync(
      join(plansDir, 'plan_my_feature_v1.md'),
      '# Plan: My Feature\n',
      'utf-8'
    );

    // First init
    await initShared(tempDir, { force: false }, ['claude']);

    // Second init
    const result = await initShared(tempDir, { force: false }, ['claude']);

    const brainFeature = join(tempDir, 'flow', 'brain', 'features', 'my-feature.md');
    expect(result.skipped).toContain(brainFeature);
  });

  it('should handle empty directories gracefully', async () => {
    // No plans, discovery, or archive — just the flow structure
    await initShared(tempDir, { force: false }, ['claude']);

    // Should still work without errors
    const brainFeaturesDir = join(tempDir, 'flow', 'brain', 'features');
    expect(existsSync(brainFeaturesDir)).toBe(true);
  });
});
