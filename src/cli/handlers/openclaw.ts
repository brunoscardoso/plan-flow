/**
 * OpenClaw handler
 *
 * Copies skills/plan-flow/ to the user's project.
 */

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { CopyOptions, CopyResult } from '../types.js';
import { copyDir, getPackageRoot, ensureDir } from '../utils/files.js';
import * as log from '../utils/logger.js';

export async function initOpenClaw(
  target: string,
  options: CopyOptions
): Promise<CopyResult> {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const packageRoot = getPackageRoot();

  // Copy skills/plan-flow/ preserving directory structure
  const skillsSrc = join(packageRoot, 'skills', 'plan-flow');
  const skillsDest = join(target, 'skills', 'plan-flow');

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

  return result;
}
