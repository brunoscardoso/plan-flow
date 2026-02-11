/**
 * Codex CLI handler
 *
 * Copies skills/plan-flow/ to .agents/skills/plan-flow/ in the user's project,
 * and creates/updates AGENTS.md with plan-flow instructions.
 */

import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { CopyOptions, CopyResult } from '../types.js';
import { copyDir, getPackageRoot, ensureDir } from '../utils/files.js';
import * as log from '../utils/logger.js';

const MARKER_START = '<!-- plan-flow-start -->';
const MARKER_END = '<!-- plan-flow-end -->';

function getPlanFlowSection(packageRoot: string): string {
  const templatePath = join(
    packageRoot,
    'templates',
    'shared',
    'AGENTS.md.template'
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

function handleAgentsMd(
  target: string,
  packageRoot: string,
  options: CopyOptions
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const agentsMdPath = join(target, 'AGENTS.md');
  const section = getPlanFlowSection(packageRoot);

  if (!existsSync(agentsMdPath)) {
    // No AGENTS.md exists - create it with the plan-flow section
    writeFileSync(agentsMdPath, section + '\n', 'utf-8');
    result.created.push(agentsMdPath);
    log.success('Created AGENTS.md');
  } else {
    const existing = readFileSync(agentsMdPath, 'utf-8');

    if (existing.includes(MARKER_START)) {
      if (options.force) {
        // Replace existing plan-flow section
        const updated = existing.replace(
          new RegExp(
            `${escapeRegExp(MARKER_START)}[\\s\\S]*?${escapeRegExp(MARKER_END)}`
          ),
          section
        );
        writeFileSync(agentsMdPath, updated, 'utf-8');
        result.updated.push(agentsMdPath);
        log.warn('Updated plan-flow section in AGENTS.md');
      } else {
        result.skipped.push(agentsMdPath);
        log.skip('AGENTS.md already has plan-flow section');
      }
    } else {
      // Append plan-flow section to existing AGENTS.md
      const appended = existing.trimEnd() + '\n\n' + section + '\n';
      writeFileSync(agentsMdPath, appended, 'utf-8');
      result.updated.push(agentsMdPath);
      log.success('Appended plan-flow section to AGENTS.md');
    }
  }

  return result;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function initCodex(
  target: string,
  options: CopyOptions
): Promise<CopyResult> {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const packageRoot = getPackageRoot();

  // 1. Copy skills/plan-flow/ → .agents/skills/plan-flow/
  const skillsSrc = join(packageRoot, 'skills', 'plan-flow');
  const skillsDest = join(target, '.agents', 'skills', 'plan-flow');

  if (existsSync(skillsSrc)) {
    ensureDir(skillsDest);
    const copyResult = copyDir(skillsSrc, skillsDest, options);
    result.created.push(...copyResult.created);
    result.skipped.push(...copyResult.skipped);
    result.updated.push(...copyResult.updated);

    for (const f of copyResult.created) {
      log.success(`Created ${f.replace(target + '/', '')}`);
    }
    for (const f of copyResult.skipped) {
      log.skip(`Skipped ${f.replace(target + '/', '')}`);
    }
    for (const f of copyResult.updated) {
      log.warn(`Updated ${f.replace(target + '/', '')}`);
    }
  }

  // 2. Handle AGENTS.md
  const mdResult = handleAgentsMd(target, packageRoot, options);
  result.created.push(...mdResult.created);
  result.skipped.push(...mdResult.skipped);
  result.updated.push(...mdResult.updated);

  return result;
}
