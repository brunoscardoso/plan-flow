/**
 * Init Command - Installs plan-flow for selected platforms
 */

import { resolve } from 'node:path';
import type { InitOptions, Platform, InitResult } from '../types.js';
import * as log from '../utils/logger.js';
import { fileExists } from '../utils/files.js';
import { selectPlatforms } from '../utils/prompts.js';
import { initClaude } from '../handlers/claude.js';
import { initCursor } from '../handlers/cursor.js';
import { initOpenClaw } from '../handlers/openclaw.js';
import { initCodex } from '../handlers/codex.js';
import { initShared } from '../handlers/shared.js';

function printBanner(): void {
  log.header('Plan-Flow Setup');
  log.info(
    'Structured AI-assisted development workflows for discovery, planning, execution, code reviews, and testing.'
  );
  log.blank();
  log.warn('⚠️  Make sure you are running this command from your project root directory!');
}

function detectPlatforms(options: InitOptions): Platform[] | null {
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

function validateTarget(target: string): boolean {
  // Check for common project indicators
  const indicators = [
    'package.json',
    'pyproject.toml',
    'Cargo.toml',
    'go.mod',
    'Gemfile',
    '.git',
  ];

  const found = indicators.some((f) => fileExists(resolve(target, f)));

  if (!found) {
    log.warn(
      'No project files detected in target directory. Are you in a project root?'
    );
  }

  return true; // Allow proceeding regardless
}

function printSummary(results: InitResult[], target: string): void {
  log.header('Summary');

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalUpdated = 0;

  for (const { platform, result } of results) {
    const created = result.created.length;
    const skipped = result.skipped.length;
    const updated = result.updated.length;

    totalCreated += created;
    totalSkipped += skipped;
    totalUpdated += updated;

    if (created > 0) {
      log.success(`${platform}: ${created} file(s) created`);
    }
    if (updated > 0) {
      log.warn(`${platform}: ${updated} file(s) updated`);
    }
    if (skipped > 0) {
      log.skip(`${platform}: ${skipped} file(s) skipped (already exist)`);
    }
  }

  log.blank();

  if (totalCreated + totalUpdated > 0) {
    log.success(
      `Done! ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped.`
    );
  } else if (totalSkipped > 0) {
    log.info('All files already exist. Use --force to overwrite.');
  }
}

function printNextSteps(platforms: Platform[]): void {
  log.header('Next Steps');

  if (platforms.includes('claude')) {
    log.info(
      'Claude Code: Open your project in Claude Code and use /setup to index patterns'
    );
  }

  if (platforms.includes('cursor')) {
    log.info('Cursor: Commands in .cursor/commands/. Use /setup to get started.');
  }

  if (platforms.includes('openclaw')) {
    log.info('OpenClaw: Skills installed in skills/plan-flow/. Run clawhub to verify.');
  }

  if (platforms.includes('codex')) {
    log.info(
      'Codex CLI: Skills in .agents/skills/plan-flow/. Use /setup in Codex to get started.'
    );
  }

  log.blank();
}

export async function runInit(options: InitOptions): Promise<void> {
  printBanner();

  const target = resolve(options.target);
  const force = options.force ?? false;

  validateTarget(target);

  // Detect platforms from flags or prompt interactively
  let platforms = detectPlatforms(options);
  if (!platforms) {
    platforms = await selectPlatforms();
  }

  log.blank();
  log.info(`Installing for: ${platforms.join(', ')}`);
  log.info(`Target: ${target}`);
  if (force) {
    log.warn('Force mode: existing files will be overwritten');
  }

  const results: InitResult[] = [];

  // Run platform-specific handlers
  for (const platform of platforms) {
    log.header(`Setting up ${platform}...`);

    let result;
    switch (platform) {
      case 'claude':
        result = await initClaude(target, { force });
        break;
      case 'cursor':
        result = await initCursor(target, { force });
        break;
      case 'openclaw':
        result = await initOpenClaw(target, { force });
        break;
      case 'codex':
        result = await initCodex(target, { force });
        break;
    }

    results.push({ platform, result });
  }

  // Run shared handler (flow directories, .gitignore)
  log.header('Setting up shared resources...');
  const sharedResult = await initShared(target, { force }, platforms);
  results.push({ platform: 'shared', result: sharedResult });

  // Print summary and next steps
  printSummary(results, target);
  printNextSteps(platforms);
}
