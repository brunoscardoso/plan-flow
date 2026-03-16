#!/usr/bin/env node
/**
 * Heartbeat Daemon
 *
 * A detached Node.js process that reads flow/heartbeat.md,
 * schedules tasks, and spawns Claude Code CLI to execute them.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, watch, appendFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { parseHeartbeatFile } from './heartbeat-parser.js';
import type { HeartbeatTask, ScheduleConfig } from '../types.js';

const target = process.argv[2] || process.cwd();
const heartbeatPath = join(target, 'flow', 'heartbeat.md');
const pidPath = join(target, 'flow', '.heartbeat.pid');
const logPath = join(target, 'flow', '.heartbeat.log');

const activeTimers: NodeJS.Timeout[] = [];
let taskRunning = false;

const ACTIVE_SESSION_ERROR = 'cannot be launched inside another Claude Code session';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 60_000;
const retryCountMap = new Map<string, number>();

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  appendFileSync(logPath, line, 'utf-8');
  truncateLog();
}

function truncateLog(): void {
  try {
    const stat = statSync(logPath);
    if (stat.size > 100_000) {
      const content = readFileSync(logPath, 'utf-8');
      const lines = content.split('\n');
      const kept = lines.slice(-500).join('\n');
      writeFileSync(logPath, kept, 'utf-8');
    }
  } catch {
    // ignore
  }
}

function clearTimers(): void {
  for (const timer of activeTimers) {
    clearTimeout(timer);
    clearInterval(timer);
  }
  activeTimers.length = 0;
}

function msUntilNextOccurrence(config: ScheduleConfig): number {
  const now = new Date();

  if (config.type === 'daily') {
    const target = new Date(now);
    target.setHours(config.hour!, config.minute!, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target.getTime() - now.getTime();
  }

  if (config.type === 'weekly') {
    const target = new Date(now);
    const currentDay = now.getDay();
    let daysUntil = config.dayOfWeek! - currentDay;
    if (daysUntil < 0) daysUntil += 7;
    if (daysUntil === 0) {
      target.setHours(config.hour!, config.minute!, 0, 0);
      if (target.getTime() <= now.getTime()) {
        daysUntil = 7;
      }
    }
    target.setDate(now.getDate() + daysUntil);
    target.setHours(config.hour!, config.minute!, 0, 0);
    return target.getTime() - now.getTime();
  }

  // once — run after delay
  if (config.type === 'once') {
    return config.intervalMs!;
  }

  // interval — start immediately
  return 0;
}

function executeTask(task: HeartbeatTask): void {
  if (taskRunning) {
    log(`Skipping "${task.name}" — another task is running`);
    return;
  }

  taskRunning = true;
  log(`Executing "${task.name}": ${task.command}`);

  // Strip CLAUDECODE env var to avoid "nested session" detection.
  // The daemon runs detached — it's not actually nested.
  const cleanEnv = { ...process.env };
  delete cleanEnv['CLAUDECODE'];

  const args = [
    '-p',
    '--dangerously-skip-permissions',
    '--append-system-prompt',
    'You are running autonomously via the heartbeat daemon. There is NO human to ask for permission — you MUST act directly. Use Edit/Write/Bash tools without hesitation. Never say "Could you grant permission" or "I need write access" — you already have full permissions via --dangerously-skip-permissions. If a tool call fails, retry or find an alternative. Complete the task fully.',
  ];

  // Add extra directories if specified
  if (task.addDirs?.length) {
    for (const dir of task.addDirs) {
      args.push('--add-dir', dir);
    }
  }

  args.push(task.command);

  const child = spawn('claude', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: target,
    env: cleanEnv,
  });

  let stdout = '';
  let stderr = '';

  child.stdout?.on('data', (data: Buffer) => {
    stdout += data.toString();
  });

  child.stderr?.on('data', (data: Buffer) => {
    stderr += data.toString();
  });

  child.on('close', (code: number | null) => {
    taskRunning = false;
    if (code === 0) {
      log(`Task "${task.name}" completed successfully`);
      retryCountMap.delete(task.name);
      if (task.oneShot) {
        disableOneShotTask(task.name);
      }
    } else if (stderr.includes(ACTIVE_SESSION_ERROR)) {
      scheduleRetry(task);
    } else {
      log(`Task "${task.name}" failed with code ${code}`);
      if (stderr) log(`  stderr: ${stderr.slice(0, 500)}`);
    }
    if (stdout) log(`  output: ${stdout.slice(0, 500)}`);
  });

  child.on('error', (err: Error) => {
    taskRunning = false;
    log(`Task "${task.name}" error: ${err.message}`);
  });
}

function scheduleRetry(task: HeartbeatTask): void {
  const count = (retryCountMap.get(task.name) ?? 0) + 1;
  retryCountMap.set(task.name, count);

  if (count > MAX_RETRIES) {
    log(`Task "${task.name}" failed — exhausted ${MAX_RETRIES} retries (Claude Code session kept active)`);
    retryCountMap.delete(task.name);
    return;
  }

  log(`Task "${task.name}" deferred — Claude Code session active. Will retry in 60s (attempt ${count}/${MAX_RETRIES})`);
  const timer = setTimeout(() => executeTask(task), RETRY_DELAY_MS);
  activeTimers.push(timer);
}

function disableOneShotTask(taskName: string): void {
  try {
    if (!existsSync(heartbeatPath)) return;
    let content = readFileSync(heartbeatPath, 'utf-8');
    // Find the task section and replace Enabled: true with Enabled: false
    const taskPattern = new RegExp(
      `(###\\s+${taskName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?\\*\\*Enabled\\*\\*:\\s*)true`,
      'i'
    );
    const updated = content.replace(taskPattern, '$1false');
    if (updated !== content) {
      writeFileSync(heartbeatPath, updated, 'utf-8');
      log(`One-shot task "${taskName}" disabled after execution`);
    }
  } catch (err) {
    log(`Failed to disable one-shot task "${taskName}": ${(err as Error).message}`);
  }
}

function scheduleTask(task: HeartbeatTask): void {
  if (!task.enabled) {
    log(`Task "${task.name}" is disabled, skipping`);
    return;
  }

  const config = task.scheduleConfig;

  if (config.type === 'once') {
    const ms = config.intervalMs!;
    log(`Scheduling one-shot "${task.name}" — runs in ${Math.round(ms / 1000)}s`);
    const timer = setTimeout(() => executeTask(task), ms);
    activeTimers.push(timer);
    return;
  }

  if (config.type === 'interval') {
    log(`Scheduling "${task.name}" every ${config.intervalMs! / 1000}s`);
    const timer = setInterval(() => executeTask(task), config.intervalMs!);
    activeTimers.push(timer);
    return;
  }

  // For daily/weekly, schedule the first occurrence, then repeat
  const ms = msUntilNextOccurrence(config);
  const repeatMs = config.type === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

  log(`Scheduling "${task.name}" — next run in ${Math.round(ms / 1000)}s`);

  const timer = setTimeout(() => {
    executeTask(task);
    const repeater = setInterval(() => executeTask(task), repeatMs);
    activeTimers.push(repeater);
  }, ms);

  activeTimers.push(timer);
}

function loadAndSchedule(): void {
  clearTimers();

  if (!existsSync(heartbeatPath)) {
    log('No heartbeat.md found');
    return;
  }

  const content = readFileSync(heartbeatPath, 'utf-8');
  const tasks = parseHeartbeatFile(content);

  log(`Loaded ${tasks.length} task(s)`);

  for (const task of tasks) {
    scheduleTask(task);
  }
}

function cleanup(): void {
  log('Daemon shutting down');
  clearTimers();

  try {
    if (existsSync(pidPath)) {
      unlinkSync(pidPath);
    }
  } catch {
    // ignore
  }

  process.exit(0);
}

// --- Main ---

// Write PID file
writeFileSync(pidPath, String(process.pid), 'utf-8');
log(`Daemon started (PID: ${process.pid})`);

// Signal handlers
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

// Initial load
loadAndSchedule();

// Watch for file changes with debounce
let debounceTimer: NodeJS.Timeout | null = null;

try {
  watch(heartbeatPath, () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      log('heartbeat.md changed — reloading');
      loadAndSchedule();
    }, 1000);
  });
} catch {
  log('Warning: could not watch heartbeat.md for changes');
}

// Keepalive: refresh PID file every 5 minutes so stale detection works
const KEEPALIVE_MS = 5 * 60 * 1000;
setInterval(() => {
  try {
    writeFileSync(pidPath, String(process.pid), 'utf-8');
  } catch {
    // ignore
  }
}, KEEPALIVE_MS);

// Handle uncaught errors gracefully — log and continue
process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${String(reason)}`);
});
