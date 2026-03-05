
# Autopilot Progress Patterns

## Overview

The autopilot progress file provides persistent workflow state tracking for multi-step autopilot workflows. It enables clean resumption across context compactions and session restarts.

**Reference Codes**: PTN-APR-1 (progress file format), PTN-APR-2 (lifecycle rules)

---

## PTN-APR-1: Progress File Format

### File Location

`flow/state/autopilot-progress.md`

### Template

```markdown
# Autopilot Progress

**Feature**: <feature_name>
**Workflow**: <feature|bugfix|refactor|security>
**Started**: <ISO 8601 timestamp>

## Steps

| # | Step | Status | Artifact | Notes |
|---|------|--------|----------|-------|
| 1 | Contracts check | done | — | No contracts found |
| 2 | Discovery | done | flow/discovery/discovery_<feature>_v1.md | 5 FRs, 3 NFRs |
| 3 | Create plan | in-progress | flow/plans/plan_<feature>_v1.md | 4 phases |
| 4 | Execute plan | pending | — | — |
| 5 | Review code | pending | — | — |
| 6 | Archive | pending | — | — |

## Checkpoints

- [x] Discovery Q&A: 3 questions answered
- [ ] Plan approval: pending
- [ ] Security review: n/a

## Current Context

<1-3 sentences describing what's happening right now and what to do next>
```

### Step Status Values

| Status | Meaning |
|--------|---------|
| `done` | Step completed successfully |
| `in-progress` | Currently executing this step |
| `pending` | Not yet started |
| `skipped` | Not applicable for this workflow (e.g., contracts check when none exist) |

### Checkpoint Recording

Record user decisions at mandatory checkpoints:

- **Discovery Q&A**: `N questions answered` or `skipped (bugfix workflow)`
- **Plan approval**: `approved`, `approved after refinement`, or `rejected`
- **Security review**: `approved`, `rejected`, or `n/a` (non-security workflows)

### Current Context Section

Keep this section updated with 1-3 sentences that answer:
1. What is happening right now?
2. What should happen next?
3. Any blockers or important context?

This section is the primary resume aid for compacted/restarted sessions.

---

## PTN-APR-2: Lifecycle Rules

### Creation

Create `flow/state/autopilot-progress.md` when:
- An actionable request triggers a workflow in autopilot mode
- Only create if the file does NOT already exist (to avoid overwriting mid-workflow progress)

### Updates

Update the progress file at these points:
1. **After each workflow step completes** — mark step as `done`, update artifact path, add notes
2. **When starting a new step** — mark it as `in-progress`
3. **At mandatory checkpoints** — record user decision in the Checkpoints section
4. **During execute-plan phase transitions** — update Current Context with phase progress

### Deletion

Delete `flow/state/autopilot-progress.md` when:
- The archive step completes successfully (workflow done)
- User runs `/flow -disable` (autopilot turned off)
- User manually deletes it (`rm flow/state/autopilot-progress.md`)

### Resumption

When the progress file exists at session start:
1. Read it to understand workflow state
2. Identify the current step (the one marked `in-progress` or the first `pending` step)
3. Resume from that step
4. If the file is stale (>7 days since last update), warn the user

### Backward Compatibility

- If the progress file does not exist, autopilot works normally (no change to existing behavior)
- The progress file is informational — it does not control workflow logic, it records it
- Skills and commands do not depend on the progress file existing

### Workflow-Specific Step Tables

Each workflow type has a different number and sequence of steps:

**Feature** (6 steps): Contracts → Discovery → Plan → Execute → Review → Archive

**Bugfix** (5 steps): Review (diagnostic) → Plan → Execute → Review (verification) → Archive

**Refactor** (6 steps): Review (baseline) → Discovery → Plan → Execute → Review (comparison) → Archive

**Security** (6 steps): Review (audit) → Discovery → Plan → Execute → Review (verification) → Archive
