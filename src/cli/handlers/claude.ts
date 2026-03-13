/**
 * Claude Code handler
 *
 * Copies .claude/commands/, .claude/rules/, and .claude/resources/ to the user's project,
 * and creates/updates CLAUDE.md with plan-flow instructions.
 */

import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { CopyOptions, CopyResult } from '../types.js';
import {
  copyDir,
  copyFile,
  getPackageRoot,
  ensureDir,
  removeDir,
  listFilesRecursive,
  moveFile,
  removeFile,
} from '../utils/files.js';
import { askLegacyFilesAction } from '../utils/prompts.js';
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

  // 3. Migrate v1 → v2: remove old plan-flow files from .claude/rules/
  //    In v1, patterns/tools/languages lived under .claude/rules/ (auto-loaded).
  //    In v2, they moved to .claude/resources/ (loaded on-demand).
  //    Only remove files we shipped; preserve any user-created files.
  for (const sub of ['patterns', 'tools', 'languages', 'core']) {
    const legacyDir = join(target, '.claude', 'rules', sub);
    if (!existsSync(legacyDir)) continue;

    // Files we ship (in resources) — used to identify plan-flow files
    const ourResourceDir = join(packageRoot, '.claude', 'resources', sub);
    const ourFiles = new Set(listFilesRecursive(ourResourceDir));

    // Files currently in the legacy directory
    const legacyFiles = listFilesRecursive(legacyDir);
    const planFlowFiles = legacyFiles.filter((f) => ourFiles.has(f));
    const userFiles = legacyFiles.filter((f) => !ourFiles.has(f));

    // Remove plan-flow files (they'll be installed fresh in resources)
    for (const f of planFlowFiles) {
      removeFile(join(legacyDir, f));
      log.warn(`Removed legacy .claude/rules/${sub}/${f}`);
    }

    // Handle user-created files
    if (userFiles.length > 0) {
      const action = await askLegacyFilesAction(sub, userFiles);

      switch (action) {
        case 'move':
          for (const f of userFiles) {
            const src = join(legacyDir, f);
            const dest = join(target, '.claude', 'resources', sub, f);
            moveFile(src, dest);
            log.info(`Moved ${f} → .claude/resources/${sub}/${f}`);
          }
          break;
        case 'remove':
          for (const f of userFiles) {
            removeFile(join(legacyDir, f));
            log.warn(`Removed .claude/rules/${sub}/${f}`);
          }
          break;
        default:
          log.info(
            `Keeping ${userFiles.length} custom file(s) in .claude/rules/${sub}/`
          );
          break;
      }
    }

    // Clean up empty legacy directory
    const remaining = listFilesRecursive(legacyDir);
    if (remaining.length === 0) {
      removeDir(legacyDir);
    }
  }

  // 4. Copy .claude/resources/ (on-demand reference files)
  const resourcesSrc = join(packageRoot, '.claude', 'resources');
  const resourcesDest = join(target, '.claude', 'resources');

  if (existsSync(resourcesSrc)) {
    ensureDir(resourcesDest);
    const resourcesResult = copyDir(resourcesSrc, resourcesDest, options);
    result.created.push(...resourcesResult.created);
    result.skipped.push(...resourcesResult.skipped);
    result.updated.push(...resourcesResult.updated);

    for (const f of resourcesResult.created) {
      log.success(`Created ${f.replace(target + '/', '')}`);
    }
    for (const f of resourcesResult.skipped) {
      log.skip(`Skipped ${f.replace(target + '/', '')}`);
    }
    for (const f of resourcesResult.updated) {
      log.warn(`Updated ${f.replace(target + '/', '')}`);
    }
  }

  // 5. Install hooks (cost tracking, compact suggestions, pre-compact state)
  const hooksResult = installHooks(target, packageRoot, options);
  result.created.push(...hooksResult.created);
  result.skipped.push(...hooksResult.skipped);
  result.updated.push(...hooksResult.updated);

  // 6. Handle CLAUDE.md
  const mdResult = handleClaudeMd(target, packageRoot, options);
  result.created.push(...mdResult.created);
  result.skipped.push(...mdResult.skipped);
  result.updated.push(...mdResult.updated);

  return result;
}

function installHooks(
  target: string,
  packageRoot: string,
  options: CopyOptions
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const hookScripts = [
    'cost-tracker.cjs',
    'cost-display.cjs',
    'suggest-compact.cjs',
    'pre-compact-save.cjs',
    'session-summary.cjs',
  ];
  const hooksSrc = join(packageRoot, 'scripts', 'hooks');
  const hooksDest = join(target, '.claude', 'hooks');

  // Copy hook scripts
  for (const script of hookScripts) {
    const src = join(hooksSrc, script);
    if (!existsSync(src)) continue;

    ensureDir(hooksDest);
    const dest = join(hooksDest, script);

    const copyResult = copyFile(src, dest, options);
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

  // Register hooks in .claude/settings.json
  const settingsPath = join(target, '.claude', 'settings.json');
  try {
    let settings: Record<string, unknown> = {};
    if (existsSync(settingsPath)) {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    }

    const hooks = (settings.hooks || {}) as Record<string, unknown[]>;
    let updated = false;

    // Guard wrapper: silently exit 0 if hook script doesn't exist
    const guard = (cmd: string) => `test -f ${cmd} && node ${cmd} || true`;

    // Register Stop hook for cost-tracker (async — background file write)
    const costTrackerScript = '.claude/hooks/cost-tracker.cjs';
    const costTrackerCmd = guard(costTrackerScript);
    if (!hasHookCommand(hooks, 'Stop', costTrackerScript)) {
      if (!hooks['Stop']) hooks['Stop'] = [];
      (hooks['Stop'] as unknown[]).push({
        hooks: [{ type: 'command', command: costTrackerCmd, async: true }],
      });
      updated = true;
    }

    // Register Stop hook for cost-display (synchronous — shows after each response)
    const costDisplayScript = '.claude/hooks/cost-display.cjs';
    const costDisplayCmd = guard(costDisplayScript);
    if (!hasHookCommand(hooks, 'Stop', costDisplayScript)) {
      if (!hooks['Stop']) hooks['Stop'] = [];
      (hooks['Stop'] as unknown[]).push({
        hooks: [{ type: 'command', command: costDisplayCmd }],
      });
      updated = true;
    }

    // Register Stop hook for suggest-compact (synchronous — displays immediately)
    const suggestCompactScript = '.claude/hooks/suggest-compact.cjs';
    const suggestCompactCmd = guard(suggestCompactScript);
    if (!hasHookCommand(hooks, 'Stop', suggestCompactScript)) {
      if (!hooks['Stop']) hooks['Stop'] = [];
      (hooks['Stop'] as unknown[]).push({
        hooks: [{ type: 'command', command: suggestCompactCmd }],
      });
      updated = true;
    }

    // Register PreCompact hook for pre-compact-save (both auto and manual triggers)
    const preCompactScript = '.claude/hooks/pre-compact-save.cjs';
    const preCompactCmd = guard(preCompactScript);
    if (!hasHookCommand(hooks, 'PreCompact', preCompactScript)) {
      if (!hooks['PreCompact']) hooks['PreCompact'] = [];
      (hooks['PreCompact'] as unknown[]).push({
        hooks: [{ type: 'command', command: preCompactCmd }],
      });
      updated = true;
    }

    // Register SessionEnd hook for session-summary
    const sessionSummaryScript = '.claude/hooks/session-summary.cjs';
    const sessionSummaryCmd = guard(sessionSummaryScript);
    if (!hasHookCommand(hooks, 'SessionEnd', sessionSummaryScript)) {
      if (!hooks['SessionEnd']) hooks['SessionEnd'] = [];
      (hooks['SessionEnd'] as unknown[]).push({
        hooks: [{ type: 'command', command: sessionSummaryCmd }],
      });
      updated = true;
    }

    if (updated) {
      settings.hooks = hooks;
      ensureDir(join(target, '.claude'));
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
      log.success('Registered hooks in .claude/settings.json');
      result.updated.push(settingsPath);
    } else {
      log.skip('Hooks already registered');
      result.skipped.push(settingsPath);
    }
  } catch (err) {
    log.warn(`Could not register hooks: ${(err as Error).message}`);
  }

  return result;
}

function hasHookCommand(
  hooks: Record<string, unknown[]>,
  event: string,
  scriptPath: string
): boolean {
  const eventHooks = hooks[event];
  if (!Array.isArray(eventHooks)) return false;

  for (const entry of eventHooks) {
    const hookEntry = entry as { hooks?: Array<{ command?: string }> };
    if (hookEntry.hooks) {
      for (const h of hookEntry.hooks) {
        // Match both old bare-path format and new guarded format
        if (h.command && h.command.includes(scriptPath)) return true;
      }
    }
  }
  return false;
}
