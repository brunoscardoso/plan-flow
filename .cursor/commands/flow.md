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
  Supports auto-detect mode (default) and 4 locked workflow types.

USAGE:
  /flow -enable          Enable autopilot with auto-detect (default)
  /flow -enable [type]   Enable autopilot locked to a specific workflow type
  /flow -disable         Disable autopilot mode
  /flow -status          Show current autopilot state and workflow type
  /flow                  Same as -status
  /flow -help            Show this help

MODES:
  auto       Auto-detect workflow type per input using signal analysis (default)
             Each request is independently classified as feature/bugfix/refactor/security

WORKFLOW TYPES (for locked mode):
  feature    New functionality, behavior changes
             Steps: contracts → discovery → plan → execute → review → archive
  bugfix     Bug reports, error fixes, regression fixes
             Steps: review (diagnostic) → plan → execute → review (verification) → archive
  refactor   Code restructuring, tech debt, pattern migration
             Steps: review (baseline) → discovery → plan → execute → review (comparison) → archive
  security   Security hardening, vulnerability fixes, auth changes
             Steps: review (audit) → discovery → plan → execute → review (verification) → archive

BEHAVIOR WHEN ENABLED:
  - Actionable requests → full flow using auto-detected or locked workflow type
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

GIT FLAGS (optional, combinable with any usage):
  commit=true         Auto-commit after each completed phase
  commit=false        Disable auto-commit (default)
  push=true           Auto-push after all phases complete (requires commit=true)
  push=false          Disable auto-push (default)
  branch=<name>       Target branch for commits (default: current branch)

STATE:
  Persisted in flow/.autopilot (survives session restarts)
  File content: "auto" for auto-detect, or a specific type for locked mode
  Git settings persisted in flow/.gitcontrol (YAML format)

EXAMPLES:
  /flow -enable              # Auto-detect mode (recommended)
  /flow -enable bugfix       # Lock to bugfix workflow only
  /flow -enable security     # Lock to security workflow only
  /flow commit=true push=true -enable  # Enable with git control
  /flow commit=true          # Set git control only (no autopilot change)
  /flow -disable             # Turn off autopilot + clear git control
```

---

> **AGENT_PROFILE: write-restricted**
> See `.claude/resources/core/agent-profiles.md` for tool access rules.

## Instructions

### Step 0: Parse Git Flags

Before processing any subcommand, extract git flags from the input:

1. Scan for `commit=true|false`, `push=true|false`, `branch=<name>` in the input
2. Remove matched flags from the input (the rest is the prompt or subcommand)
3. If any git flag is found, update `flow/.gitcontrol`:

```yaml
# flow/.gitcontrol
commit: true
push: true
branch: development
```

4. If `push=true` but `commit` is not set or is `false`, warn and set `commit=true` automatically
5. If no git flags are provided, leave `flow/.gitcontrol` unchanged

---

### When invoked with `-enable` or `-enable <type>`

1. Parse the argument:
   - No argument → **auto-detect mode** (default)
   - Valid types: `feature`, `bugfix`, `refactor`, `security` → **locked mode**
   - If an invalid type is provided, show an error and list valid types
2. Create the file `flow/.autopilot` with the mode as content:
   - No argument: write `auto` to the file
   - Specific type: write the type name (e.g., `bugfix`, `refactor`, `security`, `feature`)
3. Confirm to the user:

**For auto-detect mode:**

```markdown
Autopilot flow mode **enabled** (mode: **auto-detect**).

From now on, each actionable request will be automatically classified:
- Security signals → security workflow
- Bug/error signals → bugfix workflow
- Refactor signals → refactor workflow
- Everything else → feature workflow

Trivial tasks and questions are handled normally without the flow.

Use `/flow -enable <type>` to lock to a specific workflow, `/flow -disable` to turn off, or `/flow -status` to check state.
```

**For locked mode:**

```markdown
Autopilot flow mode **enabled** (workflow: **[type]** — locked).

From now on, ALL actionable requests will run the [type] workflow:
[Show step sequence for the active workflow type]

Trivial tasks and questions are handled normally without the flow.

Use `/flow -enable` to switch to auto-detect, `/flow -enable <type>` to switch workflow, or `/flow -disable` to turn off.
```

### When invoked with `-disable`

1. Delete the file `flow/.autopilot` (if it exists)
2. Delete the file `flow/.gitcontrol` (if it exists)
3. Delete `flow/state/autopilot-progress.md` (if it exists — cleans up any in-progress workflow tracking)
4. Confirm to the user:

```markdown
Autopilot flow mode **disabled**.
Git control: cleared.

Commands will no longer auto-chain. Use individual slash commands as before:
`/discovery-plan` → `/create-plan` → `/execute-plan` → `/review-code`
```

### When invoked with `-status` or no arguments

1. Check if `flow/.autopilot` exists
2. If exists, read its content to determine mode:
   - Content is `auto` → auto-detect mode
   - Content is `feature`, `bugfix`, `refactor`, or `security` → locked to that type
   - Empty or unrecognized → treat as `auto`
3. Check if `flow/state/autopilot-progress.md` exists — if so, read it to show workflow progress
4. Report:

```markdown
Autopilot flow mode: **[ENABLED/DISABLED]**

[If enabled — auto-detect]:
- **Mode**: auto-detect
- Each actionable request is classified independently (security > bugfix > refactor > feature)

[If enabled — locked]:
- **Mode**: locked — **[type]**
- **Steps**: [step sequence for the locked workflow type]
- ALL actionable requests will run the [type] workflow.

[If enabled AND autopilot-progress.md exists]:
- **Active workflow**: [feature name]
- **Detected type**: [workflow type for current input]
- **Progress**: Step [N] of [total] ([step name])
- **Completed**: [list of done steps]
- **Next**: [description of current/next step]

[If disabled]: Use individual slash commands to run each step manually.
```

---

## Critical Rules

| Rule | Description |
| --- | --- |
| **File-based state** | Autopilot in `flow/.autopilot`, git control in `flow/.gitcontrol` |
| **Mode in file content** | File content is `auto` (auto-detect) or a specific type (`feature`, `bugfix`, `refactor`, `security`) for locked mode |
| **No other side effects** | This command ONLY manages marker/config files. It does not run any workflow steps. |
| **Complete and stop** | After toggling state, STOP and wait for user input |
| **Git flags are independent** | Git control works with or without autopilot mode |
