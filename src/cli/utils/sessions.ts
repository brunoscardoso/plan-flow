/**
 * Session file parser and query utilities.
 *
 * Provides CRUD operations, filtering, pagination, and full-text search
 * across per-session markdown files in flow/brain/sessions/.
 */

import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join, basename } from 'node:path';

/** Machine-readable session metadata from YAML frontmatter. */
export interface SessionMetadata {
  id: string;
  date: string;
  start: string;
  end: string;
  duration_min: number;
  messages: number;
  skills: string[];
  features: string[];
  files_changed: number;
}

/** Filters for listing sessions. */
export interface SessionFilters {
  feature?: string;
  skill?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/** A search match within a session file. */
export interface SearchResult {
  session: SessionMetadata;
  matches: { line: number; text: string }[];
}

/** Paginated result wrapper. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

/**
 * Parse YAML frontmatter from a session markdown file.
 * Expects --- delimited frontmatter at the top of the file.
 */
export function parseSessionFrontmatter(
  content: string
): SessionMetadata | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const raw = match[1];
  const get = (key: string): string => {
    const m = raw.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : '';
  };

  const getArray = (key: string): string[] => {
    const m = raw.match(new RegExp(`^${key}:\\s*\\[(.*)\\]$`, 'm'));
    if (!m) return [];
    return m[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const id = get('id');
  if (!id) return null;

  return {
    id,
    date: get('date'),
    start: get('start'),
    end: get('end'),
    duration_min: parseInt(get('duration_min'), 10) || 0,
    messages: parseInt(get('messages'), 10) || 0,
    skills: getArray('skills'),
    features: getArray('features'),
    files_changed: parseInt(get('files_changed'), 10) || 0,
  };
}

/**
 * Parse a legacy daily session file (YYYY-MM-DD.md) into SessionMetadata.
 * These files lack frontmatter, so metadata is inferred from filename and content.
 */
export function parseLegacySession(
  filename: string,
  content: string
): SessionMetadata | null {
  const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
  if (!dateMatch) return null;

  const date = dateMatch[1];

  // Count skills from "### HH:MM - skill-name" lines
  const skillMatches = content.matchAll(/^### \d{2}:\d{2} - (.+)$/gm);
  const skills = [...new Set([...skillMatches].map((m) => m[1].trim()))];

  // Extract features from [[wiki-links]] in Feature lines
  const featureMatches = content.matchAll(
    /\*\*Feature\*\*:\s*\[\[([^\]]+)\]\]/g
  );
  const features = [
    ...new Set([...featureMatches].map((m) => m[1].trim())),
  ];

  return {
    id: date,
    date,
    start: `${date}T00:00:00Z`,
    end: `${date}T23:59:59Z`,
    duration_min: 0,
    messages: 0,
    skills,
    features,
    files_changed: 0,
  };
}

/**
 * List all sessions from the sessions directory, sorted by date descending.
 * Supports both per-session files (with frontmatter) and legacy daily files.
 */
export function listSessions(
  sessionsDir: string,
  filters?: SessionFilters
): SessionMetadata[] {
  if (!existsSync(sessionsDir)) return [];

  const files = readdirSync(sessionsDir).filter((f) => f.endsWith('.md'));
  const sessions: SessionMetadata[] = [];

  for (const file of files) {
    const content = readFileSync(join(sessionsDir, file), 'utf-8');
    const meta =
      parseSessionFrontmatter(content) ??
      parseLegacySession(file, content);
    if (meta) sessions.push(meta);
  }

  // Sort by date descending (newest first)
  sessions.sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start));

  // Apply filters
  let filtered = sessions;

  if (filters?.feature) {
    const f = filters.feature.toLowerCase();
    filtered = filtered.filter((s) =>
      s.features.some((feat) => feat.toLowerCase().includes(f))
    );
  }

  if (filters?.skill) {
    const sk = filters.skill.toLowerCase();
    filtered = filtered.filter((s) =>
      s.skills.some((skill) => skill.toLowerCase().includes(sk))
    );
  }

  if (filters?.from) {
    filtered = filtered.filter((s) => s.date >= filters.from!);
  }

  if (filters?.to) {
    filtered = filtered.filter((s) => s.date <= filters.to!);
  }

  return filtered;
}

/**
 * Full-text search across session content and frontmatter.
 * Returns sessions with matching lines highlighted.
 */
export function searchSessions(
  sessionsDir: string,
  query: string
): SearchResult[] {
  if (!existsSync(sessionsDir)) return [];

  const files = readdirSync(sessionsDir).filter((f) => f.endsWith('.md'));
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (const file of files) {
    const content = readFileSync(join(sessionsDir, file), 'utf-8');
    const meta =
      parseSessionFrontmatter(content) ??
      parseLegacySession(file, content);
    if (!meta) continue;

    const lines = content.split('\n');
    const matches: { line: number; text: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(lowerQuery)) {
        matches.push({ line: i + 1, text: lines[i] });
      }
    }

    if (matches.length > 0) {
      results.push({ session: meta, matches });
    }
  }

  // Sort by date descending
  results.sort((a, b) => b.session.date.localeCompare(a.session.date));

  return results;
}

/**
 * Read a single session by ID.
 * Tries exact match first, then prefix match.
 */
export function readSession(
  sessionsDir: string,
  sessionId: string
): { metadata: SessionMetadata; content: string } | null {
  if (!existsSync(sessionsDir)) return null;

  const files = readdirSync(sessionsDir).filter((f) => f.endsWith('.md'));

  // Try exact filename match
  const exactFile = files.find(
    (f) => basename(f, '.md') === sessionId
  );

  // Try prefix match if no exact match
  const matchFile =
    exactFile ?? files.find((f) => f.startsWith(sessionId));

  if (!matchFile) return null;

  const content = readFileSync(join(sessionsDir, matchFile), 'utf-8');
  const metadata =
    parseSessionFrontmatter(content) ??
    parseLegacySession(matchFile, content);

  if (!metadata) return null;

  return { metadata, content };
}

/**
 * Prune sessions before a given date.
 * Returns list of pruned file names and any errors.
 */
export function pruneSessions(
  sessionsDir: string,
  before: string
): { pruned: string[]; errors: string[] } {
  if (!existsSync(sessionsDir)) return { pruned: [], errors: [] };

  const files = readdirSync(sessionsDir).filter((f) => f.endsWith('.md'));
  const pruned: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const content = readFileSync(join(sessionsDir, file), 'utf-8');
    const meta =
      parseSessionFrontmatter(content) ??
      parseLegacySession(file, content);

    if (!meta) continue;
    if (meta.date >= before) continue;

    try {
      unlinkSync(join(sessionsDir, file));
      pruned.push(file);
    } catch (err) {
      errors.push(`Failed to delete ${file}: ${err}`);
    }
  }

  return { pruned, errors };
}

/**
 * Paginate an array of results.
 */
export function paginateResults<T>(
  items: T[],
  limit: number,
  offset: number
): PaginatedResult<T> {
  const total = items.length;
  const sliced = items.slice(offset, offset + limit);
  return {
    items: sliced,
    total,
    hasMore: offset + limit < total,
  };
}
