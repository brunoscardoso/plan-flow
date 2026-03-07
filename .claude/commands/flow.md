---
description: Toggle autopilot flow mode or start the full workflow with a feature request. Use '/flow <prompt>' to enable autopilot and begin immediately.
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
  /flow <prompt>      Enable autopilot and start the flow with the given feature request
  /flow -enable       Enable autopilot mode (persists across sessions)
  /flow -disable      Disable autopilot mode
  /flow -status       Show current autopilot state
  /flow               Same as -status
  /flow -help         Show this help

GIT FLAGS (optional, combinable with any usage):
  commit=true         Auto-commit after each completed phase
  commit=false        Disable auto-commit (default)
  push=true           Auto-push after all phases complete (requires commit=true)
  push=false          Disable auto-push (default)
  branch=<name>       Target branch for commits (default: current branch)

EXAMPLES:
  /flow add dark mode support
  /flow commit=true push=true add user authentication
  /flow commit=true implement payment flow
  /flow -enable commit=true push=true
  /flow -disable

BEHAVIOR WHEN ENABLED:
  - Feature requests → full flow (discovery → plan → execute → review → archive)
  - Trivial tasks (complexity 0-2) → executed directly, no flow
  - Questions/exploration → answered normally
  - Slash commands → run as normal

GIT CONTROL (when commit=true):
  - After each phase completes: auto-commit with message
    "Phase N: <phase name> — <feature>"
  - After all phases + build/test pass: auto-push if push=true
  - If build/test fails: commit is made but push is skipped
  - push=true without commit=true is invalid (push requires commits)

MANDATORY CHECKPOINTS (even in autopilot):
  - Discovery phase: pauses for user Q&A
  - Plan review: pauses for user approval before execution

CONTEXT MANAGEMENT:
  - Only loads the relevant command context at each step
  - Suggests context cleanup (/clear) after each completed flow cycle

STATE:
  Persisted in flow/.autopilot (survives session restarts)
  Git settings persisted in flow/.gitcontrol (YAML format)
```

---

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

4. If `push=true` but `commit` is not set or is `false`, warn and set `commit=true` automatically:
   > `push=true` requires `commit=true`. Enabling auto-commit as well.

5. If no git flags are provided, leave `flow/.gitcontrol` unchanged (or don't create it)

**Validation**:
- `commit=true push=true` → Valid: commit after each phase, push at end
- `commit=true push=false` → Valid: commit after each phase, no push
- `commit=true` → Valid: same as above (push defaults to false)
- `push=true` → Auto-corrects: sets commit=true as well
- `commit=false` → Valid: disables auto-commit, removes `.gitcontrol` if no other flags

---

### When invoked with `-enable`

1. Create the file `flow/.autopilot` (empty file)
2. If git flags were parsed in Step 0, save them to `flow/.gitcontrol`
3. Confirm to the user:

```markdown
Autopilot flow mode **enabled**.

From now on, feature requests will automatically run the full workflow:
1. Check contracts → 2. Discovery (pause for Q&A) → 3. Create plan (pause for approval) → 4. Execute plan → 5. Review code → 6. Archive

Trivial tasks and questions are handled normally without the flow.

Use `/flow -disable` to turn off, or `/flow -status` to check state.
```

### When invoked with `-disable`

1. Delete the file `flow/.autopilot` (if it exists)
2. Delete the file `flow/.gitcontrol` (if it exists)
3. Confirm to the user:

```markdown
Autopilot flow mode **disabled**.
Git control: cleared.

Commands will no longer auto-chain. Use individual slash commands as before:
`/discovery-plan` → `/create-plan` → `/execute-plan` → `/review-code`
```

### When invoked with a prompt (e.g., `/flow commit=true add gemini support`)

If the user provides text that is NOT a flag (`-enable`, `-disable`, `-status`, `-help`), treat it as a **feature request with autopilot**:

1. Parse and save any git flags (Step 0)
2. Create the file `flow/.autopilot` if it doesn't already exist
3. Confirm autopilot is enabled (brief, one line — include git settings if set)
4. **Immediately start the flow** by invoking `/discovery-plan` with the user's prompt as the feature description

**Examples**:
- `/flow add dark mode support` → Enable autopilot, run discovery (no git control)
- `/flow commit=true push=true add user auth` → Enable autopilot + git control, run discovery

---

### When invoked with `-status` or no arguments

1. Check if `flow/.autopilot` exists
2. Check if `flow/.gitcontrol` exists and read its contents
3. Report:

```markdown
Autopilot flow mode: **[ENABLED/DISABLED]**
Git control: **[commit: true/false, push: true/false, branch: <name>]** (or "not configured")

[If enabled]: Feature requests will automatically run the full workflow.
[If disabled]: Use individual slash commands to run each step manually.
```

---

### When invoked with ONLY git flags (e.g., `/flow commit=true push=true`)

If the input contains only git flags and no other text or subcommand:

1. Parse and save git flags to `flow/.gitcontrol`
2. Do NOT change autopilot state (leave `.autopilot` as-is)
3. Confirm:

```markdown
Git control updated:
- Auto-commit: **[true/false]**
- Auto-push: **[true/false]**
- Branch: **[name or current]**

These settings apply to `/execute-plan` regardless of autopilot mode.
```

> **Note**: Git control works independently of autopilot. You can set `commit=true` without enabling autopilot — `/execute-plan` will still respect the git flags.

---

## Critical Rules

| Rule | Description |
| --- | --- |
| **File-based state** | Autopilot in `flow/.autopilot`, git control in `flow/.gitcontrol` |
| **No other side effects** | This command ONLY manages marker/config files. It does not run any workflow steps. |
| **Complete and stop** | After toggling state, STOP and wait for user input |
| **Git flags are independent** | Git control works with or without autopilot mode |
