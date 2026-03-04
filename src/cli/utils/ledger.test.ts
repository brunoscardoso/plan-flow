/**
 * Tests for ledger utility — instinct read/write/update for flow/ledger.md.
 */

import { jest } from '@jest/globals';
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  readLedger,
  writeInstinct,
  formatInstinct,
  ensureLedger,
} from './ledger';
import type { Instinct } from './ledger';

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `plan-flow-ledger-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function sampleInstinct(overrides: Partial<Instinct> = {}): Instinct {
  return {
    id: 'test-instinct',
    confidence: 0.3,
    trigger: 'When testing ledger utility',
    action: 'Use sample instinct helper',
    evidence: 'Phase 3 tests confirmed this pattern',
    lastUpdated: '2026-03-04',
    ...overrides,
  };
}

const LEDGER_WITH_INSTINCTS = `# Project Ledger

> Persistent learning journal - updated automatically across sessions.
> Last updated: 2026-03-04

## Project Quirks

<!-- Unexpected behaviors, environment gotchas, undocumented constraints -->

## What Works

<!-- Proven approaches and solutions for this project -->

### use-esm-mock-pattern [confidence: 0.7]
**Trigger:** When mocking modules in Jest ESM tests
**Action:** Use jest.unstable_mockModule with absolute paths
**Evidence:** Standard jest.mock fails silently in ESM; confirmed across 7 test suites
**Last updated:** 2026-03-04

### prefer-integration-tests [confidence: 0.5]
**Trigger:** When writing tests for API endpoints
**Action:** Prefer integration tests over isolated unit tests
**Evidence:** Phase 3 of auth-feature caught middleware bug that unit tests missed
**Last updated:** 2026-03-04

## What Didn't Work

<!-- Failed approaches with brief "why" so we don't repeat them -->

## User Preferences

<!-- How the user likes things done beyond what rules files capture -->

## Domain Context

<!-- Business logic, terminology, and concepts that affect decisions -->
`;

describe('ledger utility', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('readLedger', () => {
    it('returns empty array for missing file', () => {
      const result = readLedger(tempDir);
      expect(result).toEqual([]);
    });

    it('parses instincts from existing ledger', () => {
      mkdirSync(join(tempDir, 'flow'), { recursive: true });
      writeFileSync(join(tempDir, 'flow', 'ledger.md'), LEDGER_WITH_INSTINCTS);

      const result = readLedger(tempDir);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'use-esm-mock-pattern',
        confidence: 0.7,
        trigger: 'When mocking modules in Jest ESM tests',
        action: 'Use jest.unstable_mockModule with absolute paths',
        evidence:
          'Standard jest.mock fails silently in ESM; confirmed across 7 test suites',
        lastUpdated: '2026-03-04',
      });
      expect(result[1].id).toBe('prefer-integration-tests');
      expect(result[1].confidence).toBe(0.5);
    });

    it('handles malformed entries gracefully', () => {
      mkdirSync(join(tempDir, 'flow'), { recursive: true });
      const malformed = `# Project Ledger

## What Works

### broken-entry [confidence: 0.5]
**Trigger:** Missing other fields

### valid-entry [confidence: 0.3]
**Trigger:** When something happens
**Action:** Do the thing
**Evidence:** It worked
**Last updated:** 2026-03-04
`;
      writeFileSync(join(tempDir, 'flow', 'ledger.md'), malformed);

      const result = readLedger(tempDir);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('valid-entry');
    });
  });

  describe('writeInstinct', () => {
    it('creates ledger file when missing', () => {
      const instinct = sampleInstinct();
      writeInstinct(tempDir, instinct);

      expect(existsSync(join(tempDir, 'flow', 'ledger.md'))).toBe(true);
    });

    it('appends new instinct to What Works section', () => {
      const instinct = sampleInstinct();
      const result = writeInstinct(tempDir, instinct);

      expect(result).toBe('created');
      const content = readFileSync(
        join(tempDir, 'flow', 'ledger.md'),
        'utf-8'
      );
      expect(content).toContain('### test-instinct [confidence: 0.3]');
      expect(content).toContain('**Trigger:** When testing ledger utility');
    });

    it('updates existing instinct — bumps confidence and updates evidence', () => {
      mkdirSync(join(tempDir, 'flow'), { recursive: true });
      writeFileSync(join(tempDir, 'flow', 'ledger.md'), LEDGER_WITH_INSTINCTS);

      const updated = sampleInstinct({
        id: 'use-esm-mock-pattern',
        evidence: 'New evidence from latest execution',
        lastUpdated: '2026-03-05',
      });
      const result = writeInstinct(tempDir, updated);

      expect(result).toBe('updated');
      const content = readFileSync(
        join(tempDir, 'flow', 'ledger.md'),
        'utf-8'
      );
      expect(content).toContain(
        '### use-esm-mock-pattern [confidence: 0.8]'
      );
      expect(content).toContain('New evidence from latest execution');
      expect(content).toContain('**Last updated:** 2026-03-05');
    });

    it('caps confidence at 0.9', () => {
      mkdirSync(join(tempDir, 'flow'), { recursive: true });
      // Create a ledger with an instinct already at 0.9
      const highConfidence = LEDGER_WITH_INSTINCTS.replace(
        'confidence: 0.7',
        'confidence: 0.9'
      );
      writeFileSync(join(tempDir, 'flow', 'ledger.md'), highConfidence);

      const updated = sampleInstinct({
        id: 'use-esm-mock-pattern',
        evidence: 'Even more evidence',
        lastUpdated: '2026-03-05',
      });
      writeInstinct(tempDir, updated);

      const content = readFileSync(
        join(tempDir, 'flow', 'ledger.md'),
        'utf-8'
      );
      expect(content).toContain(
        '### use-esm-mock-pattern [confidence: 0.9]'
      );
      // Should NOT contain 1.0
      expect(content).not.toContain('confidence: 1.0');
    });

    it('new instincts always start at confidence 0.3', () => {
      const instinct = sampleInstinct({ confidence: 0.8 });
      writeInstinct(tempDir, instinct);

      const content = readFileSync(
        join(tempDir, 'flow', 'ledger.md'),
        'utf-8'
      );
      expect(content).toContain('### test-instinct [confidence: 0.3]');
    });
  });

  describe('formatInstinct', () => {
    it('formats instinct as markdown matching spec', () => {
      const instinct = sampleInstinct();
      const output = formatInstinct(instinct);

      expect(output).toBe(
        [
          '### test-instinct [confidence: 0.3]',
          '**Trigger:** When testing ledger utility',
          '**Action:** Use sample instinct helper',
          '**Evidence:** Phase 3 tests confirmed this pattern',
          '**Last updated:** 2026-03-04',
        ].join('\n')
      );
    });

    it('formats confidence with one decimal place', () => {
      const instinct = sampleInstinct({ confidence: 0.5 });
      const output = formatInstinct(instinct);
      expect(output).toContain('[confidence: 0.5]');
    });
  });

  describe('ensureLedger', () => {
    it('creates ledger file with header when missing', () => {
      ensureLedger(tempDir);

      const filePath = join(tempDir, 'flow', 'ledger.md');
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('# Project Ledger');
      expect(content).toContain('## What Works');
      expect(content).toContain('## Project Quirks');
    });

    it('does not overwrite existing ledger', () => {
      mkdirSync(join(tempDir, 'flow'), { recursive: true });
      writeFileSync(join(tempDir, 'flow', 'ledger.md'), LEDGER_WITH_INSTINCTS);

      ensureLedger(tempDir);

      const content = readFileSync(
        join(tempDir, 'flow', 'ledger.md'),
        'utf-8'
      );
      expect(content).toContain('use-esm-mock-pattern');
    });

    it('creates flow directory if missing', () => {
      const nested = join(tempDir, 'nested-project');
      mkdirSync(nested);

      ensureLedger(nested);

      expect(existsSync(join(nested, 'flow', 'ledger.md'))).toBe(true);
    });
  });
});
