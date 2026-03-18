/**
 * Tests for STATE.md parser
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseStateMd, parseStateMdContent } from './state-md-parser.js';

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'plan-flow-state-md-test-'));
}

const FULL_STATE_MD = `# Session State

**Updated**: 2026-03-18T14:30:00.000Z

## Execution State
- **Active Skill**: execute-plan
- **Active Plan**: flow/plans/plan_user_auth_v1.md
- **Current Phase**: 3 — API Integration
- **Current Task**: Create API route handler
- **Completed Phases**:
  - Phase 1: Types and Schemas — done
  - Phase 2: Backend Setup — done with warnings

## Decisions
- Chose JWT over sessions (reason: discovery DR-4 specified stateless auth)
- Used Zod for validation (reason: consistent with existing codebase pattern)

## Blockers
- Missing @auth/core dependency (status: resolved, tried: installed via npm)
- CI pipeline timeout (status: open, tried: increased timeout to 10m)

## Files Modified
- src/types/auth.ts
- src/api/routes.ts
- src/utils/helpers.ts

## Next Action
Continue with Phase 3, Task 2: Add rate limiting to API routes
`;

describe('parseStateMd', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return null when STATE.md does not exist', () => {
    const result = parseStateMd(tempDir);
    expect(result).toBeNull();
  });

  it('should parse a valid STATE.md file', () => {
    writeFileSync(join(tempDir, 'STATE.md'), FULL_STATE_MD);
    const result = parseStateMd(tempDir);
    expect(result).not.toBeNull();
    expect(result!.active_skill).toBe('execute-plan');
  });
});

describe('parseStateMdContent', () => {
  it('should parse all sections from a full STATE.md', () => {
    const result = parseStateMdContent(FULL_STATE_MD);

    expect(result.updated_at).toBe('2026-03-18T14:30:00.000Z');
    expect(result.active_skill).toBe('execute-plan');
    expect(result.active_plan).toBe('flow/plans/plan_user_auth_v1.md');
    expect(result.current_phase).toEqual({ number: 3, name: 'API Integration' });
    expect(result.current_task).toBe('Create API route handler');
    expect(result.next_action).toBe('Continue with Phase 3, Task 2: Add rate limiting to API routes');
  });

  it('should parse completed phases', () => {
    const result = parseStateMdContent(FULL_STATE_MD);

    expect(result.completed_phases).toHaveLength(2);
    expect(result.completed_phases[0]).toEqual({
      number: 1,
      name: 'Types and Schemas',
      outcome: 'done',
    });
    expect(result.completed_phases[1]).toEqual({
      number: 2,
      name: 'Backend Setup',
      outcome: 'done with warnings',
    });
  });

  it('should parse decisions with reason', () => {
    const result = parseStateMdContent(FULL_STATE_MD);

    expect(result.decisions).toHaveLength(2);
    expect(result.decisions[0].decision).toBe('Chose JWT over sessions');
    expect(result.decisions[0].reason).toBe('discovery DR-4 specified stateless auth');
    expect(result.decisions[1].decision).toBe('Used Zod for validation');
    expect(result.decisions[1].reason).toBe('consistent with existing codebase pattern');
  });

  it('should parse blockers with status and tried', () => {
    const result = parseStateMdContent(FULL_STATE_MD);

    expect(result.blockers).toHaveLength(2);
    expect(result.blockers[0]).toEqual({
      issue: 'Missing @auth/core dependency',
      status: 'resolved',
      tried: 'installed via npm',
    });
    expect(result.blockers[1]).toEqual({
      issue: 'CI pipeline timeout',
      status: 'open',
      tried: 'increased timeout to 10m',
    });
  });

  it('should parse files modified', () => {
    const result = parseStateMdContent(FULL_STATE_MD);

    expect(result.files_modified).toEqual([
      'src/types/auth.ts',
      'src/api/routes.ts',
      'src/utils/helpers.ts',
    ]);
  });

  it('should handle empty STATE.md content', () => {
    const result = parseStateMdContent('');

    expect(result.active_skill).toBeNull();
    expect(result.active_plan).toBeNull();
    expect(result.current_phase).toBeNull();
    expect(result.current_task).toBeNull();
    expect(result.completed_phases).toEqual([]);
    expect(result.decisions).toEqual([]);
    expect(result.blockers).toEqual([]);
    expect(result.files_modified).toEqual([]);
    expect(result.next_action).toBeNull();
    expect(result.updated_at).toBeNull();
  });

  it('should handle STATE.md with only header and timestamp', () => {
    const content = `# Session State

**Updated**: 2026-03-18T10:00:00.000Z

## Execution State
- **Active Skill**: discovery-plan
`;
    const result = parseStateMdContent(content);

    expect(result.updated_at).toBe('2026-03-18T10:00:00.000Z');
    expect(result.active_skill).toBe('discovery-plan');
    expect(result.active_plan).toBeNull();
    expect(result.completed_phases).toEqual([]);
    expect(result.decisions).toEqual([]);
  });

  it('should handle decisions without reason format', () => {
    const content = `# Session State

## Decisions
- Simple decision without reason format
`;
    const result = parseStateMdContent(content);

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].decision).toBe('Simple decision without reason format');
    expect(result.decisions[0].reason).toBe('');
  });

  it('should handle blockers without status/tried format', () => {
    const content = `# Session State

## Blockers
- Some issue without structured format
`;
    const result = parseStateMdContent(content);

    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0].issue).toBe('Some issue without structured format');
    expect(result.blockers[0].status).toBe('unknown');
    expect(result.blockers[0].tried).toBe('');
  });

  it('should handle missing sections gracefully', () => {
    const content = `# Session State

**Updated**: 2026-03-18T10:00:00.000Z

## Execution State
- **Active Skill**: review-code

## Next Action
Review the auth module changes
`;
    const result = parseStateMdContent(content);

    expect(result.active_skill).toBe('review-code');
    expect(result.decisions).toEqual([]);
    expect(result.blockers).toEqual([]);
    expect(result.files_modified).toEqual([]);
    expect(result.next_action).toBe('Review the auth module changes');
  });

  it('should handle STATE.md with no completed phases', () => {
    const content = `# Session State

## Execution State
- **Active Skill**: execute-plan
- **Active Plan**: flow/plans/plan_feature_v1.md
- **Current Phase**: 1 — Setup Types
- **Current Task**: Create type definitions
- **Completed Phases**:

## Next Action
Implement type definitions in src/types/
`;
    const result = parseStateMdContent(content);

    expect(result.active_skill).toBe('execute-plan');
    expect(result.current_phase).toEqual({ number: 1, name: 'Setup Types' });
    expect(result.completed_phases).toEqual([]);
  });
});
