
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
4. **Generates** a plan markdown file

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

- [ ] Task 1
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

---

### Step 4: Add Key Changes Summary

Document the most important modifications:

```markdown
## Key Changes

1. **[Category]**: [Description of change]
2. **[Category]**: [Description of change]
```

---

### Step 5: Generate Plan Document

Create the plan markdown file:

**Location**: `flow/plans/plan_<feature_name>_v<version>.md`

**Use Template**: See `.claude/resources/patterns/plans-templates.md`

**Required Sections**:

1. Overview (with discovery document reference)
2. Goals
3. Non-Goals
4. Requirements Summary (FR, NFR, Constraints)
5. Risks
6. Phases (with complexity scores)
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

- [ ] Task 1
- [ ] Task 2

**Build Verification**: Run `npm run build`

### Phase N: Tests (Final)

**Scope**: Write comprehensive tests
**Complexity**: X/10

- [ ] Unit tests
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
- [ ] Tests are the LAST phase
- [ ] Key Changes section is populated
- [ ] Discovery document is referenced (discovery is required, never skipped)
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
