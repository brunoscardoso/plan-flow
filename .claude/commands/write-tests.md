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

