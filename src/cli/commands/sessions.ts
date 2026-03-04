/**
 * CLI commands for session management.
 *
 * Provides list, search, show, and prune operations
 * for per-session markdown files in flow/brain/sessions/.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  listSessions,
  searchSessions,
  readSession,
  pruneSessions,
  paginateResults,
} from '../utils/sessions.js';
import type { SessionMetadata } from '../utils/sessions.js';

const DEFAULT_LIMIT = 10;

function getSessionsDir(target: string): string {
  return join(target, 'flow', 'brain', 'sessions');
}

function formatDuration(min: number): string {
  if (min === 0) return '-';
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h${min % 60}m`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function formatTable(sessions: SessionMetadata[]): string {
  if (sessions.length === 0) return 'No sessions found.';

  const header = `${'ID'.padEnd(28)} ${'Date'.padEnd(12)} ${'Dur'.padEnd(6)} ${'Msgs'.padEnd(6)} ${'Skills'.padEnd(24)} Features`;
  const separator = '-'.repeat(header.length);
  const rows = sessions.map((s) => {
    const id = truncate(s.id, 27).padEnd(28);
    const date = s.date.padEnd(12);
    const dur = formatDuration(s.duration_min).padEnd(6);
    const msgs = String(s.messages).padEnd(6);
    const skills = truncate(s.skills.join(', ') || '-', 23).padEnd(24);
    const features = truncate(s.features.join(', ') || '-', 30);
    return `${id} ${date} ${dur} ${msgs} ${skills} ${features}`;
  });

  return [header, separator, ...rows].join('\n');
}

export interface SessionsListOptions {
  target: string;
  limit?: number;
  offset?: number;
  feature?: string;
  skill?: string;
  from?: string;
  to?: string;
  json?: boolean;
}

export async function runSessionsList(
  options: SessionsListOptions
): Promise<void> {
  const sessionsDir = getSessionsDir(options.target);

  if (!existsSync(sessionsDir)) {
    console.log('No sessions directory found. Run plan-flow init first.');
    return;
  }

  const all = listSessions(sessionsDir, {
    feature: options.feature,
    skill: options.skill,
    from: options.from,
    to: options.to,
  });

  const limit = options.limit ?? DEFAULT_LIMIT;
  const offset = options.offset ?? 0;
  const page = paginateResults(all, limit, offset);

  if (options.json) {
    console.log(JSON.stringify(page, null, 2));
    return;
  }

  console.log(formatTable(page.items));
  console.log('');
  console.log(
    `Showing ${page.items.length} of ${page.total} sessions` +
      (page.hasMore ? ` (use --offset ${offset + limit} for more)` : '')
  );
}

export interface SessionsSearchOptions {
  target: string;
  limit?: number;
  json?: boolean;
}

export async function runSessionsSearch(
  query: string,
  options: SessionsSearchOptions
): Promise<void> {
  const sessionsDir = getSessionsDir(options.target);

  if (!existsSync(sessionsDir)) {
    console.log('No sessions directory found. Run plan-flow init first.');
    return;
  }

  const results = searchSessions(sessionsDir, query);
  const limit = options.limit ?? DEFAULT_LIMIT;
  const page = paginateResults(results, limit, 0);

  if (options.json) {
    console.log(JSON.stringify(page, null, 2));
    return;
  }

  if (page.items.length === 0) {
    console.log(`No sessions found matching "${query}".`);
    return;
  }

  for (const result of page.items) {
    const s = result.session;
    console.log(`\n── ${s.id} (${s.date}, ${s.messages} msgs) ──`);
    for (const m of result.matches.slice(0, 3)) {
      console.log(`  L${m.line}: ${m.text.trim()}`);
    }
    if (result.matches.length > 3) {
      console.log(`  ... and ${result.matches.length - 3} more matches`);
    }
  }

  console.log('');
  console.log(
    `Found ${page.total} session(s) matching "${query}"` +
      (page.hasMore ? ` (showing first ${limit})` : '')
  );
}

export interface SessionsShowOptions {
  target: string;
}

export async function runSessionsShow(
  sessionId: string,
  options: SessionsShowOptions
): Promise<void> {
  const sessionsDir = getSessionsDir(options.target);

  const result = readSession(sessionsDir, sessionId);
  if (!result) {
    console.log(`Session "${sessionId}" not found.`);
    return;
  }

  console.log(result.content);
}

export interface SessionsPruneOptions {
  target: string;
  before: string;
  dryRun?: boolean;
}

export async function runSessionsPrune(
  options: SessionsPruneOptions
): Promise<void> {
  const sessionsDir = getSessionsDir(options.target);

  if (!existsSync(sessionsDir)) {
    console.log('No sessions directory found.');
    return;
  }

  if (options.dryRun) {
    const all = listSessions(sessionsDir);
    const toDelete = all.filter((s) => s.date < options.before);
    console.log(
      `Would prune ${toDelete.length} session(s) before ${options.before}:`
    );
    for (const s of toDelete) {
      console.log(`  - ${s.id} (${s.date})`);
    }
    return;
  }

  const result = pruneSessions(sessionsDir, options.before);
  console.log(`Pruned ${result.pruned.length} session(s).`);

  if (result.errors.length > 0) {
    console.log('Errors:');
    for (const err of result.errors) {
      console.log(`  - ${err}`);
    }
  }
}
