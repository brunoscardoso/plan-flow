/**
 * Tests for wave-based parallel execution resource files
 * Verifies that all wave execution assets exist, are properly structured,
 * and reference codes are valid.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Package root is 3 levels up from src/cli/resources/
const currentDir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(currentDir, '..', '..', '..');

function readResource(relativePath: string): string {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Resource file not found: ${relativePath}`);
  }
  return readFileSync(fullPath, 'utf-8');
}

describe('Wave Execution: Core Resource', () => {
  const resourcePath = '.claude/resources/core/wave-execution.md';

  it('should exist at .claude/resources/core/wave-execution.md', () => {
    expect(existsSync(join(ROOT, resourcePath))).toBe(true);
  });

  it('should contain required sections', () => {
    const content = readResource(resourcePath);

    expect(content).toContain('## Purpose');
    expect(content).toContain('## Architecture');
    expect(content).toContain('## Dependency Analysis');
    expect(content).toContain('## Wave Grouping');
  });

  it('should document file conflict detection', () => {
    const content = readResource(resourcePath);
    expect(content).toMatch(/file.?conflict/i);
  });

  it('should document failure handling', () => {
    const content = readResource(resourcePath);
    expect(content).toMatch(/failure/i);
  });

  it('should reference flowconfig wave_execution setting', () => {
    const content = readResource(resourcePath);
    expect(content).toContain('wave_execution');
  });
});

describe('Wave Execution: Reference Codes in _index.md', () => {
  it('should have COR-WAVE reference codes', () => {
    const content = readResource('.claude/resources/core/_index.md');
    expect(content).toContain('COR-WAVE-1');
    expect(content).toContain('COR-WAVE-2');
    expect(content).toContain('COR-WAVE-3');
    expect(content).toContain('COR-WAVE-4');
    expect(content).toContain('COR-WAVE-5');
  });

  it('should reference wave-execution.md as source', () => {
    const content = readResource('.claude/resources/core/_index.md');
    expect(content).toContain('wave-execution.md');
  });
});

describe('Wave Execution: Plan Template Dependencies Field', () => {
  it('should include Dependencies field in plan template', () => {
    const content = readResource('.claude/resources/patterns/plans-templates.md');
    expect(content).toContain('**Dependencies**');
  });

  it('should document Dependencies: None syntax', () => {
    const content = readResource('.claude/resources/patterns/plans-templates.md');
    expect(content).toMatch(/Dependencies.*None/i);
  });
});

describe('Wave Execution: Plan Patterns', () => {
  it('should include dependency declaration pattern', () => {
    const content = readResource('.claude/resources/patterns/plans-patterns.md');
    expect(content).toMatch(/depend/i);
  });
});

describe('Wave Execution: Execute-Plan Skill', () => {
  const skillPath = '.claude/resources/skills/execute-plan-skill.md';

  it('should include Step 2b for wave analysis', () => {
    const content = readResource(skillPath);
    expect(content).toContain('Step 2b');
    expect(content).toMatch(/wave.*analysis/i);
  });

  it('should include wave mode in Step 4', () => {
    const content = readResource(skillPath);
    expect(content).toMatch(/wave.*mode/i);
  });

  it('should include sequential fallback', () => {
    const content = readResource(skillPath);
    expect(content).toMatch(/sequential/i);
  });

  it('should reference wave-execution.md', () => {
    const content = readResource(skillPath);
    expect(content).toContain('wave-execution.md');
  });
});

describe('Wave Execution: Skills Index', () => {
  it('should mention wave execution in execute-plan entries', () => {
    const content = readResource('.claude/resources/skills/_index.md');
    expect(content).toMatch(/wave/i);
  });
});

describe('Wave Execution: Phase Isolation', () => {
  it('should include wave mode section', () => {
    const content = readResource('.claude/resources/core/phase-isolation.md');
    expect(content).toMatch(/wave.*mode/i);
  });

  it('should document parallel phase spawning', () => {
    const content = readResource('.claude/resources/core/phase-isolation.md');
    expect(content).toMatch(/parallel/i);
  });
});

describe('Wave Execution: CLAUDE.md', () => {
  it('should mention wave execution in documentation', () => {
    const content = readResource('CLAUDE.md');
    expect(content).toMatch(/wave/i);
  });

  it('should mention wave_execution config key', () => {
    const content = readResource('CLAUDE.md');
    expect(content).toContain('wave_execution');
  });
});

describe('Wave Execution: .flowconfig', () => {
  it('should include wave_execution setting', () => {
    const content = readResource('flow/.flowconfig');
    expect(content).toContain('wave_execution');
  });
});

describe('Wave Execution: Execute-Plan Command', () => {
  it('should mention wave execution', () => {
    const content = readResource('.claude/commands/execute-plan.md');
    expect(content).toMatch(/wave/i);
  });

  it('should include COR-WAVE reference codes', () => {
    const content = readResource('.claude/commands/execute-plan.md');
    expect(content).toContain('COR-WAVE');
  });
});
