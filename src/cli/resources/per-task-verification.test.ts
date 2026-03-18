/**
 * Tests for per-task verification resource files
 * Verifies that all per-task verification assets exist, are properly structured,
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

describe('Per-Task Verification: Core Resource', () => {
  const resourcePath = '.claude/resources/core/per-task-verification.md';

  it('should exist at .claude/resources/core/per-task-verification.md', () => {
    expect(existsSync(join(ROOT, resourcePath))).toBe(true);
  });

  it('should contain Purpose section', () => {
    const content = readResource(resourcePath);
    expect(content).toContain('## Purpose');
  });

  it('should contain Architecture section', () => {
    const content = readResource(resourcePath);
    expect(content).toContain('## Architecture');
  });

  it('should contain Verify Tag Syntax section', () => {
    const content = readResource(resourcePath);
    expect(content).toContain('## Verify Tag Syntax');
  });

  it('should document Debug Sub-Agent', () => {
    const content = readResource(resourcePath);
    expect(content).toMatch(/debug sub-agent/i);
  });

  it('should contain JSON schema or task_verifications return field', () => {
    const content = readResource(resourcePath);
    expect(content).toContain('task_verifications');
  });

  it('should contain Configuration section', () => {
    const content = readResource(resourcePath);
    expect(content).toContain('## Configuration');
  });

  it('should document max_verify_retries setting', () => {
    const content = readResource(resourcePath);
    expect(content).toContain('max_verify_retries');
  });

  it('should contain Error Handling section', () => {
    const content = readResource(resourcePath);
    expect(content).toMatch(/## Error Handling/i);
  });

  it('should contain Rules section', () => {
    const content = readResource(resourcePath);
    expect(content).toContain('## Rules');
  });

  it('should contain Related Files section', () => {
    const content = readResource(resourcePath);
    expect(content).toMatch(/related files/i);
  });
});

describe('Per-Task Verification: Reference Codes in _index.md', () => {
  it('should have COR-PTV-1 through COR-PTV-4 reference codes', () => {
    const content = readResource('.claude/resources/core/_index.md');
    expect(content).toContain('COR-PTV-1');
    expect(content).toContain('COR-PTV-2');
    expect(content).toContain('COR-PTV-3');
    expect(content).toContain('COR-PTV-4');
  });

  it('should reference per-task-verification.md as source', () => {
    const content = readResource('.claude/resources/core/_index.md');
    expect(content).toContain('per-task-verification.md');
  });
});

describe('Per-Task Verification: Phase Isolation Integration', () => {
  const resourcePath = '.claude/resources/core/phase-isolation.md';

  it('should contain task_verifications field documentation', () => {
    const content = readResource(resourcePath);
    expect(content).toContain('task_verifications');
  });

  it('should reference per-task verification', () => {
    const content = readResource(resourcePath);
    expect(content).toMatch(/per-task verification/i);
  });

  it('should document verify tag in sub-agent context', () => {
    const content = readResource(resourcePath);
    expect(content).toMatch(/<verify>/i);
  });
});

describe('Per-Task Verification: Plan Template Extension', () => {
  const resourcePath = '.claude/resources/patterns/plans-templates.md';

  it('should contain <verify> tag documentation', () => {
    const content = readResource(resourcePath);
    expect(content).toContain('<verify>');
  });

  it('should show verify tag syntax example', () => {
    const content = readResource(resourcePath);
    expect(content).toMatch(/<verify>.*<\/verify>/);
  });

  it('should explain verify tag purpose', () => {
    const content = readResource(resourcePath);
    expect(content).toMatch(/verification/i);
  });
});

describe('Per-Task Verification: Execute-Plan Skill', () => {
  const skillPath = '.claude/resources/skills/execute-plan-skill.md';

  it('should contain verification result processing', () => {
    const content = readResource(skillPath);
    expect(content).toContain('task_verifications');
  });

  it('should document verification summary display', () => {
    const content = readResource(skillPath);
    expect(content).toMatch(/verification summary/i);
  });

  it('should handle verification failures', () => {
    const content = readResource(skillPath);
    expect(content).toMatch(/verification fail/i);
  });

  it('should reference per-task-verification.md', () => {
    const content = readResource(skillPath);
    expect(content).toContain('per-task-verification.md');
  });
});
