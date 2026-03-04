/**
 * Tests for validate command
 */

import {
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { validatePlans, validateDiscovery, validateBrain } from './validate';

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `plan-flow-validate-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe('validatePlans', () => {
  let flowDir: string;

  beforeEach(() => {
    flowDir = createTempDir();
    mkdirSync(join(flowDir, 'plans'), { recursive: true });
  });

  afterEach(() => {
    cleanup(flowDir);
  });

  it('should warn when no plans exist', () => {
    const result = validatePlans(flowDir);
    expect(result.warnings).toContain('No plan files found in flow/plans/');
    expect(result.errors).toHaveLength(0);
  });

  it('should pass for valid plan', () => {
    writeFileSync(
      join(flowDir, 'plans', 'plan_feature_v1.md'),
      [
        '# Plan: Feature',
        '',
        '## Overview',
        '',
        'A feature plan.',
        '',
        '## Phases',
        '',
        '### Phase 1: Setup',
        '',
        '**Complexity**: 3/10',
        '',
        '- [ ] Task 1',
      ].join('\n')
    );

    const result = validatePlans(flowDir);
    expect(result.errors).toHaveLength(0);
  });

  it('should error on missing required sections', () => {
    writeFileSync(
      join(flowDir, 'plans', 'plan_bad_v1.md'),
      '# Plan: Bad\n\nNo required sections here.'
    );

    const result = validatePlans(flowDir);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('missing required section'))).toBe(true);
  });

  it('should error when phases have no complexity scores', () => {
    writeFileSync(
      join(flowDir, 'plans', 'plan_no_score_v1.md'),
      [
        '# Plan',
        '',
        '## Overview',
        '',
        'A plan.',
        '',
        '## Phases',
        '',
        '### Phase 1: Setup',
        '',
        '- [ ] Task 1',
      ].join('\n')
    );

    const result = validatePlans(flowDir);
    expect(result.errors.some((e) => e.includes('no complexity scores'))).toBe(true);
  });

  it('should error on invalid complexity score', () => {
    writeFileSync(
      join(flowDir, 'plans', 'plan_invalid_v1.md'),
      [
        '# Plan',
        '',
        '## Overview',
        '',
        'A plan.',
        '',
        '## Phases',
        '',
        '### Phase 1: Setup',
        '',
        '**Complexity**: 15/10',
      ].join('\n')
    );

    const result = validatePlans(flowDir);
    expect(result.errors.some((e) => e.includes('invalid complexity score 15'))).toBe(true);
  });
});

describe('validateDiscovery', () => {
  let flowDir: string;

  beforeEach(() => {
    flowDir = createTempDir();
    mkdirSync(join(flowDir, 'discovery'), { recursive: true });
  });

  afterEach(() => {
    cleanup(flowDir);
  });

  it('should warn when no discovery files exist', () => {
    const result = validateDiscovery(flowDir);
    expect(result.warnings).toContain(
      'No discovery files found in flow/discovery/'
    );
  });

  it('should pass for valid discovery', () => {
    writeFileSync(
      join(flowDir, 'discovery', 'discovery_feature_v1.md'),
      [
        '# Discovery: Feature',
        '',
        '## Context',
        '',
        'Some context.',
        '',
        '## Requirements Gathered',
        '',
        '- FR-1: Do thing',
        '',
        '## Proposed Approach',
        '',
        'Build it.',
      ].join('\n')
    );

    const result = validateDiscovery(flowDir);
    expect(result.errors).toHaveLength(0);
  });

  it('should error on missing required sections', () => {
    writeFileSync(
      join(flowDir, 'discovery', 'discovery_bad_v1.md'),
      '# Discovery: Bad\n\nNo sections.'
    );

    const result = validateDiscovery(flowDir);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('validateBrain', () => {
  let flowDir: string;

  beforeEach(() => {
    flowDir = createTempDir();
    mkdirSync(join(flowDir, 'brain', 'features'), { recursive: true });
    mkdirSync(join(flowDir, 'brain', 'errors'), { recursive: true });
    mkdirSync(join(flowDir, 'brain', 'decisions'), { recursive: true });
    mkdirSync(join(flowDir, 'brain', 'sessions'), { recursive: true });
  });

  afterEach(() => {
    cleanup(flowDir);
  });

  it('should warn when no brain directory exists', () => {
    const emptyDir = createTempDir();
    const result = validateBrain(emptyDir);
    expect(result.warnings).toContain('No brain directory found at flow/brain/');
    cleanup(emptyDir);
  });

  it('should warn when no index exists', () => {
    const result = validateBrain(flowDir);
    expect(result.warnings).toContain(
      'Brain index not found at flow/brain/index.md'
    );
  });

  it('should pass with valid index and files', () => {
    writeFileSync(
      join(flowDir, 'brain', 'index.md'),
      '# Brain Index\n\n- [[my-feature]] [active]\n'
    );
    writeFileSync(
      join(flowDir, 'brain', 'features', 'my-feature.md'),
      '# My Feature\n'
    );

    const result = validateBrain(flowDir);
    expect(result.errors).toHaveLength(0);
    // No unresolved wiki-links
    expect(
      result.warnings.filter((w) => w.includes('does not resolve'))
    ).toHaveLength(0);
  });

  it('should warn on unresolved wiki-links', () => {
    writeFileSync(
      join(flowDir, 'brain', 'index.md'),
      '# Brain Index\n\n- [[missing-feature]] [active]\n'
    );

    const result = validateBrain(flowDir);
    expect(
      result.warnings.some((w) =>
        w.includes('wiki-link [[missing-feature]] does not resolve')
      )
    ).toBe(true);
  });

  it('should warn on orphaned brain entries', () => {
    writeFileSync(
      join(flowDir, 'brain', 'index.md'),
      '# Brain Index\n'
    );
    writeFileSync(
      join(flowDir, 'brain', 'features', 'orphan.md'),
      '# Orphan\n'
    );

    const result = validateBrain(flowDir);
    expect(
      result.warnings.some((w) => w.includes('Orphaned brain entry'))
    ).toBe(true);
  });
});
