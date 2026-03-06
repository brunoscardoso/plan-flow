
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

## Brain Integration

When a task is completed:

1. Update the task status in `flow/tasklist.md`
2. If the task generated brain-capture blocks, those are processed normally by the brain-capture pipeline
3. The tasklist is a coordination tool — the brain captures the detailed history

---

## Rules

1. **Summarize, don't dump**: On session start, show counts and top 3 items, not the full list
2. **Real-time updates**: Update tasklist immediately when status changes, don't batch
3. **No duplicates**: Before adding a task, check if it already exists
4. **Clean completed**: Keep **Done** section to last 10 items; older items can be removed
5. **User-driven**: Only pick tasks when the user explicitly chooses one
