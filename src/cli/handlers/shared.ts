/**
 * Shared handler
 *
 * Creates flow/ directory structure and manages .gitignore entries.
 * Runs for all platform installations.
 */

import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { CopyOptions, CopyResult, Platform } from '../types.js';
import { ensureDir } from '../utils/files.js';
import * as log from '../utils/logger.js';

const FLOW_SUBDIRS = [
  'archive',
  'contracts',
  'discovery',
  'plans',
  'references',
  'reviewed-code',
  'reviewed-pr',
];

const MARKER_START = '# >>> plan-flow';
const MARKER_END = '# <<< plan-flow';

/**
 * Maps each platform to the paths it installs in the user's project.
 */
const PLATFORM_GITIGNORE_ENTRIES: Record<Platform, string[]> = {
  claude: ['.claude/', 'CLAUDE.md'],
  cursor: ['.cursor/'],
  openclaw: ['skills/plan-flow/'],
  codex: ['.agents/', 'AGENTS.md'],
};

/**
 * Paths that should always be gitignored regardless of platform.
 */
const SHARED_GITIGNORE_ENTRIES = ['flow/', '.plan-flow.yml', '.plan.flow.env'];

/**
 * Builds the plan-flow .gitignore block with markers.
 */
function buildGitignoreBlock(platforms: Platform[]): string {
  const lines: string[] = [MARKER_START];

  // Shared entries
  for (const entry of SHARED_GITIGNORE_ENTRIES) {
    lines.push(entry);
  }

  // Platform-specific entries
  for (const platform of platforms) {
    const entries = PLATFORM_GITIGNORE_ENTRIES[platform];
    if (entries) {
      for (const entry of entries) {
        lines.push(entry);
      }
    }
  }

  lines.push(MARKER_END);
  return lines.join('\n');
}

/**
 * Updates or creates .gitignore with plan-flow entries.
 */
function updateGitignore(
  target: string,
  platforms: Platform[],
  options: CopyOptions
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const gitignorePath = join(target, '.gitignore');
  const block = buildGitignoreBlock(platforms);

  if (!existsSync(gitignorePath)) {
    // No .gitignore exists - create it with plan-flow entries
    writeFileSync(gitignorePath, block + '\n', 'utf-8');
    result.created.push(gitignorePath);
    log.success('Created .gitignore with plan-flow entries');
    return result;
  }

  const existing = readFileSync(gitignorePath, 'utf-8');

  if (existing.includes(MARKER_START)) {
    if (options.force) {
      // Replace existing plan-flow section
      const pattern = new RegExp(
        `${escapeRegExp(MARKER_START)}[\\s\\S]*?${escapeRegExp(MARKER_END)}`
      );
      const updated = existing.replace(pattern, block);
      writeFileSync(gitignorePath, updated, 'utf-8');
      result.updated.push(gitignorePath);
      log.warn('Updated plan-flow entries in .gitignore');
    } else {
      result.skipped.push(gitignorePath);
      log.skip('.gitignore already has plan-flow entries');
    }
  } else {
    // Append plan-flow section to existing .gitignore
    const appended = existing.trimEnd() + '\n\n' + block + '\n';
    writeFileSync(gitignorePath, appended, 'utf-8');
    result.updated.push(gitignorePath);
    log.success('Added plan-flow entries to .gitignore');
  }

  return result;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function initShared(
  target: string,
  options: CopyOptions,
  platforms: Platform[] = []
): Promise<CopyResult> {
  const result: CopyResult = { created: [], skipped: [], updated: [] };

  // 1. Create flow/ directory structure with .gitkeep files
  const flowDir = join(target, 'flow');

  for (const subdir of FLOW_SUBDIRS) {
    const dir = join(flowDir, subdir);
    const gitkeep = join(dir, '.gitkeep');

    if (!existsSync(dir)) {
      ensureDir(dir);
      writeFileSync(gitkeep, '', 'utf-8');
      result.created.push(dir);
      log.success(`Created flow/${subdir}/`);
    } else if (!existsSync(gitkeep)) {
      writeFileSync(gitkeep, '', 'utf-8');
      result.created.push(gitkeep);
    } else {
      result.skipped.push(dir);
      log.skip(`flow/${subdir}/ already exists`);
    }
  }

  // 2. Update .gitignore with plan-flow entries
  const giResult = updateGitignore(target, platforms, options);
  result.created.push(...giResult.created);
  result.skipped.push(...giResult.skipped);
  result.updated.push(...giResult.updated);

  return result;
}
