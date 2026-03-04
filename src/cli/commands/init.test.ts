/**
 * Tests for init command
 */

import {
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, beforeAll } from '@jest/globals';
import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock prompts to avoid interactive stdin in tests
jest.unstable_mockModule(resolve(__dirname, '../utils/prompts'), () => ({
  askLegacyFilesAction: jest.fn<() => Promise<string>>().mockResolvedValue('keep'),
  selectPlatforms: jest.fn<() => Promise<string[]>>().mockResolvedValue(['claude']),
}));

const { runInit } = await import('./init');

function createTempDir(): string {
  const dir = join(tmpdir(), `plan-flow-init-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

// Redirect vault to temp dir to avoid polluting real vault
let initTestVaultDir: string;

beforeAll(() => {
  initTestVaultDir = join(tmpdir(), `plan-flow-vault-initcmd-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(initTestVaultDir, { recursive: true });
  process.env.PLAN_FLOW_VAULT_DIR = initTestVaultDir;
});

afterAll(() => {
  rmSync(initTestVaultDir, { recursive: true, force: true });
  delete process.env.PLAN_FLOW_VAULT_DIR;
});

// Suppress console output during tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('runInit', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    // Create a project indicator so validation passes cleanly
    writeFileSync(join(tempDir, 'package.json'), '{}');
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should install Claude Code files with --claude flag', async () => {
    await runInit({ claude: true, target: tempDir });

    expect(existsSync(join(tempDir, '.claude', 'commands'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'rules'))).toBe(true);
    expect(existsSync(join(tempDir, 'CLAUDE.md'))).toBe(true);
    // Shared resources should also be installed
    expect(existsSync(join(tempDir, 'flow'))).toBe(true);
  });

  it('should install Cursor files with --cursor flag', async () => {
    await runInit({ cursor: true, target: tempDir });

    expect(existsSync(join(tempDir, '.cursor', 'rules'))).toBe(true);
    // Shared resources
    expect(existsSync(join(tempDir, 'flow'))).toBe(true);
  });

  it('should install OpenClaw files with --openclaw flag', async () => {
    await runInit({ openclaw: true, target: tempDir });

    expect(existsSync(join(tempDir, 'skills', 'plan-flow'))).toBe(true);
    // Shared resources
    expect(existsSync(join(tempDir, 'flow'))).toBe(true);
  });

  it('should install Codex CLI files with --codex flag', async () => {
    await runInit({ codex: true, target: tempDir });

    expect(existsSync(join(tempDir, '.agents', 'skills', 'plan-flow'))).toBe(true);
    expect(existsSync(join(tempDir, 'AGENTS.md'))).toBe(true);
    // Shared resources
    expect(existsSync(join(tempDir, 'flow'))).toBe(true);
  });

  it('should install all platforms with --all flag', async () => {
    await runInit({ all: true, target: tempDir });

    // Claude
    expect(existsSync(join(tempDir, '.claude', 'commands'))).toBe(true);
    expect(existsSync(join(tempDir, 'CLAUDE.md'))).toBe(true);
    // Cursor
    expect(existsSync(join(tempDir, '.cursor', 'rules'))).toBe(true);
    // OpenClaw
    expect(existsSync(join(tempDir, 'skills', 'plan-flow'))).toBe(true);
    // Codex
    expect(existsSync(join(tempDir, '.agents', 'skills', 'plan-flow'))).toBe(true);
    expect(existsSync(join(tempDir, 'AGENTS.md'))).toBe(true);
    // Shared
    expect(existsSync(join(tempDir, 'flow'))).toBe(true);
  });

  it('should respect --force flag for overwriting', async () => {
    // First install
    await runInit({ all: true, target: tempDir });
    // Second install with force
    await runInit({ all: true, target: tempDir, force: true });

    // Should still have everything
    expect(existsSync(join(tempDir, '.claude', 'commands'))).toBe(true);
    expect(existsSync(join(tempDir, '.cursor', 'rules'))).toBe(true);
  });
});
