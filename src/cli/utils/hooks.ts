/**
 * Hook installation utilities for Claude Code
 *
 * Manages additive merge of Plan-Flow hooks into .claude/settings.json.
 * Never removes or overwrites user-defined hooks.
 */

import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

interface HookEntry {
  type: string;
  command: string;
}

interface HookMatcher {
  matcher: string;
  hooks: HookEntry[];
}

interface SettingsJson {
  hooks?: Record<string, HookMatcher[]>;
  [key: string]: unknown;
}

/** Marker to identify Plan-Flow hooks in settings.json */
const PLANFLOW_MARKER = '# planflow';

/** Plan-Flow hook definitions */
const PLANFLOW_HOOKS: Record<string, HookEntry> = {
  PreCompact: {
    type: 'command',
    command: `node scripts/hooks/pre-compact.cjs ${PLANFLOW_MARKER}`,
  },
  SessionStart: {
    type: 'command',
    command: `node scripts/hooks/session-start.cjs ${PLANFLOW_MARKER}`,
  },
  Stop: {
    type: 'command',
    command: `node scripts/hooks/session-end.cjs ${PLANFLOW_MARKER}`,
  },
};

/**
 * Reads .claude/settings.json from the target directory.
 * Returns an empty object if the file doesn't exist or is invalid.
 */
export function readSettings(targetDir: string): SettingsJson {
  const settingsPath = join(targetDir, '.claude', 'settings.json');
  if (!existsSync(settingsPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(settingsPath, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Merges Plan-Flow hooks into existing settings additively.
 * - Never removes user-defined hooks
 * - Only adds Plan-Flow hooks if not already present
 * - Idempotent: running twice produces the same result
 */
export function mergeHooks(existing: SettingsJson): SettingsJson {
  const settings = { ...existing };
  if (!settings.hooks) {
    settings.hooks = {};
  }

  for (const [event, hookEntry] of Object.entries(PLANFLOW_HOOKS)) {
    if (!settings.hooks[event]) {
      settings.hooks[event] = [];
    }

    const matchers = settings.hooks[event];

    // Check if Plan-Flow hook already exists
    const alreadyInstalled = matchers.some((m) =>
      m.hooks.some((h) => h.command.includes(PLANFLOW_MARKER))
    );

    if (!alreadyInstalled) {
      matchers.push({
        matcher: '',
        hooks: [hookEntry],
      });
    }
  }

  return settings;
}

/**
 * Writes settings.json back to the target directory.
 * Creates .claude/ directory if it doesn't exist.
 */
export function writeSettings(
  targetDir: string,
  settings: SettingsJson
): void {
  const claudeDir = join(targetDir, '.claude');
  const settingsPath = join(claudeDir, 'settings.json');

  // Backup existing settings before writing
  if (existsSync(settingsPath)) {
    const backupPath = settingsPath + '.bak';
    copyFileSync(settingsPath, backupPath);
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

/**
 * Installs Plan-Flow hooks into .claude/settings.json.
 * Returns true if hooks were installed (or already present), false on error.
 */
export function installHooks(targetDir: string): boolean {
  try {
    const settings = readSettings(targetDir);
    const merged = mergeHooks(settings);
    writeSettings(targetDir, merged);
    return true;
  } catch {
    return false;
  }
}
