/**
 * Project-scoped brain query module.
 *
 * Opens a planflow-brain SQLite index at the project root and exposes
 * search with scope/type filters.  This is separate from the central
 * vault brain (~/plan-flow/brain/) — it indexes project-local content:
 * .claude/resources/, .claude/rules/, flow/brain/, flow/plans/,
 * flow/discovery/, and CLAUDE.md.
 */

import * as log from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueryOptions {
  /** Filter results to a specific content scope. */
  scope?: 'resources' | 'rules' | 'brain' | 'plans' | 'discovery' | 'all';
  /** Filter results to a specific chunk type. */
  type?: string;
  /** Maximum number of results to return (default 10). */
  limit?: number;
}

export interface QueryResult {
  file: string;
  heading: string | undefined;
  content: string;
  score: number;
  chunkType: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 10;

/** Maps a scope name to the directory prefixes that belong to it. */
const SCOPE_TO_DIRS: Record<string, string[]> = {
  resources: ['.claude/resources/'],
  rules: ['.claude/rules/'],
  brain: ['flow/brain/'],
  plans: ['flow/plans/'],
  discovery: ['flow/discovery/'],
  all: [], // no filter
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Open a project-scoped brain at the given project root.
 *
 * The underlying SQLite database is stored inside the project root
 * (planflow-brain places it at `<root>/.brain.sqlite` by default).
 *
 * Returns `null` when planflow-brain is unavailable or the DB cannot
 * be opened — callers should treat `null` as "brain unavailable" and
 * fall back gracefully.
 */
export async function openProjectBrain(projectRoot: string): Promise<any | null> {
  try {
    const { Brain } = await import('planflow-brain');
    const brain = await Brain.open(projectRoot);
    return brain;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn(`Project brain unavailable: ${message}`);
    return null;
  }
}

/**
 * Search the project brain with optional scope and type filtering.
 *
 * If the brain instance is `null` (unavailable), returns an empty array.
 */
export async function queryProjectBrain(
  brain: any,
  query: string,
  opts?: QueryOptions,
): Promise<QueryResult[]> {
  if (!brain) {
    return [];
  }

  const limit = opts?.limit ?? DEFAULT_LIMIT;
  const chunkTypes = opts?.type ? [opts.type] : undefined;
  const scopeDirs = SCOPE_TO_DIRS[opts?.scope ?? 'all'] ?? [];
  const hasScope = scopeDirs.length > 0;

  try {
    // When scope filtering, request more results so post-filter has enough
    const searchLimit = hasScope ? limit * 5 : limit;
    const raw: any[] = await brain.search(query, { limit: searchLimit, chunkTypes });

    // Apply scope filtering based on sourceFile prefix
    const filtered = !hasScope
      ? raw
      : raw.filter((r: any) =>
          scopeDirs.some((dir) => r.sourceFile?.startsWith(dir)),
        );

    return filtered.slice(0, limit).map((r: any) => ({
      file: r.sourceFile ?? '',
      heading: r.heading ?? undefined,
      content: r.text ?? '',
      score: r.score ?? 0,
      chunkType: r.chunkType ?? '',
    }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn(`Brain search failed: ${message}`);
    return [];
  }
}

/**
 * Close the project brain, releasing the SQLite connection.
 *
 * Safe to call with `null` (no-op).
 */
export function closeProjectBrain(brain: any): void {
  if (!brain) {
    return;
  }

  try {
    brain.close();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn(`Failed to close project brain: ${message}`);
  }
}
