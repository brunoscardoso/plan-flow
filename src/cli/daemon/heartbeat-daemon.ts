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

  const child = spawn('claude', ['-p', task.command], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
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

function scheduleTask(task: HeartbeatTask): void {
  if (!task.enabled) {
    log(`Task "${task.name}" is disabled, skipping`);
    return;
  }

  const config = task.scheduleConfig;

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
