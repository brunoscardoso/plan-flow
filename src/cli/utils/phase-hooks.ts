/**
 * Phase lifecycle hooks for plan execution.
 *
 * Allows users to define shell commands in flow/hooks.json that run
 * at phase boundaries: pre-phase, post-phase, on-verification-fail.
 */

import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { ensureDir } from './files.js';

/** Hook event types triggered during plan execution. */
export type PhaseHookEvent =
  | 'pre-phase'
  | 'post-phase'
  | 'on-verification-fail';

/** A single hook entry in the config. */
export interface HookEntry {
  command: string;
  fatal?: boolean;
  timeout?: number;
}

/** The hooks.json config structure. */
export interface HooksConfig {
  hooks: Partial<Record<PhaseHookEvent, HookEntry[]>>;
}

/** Context passed to hooks via environment variables. */
export interface HookContext {
  phase: number;
  phaseName: string;
  plan: string;
  targetDir: string;
  totalPhases: number;
}

/** Result of executing a single hook. */
export interface HookResult {
  command: string;
  success: boolean;
  output?: string;
  error?: string;
  durationMs: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const HOOKS_CONFIG_FILE = 'hooks.json';
const HOOKS_LOG_FILE = 'hooks.log';

/**
 * Load hooks config from flow/hooks.json.
 * Returns null if the file doesn't exist or is invalid.
 */
export function loadHooksConfig(targetDir: string): HooksConfig | null {
  const configPath = join(targetDir, 'flow', HOOKS_CONFIG_FILE);
  if (!existsSync(configPath)) return null;

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    if (!raw.hooks || typeof raw.hooks !== 'object') return null;
    return raw as HooksConfig;
  } catch {
    return null;
  }
}

/**
 * Build environment variables for hook execution.
 */
function buildEnvVars(
  event: PhaseHookEvent,
  context: HookContext
): Record<string, string> {
  return {
    ...process.env,
    PLANFLOW_PHASE: String(context.phase),
    PLANFLOW_PHASE_NAME: context.phaseName,
    PLANFLOW_PLAN: context.plan,
    PLANFLOW_TARGET_DIR: context.targetDir,
    PLANFLOW_EVENT: event,
    PLANFLOW_TOTAL_PHASES: String(context.totalPhases),
  };
}

/**
 * Execute a single hook command.
 */
function executeHook(
  entry: HookEntry,
  env: Record<string, string>,
  cwd: string
): HookResult {
  const start = Date.now();
  const timeout = entry.timeout ?? DEFAULT_TIMEOUT_MS;

  try {
    const output = execSync(entry.command, {
      env,
      cwd,
      timeout,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      command: entry.command,
      success: true,
      output: output.trim(),
      durationMs: Date.now() - start,
    };
  } catch (err: unknown) {
    const error =
      err instanceof Error ? err.message : String(err);
    return {
      command: entry.command,
      success: false,
      error,
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Run all hooks for a given event.
 *
 * Non-fatal hooks log warnings on failure but don't throw.
 * Fatal hooks throw an error on failure, stopping execution.
 *
 * Returns an empty array if no config exists or no hooks are defined for the event.
 */
export function runPhaseHooks(
  event: PhaseHookEvent,
  context: HookContext
): HookResult[] {
  const config = loadHooksConfig(context.targetDir);
  if (!config) return [];

  const hooks = config.hooks[event];
  if (!hooks || hooks.length === 0) return [];

  const env = buildEnvVars(event, context);
  const results: HookResult[] = [];

  for (const entry of hooks) {
    const result = executeHook(entry, env, context.targetDir);
    results.push(result);

    if (!result.success && entry.fatal) {
      // Log before throwing so partial results are recorded
      logHookResults(context.targetDir, event, results);
      throw new Error(
        `Fatal hook failed: ${entry.command}\n${result.error}`
      );
    }
  }

  logHookResults(context.targetDir, event, results);
  return results;
}

/**
 * Append hook execution results to flow/state/hooks.log.
 */
export function logHookResults(
  targetDir: string,
  event: PhaseHookEvent,
  results: HookResult[]
): void {
  if (results.length === 0) return;

  const stateDir = join(targetDir, 'flow', 'state');
  ensureDir(stateDir);

  const logPath = join(stateDir, HOOKS_LOG_FILE);
  const timestamp = new Date().toISOString();
  const lines = results.map((r) => {
    const status = r.success ? 'OK' : 'FAIL';
    return `${timestamp} | ${event} | ${status} | ${r.durationMs}ms | ${r.command}`;
  });

  appendFileSync(logPath, lines.join('\n') + '\n');
}
