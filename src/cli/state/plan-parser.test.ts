/**
 * Tests for plan markdown parser
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parsePlan, parsePlanContent } from './plan-parser.js';

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'plan-flow-plan-parser-test-'));
}

describe('parsePlanContent', () => {
  it('should parse a standard plan with phases, complexity, and dependencies', () => {
    const content = `# Plan: Feature X

### Phase 1: Setup
**Complexity**: 3/10
**Dependencies**: None

- [ ] Create project structure
- [ ] Add configuration files

### Phase 2: Implementation
**Complexity**: 7/10
**Dependencies**: Phase 1

- [ ] Implement core logic
  <verify>npx tsc --noEmit src/core.ts</verify>
- [ ] Add error handling

### Phase 3: Tests
**Complexity**: 4/10
**Dependencies**: Phase 1, Phase 2

- [ ] Write unit tests
  <verify>npx jest src/core.test.ts --no-coverage</verify>
`;

    const phases = parsePlanContent(content);
    expect(phases).toHaveLength(3);

    expect(phases[0]).toEqual({
      number: 1,
      name: 'Setup',
      complexity: 3,
      dependencies: [],
      tasks: [
        { index: 1, name: 'Create project structure', verify_command: null },
        { index: 2, name: 'Add configuration files', verify_command: null },
      ],
    });

    expect(phases[1]).toEqual({
      number: 2,
      name: 'Implementation',
      complexity: 7,
      dependencies: [1],
      tasks: [
        { index: 1, name: 'Implement core logic', verify_command: 'npx tsc --noEmit src/core.ts' },
        { index: 2, name: 'Add error handling', verify_command: null },
      ],
    });

    expect(phases[2]).toEqual({
      number: 3,
      name: 'Tests',
      complexity: 4,
      dependencies: [1, 2],
      tasks: [
        { index: 1, name: 'Write unit tests', verify_command: 'npx jest src/core.test.ts --no-coverage' },
      ],
    });
  });

  it('should handle Dependencies: None', () => {
    const content = `### Phase 1: Init
**Complexity**: 2/10
**Dependencies**: None

- [ ] Do something
`;

    const phases = parsePlanContent(content);
    expect(phases[0].dependencies).toEqual([]);
  });

  it('should apply sequential fallback when dependencies are missing', () => {
    const content = `### Phase 1: First
**Complexity**: 3/10

- [ ] Task A

### Phase 2: Second
**Complexity**: 5/10

- [ ] Task B

### Phase 3: Third
**Complexity**: 4/10

- [ ] Task C
`;

    const phases = parsePlanContent(content);
    expect(phases[0].dependencies).toEqual([]);      // Phase 1 has no deps
    expect(phases[1].dependencies).toEqual([1]);      // Phase 2 depends on 1
    expect(phases[2].dependencies).toEqual([2]);      // Phase 3 depends on 2
  });

  it('should default complexity to 5 when not specified', () => {
    const content = `### Phase 1: No Complexity
**Dependencies**: None

- [ ] Task A
`;

    const phases = parsePlanContent(content);
    expect(phases[0].complexity).toBe(5);
  });

  it('should return empty array for empty content', () => {
    const phases = parsePlanContent('');
    expect(phases).toEqual([]);
  });

  it('should return empty array for content with no phases', () => {
    const content = `# Plan: Something
## Overview
This is a plan description with no phase headers.
`;

    const phases = parsePlanContent(content);
    expect(phases).toEqual([]);
  });

  it('should parse verify tags on task lines', () => {
    const content = `### Phase 1: Build
**Complexity**: 6/10
**Dependencies**: None

- [ ] Create module
  <verify>npx tsc --noEmit</verify>
- [ ] Add exports
- [ ] Write tests
  <verify>npx jest --no-coverage</verify>
`;

    const phases = parsePlanContent(content);
    expect(phases[0].tasks).toHaveLength(3);
    expect(phases[0].tasks[0]).toEqual({ index: 1, name: 'Create module', verify_command: 'npx tsc --noEmit' });
    expect(phases[0].tasks[1]).toEqual({ index: 2, name: 'Add exports', verify_command: null });
    expect(phases[0].tasks[2]).toEqual({ index: 3, name: 'Write tests', verify_command: 'npx jest --no-coverage' });
  });

  it('should handle completed task checkboxes', () => {
    const content = `### Phase 1: Done
**Complexity**: 2/10
**Dependencies**: None

- [x] Already completed task
- [ ] Pending task
`;

    const phases = parsePlanContent(content);
    expect(phases[0].tasks).toHaveLength(2);
    expect(phases[0].tasks[0]).toEqual({ index: 1, name: 'Already completed task', verify_command: null });
    expect(phases[0].tasks[1]).toEqual({ index: 2, name: 'Pending task', verify_command: null });
  });

  it('should parse multiple dependency references', () => {
    const content = `### Phase 1: A
**Dependencies**: None
- [ ] Task

### Phase 2: B
**Dependencies**: None
- [ ] Task

### Phase 3: C
**Dependencies**: Phase 1, Phase 2
- [ ] Task
`;

    const phases = parsePlanContent(content);
    expect(phases[2].dependencies).toEqual([1, 2]);
  });
});

  it('should assign 1-indexed task numbers that reset per phase', () => {
    const content = `### Phase 1: First
**Complexity**: 3/10
**Dependencies**: None

- [ ] Task A
- [ ] Task B
- [ ] Task C

### Phase 2: Second
**Complexity**: 4/10
**Dependencies**: Phase 1

- [ ] Task D
- [ ] Task E
`;

    const phases = parsePlanContent(content);
    expect(phases[0].tasks[0].index).toBe(1);
    expect(phases[0].tasks[1].index).toBe(2);
    expect(phases[0].tasks[2].index).toBe(3);
    // Task numbering resets for Phase 2
    expect(phases[1].tasks[0].index).toBe(1);
    expect(phases[1].tasks[1].index).toBe(2);
  });

  it('should assign index to single-task phases', () => {
    const content = `### Phase 1: Solo
**Complexity**: 2/10
**Dependencies**: None

- [ ] Only task
`;

    const phases = parsePlanContent(content);
    expect(phases[0].tasks).toHaveLength(1);
    expect(phases[0].tasks[0].index).toBe(1);
  });
});

describe('parsePlan (file-based)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should read and parse a plan file', () => {
    const planPath = join(tempDir, 'plan_test_v1.md');
    writeFileSync(
      planPath,
      `### Phase 1: Setup
**Complexity**: 3/10
**Dependencies**: None

- [ ] Initialize project
`,
    );

    const phases = parsePlan(planPath);
    expect(phases).toHaveLength(1);
    expect(phases[0].name).toBe('Setup');
  });
});
