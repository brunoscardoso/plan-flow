
# Project Tasklist

## Purpose

A persistent project todo list that tracks work items across sessions. The tasklist is loaded at session start to provide continuity and help users pick up where they left off.

**Location**: `flow/tasklist.md`

---

## Behavior

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

### Task Format

```markdown
## In Progress

- [ ] Task description — started {YYYY-MM-DD}

## To Do

- [ ] Task description

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
5. **User-driven**: Only pick tasks when the user explicitly chooses one
6. **Always update**: Every command MUST update the tasklist — this is not optional
7. **Ad-hoc tasks**: When the user asks for work outside a command, add it to In Progress immediately and mark Done when complete
