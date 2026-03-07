/**
 * Heartbeat CLI command
 *
 * Manages the heartbeat daemon: start, stop, status.
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import * as log from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getPidPath(target: string): string {
  return join(target, 'flow', '.heartbeat.pid');
}

function getDaemonPath(): string {
  return join(__dirname, '..', 'daemon', 'heartbeat-daemon.js');
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readPid(target: string): number | null {
  const pidPath = getPidPath(target);
  if (!existsSync(pidPath)) return null;

  try {
    const pidStr = readFileSync(pidPath, 'utf-8').trim();
    const pid = parseInt(pidStr, 10);
    if (isNaN(pid)) return null;
    return pid;
  } catch {
    return null;
  }
}

function cleanStalePid(target: string): void {
  const pidPath = getPidPath(target);
  if (existsSync(pidPath)) {
    try {
      unlinkSync(pidPath);
    } catch {
      // ignore
    }
  }
}

/**
 * Starts the heartbeat daemon if heartbeat.md exists and daemon is not already running.
 * Called automatically during `plan-flow init`.
 */
export async function startHeartbeatIfNeeded(target: string): Promise<void> {
  const heartbeatPath = join(target, 'flow', 'heartbeat.md');
  if (!existsSync(heartbeatPath)) return;

  const existingPid = readPid(target);
  if (existingPid && isProcessRunning(existingPid)) {
    log.info(`Heartbeat daemon already running (PID: ${existingPid})`);
    return;
  }

  if (existingPid) cleanStalePid(target);

  const daemonPath = getDaemonPath();
  const child = spawn(process.execPath, [daemonPath, target], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  await new Promise((resolve) => setTimeout(resolve, 500));

  const pid = readPid(target);
  if (pid) {
    log.success(`Heartbeat daemon started in background (PID: ${pid})`);
  }
}

export async function runHeartbeat(
  action: string,
  options: { target: string }
): Promise<void> {
  const target = options.target;
  const heartbeatPath = join(target, 'flow', 'heartbeat.md');

  switch (action) {
    case 'start': {
      // Check if already running
      const existingPid = readPid(target);
      if (existingPid && isProcessRunning(existingPid)) {
        log.info(`Heartbeat daemon is already running (PID: ${existingPid})`);
        return;
      }

      // Clean stale PID if exists
      if (existingPid) {
        cleanStalePid(target);
      }

      // Check heartbeat.md exists
      if (!existsSync(heartbeatPath)) {
        log.warn('No flow/heartbeat.md found. Create it first with /heartbeat -add');
        return;
      }

      // Spawn detached daemon
      const daemonPath = getDaemonPath();
      const child = spawn(process.execPath, [daemonPath, target], {
        detached: true,
        stdio: 'ignore',
      });

      child.unref();

      // Brief wait for PID file to be written
      await new Promise((resolve) => setTimeout(resolve, 500));

      const pid = readPid(target);
      if (pid) {
        log.success(`Heartbeat daemon started (PID: ${pid})`);
      } else {
        log.warn('Daemon may have failed to start — check flow/.heartbeat.log');
      }
      break;
    }

    case 'stop': {
      const pid = readPid(target);
      if (!pid) {
        log.info('Heartbeat daemon is not running');
        return;
      }

      if (!isProcessRunning(pid)) {
        cleanStalePid(target);
        log.info('Heartbeat daemon was not running (cleaned stale PID)');
        return;
      }

      try {
        process.kill(pid, 'SIGTERM');
        log.success(`Heartbeat daemon stopped (PID: ${pid})`);
      } catch (err) {
        log.warn(`Failed to stop daemon: ${(err as Error).message}`);
      }

      // Clean PID file (daemon should do this, but just in case)
      cleanStalePid(target);
      break;
    }

    case 'status': {
      const pid = readPid(target);

      if (!pid) {
        log.info('Heartbeat daemon: stopped');
        return;
      }

      if (isProcessRunning(pid)) {
        log.info(`Heartbeat daemon: running (PID: ${pid})`);

        // Show last few log entries
        const logPath = join(target, 'flow', '.heartbeat.log');
        if (existsSync(logPath)) {
          const logContent = readFileSync(logPath, 'utf-8');
          const lines = logContent.trim().split('\n');
          const recent = lines.slice(-5);
          console.log('\nRecent log:');
          for (const line of recent) {
            console.log(`  ${line}`);
          }
        }
      } else {
        cleanStalePid(target);
        log.info('Heartbeat daemon: stopped (cleaned stale PID)');
      }
      break;
    }

    default:
      log.warn(`Unknown action: ${action}. Use start, stop, or status.`);
  }
}
