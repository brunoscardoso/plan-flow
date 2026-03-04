/**
 * Tests for multi-platform hook system.
 */

import {
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  getPlatformHookInfo,
  generateWrapperScripts,
  needsWrapperScripts,
  PLATFORM_CAPABILITIES,
} from './platform-hooks';

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `plan-flow-platform-hooks-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe('getPlatformHookInfo', () => {
  it('should return native hooks for claude', () => {
    const info = getPlatformHookInfo('claude');
    expect(info.nativeHooks).toBe(true);
    expect(info.fallbackType).toBe('none');
  });

  it('should return wrapper-scripts for cursor', () => {
    const info = getPlatformHookInfo('cursor');
    expect(info.nativeHooks).toBe(false);
    expect(info.fallbackType).toBe('wrapper-scripts');
  });

  it('should return wrapper-scripts for codex', () => {
    const info = getPlatformHookInfo('codex');
    expect(info.nativeHooks).toBe(false);
    expect(info.fallbackType).toBe('wrapper-scripts');
  });

  it('should return instructions-only for openclaw', () => {
    const info = getPlatformHookInfo('openclaw');
    expect(info.nativeHooks).toBe(false);
    expect(info.fallbackType).toBe('instructions-only');
  });

  it('should return instructions-only for clawhub', () => {
    const info = getPlatformHookInfo('clawhub');
    expect(info.nativeHooks).toBe(false);
    expect(info.fallbackType).toBe('instructions-only');
  });
});

describe('PLATFORM_CAPABILITIES', () => {
  it('should have entries for all 5 platforms', () => {
    const platforms = ['claude', 'cursor', 'openclaw', 'clawhub', 'codex'];
    for (const p of platforms) {
      expect(PLATFORM_CAPABILITIES).toHaveProperty(p);
    }
  });

  it('should only have claude with nativeHooks', () => {
    const nativePlatforms = Object.entries(PLATFORM_CAPABILITIES)
      .filter(([, cap]) => cap.nativeHooks)
      .map(([name]) => name);
    expect(nativePlatforms).toEqual(['claude']);
  });
});

describe('needsWrapperScripts', () => {
  it('should return true when cursor is selected', () => {
    expect(needsWrapperScripts(['cursor'])).toBe(true);
  });

  it('should return true when codex is selected', () => {
    expect(needsWrapperScripts(['codex'])).toBe(true);
  });

  it('should return false for claude only', () => {
    expect(needsWrapperScripts(['claude'])).toBe(false);
  });

  it('should return false for openclaw only', () => {
    expect(needsWrapperScripts(['openclaw'])).toBe(false);
  });

  it('should return true when mixed platforms include cursor', () => {
    expect(needsWrapperScripts(['claude', 'cursor'])).toBe(true);
  });
});

describe('generateWrapperScripts', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should create both wrapper scripts', () => {
    const result = generateWrapperScripts(tempDir);

    expect(result.created).toHaveLength(2);
    expect(result.skipped).toHaveLength(0);

    const startScript = join(tempDir, 'scripts', 'plan-flow', 'start-session.sh');
    const endScript = join(tempDir, 'scripts', 'plan-flow', 'end-session.sh');

    expect(existsSync(startScript)).toBe(true);
    expect(existsSync(endScript)).toBe(true);
  });

  it('should include shebang and node command in start script', () => {
    generateWrapperScripts(tempDir);

    const content = readFileSync(
      join(tempDir, 'scripts', 'plan-flow', 'start-session.sh'),
      'utf-8'
    );
    expect(content).toContain('#!/bin/bash');
    expect(content).toContain('node scripts/hooks/session-start.cjs');
  });

  it('should include shebang and node command in end script', () => {
    generateWrapperScripts(tempDir);

    const content = readFileSync(
      join(tempDir, 'scripts', 'plan-flow', 'end-session.sh'),
      'utf-8'
    );
    expect(content).toContain('#!/bin/bash');
    expect(content).toContain('node scripts/hooks/session-end.cjs');
  });

  it('should skip existing scripts', () => {
    // Create scripts first
    generateWrapperScripts(tempDir);

    // Run again
    const result = generateWrapperScripts(tempDir);
    expect(result.created).toHaveLength(0);
    expect(result.skipped).toHaveLength(2);
  });

  it('should set executable permission on scripts', () => {
    generateWrapperScripts(tempDir);

    const startScript = join(tempDir, 'scripts', 'plan-flow', 'start-session.sh');
    const stat = statSync(startScript);
    // Check that owner execute bit is set (0o100)
    expect(stat.mode & 0o100).toBeTruthy();
  });

  it('should create scripts/plan-flow/ directory', () => {
    generateWrapperScripts(tempDir);

    const scriptsDir = join(tempDir, 'scripts', 'plan-flow');
    expect(existsSync(scriptsDir)).toBe(true);
  });
});
