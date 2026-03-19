/**
 * Flowconfig Parser
 *
 * Parses `flow/.flowconfig` YAML into a structured FlowConfig object.
 * Uses regex-based line parsing consistent with the heartbeat daemon pattern.
 * Provides legacy fallbacks for `.autopilot` and `.gitcontrol` files.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FlowConfig } from './types.js';

const DEFAULT_CONFIG: FlowConfig = {
  autopilot: false,
  commit: false,
  push: false,
  pr: false,
  branch: '',
  wave_execution: true,
  phase_isolation: true,
  model_routing: false,
  max_verify_retries: 2,
};

const MIN_VERIFY_RETRIES = 1;
const MAX_VERIFY_RETRIES = 5;

/**
 * Extract a boolean value from flowconfig content by key name.
 * Returns undefined if the key is not found.
 */
function extractBoolean(content: string, key: string): boolean | undefined {
  const match = content.match(new RegExp(`^${key}:\\s*(true|false)`, 'm'));
  if (!match) return undefined;
  return match[1] === 'true';
}

/**
 * Extract a string value from flowconfig content by key name.
 * Returns undefined if the key is not found.
 */
function extractString(content: string, key: string): string | undefined {
  const match = content.match(new RegExp(`^${key}:\\s*(.+)`, 'm'));
  if (!match) return undefined;
  return match[1].trim();
}

/**
 * Extract a numeric value from flowconfig content by key name.
 * Returns undefined if the key is not found.
 */
function extractNumber(content: string, key: string): number | undefined {
  const match = content.match(new RegExp(`^${key}:\\s*(\\d+)`, 'm'));
  if (!match) return undefined;
  return parseInt(match[1], 10);
}

/**
 * Read legacy `.autopilot` file to determine autopilot setting.
 * File existence means autopilot is enabled.
 */
function readLegacyAutopilot(flowDir: string): boolean {
  return existsSync(join(flowDir, '.autopilot'));
}

/**
 * Read legacy `.gitcontrol` file for commit/push/branch settings.
 * Returns partial config values found in the file.
 */
function readLegacyGitControl(flowDir: string): { commit?: boolean; push?: boolean; branch?: string } {
  const gitControlPath = join(flowDir, '.gitcontrol');
  if (!existsSync(gitControlPath)) return {};

  try {
    const content = readFileSync(gitControlPath, 'utf-8');
    return {
      commit: extractBoolean(content, 'commit'),
      push: extractBoolean(content, 'push'),
      branch: extractString(content, 'branch'),
    };
  } catch {
    return {};
  }
}

/**
 * Parse `flow/.flowconfig` into a structured FlowConfig object.
 *
 * Applies defaults for missing keys and falls back to legacy files
 * (`.autopilot`, `.gitcontrol`) when keys are absent from `.flowconfig`.
 */
export function parseFlowConfig(flowDir: string): FlowConfig {
  const configPath = join(flowDir, '.flowconfig');
  const config: FlowConfig = { ...DEFAULT_CONFIG };

  if (!existsSync(configPath)) {
    // No .flowconfig — use legacy fallbacks + defaults
    config.autopilot = readLegacyAutopilot(flowDir);
    const legacy = readLegacyGitControl(flowDir);
    if (legacy.commit !== undefined) config.commit = legacy.commit;
    if (legacy.push !== undefined) config.push = legacy.push;
    if (legacy.branch !== undefined) config.branch = legacy.branch;
    return config;
  }

  let content: string;
  try {
    content = readFileSync(configPath, 'utf-8');
  } catch {
    return config;
  }

  // Parse boolean keys
  const autopilot = extractBoolean(content, 'autopilot');
  if (autopilot !== undefined) {
    config.autopilot = autopilot;
  } else {
    // Legacy fallback: check .autopilot file
    config.autopilot = readLegacyAutopilot(flowDir);
  }

  const commit = extractBoolean(content, 'commit');
  const push = extractBoolean(content, 'push');
  const pr = extractBoolean(content, 'pr');
  const branch = extractString(content, 'branch');

  if (commit !== undefined) {
    config.commit = commit;
  }
  if (push !== undefined) {
    config.push = push;
  }
  if (pr !== undefined) {
    config.pr = pr;
  }
  if (branch !== undefined) {
    config.branch = branch;
  }

  // Legacy fallback for git keys not found in .flowconfig
  if (commit === undefined || push === undefined || branch === undefined) {
    const legacy = readLegacyGitControl(flowDir);
    if (commit === undefined && legacy.commit !== undefined) config.commit = legacy.commit;
    if (push === undefined && legacy.push !== undefined) config.push = legacy.push;
    if (branch === undefined && legacy.branch !== undefined) config.branch = legacy.branch;
  }

  const waveExecution = extractBoolean(content, 'wave_execution');
  if (waveExecution !== undefined) config.wave_execution = waveExecution;

  const phaseIsolation = extractBoolean(content, 'phase_isolation');
  if (phaseIsolation !== undefined) config.phase_isolation = phaseIsolation;

  const modelRouting = extractBoolean(content, 'model_routing');
  if (modelRouting !== undefined) config.model_routing = modelRouting;

  const maxVerifyRetries = extractNumber(content, 'max_verify_retries');
  if (maxVerifyRetries !== undefined) {
    config.max_verify_retries = Math.max(MIN_VERIFY_RETRIES, Math.min(MAX_VERIFY_RETRIES, maxVerifyRetries));
  }

  // Validation cascade: pr → push → commit
  if (config.pr) {
    config.push = true;
    config.commit = true;
  } else if (config.push) {
    config.commit = true;
  }

  return config;
}
