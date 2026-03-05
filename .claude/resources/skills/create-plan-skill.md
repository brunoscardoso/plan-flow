
# Create Plan Skill

## Purpose

Create a structured **implementation plan** with phases, complexity scores, and tasks based on a discovery document or user requirements.

This skill **only produces a markdown file** in `flow/plans/`. It does NOT:

- Write any code
- Execute any implementation
- Modify source files
- Run build or test commands

---

## Tool Access

This skill uses the **read-only** agent profile. See `agent-profiles.md` [COR-AG-1] for full details.

**Quick reference**: Read/Grep/Glob/WebSearch allowed. Edit/Write/Bash(write) forbidden. Output to `flow/plans/` only (plus `flow/brain/` and `flow/log.md` for knowledge capture).

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
**Model**: [Haiku/Sonnet/Opus] (recommended)

- [ ] Task 1
- [ ] Task 2

**Build Verification**: Run the project's build command (see `tech-detection.md`)
```

**Model Routing**: Assign recommended models per phase based on complexity (see `.claude/resources/core/complexity-scoring.md` Model Routing section). This is advisory — 0-4 → Haiku, 5-7 → Sonnet, 8-10 → Opus.

**Evals**: Generate 1-5 testable eval assertions per phase based on the phase's requirements. Link AC- acceptance criteria from the discovery document to phase evals where applicable. See `.claude/resources/patterns/plans-templates.md` (Eval Format section) for the format.

- **Skip evals** for trivial phases (complexity <= 2) and the Tests phase
- Each eval must be a concrete, verifiable assertion (no vague "works correctly" evals)
- Higher complexity phases should have more evals (3-5 for complexity 7+)
- If a discovery AC- maps to a specific phase, include it as an eval

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

### Step 6: Knowledge Capture

After completing the plan document, capture knowledge for the project brain. See `.claude/resources/core/brain-capture.md` for file templates and index cap rules.

1. **Session file** (most recent `.md` in `flow/brain/sessions/`, or create new per-session file): Append entry with time, skill name (`create-plan`), feature name, status, and files changed count
2. **Feature file** (`flow/brain/features/{feature-name}.md`): Create if new feature (use feature template), or append Timeline entry if exists
3. **Decisions** (`flow/brain/decisions/{decision-name}.md`): Create if the user chose between alternative approaches or architectures during planning
4. **Index** (`flow/brain/index.md`): Add new feature/decision entries. Enforce caps (5 errors, 3 decisions)
5. **Log** (`flow/log.md`): Under today's date heading (create if absent), append: `- create-plan: {feature} — {outcome}`

> **Emphasis**: If the user chose between competing approaches during planning, capture each choice as a **decision** with context and trade-offs.

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

- [ ] Task 1
- [ ] Task 2

**Build Verification**: Run the project's build command (see `tech-detection.md`)

### Phase N: Tests (Final)

**Scope**: Write comprehensive tests
**Complexity**: X/10

- [ ] Unit tests
- [ ] Integration tests

**Build Verification**: Run the project's build and test commands (see `tech-detection.md`)

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

## Audit Trail

Append structured JSONL entries to `flow/audit.log`. See `.claude/resources/core/audit-trail.md` [COR-AUD-1] for event type definitions.

**Events to log**:
1. **command_start**: `{"ts":"...","event":"command_start","command":"create-plan","feature":"<feature>","workflow":"<type>"}`
2. **file_created**: For the plan document — `{"ts":"...","event":"file_created","path":"flow/plans/plan_<feature>_v1.md"}`
3. **command_end**: `{"ts":"...","event":"command_end","command":"create-plan","status":"completed","summary":"<X> phases, complexity <total>"}`

Create `flow/audit.log` if it doesn't exist. Always append, never truncate.

---

## Handoff Consumption

Before creating the plan, check for a handoff document from the previous step.

**Input**: `flow/handoffs/handoff_<feature>_discovery_to_plan.md` (or `handoff_<feature>_review_to_plan.md` for bugfix workflow)

**Behavior**:
- If handoff exists: read it silently and use its key outputs and focus guidance to inform plan structure
- If handoff doesn't exist: proceed normally using the discovery document directly (backward compatible)
- Don't duplicate handoff content — reference and build on it

---

## Handoff Production

After the plan is created, produce a handoff document for the execution step.

**Output**: `flow/handoffs/handoff_<feature>_plan_to_execute.md`

**Content to include**:
- Feature name and workflow type
- Phase count and total complexity score
- Highest complexity phase name and score
- Plan document path and discovery document path
- Focus guidance for execution: which phases need most care, any special sequencing notes

**When to produce**: After the plan file is saved and validated, before auto-proceeding to execute-plan.

---

## Phase Access Level Assignment

When creating plan phases, assign an `**Access**` field to each phase:

### Auto-Assignment Rules

1. **Default**: All phases get `**Access**: full-access`
2. **Read-only exceptions**: Assign `**Access**: read-only` when the phase name or scope contains any of:
   - "review", "audit", "analysis", "documentation", "baseline", "comparison", "verification"
3. **Always include**: The `**Access**` line after `**Complexity**` in every phase

### Example

```markdown
### Phase 3: Security Audit

**Scope**: Review authentication flows and data handling
**Complexity**: 4/10
**Access**: read-only

- [ ] Analyze auth middleware
- [ ] Check input validation patterns
```

See `.claude/resources/patterns/plans-templates.md` for the full phase template and `.claude/resources/core/agent-profiles.md` for phase-level access definitions.

---

## ADR References

When creating a plan, check `flow/brain/decisions/` for ADR files related to the feature:

1. Search for ADR files where the feature name matches (check YAML frontmatter `feature` field or Related section)
2. If relevant ADRs are found, add an "Architectural Decisions" subsection to the plan output:

```markdown
## Architectural Decisions

The following ADRs inform this plan:

- [[ADR: jwt-over-sessions]] (api-design) — Stateless auth via JWT tokens
- [[ADR: event-sourcing]] (data-model) — Event-sourced audit trail

See `flow/brain/decisions/` for full decision context.
```

3. If no relevant ADRs exist, skip this section (do not add an empty section)

---

## Related Files

| File                                           | Purpose                          |
| ---------------------------------------------- | -------------------------------- |
| `.claude/resources/patterns/plans-patterns.md`  | Rules and patterns for plans     |
| `.claude/resources/patterns/plans-templates.md` | Plan templates                   |
| `.claude/resources/core/complexity-scoring.md`      | Complexity scoring system        |
| `flow/plans/`                                  | Output folder for plan documents |
| `flow/discovery/`                              | Input discovery documents        |
