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
  .command('heartbeat <action>')
  .description(
    'Manage the heartbeat daemon (start, stop, status)'
  )
  .option(
    '--target <dir>',
    'Target directory (defaults to current directory)',
    process.cwd()
  )
  .action(async (action: string, options: { target: string }) => {
    const { runHeartbeat } = await import('./commands/heartbeat.js');
    await runHeartbeat(action, options);
  });

program
  .command('state')
  .description(
    'Output deterministic JSON representing current plan-flow state'
  )
  .option(
    '--plan <path>',
    'Path to a plan file to include plan/wave/tier data'
  )
  .option(
    '--target <dir>',
    'Target directory (defaults to current directory)',
    process.cwd()
  )
  .action(async (options: { plan?: string; target: string }) => {
    const { runState } = await import('./commands/state.js');
    await runState(options);
  });

program
  .command('state-query <query>')
  .description(
    'Search the project brain index for relevant context'
  )
  .option(
    '--scope <scope>',
    'Filter by scope: resources, rules, brain, plans, discovery, all',
    'all'
  )
  .option(
    '--type <chunkType>',
    'Filter by chunk type'
  )
  .option(
    '--limit <n>',
    'Max results',
    (v: string) => parseInt(v, 10),
    10
  )
  .option(
    '--target <dir>',
    'Target directory (defaults to current directory)',
    process.cwd()
  )
  .action(async (query: string, options: { scope?: string; type?: string; limit?: number; target: string }) => {
    const { runStateQuery } = await import('./commands/state-query.js');
    await runStateQuery({ query, ...options });
  });

program
  .command('brain <action> [args...]')
  .description(
    'Interact with the planflow-brain knowledge base (search, ingest, rebuild, stats, sync)'
  )
  .option(
    '--brain-dir <dir>',
    `Brain directory (defaults to ~/plan-flow/brain)`
  )
  .option(
    '--limit <n>',
    'Max results for search',
    (v) => parseInt(v, 10),
    10
  )
  .option(
    '--type <chunkType>',
    'Filter search by chunk type (e.g. plan, pattern, discovery, memory)'
  )
  .action(async (action: string, args: string[], options: { brainDir?: string; limit?: number; type?: string }) => {
    const { runBrain } = await import('./commands/brain.js');
    await runBrain(action, args, options);
  });

program.parse();
