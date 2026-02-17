---
description: Toggle autopilot flow mode - automatically orchestrates discovery, planning, execution, and review for feature requests
---

# Flow: Autopilot Mode Toggle

## Command Description

This command enables or disables **autopilot flow mode**. When enabled, every new user input is automatically classified and, if it's a feature request, the full plan-flow workflow runs automatically:

**contracts check → discovery → plan → execute → review-code → archive**

The LLM pauses only at mandatory checkpoints (discovery Q&A, plan approval).

---

## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/flow - Autopilot Flow Mode Toggle

DESCRIPTION:
  Enables or disables autopilot flow mode. When enabled, feature requests
  automatically run the full plan-flow workflow without manual command invocation.

USAGE:
  /flow -enable       Enable autopilot mode (persists across sessions)
  /flow -disable      Disable autopilot mode
  /flow -status       Show current autopilot state
  /flow               Same as -status
  /flow -help         Show this help

BEHAVIOR WHEN ENABLED:
  - Feature requests → full flow (discovery → plan → execute → review → archive)
  - Trivial tasks (complexity 0-2) → executed directly, no flow
  - Questions/exploration → answered normally
  - Slash commands → run as normal

MANDATORY CHECKPOINTS (even in autopilot):
  - Discovery phase: pauses for user Q&A
  - Plan review: pauses for user approval before execution

CONTEXT MANAGEMENT:
  - Only loads the relevant command context at each step
  - Suggests context cleanup (/clear) after each completed flow cycle

STATE:
  Persisted in flow/.autopilot (survives session restarts)
```

---

## Instructions

### When invoked with `-enable`

1. Create the file `flow/.autopilot` (empty file)
2. Confirm to the user:

```markdown
Autopilot flow mode **enabled**.

From now on, feature requests will automatically run the full workflow:
1. Check contracts → 2. Discovery (pause for Q&A) → 3. Create plan (pause for approval) → 4. Execute plan → 5. Review code → 6. Archive

Trivial tasks and questions are handled normally without the flow.

Use `/flow -disable` to turn off, or `/flow -status` to check state.
```

### When invoked with `-disable`

1. Delete the file `flow/.autopilot` (if it exists)
2. Confirm to the user:

```markdown
Autopilot flow mode **disabled**.

Commands will no longer auto-chain. Use individual slash commands as before:
`/discovery-plan` → `/create-plan` → `/execute-plan` → `/review-code`
```

### When invoked with `-status` or no arguments

1. Check if `flow/.autopilot` exists
2. Report:

```markdown
Autopilot flow mode: **[ENABLED/DISABLED]**

[If enabled]: Feature requests will automatically run the full workflow.
[If disabled]: Use individual slash commands to run each step manually.
```

---

## Critical Rules

| Rule | Description |
| --- | --- |
| **File-based state** | State is stored in `flow/.autopilot` - create to enable, delete to disable |
| **No other side effects** | This command ONLY manages the marker file. It does not run any workflow steps. |
| **Complete and stop** | After toggling state, STOP and wait for user input |
