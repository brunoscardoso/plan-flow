
# Execution Audit Trail

## Overview

The execution audit trail logs every meaningful event during plan-flow workflows to `flow/audit.log` in JSONL (JSON Lines) format. Each line is a self-contained JSON object with a timestamp, event type, and structured data.

The audit trail complements `flow/log.md` (human-readable heartbeat) with machine-parseable, granular event records for forensic debugging and workflow analysis.

**Reference Codes**: COR-AUD-1 (event types), COR-AUD-2 (integration rules)

---

## COR-AUD-1: Event Types

### command_start

Logged when a plan-flow command begins execution.

```json
{"ts":"2026-03-04T14:30:00Z","event":"command_start","command":"execute-plan","feature":"user_auth","workflow":"feature"}
```

| Field | Type | Description |
|-------|------|-------------|
| command | string | Command name (discovery, create-plan, execute-plan, review-code, setup) |
| feature | string | Feature name (snake_case) |
| workflow | string | Active workflow type (feature/bugfix/refactor/security) or "manual" |

### command_end

Logged when a plan-flow command completes.

```json
{"ts":"2026-03-04T14:35:00Z","event":"command_end","command":"execute-plan","status":"completed","summary":"3 phases completed, all tests passing"}
```

| Field | Type | Description |
|-------|------|-------------|
| command | string | Command name |
| status | string | "completed", "failed", "aborted" |
| summary | string | Brief outcome description |

### phase_start

Logged when a plan phase begins execution.

```json
{"ts":"2026-03-04T14:30:05Z","event":"phase_start","phase":1,"name":"Types and Interfaces","complexity":3}
```

| Field | Type | Description |
|-------|------|-------------|
| phase | number | Phase number |
| name | string | Phase name from plan |
| complexity | number | Complexity score (0-10) |

### phase_end

Logged when a plan phase completes.

```json
{"ts":"2026-03-04T14:32:00Z","event":"phase_end","phase":1,"name":"Types and Interfaces","status":"completed","files_changed":3}
```

| Field | Type | Description |
|-------|------|-------------|
| phase | number | Phase number |
| name | string | Phase name |
| status | string | "completed", "failed" |
| files_changed | number | Count of files modified/created in this phase |

### file_created

Logged when a new file is created.

```json
{"ts":"2026-03-04T14:31:02Z","event":"file_created","path":"src/types/auth.ts"}
```

### file_modified

Logged when an existing file is edited.

```json
{"ts":"2026-03-04T14:31:00Z","event":"file_modified","path":"src/types/user.ts"}
```

### file_deleted

Logged when a file is removed.

```json
{"ts":"2026-03-04T14:31:05Z","event":"file_deleted","path":"src/types/old-auth.ts"}
```

### verification

Logged after build/test verification runs.

```json
{"ts":"2026-03-04T14:35:00Z","event":"verification","build":"pass","tests":"pass","test_count":"45/45"}
```

| Field | Type | Description |
|-------|------|-------------|
| build | string | "pass" or "fail" |
| tests | string | "pass" or "fail" |
| test_count | string | "passed/total" format |

### error

Logged when an error is encountered during execution.

```json
{"ts":"2026-03-04T14:33:00Z","event":"error","message":"Type error in user.ts","phase":2,"recoverable":true}
```

| Field | Type | Description |
|-------|------|-------------|
| message | string | Error description |
| phase | number | Phase where error occurred (if applicable) |
| recoverable | boolean | Whether execution continued |

### checkpoint

Logged when a git checkpoint commit is made.

```json
{"ts":"2026-03-04T14:32:30Z","event":"checkpoint","sha":"abc123f","message":"planflow: Phase 1 complete"}
```

| Field | Type | Description |
|-------|------|-------------|
| sha | string | Git commit SHA (short) |
| message | string | Commit message |

---

## COR-AUD-2: Integration Rules

### Writing to the Audit Log

1. **File location**: Always write to `flow/audit.log`
2. **Create if missing**: If `flow/audit.log` doesn't exist, create it
3. **Append-only**: Always append new lines — NEVER truncate, overwrite, or delete existing entries
4. **One JSON per line**: Each entry is a single line of valid JSON (JSONL format)
5. **Timestamp format**: ISO 8601 with timezone (`2026-03-04T14:30:00Z`)
6. **Feature name**: Use the snake_case feature name consistent with plan/discovery naming

### When to Log

| Skill | Events to Log |
|-------|--------------|
| execute-plan | command_start, phase_start, phase_end, file_created/modified/deleted, verification, checkpoint, error, command_end |
| discovery | command_start, file_created (discovery doc), command_end |
| create-plan | command_start, file_created (plan doc), command_end |
| review-code | command_start, file_created (review doc), command_end |
| setup | command_start, file_created (generated files), command_end |

### File Change Detection

For `file_created`, `file_modified`, and `file_deleted` events during execute-plan:
- After each phase completes, run `git diff --name-only --diff-filter=A` (added), `git diff --name-only --diff-filter=M` (modified), `git diff --name-only --diff-filter=D` (deleted) to detect changes
- Log one event per file changed
- Only log project source files — skip `flow/` directory files (plans, discovery, handoffs, brain, etc.)

### Lifecycle

- **Not archived**: Unlike plans and discovery docs, `flow/audit.log` is a running log that spans multiple features. It is NOT moved to `flow/archive/` on flow completion.
- **Manual cleanup**: Users can clear or rotate the audit log manually when it grows large
- **Backward compatible**: If a skill doesn't produce audit events, the system works normally

### Reading the Audit Log

The audit log can be queried with standard tools:
- `grep '"event":"error"' flow/audit.log` — find all errors
- `grep '"command":"execute-plan"' flow/audit.log` — find execution events
- `grep '"feature":"user_auth"' flow/audit.log` — find events for a specific feature
- `jq -s '.' flow/audit.log` — parse all entries as JSON array
