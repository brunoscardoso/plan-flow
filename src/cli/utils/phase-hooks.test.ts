/**
 * Tests for phase lifecycle hooks utility.
 */

import { jest } from '@jest/globals';
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  loadHooksConfig,
  runPhaseHooks,
  logHookResults,
} from './phase-hooks';
import type { HookContext } from './phase-hooks';

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `plan-flow-phase-hooks-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

function writeHooksConfig(dir: string, config: unknown): void {
  const flowDir = join(dir, 'flow');
  mkdirSync(flowDir, { recursive: true });
  writeFileSync(join(flowDir, 'hooks.json'), JSON.stringify(config));
}

function makeContext(dir: string, overrides?: Partial<HookContext>): HookContext {
  return {
    phase: 1,
    phaseName: 'Test Phase',
    plan: 'plan_test_v1',
    targetDir: dir,
    totalPhases: 3,
    ...overrides,
  };
}

describe('loadHooksConfig', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should return null when no hooks.json exists', () => {
    expect(loadHooksConfig(tempDir)).toBeNull();
  });

  it('should load valid hooks config', () => {
    writeHooksConfig(tempDir, {
      hooks: {
        'pre-phase': [{ command: 'echo hello' }],
      },
    });

    const config = loadHooksConfig(tempDir);
    expect(config).not.toBeNull();
    expect(config!.hooks['pre-phase']).toHaveLength(1);
    expect(config!.hooks['pre-phase']![0].command).toBe('echo hello');
  });

  it('should return null for invalid JSON', () => {
    const flowDir = join(tempDir, 'flow');
    mkdirSync(flowDir, { recursive: true });
    writeFileSync(join(flowDir, 'hooks.json'), 'not json');

    expect(loadHooksConfig(tempDir)).toBeNull();
  });

  it('should return null if hooks key is missing', () => {
    writeHooksConfig(tempDir, { notHooks: {} });
    expect(loadHooksConfig(tempDir)).toBeNull();
  });
});

describe('runPhaseHooks', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should return empty array when no config exists', () => {
    const results = runPhaseHooks('pre-phase', makeContext(tempDir));
    expect(results).toEqual([]);
  });

  it('should return empty array when no hooks for event', () => {
    writeHooksConfig(tempDir, {
      hooks: {
        'post-phase': [{ command: 'echo post' }],
      },
    });

    const results = runPhaseHooks('pre-phase', makeContext(tempDir));
    expect(results).toEqual([]);
  });

  it('should execute hooks and return results', () => {
    writeHooksConfig(tempDir, {
      hooks: {
        'pre-phase': [{ command: 'echo hello' }],
      },
    });

    const results = runPhaseHooks('pre-phase', makeContext(tempDir));
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].output).toBe('hello');
    expect(results[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should pass environment variables to hooks', () => {
    writeHooksConfig(tempDir, {
      hooks: {
        'pre-phase': [
          { command: 'echo $PLANFLOW_PHASE-$PLANFLOW_PLAN-$PLANFLOW_EVENT' },
        ],
      },
    });

    const results = runPhaseHooks(
      'pre-phase',
      makeContext(tempDir, { phase: 2, plan: 'plan_test_v1' })
    );
    expect(results[0].success).toBe(true);
    expect(results[0].output).toBe('2-plan_test_v1-pre-phase');
  });

  it('should continue on non-fatal hook failure', () => {
    writeHooksConfig(tempDir, {
      hooks: {
        'pre-phase': [
          { command: 'exit 1' },
          { command: 'echo after-fail' },
        ],
      },
    });

    const results = runPhaseHooks('pre-phase', makeContext(tempDir));
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(false);
    expect(results[1].success).toBe(true);
    expect(results[1].output).toBe('after-fail');
  });

  it('should throw on fatal hook failure', () => {
    writeHooksConfig(tempDir, {
      hooks: {
        'pre-phase': [
          { command: 'exit 1', fatal: true },
          { command: 'echo should-not-run' },
        ],
      },
    });

    expect(() => runPhaseHooks('pre-phase', makeContext(tempDir))).toThrow(
      /Fatal hook failed/
    );
  });

  it('should respect timeout', () => {
    writeHooksConfig(tempDir, {
      hooks: {
        'pre-phase': [{ command: 'sleep 10', timeout: 100 }],
      },
    });

    const results = runPhaseHooks('pre-phase', makeContext(tempDir));
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toMatch(/TIMEOUT|ETIMEDOUT|timed out|killed/i);
  });

  it('should execute multiple hooks in order', () => {
    writeHooksConfig(tempDir, {
      hooks: {
        'post-phase': [
          { command: 'echo first' },
          { command: 'echo second' },
        ],
      },
    });

    const results = runPhaseHooks('post-phase', makeContext(tempDir));
    expect(results).toHaveLength(2);
    expect(results[0].output).toBe('first');
    expect(results[1].output).toBe('second');
  });
});

describe('logHookResults', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should create hooks.log with results', () => {
    const stateDir = join(tempDir, 'flow', 'state');

    logHookResults(tempDir, 'pre-phase', [
      {
        command: 'echo hello',
        success: true,
        output: 'hello',
        durationMs: 50,
      },
    ]);

    const logPath = join(stateDir, 'hooks.log');
    expect(existsSync(logPath)).toBe(true);
    const content = readFileSync(logPath, 'utf-8');
    expect(content).toContain('pre-phase');
    expect(content).toContain('OK');
    expect(content).toContain('echo hello');
  });

  it('should log FAIL for failed hooks', () => {
    logHookResults(tempDir, 'post-phase', [
      {
        command: 'bad-command',
        success: false,
        error: 'command not found',
        durationMs: 10,
      },
    ]);

    const logPath = join(tempDir, 'flow', 'state', 'hooks.log');
    const content = readFileSync(logPath, 'utf-8');
    expect(content).toContain('FAIL');
    expect(content).toContain('bad-command');
  });

  it('should not write if no results', () => {
    logHookResults(tempDir, 'pre-phase', []);
    const logPath = join(tempDir, 'flow', 'state', 'hooks.log');
    expect(existsSync(logPath)).toBe(false);
  });

  it('should append to existing log', () => {
    logHookResults(tempDir, 'pre-phase', [
      { command: 'echo first', success: true, durationMs: 10 },
    ]);
    logHookResults(tempDir, 'post-phase', [
      { command: 'echo second', success: true, durationMs: 20 },
    ]);

    const logPath = join(tempDir, 'flow', 'state', 'hooks.log');
    const content = readFileSync(logPath, 'utf-8');
    expect(content).toContain('echo first');
    expect(content).toContain('echo second');
  });
});
