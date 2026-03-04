/**
 * Tests for session file parser and query utilities.
 */

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  parseSessionFrontmatter,
  parseLegacySession,
  listSessions,
  searchSessions,
  readSession,
  pruneSessions,
  paginateResults,
} from './sessions';

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `plan-flow-sessions-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

const SAMPLE_FRONTMATTER = `---
id: 2026-03-04_11-30_a1b2c3
date: 2026-03-04
start: 2026-03-04T11:30:00Z
end: 2026-03-04T12:15:00Z
duration_min: 45
messages: 12
skills: [execute-plan, review-code]
features: [session-storage, brain-capture]
files_changed: 8
---

# Session: 2026-03-04 11:30

**Project**: [[cli]]

## Skills Run

### 11:30 - execute-plan
- **Feature**: [[session-storage]]
- **Status**: completed
`;

const SAMPLE_FRONTMATTER_2 = `---
id: 2026-03-03_09-00_d4e5f6
date: 2026-03-03
start: 2026-03-03T09:00:00Z
end: 2026-03-03T10:30:00Z
duration_min: 90
messages: 20
skills: [discovery]
features: [auth-flow]
files_changed: 3
---

# Session: 2026-03-03 09:00

**Project**: [[cli]]
`;

const LEGACY_CONTENT = `# Session: 2026-03-01

**Project**: [[cli]]

## Skills Run

### 14:00 - create-plan
- **Feature**: [[dark-mode]]
- **Status**: completed
- **Files Changed**: 2

### 15:30 - execute-plan
- **Feature**: [[dark-mode]]
- **Status**: completed
- **Files Changed**: 5
`;

describe('parseSessionFrontmatter', () => {
  it('should parse valid frontmatter', () => {
    const result = parseSessionFrontmatter(SAMPLE_FRONTMATTER);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('2026-03-04_11-30_a1b2c3');
    expect(result!.date).toBe('2026-03-04');
    expect(result!.duration_min).toBe(45);
    expect(result!.messages).toBe(12);
    expect(result!.skills).toEqual(['execute-plan', 'review-code']);
    expect(result!.features).toEqual(['session-storage', 'brain-capture']);
    expect(result!.files_changed).toBe(8);
  });

  it('should return null for content without frontmatter', () => {
    const result = parseSessionFrontmatter('# Just a heading\n\nSome content');
    expect(result).toBeNull();
  });

  it('should return null when id is missing', () => {
    const content = `---
date: 2026-03-04
start: 2026-03-04T11:30:00Z
---
# Session`;
    const result = parseSessionFrontmatter(content);
    expect(result).toBeNull();
  });

  it('should handle empty arrays', () => {
    const content = `---
id: test-session
date: 2026-03-04
start: 2026-03-04T11:30:00Z
end: 2026-03-04T12:00:00Z
duration_min: 30
messages: 5
skills: []
features: []
files_changed: 0
---
# Session`;
    const result = parseSessionFrontmatter(content);
    expect(result).not.toBeNull();
    expect(result!.skills).toEqual([]);
    expect(result!.features).toEqual([]);
  });

  it('should default numeric fields to 0 when missing', () => {
    const content = `---
id: minimal-session
date: 2026-03-04
start: 2026-03-04T11:30:00Z
end: 2026-03-04T12:00:00Z
---
# Session`;
    const result = parseSessionFrontmatter(content);
    expect(result).not.toBeNull();
    expect(result!.duration_min).toBe(0);
    expect(result!.messages).toBe(0);
    expect(result!.files_changed).toBe(0);
  });
});

describe('parseLegacySession', () => {
  it('should parse legacy daily session file', () => {
    const result = parseLegacySession('2026-03-01.md', LEGACY_CONTENT);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('2026-03-01');
    expect(result!.date).toBe('2026-03-01');
    expect(result!.skills).toEqual(['create-plan', 'execute-plan']);
    expect(result!.features).toEqual(['dark-mode']);
  });

  it('should return null for non-date filenames', () => {
    const result = parseLegacySession('notes.md', '# Notes');
    expect(result).toBeNull();
  });

  it('should return null for non-.md filenames', () => {
    const result = parseLegacySession('2026-03-01.txt', '# Session');
    expect(result).toBeNull();
  });

  it('should deduplicate skills and features', () => {
    const content = `# Session: 2026-03-01

### 14:00 - execute-plan
- **Feature**: [[dark-mode]]

### 15:00 - execute-plan
- **Feature**: [[dark-mode]]
`;
    const result = parseLegacySession('2026-03-01.md', content);
    expect(result!.skills).toEqual(['execute-plan']);
    expect(result!.features).toEqual(['dark-mode']);
  });
});

describe('listSessions', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    writeFileSync(join(tempDir, '2026-03-04_11-30_a1b2c3.md'), SAMPLE_FRONTMATTER);
    writeFileSync(join(tempDir, '2026-03-03_09-00_d4e5f6.md'), SAMPLE_FRONTMATTER_2);
    writeFileSync(join(tempDir, '2026-03-01.md'), LEGACY_CONTENT);
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should list all sessions sorted by date descending', () => {
    const sessions = listSessions(tempDir);
    expect(sessions).toHaveLength(3);
    expect(sessions[0].date).toBe('2026-03-04');
    expect(sessions[1].date).toBe('2026-03-03');
    expect(sessions[2].date).toBe('2026-03-01');
  });

  it('should return empty array for non-existent directory', () => {
    const sessions = listSessions('/nonexistent/path');
    expect(sessions).toEqual([]);
  });

  it('should filter by feature', () => {
    const sessions = listSessions(tempDir, { feature: 'auth' });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('2026-03-03_09-00_d4e5f6');
  });

  it('should filter by skill', () => {
    const sessions = listSessions(tempDir, { skill: 'discovery' });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('2026-03-03_09-00_d4e5f6');
  });

  it('should filter by date range (from)', () => {
    const sessions = listSessions(tempDir, { from: '2026-03-03' });
    expect(sessions).toHaveLength(2);
  });

  it('should filter by date range (to)', () => {
    const sessions = listSessions(tempDir, { to: '2026-03-02' });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].date).toBe('2026-03-01');
  });

  it('should handle mixed per-session and legacy files', () => {
    const sessions = listSessions(tempDir);
    const ids = sessions.map((s) => s.id);
    expect(ids).toContain('2026-03-04_11-30_a1b2c3');
    expect(ids).toContain('2026-03-01');
  });
});

describe('searchSessions', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    writeFileSync(join(tempDir, '2026-03-04_11-30_a1b2c3.md'), SAMPLE_FRONTMATTER);
    writeFileSync(join(tempDir, '2026-03-01.md'), LEGACY_CONTENT);
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should find sessions matching query', () => {
    const results = searchSessions(tempDir, 'session-storage');
    expect(results).toHaveLength(1);
    expect(results[0].session.id).toBe('2026-03-04_11-30_a1b2c3');
    expect(results[0].matches.length).toBeGreaterThan(0);
  });

  it('should be case-insensitive', () => {
    const results = searchSessions(tempDir, 'DARK-MODE');
    expect(results).toHaveLength(1);
    expect(results[0].session.id).toBe('2026-03-01');
  });

  it('should return empty for no matches', () => {
    const results = searchSessions(tempDir, 'nonexistent-feature-xyz');
    expect(results).toEqual([]);
  });

  it('should return empty for non-existent directory', () => {
    const results = searchSessions('/nonexistent/path', 'query');
    expect(results).toEqual([]);
  });

  it('should include line numbers in matches', () => {
    const results = searchSessions(tempDir, 'execute-plan');
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      for (const match of result.matches) {
        expect(match.line).toBeGreaterThan(0);
        expect(match.text).toBeDefined();
      }
    }
  });
});

describe('readSession', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    writeFileSync(join(tempDir, '2026-03-04_11-30_a1b2c3.md'), SAMPLE_FRONTMATTER);
    writeFileSync(join(tempDir, '2026-03-01.md'), LEGACY_CONTENT);
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should read session by exact ID', () => {
    const result = readSession(tempDir, '2026-03-04_11-30_a1b2c3');
    expect(result).not.toBeNull();
    expect(result!.metadata.id).toBe('2026-03-04_11-30_a1b2c3');
    expect(result!.content).toContain('Session: 2026-03-04');
  });

  it('should read legacy session by date ID', () => {
    const result = readSession(tempDir, '2026-03-01');
    expect(result).not.toBeNull();
    expect(result!.metadata.id).toBe('2026-03-01');
  });

  it('should return null for non-existent session', () => {
    const result = readSession(tempDir, 'nonexistent-id');
    expect(result).toBeNull();
  });

  it('should return null for non-existent directory', () => {
    const result = readSession('/nonexistent/path', 'test');
    expect(result).toBeNull();
  });

  it('should support prefix match', () => {
    const result = readSession(tempDir, '2026-03-04_11-30');
    expect(result).not.toBeNull();
    expect(result!.metadata.id).toBe('2026-03-04_11-30_a1b2c3');
  });
});

describe('pruneSessions', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    writeFileSync(join(tempDir, '2026-03-04_11-30_a1b2c3.md'), SAMPLE_FRONTMATTER);
    writeFileSync(join(tempDir, '2026-03-03_09-00_d4e5f6.md'), SAMPLE_FRONTMATTER_2);
    writeFileSync(join(tempDir, '2026-03-01.md'), LEGACY_CONTENT);
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should prune sessions before given date', () => {
    const result = pruneSessions(tempDir, '2026-03-03');
    expect(result.pruned).toHaveLength(1);
    expect(result.pruned[0]).toBe('2026-03-01.md');
    expect(result.errors).toHaveLength(0);
    expect(existsSync(join(tempDir, '2026-03-01.md'))).toBe(false);
    expect(existsSync(join(tempDir, '2026-03-04_11-30_a1b2c3.md'))).toBe(true);
  });

  it('should not prune sessions on or after the date', () => {
    const result = pruneSessions(tempDir, '2026-03-01');
    expect(result.pruned).toHaveLength(0);
  });

  it('should return empty for non-existent directory', () => {
    const result = pruneSessions('/nonexistent/path', '2026-03-05');
    expect(result.pruned).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('should prune multiple sessions', () => {
    const result = pruneSessions(tempDir, '2026-03-04');
    expect(result.pruned).toHaveLength(2);
  });
});

describe('paginateResults', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];

  it('should return first page', () => {
    const result = paginateResults(items, 2, 0);
    expect(result.items).toEqual(['a', 'b']);
    expect(result.total).toBe(5);
    expect(result.hasMore).toBe(true);
  });

  it('should return second page', () => {
    const result = paginateResults(items, 2, 2);
    expect(result.items).toEqual(['c', 'd']);
    expect(result.hasMore).toBe(true);
  });

  it('should return last page', () => {
    const result = paginateResults(items, 2, 4);
    expect(result.items).toEqual(['e']);
    expect(result.hasMore).toBe(false);
  });

  it('should handle limit larger than items', () => {
    const result = paginateResults(items, 10, 0);
    expect(result.items).toEqual(items);
    expect(result.hasMore).toBe(false);
  });

  it('should handle offset beyond items', () => {
    const result = paginateResults(items, 2, 10);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(5);
    expect(result.hasMore).toBe(false);
  });

  it('should handle empty array', () => {
    const result = paginateResults([], 10, 0);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });
});
