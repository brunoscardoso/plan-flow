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

program.parse();
