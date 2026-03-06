/**
 * Tests for shared handler
 */

import { jest } from '@jest/globals';
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

// Mock askBusinessContext to avoid interactive prompts during tests
jest.unstable_mockModule('../utils/prompts.js', () => ({
  askBusinessContext: jest.fn<() => Promise<{ whatItDoes: string; targetAudience: string; problemItSolves: string }>>().mockResolvedValue({
    whatItDoes: 'Test project description',
    targetAudience: 'Developers',
    problemItSolves: 'Testing automation',
  }),
  askLegacyFilesAction: jest.fn(),
  selectPlatforms: jest.fn(),
}));

const { initShared, generateTechFoundation, generateBusinessContext, generateTasklist, generateLog, generateMemory, generateHeartbeat } = await import('./shared.js');
const { askBusinessContext } = await import('../utils/prompts.js') as { askBusinessContext: jest.Mock };

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
  'contracts',
  'discovery',
  'plans',
  'references',
  'resources',
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
    expect(config.colorGroups).toHaveLength(13);
    const queries = config.colorGroups.map((g: { query: string }) => g.query);
    expect(queries).toContain('path:patterns');
    expect(queries).toContain('path:features');
    expect(queries).toContain('path:errors');
    expect(queries).toContain('path:daily');
    expect(queries).toContain('path:discovery');
    expect(queries).toContain('path:plans');
    expect(queries).toContain('path:contracts');
    expect(queries).toContain('path:archive');
    expect(queries).toContain('path:reviewed-code');
    expect(queries).toContain('path:reviewed-pr');
    expect(queries).toContain('path:references');
    expect(queries).toContain('path:resources');
    expect(queries).toContain('path:learns');
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
    const expectedLinks = ['features', 'errors', 'discovery', 'plans', 'archive', 'contracts', 'reviewed-code', 'reviewed-pr', 'references', 'resources'];
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

  it('should create project index file', async () => {
    await initShared(tempDir, { force: false }, ['claude']);

    const projectName = tempDir.split('/').pop() || '';
    const projectDir = join(vaultDir, 'projects', projectName);

    const projectIndexPath = join(projectDir, `${projectName}.md`);
    expect(existsSync(projectIndexPath)).toBe(true);
    const content = readFileSync(projectIndexPath, 'utf-8');
    expect(content).toContain(`# [[${projectName}]]`);
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
    // Should link back to project
    const projectName = tempDir.split('/').pop() || '';
    expect(content).toContain(`**Project**: [[${projectName}]]`);

    // The original plan file should also get the project tag injected
    const planContent = readFileSync(join(tempDir, 'flow', 'plans', 'plan_user_auth_v1.md'), 'utf-8');
    expect(planContent).toContain(`**Project**: [[${projectName}]]`);
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

describe('generateTechFoundation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    // Ensure flow/references exists
    mkdirSync(join(tempDir, 'flow', 'references'), { recursive: true });
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should create tech-foundation.md from a package.json', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        dependencies: {
          react: '^18.2.0',
          next: '^14.0.0',
        },
        devDependencies: {
          jest: '^29.0.0',
          typescript: '^5.0.0',
        },
      }),
      'utf-8'
    );
    writeFileSync(
      join(tempDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { strict: true, target: 'ES2022' } }),
      'utf-8'
    );

    const result = generateTechFoundation(tempDir, { force: false });

    const filePath = join(tempDir, 'flow', 'references', 'tech-foundation.md');
    expect(existsSync(filePath)).toBe(true);
    expect(result.created).toContain(filePath);

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('# Tech Foundation');
    expect(content).toContain('**Project**:');
    expect(content).toContain('| Language | TypeScript |');
    expect(content).toContain('Next.js');
    expect(content).toContain('| Jest |');
    expect(content).toContain('| react |');
    expect(content).toContain('| next |');
    expect(content).toContain('Strict mode');
  });

  it('should detect Python projects from pyproject.toml', () => {
    writeFileSync(
      join(tempDir, 'pyproject.toml'),
      '[tool.poetry]\nname = "my-app"\n\n[tool.poetry.dependencies]\nfastapi = ">=0.100"\n\n[tool.pytest]\n',
      'utf-8'
    );

    const result = generateTechFoundation(tempDir, { force: false });

    const filePath = join(tempDir, 'flow', 'references', 'tech-foundation.md');
    expect(existsSync(filePath)).toBe(true);
    expect(result.created).toContain(filePath);

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('| Language | Python |');
    expect(content).toContain('| Test Framework | Pytest |');
  });

  it('should skip if file exists and no force', () => {
    const filePath = join(tempDir, 'flow', 'references', 'tech-foundation.md');
    writeFileSync(filePath, 'existing content', 'utf-8');

    const result = generateTechFoundation(tempDir, { force: false });

    expect(result.skipped).toContain(filePath);
    expect(readFileSync(filePath, 'utf-8')).toBe('existing content');
  });

  it('should overwrite with --force', () => {
    const filePath = join(tempDir, 'flow', 'references', 'tech-foundation.md');
    writeFileSync(filePath, 'old content', 'utf-8');

    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test', dependencies: {} }),
      'utf-8'
    );

    const result = generateTechFoundation(tempDir, { force: true });

    expect(result.updated).toContain(filePath);
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('# Tech Foundation');
    expect(content).not.toBe('old content');
  });

  it('should detect Rust projects from Cargo.toml', () => {
    writeFileSync(join(tempDir, 'Cargo.toml'), '[package]\nname = "my-app"\n', 'utf-8');

    const result = generateTechFoundation(tempDir, { force: false });

    const filePath = join(tempDir, 'flow', 'references', 'tech-foundation.md');
    expect(result.created).toContain(filePath);
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('| Language | Rust |');
  });

  it('should handle projects with no dependency files', () => {
    const result = generateTechFoundation(tempDir, { force: false });

    const filePath = join(tempDir, 'flow', 'references', 'tech-foundation.md');
    expect(result.created).toContain(filePath);
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('| Language | Unknown |');
  });
});

describe('generateBusinessContext', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    mkdirSync(join(tempDir, 'flow', 'references'), { recursive: true });
    (askBusinessContext as jest.Mock).mockClear();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should create business-context.md from provided answers', async () => {
    (askBusinessContext as jest.Mock).mockResolvedValue({
      whatItDoes: 'A CLI tool for AI workflows',
      targetAudience: 'Software developers',
      problemItSolves: 'Structured AI-assisted development',
    });

    const result = await generateBusinessContext(tempDir, { force: false });

    const filePath = join(tempDir, 'flow', 'references', 'business-context.md');
    expect(existsSync(filePath)).toBe(true);
    expect(result.created).toContain(filePath);

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('# Business Context');
    expect(content).toContain('**Project**:');
    expect(content).toContain('A CLI tool for AI workflows');
    expect(content).toContain('Software developers');
    expect(content).toContain('Structured AI-assisted development');
  });

  it('should extract README hint and pass to askBusinessContext', async () => {
    writeFileSync(join(tempDir, 'README.md'), '# My Project\n\nThis is a great tool.\n', 'utf-8');

    await generateBusinessContext(tempDir, { force: false });

    expect(askBusinessContext).toHaveBeenCalledWith('This is a great tool.');
  });

  it('should include README summary in output', async () => {
    writeFileSync(join(tempDir, 'README.md'), '# My Project\n\nThis is the summary line.\n', 'utf-8');

    await generateBusinessContext(tempDir, { force: false });

    const filePath = join(tempDir, 'flow', 'references', 'business-context.md');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('## README Summary');
    expect(content).toContain('This is the summary line.');
  });

  it('should show "No README found." when no README exists', async () => {
    await generateBusinessContext(tempDir, { force: false });

    const filePath = join(tempDir, 'flow', 'references', 'business-context.md');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('No README found.');
  });

  it('should skip if file exists and no force', async () => {
    const filePath = join(tempDir, 'flow', 'references', 'business-context.md');
    writeFileSync(filePath, 'existing content', 'utf-8');

    const result = await generateBusinessContext(tempDir, { force: false });

    expect(result.skipped).toContain(filePath);
    expect(readFileSync(filePath, 'utf-8')).toBe('existing content');
    expect(askBusinessContext).not.toHaveBeenCalled();
  });

  it('should overwrite with --force', async () => {
    const filePath = join(tempDir, 'flow', 'references', 'business-context.md');
    writeFileSync(filePath, 'old content', 'utf-8');

    const result = await generateBusinessContext(tempDir, { force: true });

    expect(result.updated).toContain(filePath);
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('# Business Context');
  });
});

describe('initShared calls generators', () => {
  let tempDir: string;
  let vaultDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    vaultDir = join(tmpdir(), `plan-flow-vault-gen-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(vaultDir, { recursive: true });
    process.env.PLAN_FLOW_VAULT_DIR = vaultDir;
    (askBusinessContext as jest.Mock).mockClear();
  });

  afterEach(() => {
    cleanup(tempDir);
    cleanup(vaultDir);
    delete process.env.PLAN_FLOW_VAULT_DIR;
  });

  it('should generate all init files during init', async () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test-project', dependencies: { express: '^4.0.0' } }),
      'utf-8'
    );

    await initShared(tempDir, { force: false }, ['claude']);

    const techPath = join(tempDir, 'flow', 'references', 'tech-foundation.md');
    const bizPath = join(tempDir, 'flow', 'references', 'business-context.md');
    const tasklistPath = join(tempDir, 'flow', 'tasklist.md');
    const logPath = join(tempDir, 'flow', 'log.md');

    expect(existsSync(techPath)).toBe(true);
    expect(existsSync(bizPath)).toBe(true);
    expect(existsSync(tasklistPath)).toBe(true);
    expect(existsSync(logPath)).toBe(true);

    const techContent = readFileSync(techPath, 'utf-8');
    expect(techContent).toContain('Express');

    expect(askBusinessContext).toHaveBeenCalled();
  });
});

describe('generateTasklist', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    mkdirSync(join(tempDir, 'flow'), { recursive: true });
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should create tasklist.md with project template', () => {
    const result = generateTasklist(tempDir, { force: false });

    const filePath = join(tempDir, 'flow', 'tasklist.md');
    expect(existsSync(filePath)).toBe(true);
    expect(result.created).toContain(filePath);

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('# Tasklist');
    expect(content).toContain('**Project**:');
    expect(content).toContain('## In Progress');
    expect(content).toContain('## To Do');
    expect(content).toContain('## Done');
  });

  it('should skip if file exists and no force', () => {
    const filePath = join(tempDir, 'flow', 'tasklist.md');
    writeFileSync(filePath, 'existing tasklist', 'utf-8');

    const result = generateTasklist(tempDir, { force: false });

    expect(result.skipped).toContain(filePath);
    expect(readFileSync(filePath, 'utf-8')).toBe('existing tasklist');
  });

  it('should overwrite with --force', () => {
    const filePath = join(tempDir, 'flow', 'tasklist.md');
    writeFileSync(filePath, 'old tasklist', 'utf-8');

    const result = generateTasklist(tempDir, { force: true });

    expect(result.updated).toContain(filePath);
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('# Tasklist');
  });
});

describe('generateLog', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    mkdirSync(join(tempDir, 'flow'), { recursive: true });
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should create log.md with initial entry', () => {
    const result = generateLog(tempDir, { force: false });

    const filePath = join(tempDir, 'flow', 'log.md');
    expect(existsSync(filePath)).toBe(true);
    expect(result.created).toContain(filePath);

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('# Project Log');
    expect(content).toContain('**Project**:');
    expect(content).toContain('plan-flow initialized');
  });

  it('should skip if file exists and no force', () => {
    const filePath = join(tempDir, 'flow', 'log.md');
    writeFileSync(filePath, 'existing log', 'utf-8');

    const result = generateLog(tempDir, { force: false });

    expect(result.skipped).toContain(filePath);
    expect(readFileSync(filePath, 'utf-8')).toBe('existing log');
  });

  it('should overwrite with --force', () => {
    const filePath = join(tempDir, 'flow', 'log.md');
    writeFileSync(filePath, 'old log', 'utf-8');

    const result = generateLog(tempDir, { force: true });

    expect(result.updated).toContain(filePath);
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('# Project Log');
  });
});

describe('generateMemory', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    mkdirSync(join(tempDir, 'flow'), { recursive: true });
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should create memory.md with table template', () => {
    const result = generateMemory(tempDir, { force: false });

    const filePath = join(tempDir, 'flow', 'memory.md');
    expect(existsSync(filePath)).toBe(true);
    expect(result.created).toContain(filePath);

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('# Project Memory');
    expect(content).toContain('**Project**:');
    expect(content).toContain('| Date | Skill | Feature | Artifact | Summary |');
    expect(content).toContain('|------|-------|---------|----------|---------|');
  });

  it('should skip if file exists and no force', () => {
    const filePath = join(tempDir, 'flow', 'memory.md');
    writeFileSync(filePath, 'existing memory', 'utf-8');

    const result = generateMemory(tempDir, { force: false });

    expect(result.skipped).toContain(filePath);
    expect(readFileSync(filePath, 'utf-8')).toBe('existing memory');
  });

  it('should overwrite with --force', () => {
    const filePath = join(tempDir, 'flow', 'memory.md');
    writeFileSync(filePath, 'old memory', 'utf-8');

    const result = generateMemory(tempDir, { force: true });

    expect(result.updated).toContain(filePath);
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('# Project Memory');
  });
});

describe('generateHeartbeat', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    mkdirSync(join(tempDir, 'flow'), { recursive: true });
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should create heartbeat.md with template', () => {
    const result = generateHeartbeat(tempDir, { force: false });

    const filePath = join(tempDir, 'flow', 'heartbeat.md');
    expect(existsSync(filePath)).toBe(true);
    expect(result.created).toContain(filePath);

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('# Heartbeat');
    expect(content).toContain('**Project**:');
    expect(content).toContain('## Tasks');
  });

  it('should skip if file exists and no force', () => {
    const filePath = join(tempDir, 'flow', 'heartbeat.md');
    writeFileSync(filePath, 'existing heartbeat', 'utf-8');

    const result = generateHeartbeat(tempDir, { force: false });

    expect(result.skipped).toContain(filePath);
    expect(readFileSync(filePath, 'utf-8')).toBe('existing heartbeat');
  });

  it('should overwrite with --force', () => {
    const filePath = join(tempDir, 'flow', 'heartbeat.md');
    writeFileSync(filePath, 'old heartbeat', 'utf-8');

    const result = generateHeartbeat(tempDir, { force: true });

    expect(result.updated).toContain(filePath);
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('# Heartbeat');
  });
});
