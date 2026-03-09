
# Project Tasklist

## Purpose

A persistent project todo list that tracks work items across sessions. The tasklist is loaded at session start to provide continuity and help users pick up where they left off.

**Location**: `flow/tasklist.md`

---

## Behavior

### CRITICAL: All Tasks MUST Be Written to Disk

**NEVER keep tasks in-memory only.** Every task addition, status change, or update MUST be written to `flow/tasklist.md` immediately using the Edit or Write tool. If a user asks to add tasks to the tasklist, you MUST edit the file — not just acknowledge the tasks in conversation. The tasklist is a **file on disk**, not a conversation artifact.

### On Session Start

1. Check if `flow/tasklist.md` exists
2. If it exists: read it silently and internalize the content
3. Present a brief summary of active tasks:
   - Count of **In Progress** items
   - Count of **To Do** items
4. Ask the user if they want to pick a task from the list
5. Do NOT read the full tasklist aloud — just summarize counts and top items

### During Work

- When a task is picked by the user, mark it as **In Progress** in `flow/tasklist.md`
- When a task is completed (skill finishes successfully), move it to **Done** with the completion date
- When new work items are discovered during execution, add them to **To Do**
- Update `flow/tasklist.md` in real-time as work progresses
- **EVERY update MUST be persisted to `flow/tasklist.md` via Edit/Write tool — no exceptions**

### Task Format

```markdown
## In Progress

- [ ] Task description — started {YYYY-MM-DD}

## To Do

- [ ] Task description
- [ ] Task description — scheduled [[heartbeat#task-name]] {YYYY-MM-DD HH:MM}

## Done

- [x] Task description — completed {YYYY-MM-DD}
```

---

## Command Integration

Every plan-flow command MUST update the tasklist at specific points. This is what makes the tasklist a living document.

### When Each Command Updates the Tasklist

| Command | On Start | On Complete | Next Task Added |
|---------|----------|-------------|-----------------|
| `/discovery-plan` | Add "Discovery: {feature}" → In Progress | Move to Done | Add "Create plan for {feature}" → To Do |
| `/create-plan` | Add "Plan: {feature}" → In Progress | Move to Done | Add "Execute plan for {feature}" → To Do |
| `/execute-plan` | Add "Execute: {feature}" → In Progress | Move to Done | Add "Review code for {feature}" → To Do |
| `/review-code` | Add "Review: {scope}" → In Progress | Move to Done | — |
| `/review-pr` | Add "Review PR: #{number}" → In Progress | Move to Done | — |
| `/write-tests` | Add "Tests: {scope}" → In Progress | Move to Done | — |

### Update Rules

1. **On command start**: Check if the task already exists in the tasklist. If yes, move it to In Progress. If no, add it to In Progress.
2. **On command complete**: Move the task from In Progress to Done with today's date.
3. **Next step task**: After completing, add the logical next step to To Do (discovery → plan → execute → review).
4. **User requests**: When the user asks for something outside a command (e.g., "fix this bug", "add this feature"), add it as a task to In Progress immediately.

### Example Flow

```
User runs: /discovery-plan "User authentication"
→ Tasklist adds: "Discovery: user_authentication" → In Progress

Discovery completes:
→ Tasklist moves: "Discovery: user_authentication" → Done (2026-03-07)
→ Tasklist adds: "Create plan for user_authentication" → To Do

User runs: /create-plan @flow/discovery/discovery_user_authentication_v1.md
→ Tasklist moves: "Create plan for user_authentication" → In Progress

Plan completes:
→ Tasklist moves: "Create plan for user_authentication" → Done (2026-03-07)
→ Tasklist adds: "Execute plan for user_authentication" → To Do
```

---

## Global Tasklist Integration

The project tasklist is linked into the central Obsidian vault at `~/plan-flow/brain/projects/{project}/tasklist.md` (symlink). A **global tasklist** at `~/plan-flow/brain/tasklist.md` aggregates all projects, showing task counts per project for a bird's-eye view.

### How It Works

1. During `plan-flow init`, the project's `flow/tasklist.md` is symlinked into the vault
2. A global `~/plan-flow/brain/tasklist.md` is generated with per-project summaries
3. Each project summary shows In Progress / To Do / Done counts
4. Obsidian `[[project-name]]` links connect the global view to each project

### Global Tasklist Format

```markdown
# Global Tasklist

**Last Updated**: 2026-03-07
**Projects**: 3

---

### [[my-app]]

| Status | Count |
|--------|-------|
| In Progress | 2 |
| To Do | 5 |
| Done | 8 |

> See: [[my-app/tasklist.md|Full Tasklist]]

### [[api-service]]

| Status | Count |
|--------|-------|
| In Progress | 1 |
| To Do | 3 |
| Done | 12 |

> See: [[api-service/tasklist.md|Full Tasklist]]
```

### When Global Updates Happen

The global tasklist is regenerated:
- On `plan-flow init` (during vault registration)
- Engineers can refresh it manually by re-running `plan-flow init`

> **Note**: The global tasklist is a snapshot. Since each project's tasklist is symlinked into the vault, Obsidian users can navigate directly to any project's live tasklist via the `[[project/tasklist.md]]` link.

---

## Heartbeat Integration (Scheduled Tasks)

When a user adds a task to the tasklist with a time expression (e.g., "in 1 hour", "at 3:00 PM", "tomorrow at 9 AM"), the task becomes a **scheduled task** that integrates with the heartbeat daemon.

### How It Works

1. **Detect schedule**: Parse time expressions from user input:
   - `in {N} hours/minutes` → relative schedule
   - `at {HH:MM AM/PM}` → absolute time today
   - `tomorrow at {HH:MM}` → absolute time tomorrow
   - `on {day} at {HH:MM}` → specific day and time
2. **Add to tasklist**: Add the task to **To Do** in `flow/tasklist.md` with a schedule annotation:
   ```markdown
   - [ ] Feature xyz — scheduled [[heartbeat#task-feature-xyz]] {YYYY-MM-DD HH:MM}
   ```
3. **Add to heartbeat**: Create a one-shot task in `flow/heartbeat.md`:
   ```markdown
   ### task-feature-xyz
   - **Schedule**: in 1 hour
   - **Command**: execute tasklist item "Feature xyz"
   - **Enabled**: true
   - **Description**: Scheduled from tasklist — Feature xyz
   - **One-Shot**: true
   - **Tasklist Link**: [[tasklist.md#Feature xyz]]
   ```
4. **On execution**: When the heartbeat daemon fires the task, it opens a Claude Code session and executes the tasklist item via the appropriate flow command
5. **On completion**: The heartbeat task is disabled (`Enabled: false`), and the tasklist item moves to **Done**

### Schedule Conversion

| User Input | Heartbeat Schedule |
|---|---|
| `in 1 hour` | `in 1 hour` (relative from now) |
| `in 30 minutes` | `in 30 minutes` |
| `at 3:00 PM` | `daily at 3:00 PM` (one-shot) |
| `tomorrow at 9 AM` | `daily at 9:00 AM` (one-shot, starts tomorrow) |
| `every day at 10 PM` | `daily at 10:00 PM` (recurring) |

### One-Shot vs Recurring

- **One-shot** (`One-Shot: true`): Executes once and auto-disables. Used for "in X hours" and specific time requests.
- **Recurring** (no `One-Shot` field): Keeps running on schedule. Used when user explicitly says "every day", "every 6 hours", etc.

### Linking

Both files cross-reference each other:
- Tasklist entry links to heartbeat: `[[heartbeat#task-name]]`
- Heartbeat entry links to tasklist: `[[tasklist.md#Task description]]`

This allows Obsidian users to navigate between scheduled tasks and their heartbeat definitions.

### Rules

1. **Always ask before scheduling**: If the user says "add to tasklist and execute in 1 hour", confirm the schedule before creating the heartbeat entry
2. **One-shot by default**: Unless the user explicitly says "every" or "recurring", treat scheduled tasks as one-shot
3. **Don't execute now**: Adding a scheduled task only creates the entries — the heartbeat daemon handles execution at the scheduled time
4. **Clean up**: After a one-shot task completes, move it to Done in tasklist and disable it in heartbeat

---

## Brain Integration

When a task is completed:

1. Update the task status in `flow/tasklist.md`
2. If the task generated brain-capture blocks, those are processed normally by the brain-capture pipeline
3. The tasklist is a coordination tool — the brain captures the detailed history

---

## Rules

1. **Summarize, don't dump**: On session start, show counts and top 3 items, not the full list
2. **Real-time updates**: Update tasklist immediately when status changes, don't batch
3. **No duplicates**: Before adding a task, check if it already exists (check all sections)
4. **Clean completed**: Keep **Done** section to last 10 items; older items can be removed
5. **User-driven**: Only pick/execute tasks when the user explicitly asks to. NEVER auto-execute a task just because it was added to the tasklist.
6. **Always update**: Every command MUST update the tasklist — this is not optional
7. **Add vs Execute**: When the user says "add to tasklist" or "add a task for X", ONLY add it to **To Do**. Do NOT start working on it. Only execute when the user explicitly says "do this", "implement this", "work on X", or invokes a command.
8. **Tasklist is a backlog**: The tasklist is a planning tool, not an execution trigger. Adding a task is separate from executing it.
9. **Persist to disk — ALWAYS**: Every task addition or status change MUST be written to `flow/tasklist.md` using Edit or Write. NEVER keep tasks only in conversation memory. If you added tasks but did not call Edit/Write on `flow/tasklist.md`, you have a bug — fix it immediately.
