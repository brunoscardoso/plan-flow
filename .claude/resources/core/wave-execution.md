
# Wave-Based Parallel Execution

## Purpose

When `wave_execution: true` in `flow/.flowconfig` (default), `/execute-plan` analyzes phase dependencies, groups independent phases into **waves**, and executes phases within each wave **in parallel** using Agent sub-agents. Waves are sequenced — Wave N+1 starts only after all Wave N phases complete. This reduces total execution time by 40-60% for plans with independent phases.

**Core principle**: Dependency analysis in, parallel waves out, sequential commits after.

---

## Architecture

```
Coordinator (main session)
    │
    ├─ Step 2b: Wave Analysis
    │   ├─ Parse Dependencies from each phase
    │   ├─ Build dependency graph
    │   ├─ Topological sort → group into waves
    │   └─ Present wave summary to user
    │
    ├─ For each Wave:
    │   │
    │   ├─ Sequential: Approve each phase in Plan Mode
    │   │
    │   ├─ Create shared context file (flow/.wave-context.jsonl)
    │   │
    │   ├─ Parallel: Spawn Agent sub-agents for all wave phases
    │   │   ├─► Agent: Phase A  (model: [tier from model routing])
    │   │   ├─► Agent: Phase B  (model: [tier from model routing])
    │   │   └─► Agent: Phase C  (model: [tier from model routing])
    │   │   (agents read/append to .wave-context.jsonl during execution)
    │   │
    │   ├─ Collect JSON returns from all sub-agents
    │   │
    │   ├─ Post-wave processing:
    │   │   ├─ Detect file conflicts (files_modified overlap)
    │   │   ├─ Detect contract conflicts (same name, different signatures)
    │   │   ├─ Accumulate files_modified list
    │   │   ├─ Buffer patterns from all phases
    │   │   ├─ Git commit per-task (iterate tasks within each phase, in phase order)
    │   │   ├─ Handle failures (present to user)
    │   │   └─ Delete .wave-context.jsonl (clean slate for next wave)
    │   │
    │   └─ Next Wave...
    │
    └─ Completion summary with wave execution stats
```

Planning and user approval always happen **sequentially** in the main session. Only **implementation** is parallelized within waves.

---

## Shared Context

### Overview

During wave execution, parallel phases share a context file (`flow/.wave-context.jsonl`) that enables real-time coordination. Agents share API contracts, architectural decisions, and progress status via append-only JSONL entries. Before each task, sub-agents receive shared context from sibling phases, preventing broken contracts and duplicate decisions.

### Lifecycle

1. **Wave start**: Coordinator creates `flow/.wave-context.jsonl` (empty file) before spawning sub-agents
2. **During execution**: Sub-agents append entries as they make decisions, define contracts, or complete tasks
3. **Before each task**: Sub-agents read the shared context file to pick up entries from sibling phases
4. **Wave end**: Coordinator reads the final context file for post-wave conflict detection
5. **Cleanup**: Context file is deleted after the wave completes (each wave gets a fresh file)

### Entry Format

Each line in `.wave-context.jsonl` is a JSON object with one of three types:

```jsonl
{"type":"contract","phase":2,"task":1,"name":"UserAPI","signature":{"endpoint":"/api/users","method":"GET","response":"User[]"},"timestamp":"2024-01-15T10:30:00Z"}
{"type":"decision","phase":1,"task":2,"name":"auth-strategy","value":"JWT with refresh tokens","reason":"Aligns with existing session management","timestamp":"2024-01-15T10:31:00Z"}
{"type":"progress","phase":3,"task":1,"status":"complete","files_modified":["src/utils/helpers.ts"],"timestamp":"2024-01-15T10:32:00Z"}
```

| Type | Purpose | Key Fields |
|------|---------|------------|
| `contract` | API shapes, interfaces, shared types | `name`, `signature` |
| `decision` | Architecture choices, technology selections | `name`, `value`, `reason` |
| `progress` | Task completion status, files touched | `status`, `files_modified` |

### Sub-Agent Context Injection

When spawning each sub-agent, the coordinator includes in the context template:

```
## Shared Context (from sibling phases)

[Contents of flow/.wave-context.jsonl, if any entries exist]

RULES:
- Read shared context before starting each task
- Append contract/decision/progress entries as you work
- If a sibling defined a contract, use that exact signature
- If a sibling made an architecture decision, follow it
```

For the first task in a wave, the context file may be empty. As phases progress, entries accumulate and inform subsequent tasks.

---

## Dependency Analysis

### Dependency Declaration Syntax

Each plan phase may include an optional `**Dependencies**` field after `**Complexity**`:

```markdown
### Phase 3: API Integration

**Scope**: ...
**Complexity**: 5/10
**Dependencies**: Phase 1, Phase 2

- [ ] Task 1
- [ ] Task 2
```

### Dependency Rules

| Declaration | Meaning |
|-------------|---------|
| `**Dependencies**: Phase 1, Phase 3` | Phase depends on Phase 1 and Phase 3 completing first |
| `**Dependencies**: None` | Phase has no dependencies — can run in parallel with others |
| No `Dependencies` field | **Default**: depends on previous phase (backward-compatible sequential) |

**Parsing rules**:
1. Look for `**Dependencies**:` line in each phase section
2. Extract phase numbers: parse `Phase N` references (case-insensitive)
3. `None` (case-insensitive) means explicitly independent
4. Missing field = implicit dependency on Phase N-1 (Phase 1 has no implicit dependency)
5. Self-references are ignored
6. References to non-existent phases are ignored with a warning

### Special Rules

- **Tests phase**: NEVER parallelized, regardless of dependency declaration. Always runs alone in the final wave.
- **Phase 1**: Always in Wave 1 (no possible predecessors)

---

## Wave Grouping Algorithm

### Topological Sort

1. **Build graph**: For each phase, record its dependencies (explicit or implicit)
2. **Assign wave numbers**:
   - Phases with no dependencies → Wave 1
   - For each remaining phase: wave = max(wave of each dependency) + 1
3. **Tests phase exception**: Move to its own final wave regardless of computed wave number
4. **Validate**: Check for circular dependencies — if found, warn user and fall back to sequential

### Example

Given a plan with 5 phases:
```
Phase 1: Types and interfaces          Dependencies: None
Phase 2: Utility functions              Dependencies: None
Phase 3: API integration                Dependencies: Phase 1, Phase 2
Phase 4: Configuration updates          Dependencies: Phase 1, Phase 3
Phase 5: Tests                          Dependencies: Phase 1, Phase 2, Phase 3, Phase 4
```

Wave grouping result:
```
Wave 1: Phase 1, Phase 2    (both independent)
Wave 2: Phase 3              (depends on Wave 1 phases)
Wave 3: Phase 4              (depends on Phase 3 in Wave 2)
Wave 4: Phase 5              (tests — always last, alone)
```

Sequential execution: 5 phases in sequence
Wave execution: 4 waves (Wave 1 runs 2 phases in parallel)
Estimated speedup: ~20% (1 fewer sequential step)

### Backward Compatibility

Plans without any `Dependencies` fields produce a fully sequential wave plan:
```
Wave 1: Phase 1
Wave 2: Phase 2
Wave 3: Phase 3
...
```

This matches existing behavior exactly — no regression.

---

## Wave Execution Summary

Before execution begins, the coordinator presents the wave plan to the user:

```markdown
## Wave Execution Plan

| Wave | Phases | Parallel |
|------|--------|----------|
| 1 | Phase 1: Types, Phase 2: Utilities | Yes (2 parallel) |
| 2 | Phase 3: API Integration | No (1 phase) |
| 3 | Phase 4: Config Updates | No (1 phase) |
| 4 | Phase 5: Tests | No (always sequential) |

**Sequential phases**: 5 → **Waves**: 4 → **Estimated speedup**: ~20%

Proceed with wave execution? (yes/no/sequential)
```

User options:
- **yes**: Execute with wave parallelism
- **no**: Stop execution
- **sequential**: Fall back to sequential execution (ignore waves)

---

## Parallel Spawning Rules

### Sub-Agent Setup

Each phase within a wave is spawned as an **independent Agent sub-agent** following the phase-isolation context template (see `phase-isolation.md` COR-PI-2). Key additions for wave execution:

1. **Files Modified context**: For Wave N, include files_modified from ALL completed waves (1 through N-1), not just the previous phase
2. **No cross-phase awareness**: Sub-agents within the same wave do NOT know about each other. They receive no information about sibling phases.
3. **Model routing**: Each sub-agent uses the model tier from its own phase complexity score (same as phase isolation)

### Spawning Pattern

```
For Wave N (phases A, B, C):
  Launch in parallel:
  - Agent(model: [tier_A], prompt: phase_A_context)
  - Agent(model: [tier_B], prompt: phase_B_context)
  - Agent(model: [tier_C], prompt: phase_C_context)

  Wait for all to complete.
  Process results sequentially.
```

This mirrors the discovery-sub-agents pattern (see `discovery-sub-agents.md` COR-DSA-3) but with phase-isolation context templates instead of exploration prompts.

### Return Format

Each sub-agent returns the **same JSON format** as phase isolation (see `phase-isolation.md`), including the `tasks_completed` array for per-task file tracking. The `tasks_completed` field enables the wave coordinator to create atomic per-task commits after the wave completes. See `.claude/resources/core/atomic-commits.md` for the full `tasks_completed` schema.

---

## Wave Coordinator Behavior

### Per-Wave Processing

After all sub-agents in a wave return, the coordinator processes results **sequentially in phase order**:

1. **Collect returns**: Gather JSON from all sub-agents
2. **Validate JSON**: Parse each return, check for required fields
3. **Detect file conflicts**: Check for files_modified overlap between phases in this wave
4. **Process each phase** (in phase number order):
   - Update plan file (mark tasks `[x]`)
   - Accumulate files_modified into running list
   - Buffer patterns_captured entries
   - Git commit per-task if enabled: iterate `tasks_completed` array and create one commit per task (`feat(phase-N.task-M): <desc> — <feature>`). See `.claude/resources/core/atomic-commits.md` for format.
   - Log decisions and deviations
5. **Report wave completion**: Summary of all phases in this wave, including `task_verifications` results from each phase return (display pass/fail counts and any repairs applied per phase)

### File Conflict Detection

After collecting all wave results, check for **files_modified overlap**:

```
For each pair of phases (A, B) in the wave:
  overlap = A.files_modified ∩ B.files_modified
  if overlap is not empty:
    → File conflict detected
```

**On conflict**:
1. Present the conflicting files and which phases modified them
2. Offer options:
   - **(1) Accept as-is**: Last writer wins (the phase with the higher number committed last)
   - **(2) Re-run conflicting phases sequentially**: Re-execute only the conflicting phases in order
   - **(3) Stop execution**: Halt for manual resolution

File conflict does NOT affect non-conflicting phases — their results are preserved.

### Contract Conflict Detection

After collecting all wave results, parse `flow/.wave-context.jsonl` and check for **contract conflicts**:

```
For each pair of "contract" entries with the same name:
  if entry_A.signature != entry_B.signature:
    → Contract conflict detected
```

**On contract conflict**:
1. Present the conflicting contract definitions — show the name, the two signatures, and which phases defined them
2. Offer options:
   - **(1) Pick one**: User selects which phase's contract to use; the other phase must be re-run with the chosen contract injected
   - **(2) Re-run conflicting phases sequentially**: Re-execute only the conflicting phases in order, so the second phase sees the first's contract
   - **(3) Stop execution**: Halt for manual resolution

Contract conflicts are checked **after** file conflicts. Both may exist simultaneously — present all conflicts before asking for resolution.

### Failure Handling

| Scenario | Behavior |
|----------|----------|
| One phase fails, others succeed | Process successful phases normally. Present failure to user. Offer: retry failed phase, skip it, or stop. |
| Multiple phases fail | Process any successful phases. Present all failures. Offer same options per failed phase. |
| All phases in wave fail | Present all failures. Offer: retry wave, skip wave, or stop. |
| Sub-agent timeout | Treat as failure for that phase. Other phases unaffected. |
| Invalid JSON return | Treat as failure for that phase. |

**Key rule**: A failed phase in a wave does NOT cancel other phases in the same wave. Parallel phases are independent — let them all complete.

### Git Commit Ordering

When `commit: true` in `.flowconfig`, git commits happen **after** the wave completes, **per-task in phase order then task order**:

```
Wave 1 complete:
  Phase 1, Task 1: git add -A && git commit -m "feat(phase-1.task-1): Define user and session types — feature-name"
  Phase 1, Task 2: git add -A && git commit -m "feat(phase-1.task-2): Create user schema with Prisma — feature-name"
  Phase 2, Task 1: git add -A && git commit -m "feat(phase-2.task-1): Implement utility helpers — feature-name"
  Phase 2, Task 2: git add -A && git commit -m "feat(phase-2.task-2): Add string formatting utils — feature-name"
```

The coordinator iterates each phase's `tasks_completed` array (from the JSON return) in task_number order. This ensures **deterministic, fine-grained commit history** regardless of which sub-agent finished first. See `.claude/resources/core/atomic-commits.md` for the full commit format spec.

---

## Configuration

### `.flowconfig` Setting

```yaml
wave_execution: true    # Enable wave-based parallel execution (default: true)
```

- `true` (default): Analyze dependencies and execute in parallel waves
- `false`: Sequential execution (ignore Dependencies, legacy behavior)

### Toggle via `/flow`

```
/flow wave_execution=true
/flow wave_execution=false
```

### Interaction Matrix

| wave_execution | phase_isolation | model_routing | Behavior |
|---------------|-----------------|---------------|----------|
| `true` | `true` | `true` | Full parallel: waves + isolated sub-agents + correct tier models |
| `true` | `true` | `false` | Parallel waves + isolated sub-agents + session model |
| `true` | `false` | `true` | Parallel waves + inline execution per phase + correct tier models |
| `true` | `false` | `false` | Parallel waves + inline execution + session model |
| `false` | `true` | `true` | Sequential + isolated sub-agents + correct tier models (existing behavior) |
| `false` | `true` | `false` | Sequential + isolated sub-agents + session model |
| `false` | `false` | `true` | Sequential + inline + correct tier models |
| `false` | `false` | `false` | Sequential + inline + session model (original behavior) |

**Note**: `wave_execution: true` requires `phase_isolation: true` for best results. Without phase isolation, parallel execution still works but sub-agents share the session context, which may cause interference.

### Interaction with Aggregation

When phases are aggregated (combined complexity ≤ 6), aggregated phases are treated as a **single unit** for wave analysis:
- They share one dependency set (union of all aggregated phases' dependencies)
- They produce one wave slot
- They run as one sub-agent call (same as current aggregation behavior)

---

## Rules

1. **Planning stays sequential** — approve each phase before wave execution begins
2. **Tests never parallel** — tests phase always runs alone in the final wave
3. **No cross-phase awareness** — sub-agents in the same wave know nothing about each other
4. **Deterministic commits** — git commits happen sequentially in phase order after wave completes
5. **Failures are isolated** — one failed phase does not cancel sibling phases in the same wave
6. **Backward compatible** — plans without Dependencies fields execute sequentially (no behavior change)
7. **User controls** — user can always choose sequential execution at the wave summary prompt
8. **File conflicts are presented** — never silently resolve file conflicts, always ask the user
9. **Reuse phase-isolation format** — sub-agent prompts and JSON returns follow phase-isolation.md exactly
10. **Wave analysis is fast** — dependency parsing and topological sort add negligible overhead
11. **Verification is internal to sub-agents** — per-task verification loops run entirely inside each phase sub-agent. The wave coordinator does not interact with verification; it only processes the final `task_verifications` field from the JSON return. See `.claude/resources/core/per-task-verification.md` for the complete verification system.
12. **Shared context per wave** — each wave creates a fresh `.wave-context.jsonl` file, deleted after post-wave processing
13. **Contract conflicts require user intervention** — never silently resolve conflicting contract signatures between parallel phases
14. **Append-only context** — sub-agents only append to `.wave-context.jsonl`, never edit or delete existing entries

---

## Related Files

| File | Purpose |
|------|---------|
| `.claude/resources/core/phase-isolation.md` | Sub-agent context template, JSON return format, coordinator processing |
| `.claude/resources/core/discovery-sub-agents.md` | Parallel spawning pattern (3 agents → collect → merge) |
| `.claude/resources/core/review-multi-agent.md` | Parallel agents with deduplication |
| `.claude/resources/core/model-routing.md` | Model tier selection per phase complexity |
| `.claude/resources/core/shared-context.md` | Shared context file format, entry types, and coordination rules |
| `.claude/resources/core/complexity-scoring.md` | Complexity scores and aggregation rules |
| `.claude/resources/core/per-task-verification.md` | Per-task verification system, debug sub-agent, and repair loops |
| `.claude/resources/skills/execute-plan-skill.md` | Execute-plan skill (Steps 2b, 3, 4 modified for waves) |
| `.claude/resources/patterns/plans-templates.md` | Plan template with Dependencies field |
