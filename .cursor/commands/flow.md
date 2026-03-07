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
  /flow -status                          Show all current settings
  /flow -reset                           Reset all settings to defaults
  /flow -help                            Show this help

SETTINGS:
  autopilot=true|false   Enable/disable autopilot mode (default: false)
  commit=true|false      Auto-commit after each completed phase (default: false)
  push=true|false        Auto-push after all phases + build/test pass (default: false)
  branch=<name>          Target branch for git operations (default: current branch)

EXAMPLES:
  /flow autopilot=true                    # Enable autopilot
  /flow commit=true push=true             # Enable git control (works without autopilot)
  /flow autopilot=true commit=true        # Enable both
  /flow branch=development                # Set target branch
  /flow commit=false push=false           # Disable git control
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

1. **Scan for `key=value` pairs**: Extract all `key=value` tokens from the input
2. **Check for flags**: `-status`, `-reset`, `-help`
3. **Remaining text**: Anything left after extracting keys and flags is a prompt

**Valid keys**:

| Key | Values | Default | Description |
|-----|--------|---------|-------------|
| `autopilot` | `true`, `false` | `false` | Enable/disable autopilot mode |
| `commit` | `true`, `false` | `false` | Auto-commit after each phase |
| `push` | `true`, `false` | `false` | Auto-push after completion |
| `branch` | any string | current branch | Target branch for git ops |

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
```

**Location**: `flow/.flowconfig`
**Format**: YAML
**Persists**: Across sessions (file-based)
