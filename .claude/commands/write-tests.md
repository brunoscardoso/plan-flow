---
description: This command takes a minimum coverage percentage as input and orchestrates the test writing process 
---

# Write Tests - Coverage Improvement Command

## Command Description

This command takes a minimum coverage percentage as input and orchestrates the test writing process by invoking the `write-tests` skill to achieve the target coverage across all files.

**Output**: Creates/updates test files to achieve the specified coverage percentage.

---


## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/write-tests - Write Tests for Coverage Target

DESCRIPTION:
  Analyzes current test coverage and iteratively writes or improves tests
  until the target coverage percentage is achieved across all files.

USAGE:
  /write-tests <coverage_percentage>
  /write-tests -help

ARGUMENTS:
  coverage_percentage   Target minimum coverage (e.g., 80, 90, 100)

EXAMPLES:
  /write-tests 80                    # Achieve 80% coverage
  /write-tests 95                    # Achieve 95% coverage
  /write-tests 100                   # Achieve 100% coverage

OUTPUT:
  - Creates/updates test files
  - Achieves target coverage across all metrics

WORKFLOW:
  1. Runs initial coverage analysis
  2. Creates work queue (lowest coverage first)
  3. For each file below target:
     - Analyzes source code
     - Identifies untested paths
     - Writes/improves tests
     - Verifies coverage improved
  4. Final verification of all metrics

COVERAGE METRICS (all must meet target):
  - Lines       Most important metric
  - Branches    All conditional paths
  - Functions   All exported functions
  - Statements  Usually follows lines

SUPPORTED FRAMEWORKS:
  - Jest (JavaScript/TypeScript)
  - Pytest (Python)

RECOMMENDED MODEL:
  Claude Opus 4.6 or Sonnet 4.5 for best results

RELATED COMMANDS:
  /execute-plan   Tests are the last phase of plan execution
```

---

## Critical Rules

| Rule                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| **Complete and Stop**    | After presenting results, STOP and wait for user         |

---

## Instructions

### Step 1: Validate Inputs

| Input                 | Required | Description                                     |
| --------------------- | -------- | ----------------------------------------------- |
| `coverage_percentage` | Yes      | Target minimum coverage (e.g., 80, 90, 100)     |

**Validation**:
- Must be a number between 1 and 100
- If invalid, ask for valid coverage percentage

---

### Step 2: Detect Testing Framework

Identify the testing framework:

| Framework | Detection                                     |
| --------- | --------------------------------------------- |
| Jest      | `jest.config.js`, `package.json` with jest    |
| Pytest    | `pytest.ini`, `pyproject.toml`, `conftest.py` |

If unable to detect, ask user which framework to use.

---

### Step 3: Invoke Write Tests Skill

The skill will:

1. Run initial coverage analysis
2. Create work queue (lowest coverage first)
3. For each file below target:
   - Analyze source code
   - Identify untested paths
   - Write/improve tests
   - Verify coverage improved
4. Run final verification

See: `.claude/resources/skills/write-tests-skill.md`

---

### Step 4: Present Results

After the skill completes, present summary:

```markdown
Coverage Target Achieved!

**Target**: [X]%
**Final Coverage**: [Y]%

**Summary**:
- X files updated
- Y new test files created
- Z tests added

All metrics (Lines, Branches, Functions, Statements) meet the target.
```

**CRITICAL**: This command is now complete. STOP and wait for the user.

---

## Flow Diagram

```
+------------------------------------------+
|         /write-tests COMMAND             |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 1: Validate Inputs                  |
| - Check coverage percentage is valid     |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 2: Detect Testing Framework         |
| - Jest or Pytest                         |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 3: Invoke Write Tests Skill         |
| - Skill handles all test writing logic   |
| - See write-tests-skill.md              |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 4: Present Results                  |
| - Show coverage summary                  |
| - Confirm all metrics met                |
+------------------------------------------+
```

---

## Coverage Priorities

1. **Lines**: Most important
2. **Branches**: Cover all conditional paths
3. **Functions**: Ensure all exported functions are tested
4. **Statements**: Usually follows lines coverage

---

## Example Usage

**User**: `/write-tests 80`

**Execution**:

1. Validate input: 80% is valid
2. Detect framework: Jest (found jest.config.js)
3. Invoke write-tests skill
4. Present final coverage summary

---

## Context Optimization

This command uses hierarchical context loading to reduce context consumption. Instead of loading full files, load indexes first and expand specific sections on-demand.

### Recommended Loading Order

1. **Always load first**: This command file (`commands/write-tests.md`)
2. **Load indexes**: Load `_index.md` files for relevant folders
3. **Expand on-demand**: Use reference codes to load specific sections when needed

### Index Files for Writing Tests

| Index | When to Load |
|-------|--------------|
| `resources/skills/_index.md` | To understand test writing workflow |
| `resources/patterns/_index.md` | For testing patterns |
| `resources/tools/_index.md` | For testing tool commands |

### Reference Codes for Writing Tests

| Code | Description | When to Expand |
|------|-------------|----------------|
| SKL-TEST-1 | Write tests skill workflow | Understanding full process |
| PTN-JEST-1 | Jest test structure | Writing Jest tests |
| PTN-JEST-2 | Jest mocking patterns | When mocking is needed |
| PTN-PYTEST-1 | Pytest test structure | Writing Pytest tests |
| PTN-PYTEST-2 | Pytest fixtures | When fixtures are needed |
| TLS-JEST-1 | Jest commands | Running Jest tests |
| TLS-PYTEST-1 | Pytest commands | Running Pytest tests |

### Expansion Instructions

When executing this command:

1. **Start with indexes**: Read `resources/skills/_index.md` and `resources/patterns/_index.md`
2. **Detect framework first**: Determine Jest or Pytest before expanding patterns
3. **Expand framework-specific**: Only load PTN-JEST-* or PTN-PYTEST-*, not both
4. **Expand tool commands**: Load TLS-JEST-* or TLS-PYTEST-* for running tests
5. **Don't expand everything**: Only load patterns relevant to detected framework

---

## Related Resources

| Resource                  | Purpose                         |
| ------------------------- | ------------------------------- |
| `resources/skills/_index.md` | Index of skills with reference codes |
| `resources/patterns/_index.md` | Index of patterns with reference codes |
| `resources/tools/_index.md`  | Index of tools with reference codes |
| `write-tests-skill.md`   | Skill that writes the tests     |
| `jest-patterns.md`       | Jest testing patterns           |
| `pytest-patterns.md`     | Pytest testing patterns         |
| `jest-testing-tool.md`   | Jest commands and utilities     |
| `pytest-testing-tool.md` | Pytest commands and utilities   |
| `/execute-plan` command   | Tests are last phase of plans   |

---

# Implementation Details


## Inputs

| Input               | Required | Description                                      |
| ------------------- | -------- | ------------------------------------------------ |
| `target_coverage`   | Yes      | Minimum coverage percentage (e.g., 80, 90, 100)  |
| `framework`         | Optional | Testing framework (Jest or Pytest, auto-detected)|
| `specific_files`    | Optional | Specific files to focus on                       |

---

## Workflow

### Step 1: Detect Testing Framework

Identify the testing framework based on project files:

| Framework | Detection                                     |
| --------- | --------------------------------------------- |
| Jest      | `jest.config.js`, `package.json` with jest    |
| Pytest    | `pytest.ini`, `pyproject.toml`, `conftest.py` |

Load the appropriate patterns:
- Jest: `.claude/resources/patterns/jest-patterns.md`
- Pytest: `.claude/resources/patterns/pytest-patterns.md`

---

### Step 2: Run Initial Coverage Analysis

Run the coverage command:

**Jest**:
```bash
npm run test -- --coverage
```

**Pytest**:
```bash
pytest --cov=src --cov-report=term-missing
```

Parse the results to identify:
- Current coverage per file
- Files below target
- Uncovered lines/branches

---

### Step 3: Create Work Queue

Sort files by coverage (lowest first):

```markdown
## Coverage Work Queue

| File                        | Current | Target | Gap  | Priority |
| --------------------------- | ------- | ------ | ---- | -------- |
| src/services/userService.ts | 45%     | 80%    | 35%  | 1        |
| src/utils/validation.ts     | 60%     | 80%    | 20%  | 2        |
| src/components/Button.tsx   | 75%     | 80%    | 5%   | 3        |
```

---

### Step 4: For Each File Below Target

For each file in the work queue:

#### 4.1: Analyze Source File

1. Read the source file
2. Identify all functions/methods
3. Check existing tests (if any)
4. Identify uncovered code paths:
   - Uncovered functions
   - Uncovered branches (if/else, switch)
   - Error handling paths
   - Edge cases

#### 4.2: Write/Improve Tests

1. Create test file if missing
2. Add tests for uncovered lines
3. Follow testing patterns from patterns file

**Test File Naming**:
- Jest: `*.test.ts`, `*.spec.ts`
- Pytest: `test_*.py`, `*_test.py`

**Test Structure**:

```typescript
// Jest example
describe('FunctionName', () => {
  describe('when condition', () => {
    it('should expected behavior', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

```python
# Pytest example
class TestFunctionName:
    def test_when_condition_should_expected_behavior(self):
        # Arrange
        # Act
        # Assert
```

#### 4.3: Verify File Coverage

After writing tests, run coverage for the specific file:

**Jest**:
```bash
npm run test -- --coverage --collectCoverageFrom="src/path/file.ts"
```

**Pytest**:
```bash
pytest tests/test_file.py --cov=src/module --cov-report=term-missing
```

**CRITICAL**: ALL metrics must meet target:
- Lines
- Statements
- Branches
- Functions

If not met, continue adding tests until all metrics pass.

---

### Step 5: Final Verification

After all files are processed, run full coverage:

**Jest**:
```bash
npm run test -- --coverage
```

**Pytest**:
```bash
pytest --cov=src --cov-report=term-missing
```

Verify all files meet the target coverage.

---

## Coverage Metrics Priority

1. **Lines**: Most important metric
2. **Branches**: Cover all conditional paths (if/else, ternary, switch)
3. **Functions**: Ensure all exported functions are tested
4. **Statements**: Usually follows lines coverage

---

## Test Writing Guidelines

### What to Test

| Priority | What to Test                    | Why                              |
| -------- | ------------------------------- | -------------------------------- |
| High     | Public API / Exported functions | Contract with consumers          |
| High     | Error handling paths            | Critical for reliability         |
| High     | Edge cases                      | Often source of bugs             |
| Medium   | Happy path scenarios            | Basic functionality              |
| Medium   | Boundary conditions             | Off-by-one errors                |
| Low      | Private helper functions        | Tested via public API            |

### Test Quality Checklist

- [ ] Tests are independent (no shared state)
- [ ] Tests have clear names describing behavior
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] Mocks are minimal and focused
- [ ] Edge cases are covered
- [ ] Error scenarios are tested

---

## Handling Common Patterns

### Async Functions

```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});
```

### Error Throwing

```typescript
it('should throw error for invalid input', () => {
  expect(() => functionWithValidation(null)).toThrow('Invalid input');
});
```

### Mocking Dependencies

```typescript
jest.mock('./dependency', () => ({
  dependencyFunction: jest.fn().mockReturnValue('mocked'),
}));
```

---

## Output Format

Present progress after each file:

```markdown
## Test Progress: [file_path]

**Before**: 45% coverage
**After**: 82% coverage

**Tests Added**:
- test_when_valid_input_returns_result
- test_when_invalid_input_throws_error
- test_edge_case_empty_string

**Metrics**:
| Metric     | Before | After  | Target | Status |
| ---------- | ------ | ------ | ------ | ------ |
| Lines      | 45%    | 82%    | 80%    | Pass   |
| Branches   | 30%    | 80%    | 80%    | Pass   |
| Functions  | 50%    | 100%   | 80%    | Pass   |
| Statements | 45%    | 82%    | 80%    | Pass   |
```

---

## Final Report

After completion, present summary:

```markdown
## Coverage Target Achieved!

**Target**: [X]%
**Final Coverage**: [Y]%

### Files Updated:

| File                        | Before | After  |
| --------------------------- | ------ | ------ |
| src/services/userService.ts | 45%    | 85%    |
| src/utils/validation.ts     | 60%    | 92%    |

### Tests Created/Updated:

- Created: X new test files
- Updated: Y existing test files
- Total tests added: Z

All metrics meet or exceed the target coverage.
```

---

## Related Files

| File                                        | Purpose                         |
| ------------------------------------------- | ------------------------------- |
| `.claude/resources/patterns/jest-patterns.md`  | Jest testing patterns           |
| `.claude/resources/patterns/pytest-patterns.md`| Pytest testing patterns         |
| `.claude/resources/tools/jest-testing-tool.md` | Jest commands and utilities     |
| `.claude/resources/tools/pytest-testing-tool.md`| Pytest commands and utilities  |
