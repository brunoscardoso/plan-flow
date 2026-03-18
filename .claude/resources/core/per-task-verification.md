
# Per-Task Verification

## Purpose

When a plan phase includes tasks with `<verify>` tags, the phase isolation sub-agent runs **targeted verification immediately after each task completes**. If verification fails, a nested debug sub-agent diagnoses the failure and the implementation sub-agent applies repairs. This catches errors at the task level instead of waiting for the final build+test step.

**Core principle**: Verify early, diagnose fast, repair in place.

---

## Architecture

```
Phase Sub-Agent (isolated)
    │
    ├─ Task 1: Implement
    │   ├─ Complete task implementation
    │   ├─ Parse <verify> tag → extract command
    │   ├─ Run verification command
    │   ├─ ✅ Pass → record result, move to Task 2
    │   └─ ❌ Fail → enter verification loop:
    │       │
    │       ├─ Spawn debug sub-agent (haiku):
    │       │   Input: error output + task context + file content
    │       │   Output: JSON diagnosis (root cause, repair actions)
    │       │
    │       ├─ Apply repair actions
    │       ├─ Re-run verification command
    │       ├─ ✅ Pass → record result (with repair info), move to Task 2
    │       ├─ ❌ Fail → retry (up to max_verify_retries)
    │       └─ ❌ Max retries exceeded → record failure, escalate to user
    │
    ├─ Task 2: Implement (no <verify> tag → skip verification)
    │
    ├─ Task 3: Implement
    │   ├─ Complete task implementation
    │   ├─ Parse <verify> tag → extract command
    │   └─ Run verification → ✅ Pass
    │
    └─ Return JSON (includes task_verifications array)
```

Verification is **internal to the phase sub-agent**. The wave coordinator and main session see only the final JSON return with verification results — they never interact with the verification loop directly.

---

## Verify Tag Syntax

### Declaration in Plans

Tasks in a plan phase can include an optional `<verify>` tag indented under the task:

```markdown
### Phase 2: API Integration

**Scope**: ...
**Complexity**: 5/10
**Dependencies**: Phase 1

- [ ] Create user authentication middleware in `src/middleware/auth.ts`
  <verify>npx tsc --noEmit src/middleware/auth.ts</verify>
- [ ] Add rate limiting to API routes
  <verify>npx jest src/middleware/__tests__/rate-limit.test.ts --no-coverage</verify>
- [ ] Update configuration constants
```

### Parsing Rules

1. **Tag format**: `<verify>COMMAND</verify>` on a single line, indented under a task
2. **One verify per task**: Only the first `<verify>` tag under a task is used; additional tags are ignored
3. **Command content**: The text between tags is executed as a shell command by the sub-agent
4. **No verify = no verification**: Tasks without `<verify>` tags skip verification entirely (backward compatible)
5. **Whitespace**: Leading/trailing whitespace inside the tag is trimmed
6. **Nesting**: The `<verify>` tag must be indented under its parent task (2+ spaces or 1+ tab)

### Recommended Verification Commands

| Task Type | Verify Command | Purpose |
|-----------|---------------|---------|
| File creation (TypeScript) | `npx tsc --noEmit <file>` | Type-check the new file |
| Test writing | `npx jest <test-file> --no-coverage` | Run the specific test |
| Schema/type changes | `npx tsc --noEmit <type-file>` | Verify type consistency |
| Config changes | *(no verify)* | Manual review preferred |
| Documentation | *(no verify)* | No automated check available |

**Constraint**: Verification commands must be **targeted** (single file or small scope). Never use full builds (`npm run build`) or full test suites (`npm test`) as verify commands — those run in the final Step 7.

---

## Debug Sub-Agent

### When to Spawn

A debug sub-agent is spawned when a verification command returns a **non-zero exit code**. The sub-agent diagnoses the failure and suggests repair actions.

### Prompt Template

```markdown
# Debug Diagnosis

## Failed Verification
**Task**: {task description}
**Command**: {verify command}
**Exit Code**: {exit code}

## Error Output
```
{stderr + stdout from the failed command, truncated to 200 lines}
```

## Task Context
**File**: {primary file being modified}
**Phase**: {phase name}
**What was implemented**: {brief description of what the task did}

## File Content
```
{content of the primary file, truncated to 300 lines}
```

## Instructions
Analyze the error output and diagnose the root cause. Return a JSON object with your diagnosis and suggested repair actions. Do NOT fix the code — only diagnose.

Return ONLY a JSON object (no markdown fences):
{see Debug Return Schema below}
```

### Debug Return Schema

```json
{
  "root_cause": "Missing import for AuthMiddleware type used on line 15",
  "category": "import_missing",
  "repair_actions": [
    "Add import { AuthMiddleware } from '../types/auth' to src/middleware/auth.ts"
  ],
  "confidence": "high",
  "file_to_fix": "src/middleware/auth.ts"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `root_cause` | string | Yes | Human-readable description of what went wrong |
| `category` | string | Yes | Error category: `import_missing`, `type_error`, `syntax_error`, `runtime_error`, `test_failure`, `config_error`, `other` |
| `repair_actions` | string[] | Yes | Ordered list of specific actions to fix the issue |
| `confidence` | `"high" \| "medium" \| "low"` | Yes | How confident the diagnosis is |
| `file_to_fix` | string | Yes | Primary file that needs modification |

### Sub-Agent Configuration

- **Model**: Always uses haiku (fast tier) — diagnosis is a focused, low-complexity task
- **Mode**: `"auto"`
- **Read-only**: The debug sub-agent does NOT modify files — it only returns a diagnosis. The implementation sub-agent applies the repairs.

---

## Verification Loop

### Flow

```
1. Complete task implementation
2. Parse <verify> tag → extract command
3. Run command
4. If exit code == 0 → PASS (record result, continue)
5. If exit code != 0:
   a. Increment retry counter
   b. If retry counter > max_verify_retries → ESCALATE (record failure)
   c. Spawn debug sub-agent with error context
   d. Receive JSON diagnosis
   e. Apply repair actions from diagnosis
   f. Re-run verification command → go to step 4
```

### Retry Behavior

- **Retry counter**: Starts at 0, increments on each failed verification attempt
- **First attempt**: The initial verification run does NOT count as a retry
- **Max retries**: Controlled by `max_verify_retries` in `.flowconfig` (default: 2)
- **Example with default**: Initial attempt + 2 retries = 3 total verification runs maximum

### Escalation on Max Retries

When max retries are exceeded, the sub-agent:

1. Records the verification failure in the `task_verifications` array
2. Includes the last debug diagnosis in the failure record
3. Continues to the next task (does NOT abort the phase)
4. Sets overall phase `status` to `"partial"` if any task verification failed

The coordinator presents the failure to the user with the accumulated diagnosis:

```markdown
⚠️ Task verification failed after 2 retries:

**Task**: Create user authentication middleware in `src/middleware/auth.ts`
**Command**: `npx tsc --noEmit src/middleware/auth.ts`
**Last diagnosis**: Missing type export from @auth/core — dependency may need updating
**Category**: import_missing

Options:
1. Continue with remaining phases (issue noted)
2. Stop and fix manually
```

---

## Task Verifications Return Field

### Schema Extension

The phase isolation JSON return format is extended with an optional `task_verifications` array:

```json
{
  "status": "success",
  "phase": "Phase 2: API Integration",
  "summary": "Implemented auth middleware and rate limiting. One task required type import repair.",
  "files_created": ["src/middleware/auth.ts"],
  "files_modified": ["src/api/routes.ts"],
  "decisions": [],
  "deviations": [],
  "errors": [],
  "patterns_captured": [],
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

### Task Verification Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task` | string | Yes | Short description of the task (from plan) |
| `verify_command` | string | Yes | The verification command that was run |
| `status` | `"pass" \| "fail"` | Yes | Final verification outcome |
| `attempts` | number | Yes | Total verification attempts (1 = passed first try) |
| `repairs_applied` | string[] | Yes | List of repairs applied during retries (empty if passed first try) |
| `last_diagnosis` | object | No | Last debug sub-agent diagnosis (only present when `status: "fail"`) |

### When `task_verifications` is Omitted

- If a phase has **no tasks with `<verify>` tags**, the `task_verifications` field is omitted entirely from the JSON return
- This maintains backward compatibility — existing phase isolation returns are unchanged

---

## Configuration

### `.flowconfig` Setting

```yaml
max_verify_retries: 2    # Max repair attempts per task verification (default: 2, range: 1-5)
```

- **Default**: `2` (initial attempt + 2 retries = 3 total runs)
- **Range**: `1` to `5`
- **Values below 1 or above 5**: Clamped to the valid range with a warning

### Toggle via `/flow`

```
/flow max_verify_retries=3
```

### No Feature Toggle

Per-task verification has no on/off toggle. It activates automatically when tasks include `<verify>` tags. Plans without `<verify>` tags behave exactly as before — fully backward compatible.

---

## Error Handling

### Verification Command Errors

| Scenario | Behavior |
|----------|----------|
| Command not found | Treat as verification failure, spawn debug sub-agent |
| Command timeout (>30s) | Kill process, treat as failure, include timeout in error output |
| Command produces no output | Treat exit code as sole indicator (0 = pass, non-zero = fail) |
| Command produces large output | Truncate to 200 lines before passing to debug sub-agent |

### Debug Sub-Agent Errors

| Scenario | Behavior |
|----------|----------|
| Invalid JSON return | Skip this retry, count as failed attempt |
| Sub-agent timeout | Skip this retry, count as failed attempt |
| Empty repair_actions | Skip repair, re-run verification (may pass if issue was transient) |

### Phase-Level Impact

| Verification Outcome | Phase Status |
|----------------------|-------------|
| All verifications pass | `"success"` (no change) |
| Some verifications fail (max retries exceeded) | `"partial"` |
| Task implementation itself fails | `"failure"` (existing behavior, unrelated to verification) |

---

## Interaction with Wave Mode

Per-task verification is **entirely internal** to each phase sub-agent. The wave coordinator:

- Does NOT know about individual task verifications during execution
- Receives `task_verifications` in the JSON return after the sub-agent completes
- Displays verification stats in the wave completion summary
- Does NOT retry phases based on verification failures (that is internal to the sub-agent)

```
Wave 1: Phase 1 (2 tasks verified: 2 pass), Phase 2 (3 tasks verified: 2 pass, 1 fail after 2 retries)
```

Wave execution treats a phase with failed verifications as `"partial"` — the same way it handles any partial result. The user decides whether to continue.

---

## Rules

1. **Verify is optional** — tasks without `<verify>` tags skip verification entirely
2. **Targeted commands only** — never use full builds or full test suites as verify commands
3. **Debug sub-agent is read-only** — it diagnoses but never modifies files
4. **Implementation sub-agent repairs** — only the phase sub-agent applies fixes
5. **Continue on failure** — failed verification does NOT abort the phase; it records the failure and continues to the next task
6. **Max retries are hard** — once exceeded, escalate to user; never increase retries dynamically
7. **First attempt is not a retry** — the initial verification run is attempt 1, retries start at attempt 2
8. **Truncate large output** — cap error output at 200 lines and file content at 300 lines for debug sub-agent
9. **Backward compatible** — phases without any `<verify>` tags produce no `task_verifications` field
10. **Wave-transparent** — wave coordinator sees only final results; verification loops are internal to phase sub-agents

---

## Related Files

| File | Purpose |
|------|---------|
| `.claude/resources/core/phase-isolation.md` | Sub-agent context template and JSON return format (extended by this feature) |
| `.claude/resources/core/wave-execution.md` | Wave coordinator behavior (verification is internal to sub-agents) |
| `.claude/resources/core/model-routing.md` | Model tier selection (debug sub-agent always uses haiku) |
| `.claude/resources/skills/execute-plan-skill.md` | Execute-plan skill with verification result display |
| `.claude/resources/skills/create-plan-skill.md` | Auto-generation of `<verify>` sections in plans |
| `.claude/resources/patterns/plans-templates.md` | Plan template with `<verify>` tag syntax |
