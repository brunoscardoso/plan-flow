/**
 * Update Command - Updates plan-flow files to the latest version
 *
 * Replaces all plan-flow files with the latest version while
 * preserving user-created files. Handles v1 → v2 migration.
 */

import { resolve } from 'node:path';
import type { Platform } from '../types.js';
import * as log from '../utils/logger.js';
import { fileExists } from '../utils/files.js';
import { selectPlatforms } from '../utils/prompts.js';

export interface UpdateOptions {
  claude?: boolean;
  cursor?: boolean;
  openclaw?: boolean;
  codex?: boolean;
  all?: boolean;
  target: string;
}

function printBanner(): void {
  log.header('Plan-Flow Update');
  log.info(
    'Updating plan-flow files to the latest version. User-created files will be preserved.'
  );
  log.blank();
  log.warn(
    '⚠️  Make sure you are running this command from your project root directory!'
  );
}

function detectPlatforms(options: UpdateOptions): Platform[] | null {
  if (options.all) {
    return ['claude', 'cursor', 'openclaw', 'codex'];
  }

  const platforms: Platform[] = [];
  if (options.claude) platforms.push('claude');
  if (options.cursor) platforms.push('cursor');
  if (options.openclaw) platforms.push('openclaw');
  if (options.codex) platforms.push('codex');

  return platforms.length > 0 ? platforms : null;
}

function detectInstalledPlatforms(target: string): Platform[] {
  const platforms: Platform[] = [];

  if (fileExists(resolve(target, '.claude', 'commands'))) {
    platforms.push('claude');
  }
  if (fileExists(resolve(target, 'rules'))) {
    platforms.push('cursor');
  }
  if (fileExists(resolve(target, 'skills', 'plan-flow'))) {
    platforms.push('openclaw');
  }
  if (fileExists(resolve(target, '.agents', 'skills', 'plan-flow'))) {
    platforms.push('codex');
  }

  return platforms;
}

export async function runUpdate(options: UpdateOptions): Promise<void> {
  printBanner();

  const target = resolve(options.target);

  // Detect platforms: explicit flags > auto-detect installed > prompt
  let platforms = detectPlatforms(options);
  if (!platforms) {
    const detected = detectInstalledPlatforms(target);
    if (detected.length > 0) {
      platforms = detected;
      log.info(`Detected installed platforms: ${platforms.join(', ')}`);
    } else {
      platforms = await selectPlatforms();
    }
  }

  log.blank();
  log.info(`Updating for: ${platforms.join(', ')}`);
  log.info(`Target: ${target}`);
  log.warn('Force mode: plan-flow files will be replaced with latest version');

  // Delegate to init with force: true
  const { runInit } = await import('./init.js');
  await runInit({
    ...options,
    claude: platforms.includes('claude'),
    cursor: platforms.includes('cursor'),
    openclaw: platforms.includes('openclaw'),
    codex: platforms.includes('codex'),
    force: true,
  });
}
