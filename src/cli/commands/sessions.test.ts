/**
 * Tests for CLI session commands.
 */

import { jest } from '@jest/globals';
import {
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  runSessionsList,
  runSessionsSearch,
  runSessionsShow,
  runSessionsPrune,
} from './sessions';

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `plan-flow-cmd-sessions-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

const SAMPLE_SESSION = `---
id: 2026-03-04_11-30_a1b2c3
date: 2026-03-04
start: 2026-03-04T11:30:00Z
end: 2026-03-04T12:15:00Z
duration_min: 45
messages: 12
skills: [execute-plan, review-code]
features: [session-storage]
files_changed: 8
---

# Session: 2026-03-04 11:30

**Project**: [[cli]]
`;

const SAMPLE_SESSION_2 = `---
id: 2026-03-01_09-00_d4e5f6
date: 2026-03-01
start: 2026-03-01T09:00:00Z
end: 2026-03-01T10:00:00Z
duration_min: 60
messages: 8
skills: [discovery]
features: [auth-flow]
files_changed: 2
---

# Session: 2026-03-01 09:00

**Project**: [[cli]]
`;

let tempDir: string;
let consoleSpy: jest.SpyInstance;

beforeEach(() => {
  tempDir = createTempDir();
  const sessionsDir = join(tempDir, 'flow', 'brain', 'sessions');
  mkdirSync(sessionsDir, { recursive: true });
  writeFileSync(join(sessionsDir, '2026-03-04_11-30_a1b2c3.md'), SAMPLE_SESSION);
  writeFileSync(join(sessionsDir, '2026-03-01_09-00_d4e5f6.md'), SAMPLE_SESSION_2);
  consoleSpy = jest.spyOn(console, 'log').mockImplementation();
});

afterEach(() => {
  cleanup(tempDir);
  consoleSpy.mockRestore();
});

describe('runSessionsList', () => {
  it('should display sessions in table format', async () => {
    await runSessionsList({ target: tempDir });

    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('2026-03-04_11-30_a1b2c3');
    expect(output).toContain('2026-03-01_09-00_d4e5f6');
    expect(output).toContain('Showing 2 of 2 sessions');
  });

  it('should output JSON when --json flag is set', async () => {
    await runSessionsList({ target: tempDir, json: true });

    const output = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.total).toBe(2);
  });

  it('should filter by feature', async () => {
    await runSessionsList({ target: tempDir, feature: 'auth', json: true });

    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].features).toContain('auth-flow');
  });

  it('should handle missing sessions directory', async () => {
    const emptyDir = createTempDir();
    await runSessionsList({ target: emptyDir });

    const output = consoleSpy.mock.calls[0][0];
    expect(output).toContain('No sessions directory found');
    cleanup(emptyDir);
  });

  it('should respect limit and offset', async () => {
    await runSessionsList({ target: tempDir, limit: 1, offset: 0, json: true });

    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.hasMore).toBe(true);
  });
});

describe('runSessionsSearch', () => {
  it('should find sessions matching query', async () => {
    await runSessionsSearch('session-storage', { target: tempDir });

    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('2026-03-04_11-30_a1b2c3');
  });

  it('should display no results message', async () => {
    await runSessionsSearch('nonexistent-xyz', { target: tempDir });

    const output = consoleSpy.mock.calls[0][0];
    expect(output).toContain('No sessions found matching');
  });

  it('should output JSON when --json flag is set', async () => {
    await runSessionsSearch('session-storage', { target: tempDir, json: true });

    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(parsed.items.length).toBeGreaterThan(0);
  });
});

describe('runSessionsShow', () => {
  it('should display session content', async () => {
    await runSessionsShow('2026-03-04_11-30_a1b2c3', { target: tempDir });

    const output = consoleSpy.mock.calls[0][0];
    expect(output).toContain('Session: 2026-03-04');
    expect(output).toContain('[[cli]]');
  });

  it('should display not found message for invalid ID', async () => {
    await runSessionsShow('nonexistent', { target: tempDir });

    const output = consoleSpy.mock.calls[0][0];
    expect(output).toContain('not found');
  });
});

describe('runSessionsPrune', () => {
  it('should show dry run output', async () => {
    await runSessionsPrune({
      target: tempDir,
      before: '2026-03-03',
      dryRun: true,
    });

    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('Would prune 1 session(s)');
    expect(output).toContain('2026-03-01_09-00_d4e5f6');
  });

  it('should prune sessions', async () => {
    await runSessionsPrune({
      target: tempDir,
      before: '2026-03-03',
    });

    const output = consoleSpy.mock.calls[0][0];
    expect(output).toContain('Pruned 1 session(s)');
  });

  it('should handle missing directory', async () => {
    const emptyDir = createTempDir();
    await runSessionsPrune({
      target: emptyDir,
      before: '2026-03-05',
    });

    const output = consoleSpy.mock.calls[0][0];
    expect(output).toContain('No sessions directory found');
    cleanup(emptyDir);
  });
});
