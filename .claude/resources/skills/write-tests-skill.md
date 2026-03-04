
# Write Tests Skill

## Purpose

Analyze current test coverage and **iteratively write or improve tests** for each file until the target coverage percentage is achieved across all files.

This skill writes test code to achieve the specified coverage target.

---

## Tool Access

This skill uses the **full-access** agent profile. See `agent-profiles.md` [COR-AG-1] for full details.

**Quick reference**: All tools allowed. Full project read/write access for test file creation.

---

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

### Step 6: Knowledge Capture

After achieving the coverage target, capture knowledge for the project brain. See `.claude/resources/core/brain-capture.md` for file templates and index cap rules.

1. **Session file** (most recent `.md` in `flow/brain/sessions/`, or create new per-session file): Append entry with time, skill name (`write-tests`), files tested, status, and coverage achieved
2. **Feature file** (`flow/brain/features/{feature-name}.md`): If tests relate to a known feature, append Timeline entry
3. **Errors** (`flow/brain/errors/{error-name}.md`): Create for each non-trivial test framework issue encountered (e.g., ESM mocking quirks, configuration issues, flaky test patterns)
4. **Index** (`flow/brain/index.md`): Add new error entries if created. Enforce caps (5 errors, 3 decisions)
5. **Log** (`flow/log.md`): Under today's date heading (create if absent), append: `- write-tests: {scope} — {coverage}% achieved`

> **Emphasis**: Test writing often surfaces **test framework errors** (mocking issues, configuration quirks). Capture these so future test sessions avoid the same pitfalls.

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
| `.claude/resources/patterns/jest-patterns.md` | Jest testing patterns           |
| `.claude/resources/patterns/pytest-patterns.md`| Pytest testing patterns         |
| `.claude/resources/tools/jest-testing-tool.md` | Jest commands and utilities     |
| `.claude/resources/tools/pytest-testing-tool.md`| Pytest commands and utilities  |
