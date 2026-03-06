/**
 * Tests for heartbeat CLI command
 */

import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runHeartbeat } from './heartbeat.js';

function createTempDir(): string {
  const dir = join(tmpdir(), `plan-flow-heartbeat-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe('heartbeat CLI', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    mkdirSync(join(tempDir, 'flow'), { recursive: true });
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  describe('status', () => {
    it('should report stopped when no PID file exists', async () => {
      // Should not throw
      await runHeartbeat('status', { target: tempDir });
    });

    it('should clean stale PID file', async () => {
      const pidPath = join(tempDir, 'flow', '.heartbeat.pid');
      // Write a PID that is very unlikely to be running
      writeFileSync(pidPath, '999999999', 'utf-8');

      await runHeartbeat('status', { target: tempDir });

      // PID file should be cleaned up
      expect(existsSync(pidPath)).toBe(false);
    });
  });

  describe('stop', () => {
    it('should report not running when no PID file exists', async () => {
      // Should not throw
      await runHeartbeat('stop', { target: tempDir });
    });

    it('should clean stale PID on stop', async () => {
      const pidPath = join(tempDir, 'flow', '.heartbeat.pid');
      writeFileSync(pidPath, '999999999', 'utf-8');

      await runHeartbeat('stop', { target: tempDir });

      expect(existsSync(pidPath)).toBe(false);
    });
  });

  describe('start', () => {
    it('should warn when no heartbeat.md exists', async () => {
      // Should not throw, just warn
      await runHeartbeat('start', { target: tempDir });
      // No PID file should be created without heartbeat.md
      expect(existsSync(join(tempDir, 'flow', '.heartbeat.pid'))).toBe(false);
    });
  });

  describe('unknown action', () => {
    it('should handle unknown actions gracefully', async () => {
      // Should not throw
      await runHeartbeat('restart', { target: tempDir });
    });
  });
});
