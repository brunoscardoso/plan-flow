/**
 * Cursor handler
 *
 * Copies commands to .cursor/commands/ and rules to .cursor/rules/
 * Cursor supports slash commands via .cursor/commands/*.md files
 */

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { CopyOptions, CopyResult } from '../types.js';
import { copyDir, getPackageRoot, ensureDir } from '../utils/files.js';
import { generateWrapperScripts } from '../utils/platform-hooks.js';
import * as log from '../utils/logger.js';

export async function initCursor(
  target: string,
  options: CopyOptions,
  stackProfile?: import('../utils/detect-stack.js').StackProfile
): Promise<CopyResult> {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const packageRoot = getPackageRoot();

  // 1. Copy commands to .cursor/commands/
  const commandsSrc = join(packageRoot, '.claude', 'commands');
  const commandsDest = join(target, '.cursor', 'commands');

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
  } else {
    log.warn('No commands found in package. Skipping commands setup.');
  }

  // 2. Copy rules to .cursor/rules/
  //    Filter language patterns based on detected stack
  const rulesSrc = join(packageRoot, 'rules');
  const rulesDest = join(target, '.cursor', 'rules');

  if (existsSync(rulesSrc)) {
    ensureDir(rulesDest);
    const rulesCopyOptions = { ...options };
    if (stackProfile) {
      const { getRelevantLanguagePatterns } = await import('../utils/detect-stack.js');
      const relevant = getRelevantLanguagePatterns(stackProfile);
      if (relevant) {
        const allLangPrefixes = ['typescript', 'python', 'go', 'rust'];
        const excludePatterns = allLangPrefixes
          .filter((p) => !relevant.includes(p))
          .map((p) => `${p}-patterns`);
        if (excludePatterns.length > 0) {
          rulesCopyOptions.exclude = excludePatterns;
        }
      }
    }
    const rulesResult = copyDir(rulesSrc, rulesDest, rulesCopyOptions);
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
  } else {
    log.warn('No rules found in package. Skipping rules setup.');
  }

  // 3. Generate wrapper scripts for session hooks (manual fallback)
  const wrapperResult = generateWrapperScripts(target);
  result.created.push(...wrapperResult.created);
  result.skipped.push(...wrapperResult.skipped);

  for (const f of wrapperResult.created) {
    log.success(`Created ${f.replace(target + '/', '')}`);
  }
  if (wrapperResult.created.length > 0) {
    log.info('Session hook scripts installed. Run manually: bash scripts/plan-flow/start-session.sh');
  }

  return result;
}
