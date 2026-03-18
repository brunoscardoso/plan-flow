
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
**Dependencies**: None

- [ ] Task 1
- [ ] Task 2

**Build Verification**: Run `npm run build`

### Phase 2: [Phase Name]

**Scope**: [What this phase covers]
**Complexity**: X/10
**Dependencies**: Phase 1

- [ ] Task 1
- [ ] Task 2

**Build Verification**: Run `npm run build`

### Phase N: Tests (Final)

**Scope**: Write comprehensive tests
**Complexity**: X/10
**Dependencies**: Phase 1, Phase 2, ..., Phase N-1

- [ ] Unit tests for logic hooks
- [ ] Unit tests for utilities
- [ ] Integration tests

**Build Verification**: Run `npm run build && npm run test`

## Key Changes

1. **[Category]**: [Description of change]
2. **[Category]**: [Description of change]
3. **[Category]**: [Description of change]
```

---

## Dependencies Field

The optional `**Dependencies**` field declares which phases must complete before a phase can start. This enables wave-based parallel execution.

### Syntax

- `**Dependencies**: None` — Phase has no dependencies and can run in the first wave (parallel with other independent phases)
- `**Dependencies**: Phase 1, Phase 3` — Phase depends on Phases 1 and 3 completing first
- **Omitting the field entirely** — Backward-compatible default; phase depends on the immediately previous phase (sequential execution)

### Rules

1. The Tests phase (always last) depends on ALL prior phases — it is never parallelized
2. Phases with `Dependencies: None` form the first execution wave
3. A phase cannot depend on itself or on phases that come after it
4. When in doubt, omit the field to default to sequential execution

### Example

```markdown
### Phase 1: Types and Schemas
**Scope**: Define TypeScript types
**Complexity**: 3/10
**Dependencies**: None

### Phase 2: Config Parser
**Scope**: Implement config parsing
**Complexity**: 4/10
**Dependencies**: Phase 1

### Phase 3: CLI Commands
**Scope**: Implement CLI interface
**Complexity**: 4/10
**Dependencies**: Phase 1

### Phase 4: Integration
**Scope**: Connect all pieces
**Complexity**: 5/10
**Dependencies**: Phase 2, Phase 3

### Phase 5: Tests (Final)
**Scope**: Write comprehensive tests
**Complexity**: 5/10
**Dependencies**: Phase 1, Phase 2, Phase 3, Phase 4
```

In this example, Phases 2 and 3 can run in parallel (both only depend on Phase 1). Phase 4 waits for both 2 and 3. Phase 5 (tests) waits for everything.

---

## Phase Templates

### Types and Schemas Phase

```markdown
### Phase 1: Types and Schemas

**Scope**: Define all TypeScript types and Zod schemas needed for the feature.
**Complexity**: 3/10
**Dependencies**: None

- [ ] Create type definitions in `/src/types/`
- [ ] Create Zod validation schemas in `/src/types/rest-inputs.ts`

**Build Verification**: Run `npm run build`
```

### Backend Implementation Phase

```markdown
### Phase 2: Backend Implementation

**Scope**: Implement API routes and commands.
**Complexity**: 7/10
**Dependencies**: Phase 1

- [ ] Create command in `/src/commands/`
- [ ] Create API route in `/src/app/api/`
- [ ] Add database operations if needed

**Build Verification**: Run `npm run build`
```

### Store and State Management Phase

```markdown
### Phase 3: Store and State Management

**Scope**: Implement Zustand stores for state management.
**Complexity**: 5/10
**Dependencies**: Phase 1

- [ ] Create or extend store in `/src/stores/`
- [ ] Add actions and selectors

**Build Verification**: Run `npm run build`
```

### UI Components Phase

```markdown
### Phase 4: UI Components

**Scope**: Build the user interface components.
**Complexity**: 6/10
**Dependencies**: Phase 3

- [ ] Create logic hook (`useFeatureLogic.internal.ts`)
- [ ] Create view component (`index.tsx`)
- [ ] Follow view/logic separation pattern

**Build Verification**: Run `npm run build`
```

### Integration Phase

```markdown
### Phase 5: Integration

**Scope**: Connect all pieces and verify functionality.
**Complexity**: 4/10
**Dependencies**: Phase 2, Phase 4

- [ ] Integrate components with pages
- [ ] Connect to API endpoints
- [ ] Verify end-to-end flow

**Build Verification**: Run `npm run build`
```

### Tests Phase (Always Last)

```markdown
### Phase N: Tests (Final)

**Scope**: Write comprehensive tests for all new code.
**Complexity**: 5/10
**Dependencies**: Phase 1, Phase 2, Phase 3, Phase 4, Phase 5

- [ ] Unit tests for logic hooks (`*.client.test.ts`)
- [ ] Unit tests for utility functions
- [ ] Integration tests for API routes
- [ ] Command tests

**Build Verification**: Run `npm run build && npm run test`
```

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

## Execution Strategy Example

```markdown
## Execution Strategy

Based on complexity scores (per `.claude/resources/core/complexity-scoring.md`):

- **Phases 1-2**: Execute separately (Phase 2 is 7/10)
- **Phases 3-4**: Can be aggregated (combined complexity: 11, but cautious)
- **Phase 5**: Can aggregate with Phase 6 if simple
- **Phase 6**: Tests - always execute separately

Based on dependency graph (when Dependencies fields are present):

- **Wave 1**: Phase 1 (no dependencies)
- **Wave 2**: Phases 2, 3 (both depend only on Phase 1 — run in parallel)
- **Wave 3**: Phases 4, 5 (depend on earlier waves)
- **Wave 4**: Phase 6 (Tests — always sequential, always last)
```
