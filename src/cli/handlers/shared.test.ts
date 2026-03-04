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
  symlinkSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
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
  let vaultDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    vaultDir = join(tmpdir(), `plan-flow-vault-init-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(vaultDir, { recursive: true });
    process.env.PLAN_FLOW_VAULT_DIR = vaultDir;
  });

  afterEach(() => {
    cleanup(tempDir);
    cleanup(vaultDir);
    delete process.env.PLAN_FLOW_VAULT_DIR;
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
  let vaultDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    vaultDir = join(tmpdir(), `plan-flow-vault-gi-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(vaultDir, { recursive: true });
    process.env.PLAN_FLOW_VAULT_DIR = vaultDir;
  });

  afterEach(() => {
    cleanup(tempDir);
    cleanup(vaultDir);
    delete process.env.PLAN_FLOW_VAULT_DIR;
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
  let vaultDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    vaultDir = join(tmpdir(), `plan-flow-vault-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(vaultDir, { recursive: true });
    process.env.PLAN_FLOW_VAULT_DIR = vaultDir;
  });

  afterEach(() => {
    cleanup(tempDir);
    cleanup(vaultDir);
    delete process.env.PLAN_FLOW_VAULT_DIR;
  });

  it('should create vault directory structure', async () => {
    await initShared(tempDir, { force: false }, ['claude']);

    expect(existsSync(vaultDir)).toBe(true);
    expect(existsSync(join(vaultDir, 'patterns'))).toBe(true);
    expect(existsSync(join(vaultDir, 'projects'))).toBe(true);
  });

  it('should create Obsidian config with path-based color groups', async () => {
    await initShared(tempDir, { force: false }, ['claude']);

    const graphPath = join(vaultDir, '.obsidian', 'graph.json');
    expect(existsSync(graphPath)).toBe(true);

    const config = JSON.parse(readFileSync(graphPath, 'utf-8'));
    expect(config.colorGroups).toHaveLength(8);
    expect(config.colorGroups[0].query).toBe('path:patterns');
    expect(config.colorGroups[1].query).toBe('path:features');
    expect(config.colorGroups[2].query).toBe('path:errors');
    expect(config.colorGroups[3].query).toBe('path:decisions');
    expect(config.colorGroups[4].query).toBe('path:sessions');
    expect(config.colorGroups[5].query).toBe('path:discovery');
    expect(config.colorGroups[6].query).toBe('path:plans');
    expect(config.colorGroups[7].query).toBe('path:contracts');
    expect(config['collapse-color']).toBe(false);
    expect(config['collapse-filter']).toBe(true);
  });

  it('should create project directory with individual symlinks', async () => {
    await initShared(tempDir, { force: false }, ['claude']);

    const projectName = tempDir.split('/').pop() || '';
    const projectDir = join(vaultDir, 'projects', projectName);

    // Project dir should be a real directory, not a symlink
    expect(existsSync(projectDir)).toBe(true);
    const stat = lstatSync(projectDir);
    expect(stat.isDirectory()).toBe(true);
    expect(stat.isSymbolicLink()).toBe(false);

    // Check individual symlinks
    const expectedLinks = ['features', 'errors', 'decisions', 'sessions', 'discovery', 'plans', 'archive', 'contracts'];
    for (const linkName of expectedLinks) {
      const linkPath = join(projectDir, linkName);
      expect(existsSync(linkPath)).toBe(true);
      const linkStat = lstatSync(linkPath);
      expect(linkStat.isSymbolicLink()).toBe(true);
    }

    // Verify features symlink points to the right place
    const featuresTarget = readlinkSync(join(projectDir, 'features'), 'utf-8');
    expect(featuresTarget).toBe(join(resolve(tempDir), 'flow', 'brain', 'features'));
  });

  it('should create project index and category group files', async () => {
    await initShared(tempDir, { force: false }, ['claude']);

    const projectName = tempDir.split('/').pop() || '';
    const projectDir = join(vaultDir, 'projects', projectName);

    // Project index links to category groups
    const projectIndexPath = join(projectDir, `${projectName}.md`);
    expect(existsSync(projectIndexPath)).toBe(true);
    const indexContent = readFileSync(projectIndexPath, 'utf-8');
    expect(indexContent).toContain(`# [[${projectName}]]`);
    expect(indexContent).toContain(`[[${projectName}-features|features]]`);
    expect(indexContent).toContain(`[[${projectName}-errors|errors]]`);
    expect(indexContent).toContain(`[[${projectName}-discovery|discovery]]`);
    expect(indexContent).toContain(`[[${projectName}-plans|plans]]`);

    // Category group files link back to project
    const featuresGroupPath = join(projectDir, `${projectName}-features.md`);
    expect(existsSync(featuresGroupPath)).toBe(true);
    const groupContent = readFileSync(featuresGroupPath, 'utf-8');
    expect(groupContent).toContain(`**Project**: [[${projectName}]]`);

    // All 8 category group files should exist
    const categories = ['features', 'errors', 'decisions', 'sessions', 'discovery', 'plans', 'archive', 'contracts'];
    for (const cat of categories) {
      expect(existsSync(join(projectDir, `${projectName}-${cat}.md`))).toBe(true);
    }
  });

  it('should create vault index with project entry', async () => {
    await initShared(tempDir, { force: false }, ['claude']);

    const indexPath = join(vaultDir, 'index.md');
    expect(existsSync(indexPath)).toBe(true);

    const content = readFileSync(indexPath, 'utf-8');
    const projectName = tempDir.split('/').pop() || '';
    expect(content).toContain(`[[${projectName}]]`);
  });

  it('should skip symlinks on second install', async () => {
    await initShared(tempDir, { force: false }, ['claude']);
    const result = await initShared(tempDir, { force: false }, ['claude']);

    const projectName = tempDir.split('/').pop() || '';
    const featuresLink = join(vaultDir, 'projects', projectName, 'features');
    expect(result.skipped).toContain(featuresLink);
  });

  it('should clean old-format single symlinks during registration', async () => {
    // Create an old-format single symlink
    const projectsDir = join(vaultDir, 'projects');
    mkdirSync(projectsDir, { recursive: true });
    const oldTarget = join(tempDir, 'flow');
    mkdirSync(oldTarget, { recursive: true });
    symlinkSync(oldTarget, join(projectsDir, 'old-project'));

    // Also create a broken symlink
    symlinkSync('/nonexistent/path', join(projectsDir, 'broken-project'));

    await initShared(tempDir, { force: false }, ['claude']);

    // Old-format symlinks should be cleaned
    expect(existsSync(join(projectsDir, 'old-project'))).toBe(false);
    expect(existsSync(join(projectsDir, 'broken-project'))).toBe(false);
  });
});

describe('legacy artifact scanning', () => {
  let tempDir: string;
  let vaultDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    vaultDir = join(tmpdir(), `plan-flow-vault-legacy-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(vaultDir, { recursive: true });
    process.env.PLAN_FLOW_VAULT_DIR = vaultDir;
  });

  afterEach(() => {
    cleanup(tempDir);
    cleanup(vaultDir);
    delete process.env.PLAN_FLOW_VAULT_DIR;
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
    expect(content).toContain('status: active');
    expect(content).toContain('[[user-auth]]');
    expect(content).toContain('[[plan_user_auth_v1]]');
    // Should link back to project and group
    const projectName = tempDir.split('/').pop() || '';
    expect(content).toContain(`**Project**: [[${projectName}]]`);
    expect(content).toContain(`**Group**: [[${projectName}-features|features]]`);
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
