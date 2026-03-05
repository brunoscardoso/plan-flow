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
  Enables or disables autopilot flow mode. When enabled, actionable requests
  automatically run the full plan-flow workflow without manual command invocation.
  Supports 4 workflow types: feature (default), bugfix, refactor, security.

USAGE:
  /flow -enable [type]   Enable autopilot mode with workflow type (default: feature)
  /flow -disable         Disable autopilot mode
  /flow -status          Show current autopilot state and workflow type
  /flow                  Same as -status
  /flow -help            Show this help

WORKFLOW TYPES:
  feature    New functionality, behavior changes (default)
             Steps: contracts → discovery → plan → execute → review → archive
  bugfix     Bug reports, error fixes, regression fixes
             Steps: review (diagnostic) → plan → execute → review (verification) → archive
  refactor   Code restructuring, tech debt, pattern migration
             Steps: review (baseline) → discovery → plan → execute → review (comparison) → archive
  security   Security hardening, vulnerability fixes, auth changes
             Steps: review (audit) → discovery → plan → execute → review (verification) → archive

BEHAVIOR WHEN ENABLED:
  - Actionable requests → full flow using the active workflow type
  - Trivial tasks (below workflow threshold) → executed directly, no flow
  - Questions/exploration → answered normally
  - Slash commands → run as normal

MANDATORY CHECKPOINTS (even in autopilot):
  - Discovery phase: pauses for user Q&A (feature, refactor, security)
  - Plan review: pauses for user approval before execution (all workflows)
  - Security review: pauses for user approval after execution (security only)

CONTEXT MANAGEMENT:
  - Only loads the relevant command context at each step
  - Suggests context cleanup (/clear) after each completed flow cycle

STATE:
  Persisted in flow/.autopilot (survives session restarts)
  File content determines workflow type (empty = feature)
```

---

> **AGENT_PROFILE: write-restricted**
> See `.claude/resources/core/agent-profiles.md` for tool access rules.

## Instructions

### When invoked with `-enable` or `-enable <type>`

1. Parse the workflow type from the argument (default: `feature`)
   - Valid types: `feature`, `bugfix`, `refactor`, `security`
   - If an invalid type is provided, show an error and list valid types
2. Create the file `flow/.autopilot` with the workflow type as content
   - For `feature` (default), write `feature` to the file
   - For other types, write the type name (e.g., `bugfix`, `refactor`, `security`)
3. Confirm to the user:

```markdown
Autopilot flow mode **enabled** (workflow: **[type]**).

From now on, actionable requests will automatically run the [type] workflow:
[Show step sequence for the active workflow type]

Trivial tasks and questions are handled normally without the flow.

Use `/flow -enable <type>` to switch workflow, `/flow -disable` to turn off, or `/flow -status` to check state.
```

### When invoked with `-disable`

1. Delete the file `flow/.autopilot` (if it exists)
2. Delete `flow/state/autopilot-progress.md` (if it exists — cleans up any in-progress workflow tracking)
3. Confirm to the user:

```markdown
Autopilot flow mode **disabled**.

Commands will no longer auto-chain. Use individual slash commands as before:
`/discovery-plan` → `/create-plan` → `/execute-plan` → `/review-code`
```

### When invoked with `-status` or no arguments

1. Check if `flow/.autopilot` exists
2. If exists, read its content to determine active workflow type
3. Check if `flow/state/autopilot-progress.md` exists — if so, read it to show workflow progress
4. Report:

```markdown
Autopilot flow mode: **[ENABLED/DISABLED]**

[If enabled]:
- **Workflow type**: [feature/bugfix/refactor/security]
- **Steps**: [step sequence for active workflow]
- Actionable requests will automatically run the [type] workflow.

[If enabled AND autopilot-progress.md exists]:
- **Active workflow**: [feature name]
- **Progress**: Step [N] of [total] ([step name])
- **Completed**: [list of done steps]
- **Next**: [description of current/next step]

[If disabled]: Use individual slash commands to run each step manually.
```

---

## Critical Rules

| Rule | Description |
| --- | --- |
| **File-based state** | State is stored in `flow/.autopilot` - create to enable, delete to disable |
| **Workflow type in file content** | The workflow type is written as file content (e.g., `feature`, `bugfix`, `refactor`, `security`) |
| **No other side effects** | This command ONLY manages the marker file. It does not run any workflow steps. |
| **Complete and stop** | After toggling state, STOP and wait for user input |
