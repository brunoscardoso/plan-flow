---
description: Configure plan-flow settings — autopilot mode, git control, and other runtime options. Use key=value syntax.
---

# Flow: Plan-Flow Configuration

## Command Description

This command is the **central configuration hub** for plan-flow runtime settings. All settings use `key=value` syntax and are persisted in `flow/.flowconfig` (YAML format).

Settings include:
- **Autopilot mode** — auto-chain commands for feature requests
- **Git control** — auto-commit per phase, auto-push after completion
- **Branch targeting** — specify which branch to commit/push to

---

## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/flow - Plan-Flow Configuration

DESCRIPTION:
  Central configuration command for plan-flow runtime settings.
  All settings use key=value syntax and persist across sessions.

USAGE:
  /flow <key>=<value> [key=value ...]   Set one or more settings
  /flow <prompt>                         Enable autopilot and start flow with prompt
  /flow cost [--today|--week|--month]   Show token usage and cost report
  /flow -status                          Show all current settings
  /flow -reset                           Reset all settings to defaults
  /flow -help                            Show this help

SETTINGS:
  autopilot=true|false   Enable/disable autopilot mode (default: false)
  commit=true|false      Auto-commit after each completed phase (default: false)
  push=true|false        Auto-push after all phases + build/test pass (default: false)
  branch=<name>          Target branch for git operations (default: current branch)
  model_routing=true|false  Auto-select model per phase based on complexity (default: false)
  phase_isolation=true|false  Run each phase in isolated sub-agent with clean context (default: true)
  max_verify_retries=1-5     Max repair attempts per task verification failure (default: 2)

COST REPORTING:
  /flow cost                             Last 7 days summary (default)
  /flow cost --today                     Today's usage only
  /flow cost --week                      Last 7 days
  /flow cost --month                     Last 30 days
  /flow cost --project <name>            Filter by project name
  /flow cost --session <id>              Show single session detail
  /flow cost --detail                    Include model breakdown

EXAMPLES:
  /flow autopilot=true                    # Enable autopilot
  /flow commit=true push=true             # Enable git control (works without autopilot)
  /flow autopilot=true commit=true        # Enable both
  /flow branch=development                # Set target branch
  /flow commit=false push=false           # Disable git control
  /flow model_routing=false               # Disable model routing (use session model for all phases)
  /flow phase_isolation=false             # Disable phase isolation (inline execution, for debugging)
  /flow max_verify_retries=3             # Set max repair attempts per task verification to 3
  /flow cost                              # Show cost report (last 7 days)
  /flow cost --today --detail             # Today's costs with model breakdown
  /flow -status                           # Show current config
  /flow -reset                            # Reset everything

  # Shorthand: text without key=value enables autopilot and starts flow
  /flow add dark mode support             # autopilot=true + start discovery
  /flow commit=true add user auth         # autopilot=true + git + start discovery

BEHAVIOR WHEN AUTOPILOT IS ON:
  - Feature requests → full flow (discovery → plan → execute → review → archive)
  - Trivial tasks (complexity 0-2) → executed directly, no flow
  - Questions/exploration → answered normally
  - Slash commands → run as normal

GIT CONTROL (when commit=true):
  - After each phase completes: auto-commit
    "Phase N: <phase name> — <feature>"
  - After all phases + build/test pass: auto-push if push=true
  - If build/test fails: commit is made but push is skipped
  - push=true without commit=true: auto-enables commit=true

MANDATORY CHECKPOINTS (even in autopilot):
  - Discovery phase: pauses for user Q&A
  - Plan review: pauses for user approval before execution

CONFIG FILE:
  All settings stored in flow/.flowconfig (YAML)
  Backward compatible: also reads flow/.autopilot and flow/.gitcontrol
```

---

## Instructions

### Step 1: Parse Input

Parse the user input to determine what action to take:

1. **Check for `cost` subcommand**: If input starts with `cost`, route to cost reporting (see Step 6)
2. **Scan for `key=value` pairs**: Extract all `key=value` tokens from the input
3. **Check for flags**: `-status`, `-reset`, `-help`
4. **Remaining text**: Anything left after extracting keys and flags is a prompt

**Valid keys**:

| Key | Values | Default | Description |
|-----|--------|---------|-------------|
| `autopilot` | `true`, `false` | `false` | Enable/disable autopilot mode |
| `commit` | `true`, `false` | `false` | Auto-commit after each phase |
| `push` | `true`, `false` | `false` | Auto-push after completion |
| `branch` | any string | current branch | Target branch for git ops |
| `model_routing` | `true`, `false` | `false` | Auto-select model per phase based on complexity |
| `phase_isolation` | `true`, `false` | `true` | Run each phase in isolated sub-agent with clean context |
| `max_verify_retries` | `1`-`5` | `2` | Max repair attempts per task verification failure |

---

### Step 2: Load Existing Config

1. If `flow/.flowconfig` exists, read it
2. **Backward compatibility**: If `.flowconfig` doesn't exist but `flow/.autopilot` does, read it and migrate:
   - `flow/.autopilot` exists → `autopilot: true`
   - `flow/.gitcontrol` exists → read its `commit`, `push`, `branch` values
3. Merge parsed key=value pairs into existing config (new values override old)

---

### Step 3: Validate Settings

1. If `push=true` but `commit` is not `true`, auto-enable `commit=true` and warn:
   > `push=true` requires `commit=true`. Enabling auto-commit as well.
2. If `autopilot=false` and `commit=false` and no other settings, consider removing `.flowconfig`
3. If `max_verify_retries` is set, validate it is an integer between 1 and 5 (inclusive). If out of range, warn and clamp to nearest valid value.

---

### Step 4: Save Config

Write the merged config to `flow/.flowconfig`:

```yaml
# flow/.flowconfig — plan-flow runtime settings
autopilot: true
commit: true
push: true
branch: development
```

**Also maintain backward-compatible marker files**:
- If `autopilot: true` → create `flow/.autopilot` (for backward compat with existing rules)
- If `autopilot: false` → delete `flow/.autopilot`
- Write git settings to `flow/.gitcontrol` as well (for backward compat)

---

### Step 5: Handle Action

#### If `-status` or no arguments and no key=value pairs

Show current config:

```markdown
**Plan-Flow Configuration**

| Setting | Value |
|---------|-------|
| Autopilot | enabled/disabled |
| Auto-commit | true/false |
| Auto-push | true/false |
| Branch | <name> or (current) |
```

#### If `-reset`

1. Delete `flow/.flowconfig`, `flow/.autopilot`, `flow/.gitcontrol`
2. Confirm: "All plan-flow settings reset to defaults."

#### If only key=value pairs (no prompt text)

1. Save settings (Steps 2-4)
2. Confirm what changed:

```markdown
**Settings updated:**
- commit: false → **true**
- push: false → **true**

These apply to all `/execute-plan` runs.
```

#### If prompt text remains (with or without key=value pairs)

This is a **feature request with autopilot**:

1. Set `autopilot: true` (if not already)
2. Save all settings (Steps 2-4)
3. Confirm settings briefly (one line)
4. **Immediately start the flow** by invoking `/discovery-plan` with the prompt

**Examples**:
- `/flow add dark mode` → `autopilot=true`, start discovery
- `/flow commit=true push=true add user auth` → `autopilot=true, commit=true, push=true`, start discovery

---

### Step 6: Cost Reporting (`/flow cost`)

If the input starts with `cost`, route to the cost reporting flow:

1. **Load the skill**: Read `.claude/resources/skills/flow-cost.md` for full implementation details
2. **Parse cost flags**: `--today`, `--week`, `--month`, `--project <name>`, `--session <id>`, `--detail`
3. **Read metrics file**: `~/.claude/metrics/costs.jsonl`
4. **Filter and aggregate**: Apply time/project/session filters, group by project
5. **Display summary table**: Format tokens (K/M), costs ($X.XX), present as markdown table
6. **STOP**: After showing the report, wait for user input

**Default behavior** (no flags): Show last 7 days summary grouped by project.

See `.claude/resources/skills/flow-cost.md` for detailed formatting rules and examples.

---

## Critical Rules

| Rule | Description |
| --- | --- |
| **Single config file** | All settings in `flow/.flowconfig`. Maintain `.autopilot` and `.gitcontrol` for backward compat. |
| **Key=value syntax** | All settings use `key=value`. No `-enable`/`-disable` flags needed (use `autopilot=true/false`). |
| **Settings are independent** | `commit=true` works without `autopilot=true`. Git control applies to any `/execute-plan` run. |
| **Complete and stop** | After updating settings, STOP and wait for user input (unless a prompt was provided). |
| **Backward compatible** | Still reads `flow/.autopilot` and `flow/.gitcontrol` if `.flowconfig` doesn't exist yet. |

---

## Config File Format

```yaml
# flow/.flowconfig — plan-flow runtime settings
# Managed by /flow command. Do not edit manually.

autopilot: false
commit: false
push: false
branch: ""
model_routing: false
phase_isolation: true
max_verify_retries: 2
```

**Location**: `flow/.flowconfig`
**Format**: YAML
**Persists**: Across sessions (file-based)
