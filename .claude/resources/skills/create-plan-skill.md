
# Create Plan Skill

## Purpose

Create a structured **implementation plan** with phases, complexity scores, and tasks based on a discovery document or user requirements.

This skill **only produces a markdown file** in `flow/plans/`. It does NOT:

- Write any code
- Execute any implementation
- Modify source files
- Run build or test commands

---

## Restrictions - PLANNING ONLY

This skill is **strictly for creating plan documents**. The process:

1. **Reads** the discovery document or gathers requirements
2. **Analyzes** complexity and scope
3. **Structures** phases with complexity scores
4. **Analyzes** phase independence for parallel execution
5. **Generates** verify sections for applicable tasks
6. **Generates** a plan markdown file

**No code, no implementation, no source file modifications.**

### NEVER Do These Actions

| Forbidden Action                    | Reason                           |
| ----------------------------------- | -------------------------------- |
| Create/edit source code files       | Planning only, no implementation |
| Write implementation code           | Plans describe what, not how     |
| Execute any plan phases             | Use /execute-plan for that       |
| Run build or test commands          | No execution commands            |
| Create files outside `flow/plans/`  | Only write plan documents        |

### Allowed Actions

| Allowed Action                         | Purpose                           |
| -------------------------------------- | --------------------------------- |
| Read discovery documents               | Extract requirements              |
| Read any project file                  | Understand existing codebase      |
| Search codebase (grep, glob, semantic) | Find existing patterns            |
| Write to `flow/plans/`                 | Save plan document                |
| Read project rule files                | Understand patterns to follow     |

> **Important**: The ONLY writable location is `flow/plans/`. No source code or other files should be modified.

---

## Inputs

| Input                | Required | Description                                        |
| -------------------- | -------- | -------------------------------------------------- |
| `discovery_document` | **Required** | Path to discovery document. Plans cannot be created without one. |
| `feature_name`       | Yes      | Name of the feature to plan                        |
| `requirements`       | Optional | Direct requirements if no discovery document       |
| `version`            | Optional | Version number (auto-incremented if not provided)  |

---

## Workflow

### Step 1: Validate Discovery Document (HARD BLOCK)

**A discovery document is REQUIRED. No exceptions.**

1. Check if a discovery document was provided or exists in `flow/discovery/`
2. **If NO discovery document exists**: **STOP immediately.** Do NOT create a plan. Inform the user that discovery is required and run `/discovery-plan` first.
3. **If discovery document exists**: Read it and extract:
   - Feature name, description, goals
   - FR, NFR, Constraints
   - Risks identified

---

### Step 2: Analyze Scope and Complexity

Based on extracted requirements:

1. Identify the major components/areas of work
2. Group related tasks into logical phases
3. Estimate complexity for each phase using `.claude/resources/core/complexity-scoring.md`

---

### Step 3: Structure Phases

Create phases following these guidelines:

**Phase Structure**:

```markdown
### Phase X: [Phase Name]

**Scope**: [What this phase covers]
**Complexity**: X/10
**Dependencies**: [None | Phase N, Phase M | omit for sequential default]

- [ ] Task 1
  <verify>npx tsc --noEmit src/path/to/file.ts</verify>
- [ ] Task 2

**Build Verification**: Run `npm run build`
```

**Standard Phase Order**:

1. Types and Schemas (usually low complexity)
2. Backend/API Implementation
3. Store/State Management
4. UI Components
5. Integration
6. Tests (ALWAYS last)

**Complexity Scoring** (per `.claude/resources/core/complexity-scoring.md`):

| Score | Level     | Description                      |
| ----- | --------- | -------------------------------- |
| 0-2   | Trivial   | Simple, mechanical changes       |
| 3-4   | Low       | Straightforward implementation   |
| 5-6   | Medium    | Moderate effort, some decisions  |
| 7-8   | High      | Complex, multiple considerations |
| 9-10  | Very High | Significant complexity/risk      |

#### Auto-Generating Verify Sections

When creating tasks within phases, auto-generate `<verify>` tags based on the task type using these heuristics:

| Task Type | Verify Command | When to Apply |
|-----------|---------------|---------------|
| File creation (`.ts`, `.tsx`) | `npx tsc --noEmit <file>` | Task creates or modifies a TypeScript source file |
| Test writing | `npx jest <test-file> --no-coverage` | Task creates or modifies a test file |
| Schema/type definition | `npx tsc --noEmit <type-file>` | Task creates or modifies type definitions or schemas |
| Config file changes | No verify | Task modifies `.flowconfig`, `tsconfig.json`, or similar config files |
| Documentation/markdown | No verify | Task creates or updates `.md` files |
| Generic/ambiguous tasks | No verify | Task description does not clearly indicate a verifiable output file |

**Rules for auto-generation:**

1. Only generate `<verify>` when the task clearly references a specific file path
2. Use the file path from the task description in the verify command
3. Prefer `npx tsc --noEmit` for source files and `npx jest --no-coverage` for test files
4. When in doubt, omit the `<verify>` tag — false verification commands are worse than no verification
5. Never generate full-build commands (`npm run build`) as verify tags — those belong in Build Verification

---

### Step 4: Analyze Phase Dependencies

After structuring phases, analyze which phases are independent and can run in parallel:

1. **For each phase**, determine its data and code dependencies on other phases:
   - Does this phase use types/interfaces defined in another phase?
   - Does this phase call functions or APIs created in another phase?
   - Does this phase modify files that another phase also modifies?

2. **Mark independent phases** with `**Dependencies**: None` when they:
   - Only depend on pre-existing code (not created in this plan)
   - Have no shared file modifications with other phases in the same wave
   - Can be implemented and verified independently

3. **Mark dependent phases** with explicit dependency lists:
   - `**Dependencies**: Phase 1` — depends on one phase
   - `**Dependencies**: Phase 1, Phase 3` — depends on multiple phases
   - List only **direct** dependencies (not transitive ones)

4. **Default to sequential** (omit the field) when:
   - Unsure whether phases are truly independent
   - Phases touch overlapping files
   - The dependency relationship is ambiguous

5. **Tests phase**: Always list ALL prior phases as dependencies. The Tests phase is never parallelized.

**Common independence patterns**:
- Types/schemas phase is often `Dependencies: None` (foundational, no prior phases needed)
- Backend API and CLI commands may be independent if they don't share code
- Store and UI phases often depend on types but may be independent of each other
- Integration phases typically depend on multiple prior phases

---

### Step 5: Add Key Changes Summary

Document the most important modifications:

```markdown
## Key Changes

1. **[Category]**: [Description of change]
2. **[Category]**: [Description of change]
```

---

### Step 6: Generate Plan Document

Create the plan markdown file:

**Location**: `flow/plans/plan_<feature_name>_v<version>.md`

**Use Template**: See `.claude/resources/patterns/plans-templates.md`

**Required Sections**:

1. Overview (with discovery document reference)
2. Goals
3. Non-Goals
4. Requirements Summary (FR, NFR, Constraints)
5. Risks
6. Phases (with complexity scores and optional dependency declarations)
7. Key Changes

---

## Output Format

The plan document should follow the template in `.claude/resources/patterns/plans-templates.md`.

**Naming Convention**: `plan_<feature_name>_v<version>.md`

**Examples**:
- `plan_user_authentication_v1.md`
- `plan_dark_mode_v2.md`

---

## Plan Template

```markdown
# Plan: [Feature Name]

**Project**: [[{project-name}]]

## Overview

[Brief description of the feature and its purpose]

**Based on Discovery**: `flow/discovery/discovery_<feature>_v1.md` (or "Discovery skipped")

## Goals

- [Goal 1]
- [Goal 2]

## Non-Goals

- [What this plan explicitly does NOT cover]

## Requirements Summary

### Functional Requirements

- [FR-1]: [Description]

### Non-Functional Requirements

- [NFR-1]: [Description]

### Constraints

- [C-1]: [Description]

## Risks

| Risk     | Impact          | Mitigation            |
| -------- | --------------- | --------------------- |
| [Risk 1] | High/Medium/Low | [Mitigation strategy] |

## Phases

### Phase 1: [Phase Name]

**Scope**: [What this phase covers]
**Complexity**: X/10
**Dependencies**: None

- [ ] Task 1
  <verify>npx tsc --noEmit src/path/to/file.ts</verify>
- [ ] Task 2

**Build Verification**: Run `npm run build`

### Phase N: Tests (Final)

**Scope**: Write comprehensive tests
**Complexity**: X/10
**Dependencies**: Phase 1, Phase 2, ..., Phase N-1

- [ ] Unit tests
  <verify>npx jest src/path/to/test.ts --no-coverage</verify>
- [ ] Integration tests

**Build Verification**: Run `npm run build && npm run test`

## Key Changes

1. **[Category]**: [Description]
```

---

## Validation Checklist

Before completing the plan, verify:

- [ ] Plan is saved in `flow/plans/` folder
- [ ] File uses snake_case naming: `plan_<feature>_v<version>.md`
- [ ] All phases have complexity scores (X/10)
- [ ] Phase dependencies are analyzed and declared where appropriate
- [ ] Tests are the LAST phase with dependencies on ALL prior phases
- [ ] Key Changes section is populated
- [ ] Discovery document is referenced (discovery is required, never skipped)
- [ ] Verify sections are generated for applicable tasks (file creation, test writing, schema/type tasks)
- [ ] Verify sections are omitted for config, documentation, and generic tasks
- [ ] **NO implementation code is included**
- [ ] **NO source files were created or modified**

---

## Related Files

| File                                           | Purpose                          |
| ---------------------------------------------- | -------------------------------- |
| `.claude/resources/patterns/plans-patterns.md`  | Rules and patterns for plans     |
| `.claude/resources/patterns/plans-templates.md` | Plan templates                   |
| `.claude/resources/core/complexity-scoring.md`      | Complexity scoring system        |
| `flow/plans/`                                  | Output folder for plan documents |
| `flow/discovery/`                              | Input discovery documents        |
