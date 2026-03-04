/**
 * Multi-platform hook system.
 *
 * Detects platform hook capabilities and generates wrapper scripts
 * for platforms without native lifecycle hook support.
 */

import { existsSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import type { Platform } from '../types.js';
import type { CopyResult } from '../types.js';
import { ensureDir } from './files.js';

/** Hook capability for a platform. */
export interface PlatformHookCapability {
  nativeHooks: boolean;
  fallbackType: 'none' | 'wrapper-scripts' | 'instructions-only';
}

/** Platform capability map. */
export const PLATFORM_CAPABILITIES: Record<Platform, PlatformHookCapability> = {
  claude: { nativeHooks: true, fallbackType: 'none' },
  cursor: { nativeHooks: false, fallbackType: 'wrapper-scripts' },
  codex: { nativeHooks: false, fallbackType: 'wrapper-scripts' },
  openclaw: { nativeHooks: false, fallbackType: 'instructions-only' },
  clawhub: { nativeHooks: false, fallbackType: 'instructions-only' },
};

/**
 * Get hook capability info for a platform.
 */
export function getPlatformHookInfo(
  platform: Platform
): PlatformHookCapability {
  return PLATFORM_CAPABILITIES[platform];
}

/**
 * Check if any of the selected platforms need wrapper scripts.
 */
export function needsWrapperScripts(platforms: Platform[]): boolean {
  return platforms.some(
    (p) => PLATFORM_CAPABILITIES[p].fallbackType === 'wrapper-scripts'
  );
}

const START_SESSION_SCRIPT = `#!/bin/bash
# Plan-Flow: Start Session
#
# Run this at the start of your AI coding session to get resume context.
# This is a manual fallback for platforms without native lifecycle hooks.
#
# Usage:
#   bash scripts/plan-flow/start-session.sh
#
# What it does:
#   - Reads execution state from flow/state/current.json
#   - Outputs resume context (plan name, phase progress, etc.)
#   - Reports autopilot mode status

set -e
cd "$(dirname "$0")/../.."
node scripts/hooks/session-start.cjs
`;

const END_SESSION_SCRIPT = `#!/bin/bash
# Plan-Flow: End Session
#
# Run this at the end of your AI coding session for brain capture.
# This is a manual fallback for platforms without native lifecycle hooks.
#
# Usage:
#   bash scripts/plan-flow/end-session.sh
#
# What it does:
#   - Creates a session summary in flow/state/last-session.json
#   - Creates a brain session file in flow/brain/sessions/
#   - Updates execution state timestamps
#
# Note: Without transcript stdin (only available in Claude Code),
# session capture will be minimal (timestamp and basic record only).

set -e
cd "$(dirname "$0")/../.."
node scripts/hooks/session-end.cjs
`;

/**
 * Generate wrapper shell scripts for platforms without native hook support.
 * Creates scripts/plan-flow/start-session.sh and end-session.sh.
 *
 * Returns a CopyResult with created/skipped files.
 */
export function generateWrapperScripts(targetDir: string): CopyResult {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const scriptsDir = join(targetDir, 'scripts', 'plan-flow');
  ensureDir(scriptsDir);

  const scripts: [string, string][] = [
    ['start-session.sh', START_SESSION_SCRIPT],
    ['end-session.sh', END_SESSION_SCRIPT],
  ];

  for (const [filename, content] of scripts) {
    const scriptPath = join(scriptsDir, filename);

    if (existsSync(scriptPath)) {
      result.skipped.push(scriptPath);
    } else {
      writeFileSync(scriptPath, content, 'utf-8');
      try {
        chmodSync(scriptPath, 0o755);
      } catch {
        // chmod may fail on Windows — non-critical
      }
      result.created.push(scriptPath);
    }
  }

  return result;
}
