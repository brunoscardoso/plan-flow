/**
 * ClawHub handler
 *
 * Copies skills/plan-flow/ to the user's project and registers
 * the skill in .clawdhub/lock.json.
 */

import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { CopyOptions, CopyResult } from '../types.js';
import { copyDir, getPackageRoot, ensureDir } from '../utils/files.js';
import * as log from '../utils/logger.js';

function getSkillVersion(): string {
  try {
    const packageRoot = getPackageRoot();
    const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf-8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

function updateLockFile(target: string, version: string): void {
  const lockPath = join(target, '.clawdhub', 'lock.json');
  ensureDir(join(target, '.clawdhub'));

  let lock: { version: number; skills: Record<string, { version: string; installedAt: number }> } = {
    version: 1,
    skills: {},
  };

  if (existsSync(lockPath)) {
    try {
      lock = JSON.parse(readFileSync(lockPath, 'utf-8'));
    } catch {
      // start fresh if corrupt
    }
  }

  lock.skills['plan-flow'] = { version, installedAt: Date.now() };
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
}

export async function initClawHub(
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

  // Register in .clawdhub/lock.json
  const version = getSkillVersion();
  updateLockFile(target, version);
  log.success(`Registered plan-flow@${version} in .clawdhub/lock.json`);

  return result;
}
