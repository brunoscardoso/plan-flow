/**
 * Tests for hooks utility
 */

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { readSettings, mergeHooks, writeSettings, installHooks } from './hooks';

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `plan-flow-hooks-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe('readSettings', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should return empty object when settings.json does not exist', () => {
    const result = readSettings(tempDir);
    expect(result).toEqual({});
  });

  it('should parse existing settings.json', () => {
    const claudeDir = join(tempDir, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(
      join(claudeDir, 'settings.json'),
      JSON.stringify({ permissions: { allow: ['Read'] } })
    );

    const result = readSettings(tempDir);
    expect(result.permissions).toEqual({ allow: ['Read'] });
  });

  it('should return empty object for invalid JSON', () => {
    const claudeDir = join(tempDir, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'settings.json'), 'not valid json');

    const result = readSettings(tempDir);
    expect(result).toEqual({});
  });
});

describe('mergeHooks', () => {
  it('should add hooks to empty settings', () => {
    const result = mergeHooks({});
    expect(result.hooks).toBeDefined();
    expect(result.hooks!.PreCompact).toHaveLength(1);
    expect(result.hooks!.SessionStart).toHaveLength(1);
    expect(result.hooks!.Stop).toHaveLength(1);
  });

  it('should preserve existing non-hook settings', () => {
    const existing = { permissions: { allow: ['Read'] } };
    const result = mergeHooks(existing);
    expect(result.permissions).toEqual({ allow: ['Read'] });
    expect(result.hooks).toBeDefined();
  });

  it('should preserve existing user hooks', () => {
    const existing = {
      hooks: {
        PreCompact: [
          {
            matcher: '',
            hooks: [{ type: 'command', command: 'echo "user hook"' }],
          },
        ],
      },
    };
    const result = mergeHooks(existing);

    // Should have user hook + planflow hook
    expect(result.hooks!.PreCompact).toHaveLength(2);
    expect(result.hooks!.PreCompact[0].hooks[0].command).toBe(
      'echo "user hook"'
    );
    expect(result.hooks!.PreCompact[1].hooks[0].command).toContain(
      'pre-compact.cjs'
    );
  });

  it('should not duplicate planflow hooks on second merge', () => {
    const first = mergeHooks({});
    const second = mergeHooks(first);

    expect(second.hooks!.PreCompact).toHaveLength(1);
    expect(second.hooks!.SessionStart).toHaveLength(1);
    expect(second.hooks!.Stop).toHaveLength(1);
  });

  it('should include planflow marker in hook commands', () => {
    const result = mergeHooks({});
    const hook = result.hooks!.PreCompact[0].hooks[0];
    expect(hook.command).toContain('# planflow');
  });
});

describe('writeSettings', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    mkdirSync(join(tempDir, '.claude'), { recursive: true });
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should write settings.json', () => {
    writeSettings(tempDir, { hooks: {} });

    const content = readFileSync(
      join(tempDir, '.claude', 'settings.json'),
      'utf-8'
    );
    expect(JSON.parse(content)).toEqual({ hooks: {} });
  });

  it('should create backup of existing settings', () => {
    const settingsPath = join(tempDir, '.claude', 'settings.json');
    writeFileSync(settingsPath, '{"old": true}');

    writeSettings(tempDir, { hooks: {} });

    const backup = readFileSync(settingsPath + '.bak', 'utf-8');
    expect(JSON.parse(backup)).toEqual({ old: true });
  });
});

describe('installHooks', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    mkdirSync(join(tempDir, '.claude'), { recursive: true });
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should install hooks and return true', () => {
    const result = installHooks(tempDir);
    expect(result).toBe(true);

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );
    expect(settings.hooks.PreCompact).toBeDefined();
    expect(settings.hooks.SessionStart).toBeDefined();
    expect(settings.hooks.Stop).toBeDefined();
  });

  it('should be idempotent', () => {
    installHooks(tempDir);
    installHooks(tempDir);

    const settings = JSON.parse(
      readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8')
    );
    expect(settings.hooks.PreCompact).toHaveLength(1);
  });
});
