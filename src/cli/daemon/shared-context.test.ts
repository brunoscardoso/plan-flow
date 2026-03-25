/**
 * Tests for shared-context — JSONL context file management and contract conflict detection
 */

import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  createContextFile,
  appendContextEntry,
  readContextEntries,
  clearContextFile,
  detectContractConflicts,
} from './shared-context.js';
import type { ContextEntry } from '../state/types.js';

describe('shared-context', () => {
  let flowDir: string;

  beforeEach(() => {
    flowDir = mkdtempSync(join(tmpdir(), 'shared-context-test-'));
  });

  afterEach(() => {
    rmSync(flowDir, { recursive: true, force: true });
  });

  // ── Helpers ──────────────────────────────────────────────

  function makeContractEntry(
    agent: string,
    name: string,
    signature: string,
    fields?: string[],
  ): ContextEntry {
    return {
      agent,
      type: 'contract',
      timestamp: new Date().toISOString(),
      data: { name, kind: 'function', signature, ...(fields ? { fields } : {}) },
    };
  }

  function makeDecisionEntry(agent: string, choice: string): ContextEntry {
    return {
      agent,
      type: 'decision',
      timestamp: new Date().toISOString(),
      data: { choice, reason: 'test reason' },
    };
  }

  function makeProgressEntry(agent: string, task: number): ContextEntry {
    return {
      agent,
      type: 'progress',
      timestamp: new Date().toISOString(),
      data: { task, status: 'complete' as const, summary: 'done' },
    };
  }

  // ── createContextFile ────────────────────────────────────

  describe('createContextFile', () => {
    it('should create an empty file', async () => {
      await createContextFile(flowDir);

      const filePath = join(flowDir, '.wave-context.jsonl');
      expect(existsSync(filePath)).toBe(true);

      const content = await readFile(filePath, 'utf-8');
      expect(content).toBe('');
    });

    it('should create parent directories if needed', async () => {
      const nestedDir = join(flowDir, 'nested', 'deep');

      await createContextFile(nestedDir);

      const filePath = join(nestedDir, '.wave-context.jsonl');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  // ── appendContextEntry ───────────────────────────────────

  describe('appendContextEntry', () => {
    it('should append a JSONL line to the context file', async () => {
      const entry = makeContractEntry('agent-1', 'getUser', '(id: string) => User');

      await appendContextEntry(flowDir, entry);

      const content = await readFile(join(flowDir, '.wave-context.jsonl'), 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(1);

      const parsed = JSON.parse(lines[0]);
      expect(parsed.agent).toBe('agent-1');
      expect(parsed.type).toBe('contract');
      expect(parsed.data.name).toBe('getUser');
    });

    it('should create the file if it does not exist', async () => {
      const entry = makeDecisionEntry('agent-2', 'use REST');

      await appendContextEntry(flowDir, entry);

      expect(existsSync(join(flowDir, '.wave-context.jsonl'))).toBe(true);
    });

    it('should accumulate multiple appends', async () => {
      const entry1 = makeContractEntry('agent-1', 'getUser', '(id: string) => User');
      const entry2 = makeDecisionEntry('agent-2', 'use REST');
      const entry3 = makeProgressEntry('agent-3', 1);

      await appendContextEntry(flowDir, entry1);
      await appendContextEntry(flowDir, entry2);
      await appendContextEntry(flowDir, entry3);

      const content = await readFile(join(flowDir, '.wave-context.jsonl'), 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(3);
    });

    it('should not leave a .tmp file after atomic write', async () => {
      const entry = makeContractEntry('agent-1', 'foo', '() => void');

      await appendContextEntry(flowDir, entry);

      expect(existsSync(join(flowDir, '.wave-context.jsonl.tmp'))).toBe(false);
    });
  });

  // ── readContextEntries ───────────────────────────────────

  describe('readContextEntries', () => {
    it('should return parsed entries', async () => {
      const entry = makeContractEntry('agent-1', 'getUser', '(id: string) => User');
      await appendContextEntry(flowDir, entry);

      const entries = await readContextEntries(flowDir);

      expect(entries).toHaveLength(1);
      expect(entries[0].agent).toBe('agent-1');
      expect(entries[0].type).toBe('contract');
    });

    it('should return empty array for missing file', async () => {
      const entries = await readContextEntries(join(flowDir, 'nonexistent'));

      expect(entries).toEqual([]);
    });

    it('should handle multiple entries', async () => {
      await appendContextEntry(flowDir, makeContractEntry('a1', 'fn1', 'sig1'));
      await appendContextEntry(flowDir, makeDecisionEntry('a2', 'choice'));
      await appendContextEntry(flowDir, makeProgressEntry('a3', 2));

      const entries = await readContextEntries(flowDir);

      expect(entries).toHaveLength(3);
      expect(entries[0].type).toBe('contract');
      expect(entries[1].type).toBe('decision');
      expect(entries[2].type).toBe('progress');
    });
  });

  // ── clearContextFile ─────────────────────────────────────

  describe('clearContextFile', () => {
    it('should remove the context file', async () => {
      await createContextFile(flowDir);
      expect(existsSync(join(flowDir, '.wave-context.jsonl'))).toBe(true);

      await clearContextFile(flowDir);

      expect(existsSync(join(flowDir, '.wave-context.jsonl'))).toBe(false);
    });

    it('should succeed silently if file does not exist', async () => {
      await expect(clearContextFile(flowDir)).resolves.toBeUndefined();
    });
  });

  // ── detectContractConflicts ──────────────────────────────

  describe('detectContractConflicts', () => {
    it('should find conflict when same name has different signatures', () => {
      const entries: ContextEntry[] = [
        makeContractEntry('agent-1', 'getUser', '(id: string) => User'),
        makeContractEntry('agent-2', 'getUser', '(id: number) => User'),
      ];

      const conflicts = detectContractConflicts(entries);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].name).toBe('getUser');
      expect(conflicts[0].entries).toHaveLength(2);
      expect(conflicts[0].entries[0].agent).toBe('agent-1');
      expect(conflicts[0].entries[1].agent).toBe('agent-2');
    });

    it('should find conflict when same name has different fields', () => {
      const entries: ContextEntry[] = [
        makeContractEntry('agent-1', 'UserResponse', '{}', ['id', 'name']),
        makeContractEntry('agent-2', 'UserResponse', '{}', ['id', 'email']),
      ];

      const conflicts = detectContractConflicts(entries);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].name).toBe('UserResponse');
    });

    it('should return empty when same name has same signature and fields', () => {
      const entries: ContextEntry[] = [
        makeContractEntry('agent-1', 'getUser', '(id: string) => User', ['id', 'name']),
        makeContractEntry('agent-2', 'getUser', '(id: string) => User', ['id', 'name']),
      ];

      const conflicts = detectContractConflicts(entries);

      expect(conflicts).toEqual([]);
    });

    it('should return empty when no contract entries exist', () => {
      const entries: ContextEntry[] = [
        makeDecisionEntry('agent-1', 'use REST'),
        makeProgressEntry('agent-2', 1),
      ];

      const conflicts = detectContractConflicts(entries);

      expect(conflicts).toEqual([]);
    });

    it('should return empty for single contract entry per name', () => {
      const entries: ContextEntry[] = [
        makeContractEntry('agent-1', 'getUser', '(id: string) => User'),
        makeContractEntry('agent-2', 'listUsers', '() => User[]'),
      ];

      const conflicts = detectContractConflicts(entries);

      expect(conflicts).toEqual([]);
    });

    it('should handle mixed entry types correctly', () => {
      const entries: ContextEntry[] = [
        makeContractEntry('agent-1', 'getUser', '(id: string) => User'),
        makeDecisionEntry('agent-1', 'use REST'),
        makeProgressEntry('agent-2', 1),
        makeContractEntry('agent-2', 'getUser', '(id: number) => User'),
        makeDecisionEntry('agent-2', 'use GraphQL'),
      ];

      const conflicts = detectContractConflicts(entries);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].name).toBe('getUser');
    });

    it('should compare fields order-insensitively (sorted)', () => {
      const entries: ContextEntry[] = [
        makeContractEntry('agent-1', 'UserResponse', '{}', ['name', 'id', 'email']),
        makeContractEntry('agent-2', 'UserResponse', '{}', ['email', 'name', 'id']),
      ];

      const conflicts = detectContractConflicts(entries);

      expect(conflicts).toEqual([]);
    });

    it('should detect conflict when field counts differ', () => {
      const entries: ContextEntry[] = [
        makeContractEntry('agent-1', 'UserResponse', '{}', ['id', 'name']),
        makeContractEntry('agent-2', 'UserResponse', '{}', ['id', 'name', 'email']),
      ];

      const conflicts = detectContractConflicts(entries);

      expect(conflicts).toHaveLength(1);
    });

    it('should return empty array for empty input', () => {
      const conflicts = detectContractConflicts([]);

      expect(conflicts).toEqual([]);
    });
  });
});
