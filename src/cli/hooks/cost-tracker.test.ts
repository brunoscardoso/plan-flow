/**
 * Tests for cost-tracker.cjs and session-summary.cjs hook scripts
 *
 * These tests spawn the hook scripts as child processes with mock stdin data
 * and verify the JSONL output written to a temp metrics file.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..');
const COST_TRACKER = join(PROJECT_ROOT, 'scripts', 'hooks', 'cost-tracker.cjs');
const SESSION_SUMMARY = join(PROJECT_ROOT, 'scripts', 'hooks', 'session-summary.cjs');

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `plan-flow-hooks-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/**
 * Create a fake transcript JSONL file with an assistant entry containing usage data.
 */
function createTranscript(
  dir: string,
  usage: Record<string, number>,
  model = 'claude-sonnet-4-6'
): string {
  const transcriptPath = join(dir, 'transcript.jsonl');
  const lines = [
    JSON.stringify({ type: 'user', message: { role: 'user', content: 'hello' } }),
    JSON.stringify({
      type: 'assistant',
      message: {
        role: 'assistant',
        model,
        usage: {
          input_tokens: usage.input_tokens || 0,
          output_tokens: usage.output_tokens || 0,
          cache_creation_input_tokens: usage.cache_creation_tokens || 0,
          cache_read_input_tokens: usage.cache_read_tokens || 0,
        },
      },
    }),
  ];
  writeFileSync(transcriptPath, lines.join('\n') + '\n');
  return transcriptPath;
}

/**
 * Run a hook script with given stdin JSON, using a custom HOME to control metrics path.
 */
function runHook(
  script: string,
  stdinData: Record<string, unknown>,
  homeDir: string
): void {
  const input = JSON.stringify(stdinData);
  execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${script}"`, {
    env: { ...process.env, HOME: homeDir },
    timeout: 5000,
  });
}

describe('cost-tracker.cjs', () => {
  let tempDir: string;
  let fakeHome: string;

  beforeEach(() => {
    tempDir = createTempDir();
    fakeHome = join(tempDir, 'home');
    mkdirSync(fakeHome, { recursive: true });
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should log token usage from transcript to costs.jsonl', () => {
    const transcriptPath = createTranscript(tempDir, {
      input_tokens: 1000,
      output_tokens: 500,
      cache_creation_tokens: 200,
      cache_read_tokens: 100,
    });

    runHook(COST_TRACKER, {
      transcript_path: transcriptPath,
      session_id: 'test-session-1',
      cwd: '/home/user/my-project',
    }, fakeHome);

    const costsFile = join(fakeHome, '.claude', 'metrics', 'costs.jsonl');
    expect(existsSync(costsFile)).toBe(true);

    const content = readFileSync(costsFile, 'utf-8').trim();
    const entry = JSON.parse(content);

    expect(entry.session_id).toBe('test-session-1');
    expect(entry.project).toBe('my-project');
    expect(entry.model).toBe('claude-sonnet-4-6');
    expect(entry.input_tokens).toBe(1000);
    expect(entry.output_tokens).toBe(500);
    expect(entry.cache_creation_tokens).toBe(200);
    expect(entry.cache_read_tokens).toBe(100);
    expect(entry.estimated_cost_usd).toBeGreaterThan(0);
    expect(entry.hook_version).toBe('1.0.0');
  });

  it('should calculate cost correctly for Opus model', () => {
    const transcriptPath = createTranscript(
      tempDir,
      { input_tokens: 1000000, output_tokens: 100000 },
      'claude-opus-4-6'
    );

    runHook(COST_TRACKER, {
      transcript_path: transcriptPath,
      session_id: 'opus-test',
      cwd: '/tmp/test',
    }, fakeHome);

    const costsFile = join(fakeHome, '.claude', 'metrics', 'costs.jsonl');
    const entry = JSON.parse(readFileSync(costsFile, 'utf-8').trim());

    // Opus: input $15/M, output $75/M
    // 1M input = $15, 100K output = $7.50
    const expectedCost = 15.0 + 7.5;
    expect(entry.estimated_cost_usd).toBeCloseTo(expectedCost, 2);
  });

  it('should calculate cost correctly for Haiku model', () => {
    const transcriptPath = createTranscript(
      tempDir,
      { input_tokens: 1000000, output_tokens: 1000000 },
      'claude-haiku-4-5-20251001'
    );

    runHook(COST_TRACKER, {
      transcript_path: transcriptPath,
      session_id: 'haiku-test',
      cwd: '/tmp/test',
    }, fakeHome);

    const costsFile = join(fakeHome, '.claude', 'metrics', 'costs.jsonl');
    const entry = JSON.parse(readFileSync(costsFile, 'utf-8').trim());

    // Haiku: input $0.80/M, output $4.00/M
    const expectedCost = 0.80 + 4.00;
    expect(entry.estimated_cost_usd).toBeCloseTo(expectedCost, 2);
  });

  it('should handle missing transcript gracefully', () => {
    // No transcript file — should exit cleanly
    expect(() => {
      runHook(COST_TRACKER, {
        transcript_path: '/nonexistent/path.jsonl',
        session_id: 'missing-transcript',
        cwd: '/tmp/test',
      }, fakeHome);
    }).not.toThrow();

    const costsFile = join(fakeHome, '.claude', 'metrics', 'costs.jsonl');
    expect(existsSync(costsFile)).toBe(false);
  });

  it('should handle malformed transcript gracefully', () => {
    const transcriptPath = join(tempDir, 'bad-transcript.jsonl');
    writeFileSync(transcriptPath, 'not valid json\nalso bad\n');

    expect(() => {
      runHook(COST_TRACKER, {
        transcript_path: transcriptPath,
        session_id: 'bad-transcript',
        cwd: '/tmp/test',
      }, fakeHome);
    }).not.toThrow();

    const costsFile = join(fakeHome, '.claude', 'metrics', 'costs.jsonl');
    expect(existsSync(costsFile)).toBe(false);
  });

  it('should include cache read discount in cost calculation', () => {
    const transcriptPath = createTranscript(tempDir, {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_tokens: 0,
      cache_read_tokens: 1000000,
    }, 'claude-sonnet-4-6');

    runHook(COST_TRACKER, {
      transcript_path: transcriptPath,
      session_id: 'cache-test',
      cwd: '/tmp/test',
    }, fakeHome);

    const costsFile = join(fakeHome, '.claude', 'metrics', 'costs.jsonl');
    const entry = JSON.parse(readFileSync(costsFile, 'utf-8').trim());

    // Sonnet cache read: $3.00/M * 0.1 = $0.30/M for 1M tokens
    expect(entry.estimated_cost_usd).toBeCloseTo(0.30, 2);
  });
});

describe('session-summary.cjs', () => {
  let tempDir: string;
  let fakeHome: string;

  beforeEach(() => {
    tempDir = createTempDir();
    fakeHome = join(tempDir, 'home');
    mkdirSync(join(fakeHome, '.claude', 'metrics'), { recursive: true });
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should aggregate session entries and write summary', () => {
    const costsFile = join(fakeHome, '.claude', 'metrics', 'costs.jsonl');
    const entries = [
      {
        timestamp: '2026-03-09T10:00:00.000Z',
        session_id: 'sess-1',
        project: 'test-project',
        model: 'claude-sonnet-4-6',
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        estimated_cost_usd: 0.01,
      },
      {
        timestamp: '2026-03-09T10:30:00.000Z',
        session_id: 'sess-1',
        project: 'test-project',
        model: 'claude-sonnet-4-6',
        input_tokens: 2000,
        output_tokens: 1000,
        cache_creation_tokens: 100,
        cache_read_tokens: 50,
        estimated_cost_usd: 0.02,
      },
      {
        timestamp: '2026-03-09T11:00:00.000Z',
        session_id: 'other-session',
        project: 'other-project',
        model: 'claude-opus-4-6',
        input_tokens: 5000,
        output_tokens: 2000,
        estimated_cost_usd: 0.05,
      },
    ];

    writeFileSync(costsFile, entries.map(e => JSON.stringify(e)).join('\n') + '\n');

    runHook(SESSION_SUMMARY, { session_id: 'sess-1' }, fakeHome);

    const content = readFileSync(costsFile, 'utf-8').trim();
    const lines = content.split('\n');

    // Should have 4 lines: 3 original + 1 summary
    expect(lines.length).toBe(4);

    const summary = JSON.parse(lines[3]);
    expect(summary.type).toBe('session_summary');
    expect(summary.session_id).toBe('sess-1');
    expect(summary.response_count).toBe(2);
    expect(summary.total_input_tokens).toBe(3000);
    expect(summary.total_output_tokens).toBe(1500);
    expect(summary.total_cache_creation_tokens).toBe(100);
    expect(summary.total_cache_read_tokens).toBe(50);
    expect(summary.total_cost_usd).toBeCloseTo(0.03, 4);
    expect(summary.duration_minutes).toBe(30);
  });

  it('should handle empty session gracefully', () => {
    const costsFile = join(fakeHome, '.claude', 'metrics', 'costs.jsonl');
    writeFileSync(costsFile, JSON.stringify({
      session_id: 'other-session',
      input_tokens: 100,
      output_tokens: 50,
      estimated_cost_usd: 0.01,
    }) + '\n');

    expect(() => {
      runHook(SESSION_SUMMARY, { session_id: 'nonexistent-session' }, fakeHome);
    }).not.toThrow();

    // Should not add a summary line
    const lines = readFileSync(costsFile, 'utf-8').trim().split('\n');
    expect(lines.length).toBe(1);
  });

  it('should handle missing costs file gracefully', () => {
    // Delete the metrics dir contents
    rmSync(join(fakeHome, '.claude', 'metrics', 'costs.jsonl'), { force: true });

    expect(() => {
      runHook(SESSION_SUMMARY, { session_id: 'test' }, fakeHome);
    }).not.toThrow();
  });

  it('should exclude existing summaries from aggregation', () => {
    const costsFile = join(fakeHome, '.claude', 'metrics', 'costs.jsonl');
    const entries = [
      {
        session_id: 'sess-1',
        input_tokens: 1000,
        output_tokens: 500,
        estimated_cost_usd: 0.01,
        timestamp: '2026-03-09T10:00:00.000Z',
      },
      {
        type: 'session_summary',
        session_id: 'sess-1',
        total_input_tokens: 1000,
        total_output_tokens: 500,
        total_cost_usd: 0.01,
        timestamp: '2026-03-09T10:05:00.000Z',
      },
      {
        session_id: 'sess-1',
        input_tokens: 2000,
        output_tokens: 1000,
        estimated_cost_usd: 0.02,
        timestamp: '2026-03-09T10:10:00.000Z',
      },
    ];

    writeFileSync(costsFile, entries.map(e => JSON.stringify(e)).join('\n') + '\n');

    runHook(SESSION_SUMMARY, { session_id: 'sess-1' }, fakeHome);

    const lines = readFileSync(costsFile, 'utf-8').trim().split('\n');
    const lastLine = JSON.parse(lines[lines.length - 1]);

    // Summary should only count the 2 non-summary entries
    expect(lastLine.type).toBe('session_summary');
    expect(lastLine.response_count).toBe(2);
    expect(lastLine.total_input_tokens).toBe(3000);
  });
});

describe('cost-tracker.cjs rotation', () => {
  let tempDir: string;
  let fakeHome: string;

  beforeEach(() => {
    tempDir = createTempDir();
    fakeHome = join(tempDir, 'home');
    mkdirSync(join(fakeHome, '.claude', 'metrics'), { recursive: true });
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should not rotate when under 10,000 lines', () => {
    const costsFile = join(fakeHome, '.claude', 'metrics', 'costs.jsonl');
    // Write 100 lines
    const lines = Array.from({ length: 100 }, (_, i) =>
      JSON.stringify({ session_id: 'test', input_tokens: i, timestamp: new Date().toISOString() })
    );
    writeFileSync(costsFile, lines.join('\n') + '\n');

    const transcriptPath = createTranscript(tempDir, {
      input_tokens: 100,
      output_tokens: 50,
    });

    runHook(COST_TRACKER, {
      transcript_path: transcriptPath,
      session_id: 'rotation-test',
      cwd: '/tmp/test',
    }, fakeHome);

    // Should still have the original file with one more line
    expect(existsSync(costsFile)).toBe(true);
    const resultLines = readFileSync(costsFile, 'utf-8').trim().split('\n');
    expect(resultLines.length).toBe(101);
  });
});
