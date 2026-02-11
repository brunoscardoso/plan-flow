/**
 * Claude Code handler
 *
 * Copies .claude/commands/ and .claude/rules/ to the user's project,
 * and creates/updates CLAUDE.md with plan-flow instructions.
 */

import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { CopyOptions, CopyResult } from '../types.js';
import { copyDir, copyFile, getPackageRoot, ensureDir } from '../utils/files.js';
import * as log from '../utils/logger.js';

const MARKER_START = '<!-- plan-flow-start -->';
const MARKER_END = '<!-- plan-flow-end -->';

function getPlanFlowSection(packageRoot: string): string {
  const templatePath = join(
    packageRoot,
    'templates',
    'shared',
    'CLAUDE.md.template'
  );

  if (existsSync(templatePath)) {
    return [
      MARKER_START,
      readFileSync(templatePath, 'utf-8').trim(),
      MARKER_END,
    ].join('\n');
  }

  // Fallback minimal section if template is missing
  return [
    MARKER_START,
    '',
    '# Plan-Flow',
    '',
    'Use `/setup` to get started. See plan-flow documentation for available commands.',
    '',
    MARKER_END,
  ].join('\n');
}

function handleClaudeMd(
  target: string,
  packageRoot: string,
  options: CopyOptions
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const claudeMdPath = join(target, 'CLAUDE.md');
  const section = getPlanFlowSection(packageRoot);

  if (!existsSync(claudeMdPath)) {
    // No CLAUDE.md exists - create it with the plan-flow section
    writeFileSync(claudeMdPath, section + '\n', 'utf-8');
    result.created.push(claudeMdPath);
    log.success('Created CLAUDE.md');
  } else {
    const existing = readFileSync(claudeMdPath, 'utf-8');

    if (existing.includes(MARKER_START)) {
      if (options.force) {
        // Replace existing plan-flow section
        const updated = existing.replace(
          new RegExp(
            `${escapeRegExp(MARKER_START)}[\\s\\S]*?${escapeRegExp(MARKER_END)}`
          ),
          section
        );
        writeFileSync(claudeMdPath, updated, 'utf-8');
        result.updated.push(claudeMdPath);
        log.warn('Updated plan-flow section in CLAUDE.md');
      } else {
        result.skipped.push(claudeMdPath);
        log.skip('CLAUDE.md already has plan-flow section');
      }
    } else {
      // Append plan-flow section to existing CLAUDE.md
      const appended = existing.trimEnd() + '\n\n' + section + '\n';
      writeFileSync(claudeMdPath, appended, 'utf-8');
      result.updated.push(claudeMdPath);
      log.success('Appended plan-flow section to CLAUDE.md');
    }
  }

  return result;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function initClaude(
  target: string,
  options: CopyOptions
): Promise<CopyResult> {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const packageRoot = getPackageRoot();

  // 1. Copy .claude/commands/
  const commandsSrc = join(packageRoot, '.claude', 'commands');
  const commandsDest = join(target, '.claude', 'commands');

  if (existsSync(commandsSrc)) {
    ensureDir(commandsDest);
    const cmdResult = copyDir(commandsSrc, commandsDest, options);
    result.created.push(...cmdResult.created);
    result.skipped.push(...cmdResult.skipped);
    result.updated.push(...cmdResult.updated);

    for (const f of cmdResult.created) {
      log.success(`Created ${f.replace(target + '/', '')}`);
    }
    for (const f of cmdResult.skipped) {
      log.skip(`Skipped ${f.replace(target + '/', '')}`);
    }
    for (const f of cmdResult.updated) {
      log.warn(`Updated ${f.replace(target + '/', '')}`);
    }
  }

  // 2. Copy .claude/rules/ (preserving subdirectory structure)
  const rulesSrc = join(packageRoot, '.claude', 'rules');
  const rulesDest = join(target, '.claude', 'rules');

  if (existsSync(rulesSrc)) {
    ensureDir(rulesDest);
    const rulesResult = copyDir(rulesSrc, rulesDest, options);
    result.created.push(...rulesResult.created);
    result.skipped.push(...rulesResult.skipped);
    result.updated.push(...rulesResult.updated);

    for (const f of rulesResult.created) {
      log.success(`Created ${f.replace(target + '/', '')}`);
    }
    for (const f of rulesResult.skipped) {
      log.skip(`Skipped ${f.replace(target + '/', '')}`);
    }
    for (const f of rulesResult.updated) {
      log.warn(`Updated ${f.replace(target + '/', '')}`);
    }
  }

  // 3. Handle CLAUDE.md
  const mdResult = handleClaudeMd(target, packageRoot, options);
  result.created.push(...mdResult.created);
  result.skipped.push(...mdResult.skipped);
  result.updated.push(...mdResult.updated);

  return result;
}
