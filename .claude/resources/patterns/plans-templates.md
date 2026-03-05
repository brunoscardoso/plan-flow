
## Plan Template

Use this template when creating new implementation plans:

```markdown
# Plan: [Feature Name]

**Project**: [[{project-name}]]

## Overview

[Brief description of the feature and its purpose]

**Based on Discovery**: `flow/discovery/discovery_<feature>_v1.md` (or "Discovery skipped")

## Goals

- [Goal 1]
- [Goal 2]
- [Goal 3]

## Non-Goals

- [What this plan explicitly does NOT cover]

## Requirements Summary

### Functional Requirements

- [FR-1]: [Description]
- [FR-2]: [Description]

### Non-Functional Requirements

- [NFR-1]: [Description]

### Constraints

- [C-1]: [Description]

## Risks

| Risk     | Impact          | Mitigation           |
| -------- | --------------- | -------------------- |
| [Risk 1] | High/Medium/Low | [Mitigation strategy]|

## Phases

### Phase 1: [Phase Name]

**Scope**: [What this phase covers]
**Complexity**: X/10
**Access**: full-access
**Evals**:
- [EVAL-1]: [Concrete testable assertion about phase output]
- [EVAL-2]: [Another verifiable assertion]

- [ ] Task 1
- [ ] Task 2

**Build Verification**: Run the project's build command (see `tech-detection.md`)

### Phase 2: [Phase Name]

**Scope**: [What this phase covers]
**Complexity**: X/10
**Access**: full-access
**Evals**:
- [EVAL-1]: [Concrete testable assertion about phase output]

- [ ] Task 1
- [ ] Task 2

**Build Verification**: Run the project's build command (see `tech-detection.md`)

### Phase N: Tests (Final)

**Scope**: Write comprehensive tests
**Complexity**: X/10

- [ ] Unit tests for logic hooks
- [ ] Unit tests for utilities
- [ ] Integration tests

**Build Verification**: Run the project's build and test commands (see `tech-detection.md`)

## Key Changes

1. **[Category]**: [Description of change]
2. **[Category]**: [Description of change]
3. **[Category]**: [Description of change]
```

---

## Phase Templates

### Types and Schemas Phase

```markdown
### Phase 1: Types and Schemas

**Scope**: Define all TypeScript types and Zod schemas needed for the feature.
**Complexity**: 3/10

- [ ] Create type definitions in `/src/types/`
- [ ] Create Zod validation schemas in `/src/types/rest-inputs.ts`

**Build Verification**: Run the project's build command (see `tech-detection.md`)
```

### Backend Implementation Phase

```markdown
### Phase 2: Backend Implementation

**Scope**: Implement API routes and commands.
**Complexity**: 7/10

- [ ] Create command in `/src/commands/`
- [ ] Create API route in `/src/app/api/`
- [ ] Add database operations if needed

**Build Verification**: Run the project's build command (see `tech-detection.md`)
```

### Store and State Management Phase

```markdown
### Phase 3: Store and State Management

**Scope**: Implement Zustand stores for state management.
**Complexity**: 5/10

- [ ] Create or extend store in `/src/stores/`
- [ ] Add actions and selectors

**Build Verification**: Run the project's build command (see `tech-detection.md`)
```

### UI Components Phase

```markdown
### Phase 4: UI Components

**Scope**: Build the user interface components.
**Complexity**: 6/10

- [ ] Create logic hook (`useFeatureLogic.internal.ts`)
- [ ] Create view component (`index.tsx`)
- [ ] Follow view/logic separation pattern

**Build Verification**: Run the project's build command (see `tech-detection.md`)
```

### Integration Phase

```markdown
### Phase 5: Integration

**Scope**: Connect all pieces and verify functionality.
**Complexity**: 4/10

- [ ] Integrate components with pages
- [ ] Connect to API endpoints
- [ ] Verify end-to-end flow

**Build Verification**: Run the project's build command (see `tech-detection.md`)
```

### Tests Phase (Always Last)

```markdown
### Phase N: Tests (Final)

**Scope**: Write comprehensive tests for all new code.
**Complexity**: 5/10

- [ ] Unit tests for logic hooks (`*.client.test.ts`)
- [ ] Unit tests for utility functions
- [ ] Integration tests for API routes
- [ ] Command tests

**Build Verification**: Run the project's build and test commands (see `tech-detection.md`)
```

---

## Multi-Language Phase Examples

### Go Project Phase

```markdown
### Phase 2: API Implementation

**Scope**: Implement HTTP handlers and middleware.
**Complexity**: 6/10

- [ ] Create handler in `internal/handler/`
- [ ] Add middleware for authentication
- [ ] Wire routes in `cmd/server/main.go`

**Build Verification**: Run the project's build command (see `tech-detection.md`)
```

### Python Project Phase

```markdown
### Phase 1: Data Models

**Scope**: Define Pydantic models and database schemas.
**Complexity**: 3/10

- [ ] Create models in `src/models/`
- [ ] Add Pydantic validation schemas
- [ ] Create Alembic migration

**Build Verification**: Run the project's build command (see `tech-detection.md`)
```

> **Note**: Build verification adapts to the detected language. For Python projects, this may skip the build step and run tests only. See `.claude/resources/core/tech-detection.md` for the full command mapping.

---

## Key Changes Examples

```markdown
## Key Changes

1. **New API Endpoint**: Added `/api/v1/agents/workflow` for workflow management
2. **Database Schema**: New `workflow_steps` table with foreign key to `agents`
3. **Store Update**: Extended `agentStore` with workflow state management
4. **Component Addition**: New `WorkflowEditor` component in `/src/components/agent/`
5. **Type Definitions**: Added `WorkflowStep` and `WorkflowConfig` types in `/src/types/workflow.ts`
```

---

## Complexity Summary Example

```markdown
## Complexity Summary

| Phase | Complexity | Description               |
| ----- | ---------- | ------------------------- |
| 1     | 3/10       | Types and schemas         |
| 2     | 7/10       | Backend implementation    |
| 3     | 5/10       | Store and state           |
| 4     | 6/10       | UI components             |
| 5     | 4/10       | Integration               |
| 6     | 5/10       | Tests                     |

**Total Phases**: 6
**Average Complexity**: 5/10
**Highest Complexity**: Phase 2 at 7/10
```

---

## Eval Format

### Eval Definition (in plan creation)

```markdown
**Evals**:
- [EVAL-1]: POST /api/users returns 201 with valid body
- [EVAL-2]: Invalid input returns 400 with validation errors
- [EVAL-3]: Auth middleware rejects unauthenticated requests
```

Evals are **optional** per phase. Phases without evals work as before. Skip evals for trivial phases (complexity <= 2) and the Tests phase.

### Completed Eval Format (after execution)

```markdown
### Phase 2: API Implementation ✅ (pass@1.33)

**Evals**:
- [EVAL-1]: ✅ (k=2) POST /api/users returns 201
- [EVAL-2]: ✅ (k=1) Invalid input returns 400
- [EVAL-3]: ✅ (k=1) Auth middleware rejects unauthenticated
```

**Markers**: `✅` for passed, `❌` for failed. `k=N` indicates the attempt number on which the eval passed.

### Eval Writing Guidelines

- Each eval must be a **concrete, verifiable assertion** about code behavior
- Use specific values, status codes, or observable outcomes
- 1-5 evals per phase (more for higher complexity)
- Avoid vague evals like "code works correctly" or "feature is implemented"

---

## Phase Access Levels

Each phase can specify an `**Access**` field to control tool access during execution:

| Access Level | When Used | Tool Access |
|-------------|-----------|-------------|
| `full-access` | Implementation phases (default) | All tools — Edit, Write, Bash, Read, Grep, Glob |
| `read-only` | Review, audit, analysis, documentation-only phases | Read, Grep, Glob only — output to `flow/` dirs |

**Default**: If `**Access**` is omitted, the phase uses `full-access`. This ensures backward compatibility with existing plans.

**Auto-assignment by create-plan**: The create-plan skill auto-assigns access levels based on phase content. Phases with "review", "audit", "analysis", or "documentation" in their name/scope get `read-only`. All other phases get `full-access`.

---

## Execution Strategy Example

```markdown
## Execution Strategy

Based on complexity scores (per `.claude/resources/core/complexity-scoring.md`):

- **Phases 1-2**: Execute separately (Phase 2 is 7/10)
- **Phases 3-4**: Can be aggregated (combined complexity: 11, but cautious)
- **Phase 5**: Can aggregate with Phase 6 if simple
- **Phase 6**: Tests - always execute separately
```
