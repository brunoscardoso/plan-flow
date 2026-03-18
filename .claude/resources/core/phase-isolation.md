
# Phase Isolation

## Purpose

When `phase_isolation: true` in `flow/.flowconfig` (default), each `/execute-plan` phase implementation runs in an **isolated Agent sub-agent** with a clean context window. The sub-agent receives only the context it needs and returns a structured JSON summary. This eliminates context rot — phase 7 has the same quality as phase 1.

**Core principle**: Clean context in, structured summary out.

### Per-Task Verification

Phase sub-agents support **per-task verification** when plan tasks include `<verify>` tags. After completing each task, the sub-agent runs the verification command and, on failure, spawns a debug sub-agent (haiku) for diagnosis and repair. See `.claude/resources/core/per-task-verification.md` for the complete verification system, debug sub-agent prompt template, JSON schemas, and configuration.

---

## Architecture

### Sequential Mode (default)

```
Coordinator (main session)
    │
    ├─ Present phase in Plan Mode → User approves
    │
    ├─ Prepare isolated context (see Context Template below)
    │
    ├─ Spawn Agent sub-agent:
    │   model: [tier from model routing]
    │   mode: "auto"
    │   prompt: [focused context + instructions + return format]
    │
    ├─ Receive structured JSON summary (1-2K tokens)
    │
    ├─ Process summary:
    │   ├─ Update plan file (mark tasks [x])
    │   ├─ Accumulate files_modified list
    │   ├─ Append patterns to pending-patterns.md
    │   ├─ Git commit (if enabled)
    │   └─ Handle errors (present to user if status != success)
    │
    └─ Next phase...
```

### Wave Mode (when `wave_execution: true`)

```
Coordinator (main session)
    │
    ├─ For each Wave:
    │   │
    │   ├─ Approve each phase sequentially in Plan Mode
    │   │
    │   ├─ Prepare isolated context for EACH phase in the wave
    │   │
    │   ├─ Spawn MULTIPLE Agent sub-agents IN PARALLEL:
    │   │   ├─► Agent: Phase A  (model: [tier_A], prompt: phase_A_context)
    │   │   ├─► Agent: Phase B  (model: [tier_B], prompt: phase_B_context)
    │   │   └─► Agent: Phase C  (model: [tier_C], prompt: phase_C_context)
    │   │
    │   ├─ Wait for ALL sub-agents to complete
    │   │
    │   ├─ Collect JSON returns from all sub-agents
    │   │
    │   ├─ Post-wave processing (sequential, in phase order):
    │   │   ├─ Detect file conflicts (files_modified overlap)
    │   │   ├─ Process each phase result
    │   │   ├─ Update plan file (mark tasks [x])
    │   │   ├─ Accumulate files_modified list
    │   │   ├─ Buffer patterns from all phases
    │   │   ├─ Git commit sequentially (Phase A, then B, then C)
    │   │   └─ Handle failures (present to user)
    │   │
    │   └─ Next Wave...
    │
    └─ Completion summary with wave execution stats
```

Planning and user approval always happen in the **main session** (full context). Only the **implementation step** is isolated.

---

## Context Template

The Agent sub-agent prompt must include exactly these sections:

```markdown
# Phase Implementation: {Phase N — Phase Name}

## Plan
**Feature**: {feature name}
**Plan file**: {path to plan file}

## Phase Scope
{Scope description from plan}

## Tasks
{Task list from plan, as checklist}

## Files Modified in Previous Phases
{List of file paths created/modified so far, or "None — this is Phase 1"}

## Project Patterns
Read these files before implementing:
- `.claude/rules/core/allowed-patterns.md`
- `.claude/rules/core/forbidden-patterns.md`

## Design Context
{Only if UI phase — include design tokens from discovery doc}
{Otherwise omit this section entirely}

## Instructions
1. Read the plan file to understand the full feature context
2. Implement all tasks listed above
3. Follow the project patterns from the files listed
4. After completing each task, check if it has a `<verify>` tag indented beneath it:
   - If yes: run the verification command inside the tag
   - If the command exits 0: record a pass result and continue to the next task
   - If the command exits non-zero: spawn a debug sub-agent (haiku, mode: "auto") with the error output, task context, and file content. Apply the repair actions from the diagnosis and re-run the verification command (up to `max_verify_retries` attempts, default 2). See `.claude/resources/core/per-task-verification.md` for the debug sub-agent prompt template and return schema.
   - If max retries exceeded: record a fail result and continue to the next task (do NOT abort)
   - If no `<verify>` tag: skip verification for that task
5. Return a JSON summary in the exact format below — do NOT return markdown

## Return Format
Return ONLY a JSON object (no markdown fences, no explanation):
{see Return Format Schema below}
```

### Context Size Target

The prompt should be **under 2K tokens** (excluding files the sub-agent reads itself via the Read tool). Keep it focused — the sub-agent will read project files as needed during implementation.

### Wave Mode Context Additions

When spawning sub-agents within a wave, the context template is **identical** to sequential mode with one key difference:

- **`Files Modified in Previous Phases`**: Include files from ALL completed waves (Wave 1 through Wave N-1), not just the immediately preceding phase. This gives each sub-agent awareness of everything that changed before the current wave.

Sub-agents within the same wave do NOT receive information about each other — no cross-phase awareness. Each sub-agent operates as if it is the only phase running.

---

## Return Format Schema

The sub-agent must return a JSON object with this structure:

```json
{
  "status": "success",
  "phase": "Phase 1: Create Core Resource",
  "summary": "One-paragraph description of what was implemented and any notable decisions.",
  "files_created": [
    "src/types/auth.ts"
  ],
  "files_modified": [
    "src/api/routes.ts",
    "src/utils/helpers.ts"
  ],
  "decisions": [
    "Chose JWT over sessions because discovery DR-4 specified stateless auth"
  ],
  "deviations": [
    "Task 3 deferred — requires database migration first"
  ],
  "errors": [],
  "patterns_captured": [
    {
      "category": "allowed",
      "name": "Zod schema co-location",
      "description": "All Zod schemas live next to their type definitions",
      "confidence": "high"
    }
  ],
  "task_verifications": [
    {
      "task": "Create user authentication middleware",
      "verify_command": "npx tsc --noEmit src/middleware/auth.ts",
      "status": "pass",
      "attempts": 2,
      "repairs_applied": [
        "Added missing import for AuthMiddleware type"
      ]
    },
    {
      "task": "Add rate limiting to API routes",
      "verify_command": "npx jest src/middleware/__tests__/rate-limit.test.ts --no-coverage",
      "status": "pass",
      "attempts": 1,
      "repairs_applied": []
    }
  ]
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `"success" \| "failure" \| "partial"` | Yes | Overall phase outcome |
| `phase` | string | Yes | Phase number and name |
| `summary` | string | Yes | 1-3 sentence description of what was done |
| `files_created` | string[] | Yes | Paths of new files created (empty array if none) |
| `files_modified` | string[] | Yes | Paths of existing files modified (empty array if none) |
| `decisions` | string[] | No | Architecture/design decisions made during implementation |
| `deviations` | string[] | No | Tasks skipped or changed from plan |
| `errors` | string[] | No | Errors encountered (even if resolved) |
| `patterns_captured` | object[] | No | Patterns observed during implementation |
| `task_verifications` | object[] | No | Array of per-task verification results. Only present when at least one task had a `<verify>` tag. Each entry contains: `task` (string), `verify_command` (string), `status` (`"pass" \| "fail"`), `attempts` (number), `repairs_applied` (string[]), and optionally `last_diagnosis` (object, only when status is `"fail"`). See `.claude/resources/core/per-task-verification.md` for full schema. |

### Failure Return Example

```json
{
  "status": "failure",
  "phase": "Phase 3: API Integration",
  "summary": "Failed to implement API routes. Missing dependency '@auth/core' not in package.json.",
  "files_created": [],
  "files_modified": ["src/api/auth.ts"],
  "decisions": [],
  "deviations": [],
  "errors": [
    "Cannot find module '@auth/core' — dependency not installed",
    "Partial implementation in src/api/auth.ts — needs cleanup"
  ],
  "patterns_captured": []
}
```

---

## Coordinator Processing

After receiving the sub-agent's JSON summary, the coordinator:

### On Success (`status: "success"`)

1. **Update plan file**: Mark all phase tasks as `[x]`
2. **Accumulate file list**: Merge `files_created` and `files_modified` into running list
3. **Buffer patterns**: Append `patterns_captured` entries to `flow/resources/pending-patterns.md`
4. **Git commit**: If `commit: true`, run `git add -A && git commit -m "Phase N: {name} — {feature}"`
5. **Log decisions**: Include `decisions` in phase completion message
6. **Display verification results**: If `task_verifications` is present, show pass/fail counts and any repairs applied
7. **Proceed**: Move to next phase

### On Failure (`status: "failure"`)

1. **Present error**: Show `errors` array to user
2. **Show partial work**: List `files_modified` so user knows what was touched
3. **Ask user**: "Phase failed. Options: (1) Retry phase, (2) Skip and continue, (3) Stop execution"
4. **Do NOT auto-retry**: Let user decide

### On Partial (`status: "partial"`)

1. **Present summary**: Show what was completed and what wasn't
2. **Show deviations**: List `deviations` explaining what was skipped
3. **Display verification failures**: If `task_verifications` contains failed entries, show task name, last diagnosis, and repair attempts
4. **Ask user**: "Phase partially complete. Continue to next phase or retry remaining tasks?"

---

## Wave Coordinator Processing

When multiple sub-agents return simultaneously from a wave, the coordinator handles them differently from sequential mode. See `.claude/resources/core/wave-execution.md` for the full wave system and `.claude/resources/skills/execute-plan-skill.md` Step 4c for the detailed processing flow.

### Collecting Multiple JSON Returns

After all sub-agents in a wave complete, the coordinator collects all JSON returns before processing any of them. This allows file conflict detection before committing.

### Processing Order

Results are always processed **sequentially in phase number order**, regardless of which sub-agent finished first. This ensures:
- Deterministic commit history (Phase A committed before Phase B)
- Predictable plan file updates
- Consistent file accumulation order

### File Conflict Detection

After collecting all wave results, check for `files_modified` overlap between phases:

```
For each pair of phases (A, B) in the wave:
  overlap = A.files_modified ∩ B.files_modified
  if overlap is not empty:
    → File conflict detected
```

**On conflict**: Present to user with options (accept as-is, re-run conflicting phases sequentially, or stop). Never silently resolve conflicts.

### Wave Failure Isolation

A failed phase in a wave does NOT affect other phases in the same wave:
- Successful phases are processed normally (plan updates, file accumulation, git commits)
- Failed phases are presented to the user after all successful phases are processed
- The user chooses per failed phase: retry, skip, or stop

This differs from sequential mode where a failure immediately pauses execution. In wave mode, all parallel phases complete independently before any failure handling.

---

## Aggregated Phases

When phases are aggregated (combined complexity ≤ 6), they run as **one sub-agent call** with all tasks from all aggregated phases. The context template lists all phases and tasks together. The return uses the highest phase number as the `phase` field.

In wave mode, aggregated phases within the same wave are treated as a **single unit** — they share one wave slot, one dependency set (union of all aggregated phases' dependencies), and one sub-agent call.

---

## Configuration

### `.flowconfig` Setting

```yaml
phase_isolation: true    # Run phases in isolated sub-agents (default: true)
```

- `true` (default): Each phase runs in an isolated Agent sub-agent
- `false`: Phases execute inline in the main session (legacy behavior, useful for debugging)

### Interaction with Model Routing

Phase isolation **enhances** model routing — it doesn't replace it:

| Setting | Behavior |
|---------|----------|
| `model_routing: true` + `phase_isolation: true` | Sub-agent spawned with correct tier model AND clean context |
| `model_routing: true` + `phase_isolation: false` | Sub-agent spawned with correct tier model, inherits session context |
| `model_routing: false` + `phase_isolation: true` | Sub-agent spawned with session model, clean context |
| `model_routing: false` + `phase_isolation: false` | Inline execution, no sub-agents (original behavior) |

### Interaction with Wave Execution

Phase isolation is the **foundation** for wave execution — wave mode spawns multiple isolated sub-agents per wave instead of one at a time:

| Setting | Behavior |
|---------|----------|
| `wave_execution: true` + `phase_isolation: true` | Multiple sub-agents per wave, each with clean context (optimal) |
| `wave_execution: true` + `phase_isolation: false` | Multiple sub-agents per wave, but sharing session context (may cause interference) |
| `wave_execution: false` + `phase_isolation: true` | One sub-agent at a time, clean context (existing behavior) |
| `wave_execution: false` + `phase_isolation: false` | Inline execution, no sub-agents (original behavior) |

**Recommendation**: `wave_execution: true` works best with `phase_isolation: true`. Without phase isolation, parallel sub-agents may interfere with each other's context.

---

## Rules

1. **Planning stays in session** — only implementation is isolated
2. **Under 2K token prompts** — keep context focused, let sub-agent read files
3. **JSON return only** — no markdown in the return, pure JSON
4. **Coordinator validates** — check status field before proceeding
5. **Never auto-retry** — on failure, present to user and ask
6. **Pass paths, not content** — give file paths, sub-agent reads them
7. **Each phase gets own sub-agent** — even in wave mode, phases are never merged into one sub-agent (except for aggregated phases per complexity rules)
8. **No cross-wave awareness** — sub-agents in the same wave know nothing about each other
9. **Deterministic processing** — wave results are always processed in phase number order
10. **Collect before commit** — in wave mode, all JSON returns are collected before any commits happen
11. **Verification is internal** — per-task verification loops run inside the phase sub-agent; the coordinator sees only the final `task_verifications` results

---

## Related Files

| File | Purpose |
|------|---------|
| `.claude/resources/core/wave-execution.md` | Full wave-based parallel execution system |
| `.claude/resources/core/model-routing.md` | Model tier selection per phase complexity |
| `.claude/resources/core/discovery-sub-agents.md` | Parallel spawning pattern reference |
| `.claude/resources/core/per-task-verification.md` | Per-task verification system, debug sub-agent, and repair loops |
| `.claude/resources/skills/execute-plan-skill.md` | Execute-plan skill with wave integration (Steps 2b, 3, 4) |
