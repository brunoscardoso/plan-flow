#!/usr/bin/env node
/**
 * Plan-Flow CLI
 *
 * Installs plan-flow skills into your project for Claude Code, Cursor, and/or OpenClaw.
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

const program = new Command();

program
  .name('plan-flow')
  .description(
    'Structured AI-assisted development workflows for discovery, planning, execution, code reviews, and testing.'
  )
  .version(getVersion());

program
  .command('init', { isDefault: true })
  .description(
    'Install plan-flow into your project for Claude Code, Cursor, OpenClaw, and/or Codex CLI'
  )
  .option('--claude', 'Install for Claude Code (slash commands + rules)')
  .option('--cursor', 'Install for Cursor (rules)')
  .option('--openclaw', 'Install for OpenClaw (skill manifests)')
  .option('--clawhub', 'Install for ClawHub (skill manifests + lock file)')
  .option('--codex', 'Install for Codex CLI (skills + AGENTS.md)')
  .option('--all', 'Install for all platforms')
  .option('--force', 'Overwrite existing files')
  .option(
    '--target <dir>',
    'Target directory (defaults to current directory)',
    process.cwd()
  )
  .action(async (options) => {
    const { runInit } = await import('./commands/init.js');
    await runInit(options);
  });

program
  .command('update')
  .description(
    'Update plan-flow files to the latest version (replaces plan-flow files, preserves user files)'
  )
  .option('--claude', 'Update Claude Code files')
  .option('--cursor', 'Update Cursor files')
  .option('--openclaw', 'Update OpenClaw files')
  .option('--clawhub', 'Update ClawHub files')
  .option('--codex', 'Update Codex CLI files')
  .option('--all', 'Update all platforms')
  .option(
    '--target <dir>',
    'Target directory (defaults to current directory)',
    process.cwd()
  )
  .action(async (options) => {
    const { runUpdate } = await import('./commands/update.js');
    await runUpdate(options);
  });

program
  .command('validate')
  .description('Validate Plan-Flow artifacts (plans, discovery, brain)')
  .option(
    '--target <dir>',
    'Target directory (defaults to current directory)',
    process.cwd()
  )
  .option('--fix', 'Auto-fix issues where possible')
  .action(async (options) => {
    const { runValidate } = await import('./commands/validate.js');
    await runValidate(options);
  });

const sessions = program
  .command('sessions')
  .description('Manage session history (list, search, show, prune)');

sessions
  .command('list')
  .description('List sessions with optional filters')
  .option('--limit <n>', 'Max results per page', '10')
  .option('--offset <n>', 'Skip first N results', '0')
  .option('--feature <name>', 'Filter by feature name')
  .option('--skill <name>', 'Filter by skill name')
  .option('--from <date>', 'Filter from date (YYYY-MM-DD)')
  .option('--to <date>', 'Filter to date (YYYY-MM-DD)')
  .option('--json', 'Output as JSON')
  .option(
    '--target <dir>',
    'Target directory',
    process.cwd()
  )
  .action(async (options) => {
    const { runSessionsList } = await import('./commands/sessions.js');
    await runSessionsList({
      target: options.target,
      limit: parseInt(options.limit, 10),
      offset: parseInt(options.offset, 10),
      feature: options.feature,
      skill: options.skill,
      from: options.from,
      to: options.to,
      json: options.json,
    });
  });

sessions
  .command('search <query>')
  .description('Full-text search across session content')
  .option('--limit <n>', 'Max results', '10')
  .option('--json', 'Output as JSON')
  .option(
    '--target <dir>',
    'Target directory',
    process.cwd()
  )
  .action(async (query, options) => {
    const { runSessionsSearch } = await import('./commands/sessions.js');
    await runSessionsSearch(query, {
      target: options.target,
      limit: parseInt(options.limit, 10),
      json: options.json,
    });
  });

sessions
  .command('show <session-id>')
  .description('Display full content of a session')
  .option(
    '--target <dir>',
    'Target directory',
    process.cwd()
  )
  .action(async (sessionId, options) => {
    const { runSessionsShow } = await import('./commands/sessions.js');
    await runSessionsShow(sessionId, { target: options.target });
  });

sessions
  .command('prune')
  .description('Remove sessions before a date')
  .requiredOption('--before <date>', 'Delete sessions before this date (YYYY-MM-DD)')
  .option('--dry-run', 'Show what would be deleted without deleting')
  .option(
    '--target <dir>',
    'Target directory',
    process.cwd()
  )
  .action(async (options) => {
    const { runSessionsPrune } = await import('./commands/sessions.js');
    await runSessionsPrune({
      target: options.target,
      before: options.before,
      dryRun: options.dryRun,
    });
  });

program.parse();
