---
description: This command reviews local uncommitted changes by invoking the `review-code` skill. The command vali
---

# Review Code Command

## Command Description

This command reviews local uncommitted changes by invoking the `review-code` skill. The command validates inputs and orchestrates the review process.

---


## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/review-code - Review Local Code Changes

DESCRIPTION:
  Reviews local uncommitted changes against project patterns and best
  practices. Generates a detailed review document.

USAGE:
  /review-code [file_path] [--scope <staged|unstaged>]
  /review-code -help

ARGUMENTS:
  file_path   Optional. Specific file to review (reviews all if not provided)
  --scope     Optional. "staged" or "unstaged" (reviews both if not provided)

EXAMPLES:
  /review-code                              # Review all changes
  /review-code --scope staged               # Review only staged changes
  /review-code src/services/userService.ts  # Review specific file
  /review-code src/api --scope unstaged     # Review unstaged in directory

OUTPUT:
  Creates: flow/reviewed-code/<filename>.md

WORKFLOW:
  1. Identifies changed files via git diff
  2. Loads review patterns from project rules
  3. Finds similar implementations in codebase
  4. Compares against existing patterns
  5. Generates review document with findings

REVIEW CATEGORIES:
  - Pattern compliance
  - Code quality issues
  - Potential bugs
  - Performance concerns
  - Security considerations

RECOMMENDED MODEL:
  Claude Opus 4.6 or Sonnet 4.5 for best results

RELATED COMMANDS:
  /review-pr    Review a Pull Request instead
```

---

> ⚠️ **AUTOPILOT MODE CHECK**
>
> Before proceeding, check if `flow/.autopilot` exists.
> - **If YES**: Autopilot is ON. After completing the review, **auto-archive** the discovery and plan documents to `flow/archive/`, present the completion summary, and prompt for context cleanup (`/clear`).
> - **If NO**: Follow the standard rules below (stop and wait for user).

## Critical Rules

| Rule                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| **Read-Only Analysis**   | This command ONLY produces a review document             |
| **Complete and Stop**    | After presenting results, STOP and wait for user (unless autopilot ON) |

---

## Instructions

### Step 1: Validate Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `file_path` | No | Specific file to review (if not provided, reviews all changes) |
| `scope` | No | `staged` or `unstaged` (if not provided, reviews both) |
| `language` | No | Primary language (auto-detected if not provided) |

### Step 2: Check for Changes

Verify there are changes to review using `git diff`.

### Step 3: Invoke Review Code Skill

The skill will:
1. Identify changed files
2. Load review patterns
3. Find similar implementations in codebase
4. Compare patterns against existing code
5. Generate review document

See: `.claude/resources/skills/review-code-skill.md`

### Step 4: Present Results

**Review document created**: `flow/reviewed-code/{filename}.md`

---

## Example Usage

```bash
# Review all changes
review-code

# Review only staged changes
review-code --scope staged

# Review a specific file
review-code src/services/userService.ts
```

---

## Context Optimization

This command uses hierarchical context loading to reduce context consumption. Instead of loading full files, load indexes first and expand specific sections on-demand.

### Recommended Loading Order

1. **Always load first**: This command file (`commands/review-code.md`)
2. **Load indexes**: Load `_index.md` files for relevant folders
3. **Expand on-demand**: Use reference codes to load specific sections when needed

### Index Files for Code Review

| Index | When to Load |
|-------|--------------|
| `resources/skills/_index.md` | To understand review workflow |
| `resources/patterns/_index.md` | For review patterns and templates |
| `resources/core/_index.md` | For allowed/forbidden patterns reference |

### Reference Codes for Code Review

| Code | Description | When to Expand |
|------|-------------|----------------|
| SKL-REV-1 | Review code skill workflow | Understanding full process |
| PTN-REV-1 | Review document structure | Creating review output |
| COR-AP-1 | Allowed patterns overview | Checking pattern compliance |
| COR-FP-1 | Forbidden patterns overview | Identifying anti-patterns |

### Expansion Instructions

When executing this command:

1. **Start with indexes**: Read `resources/skills/_index.md` and `resources/patterns/_index.md`
2. **Identify needed codes**: Based on detected language/framework, expand relevant patterns
3. **Expand as needed**: Use the Read tool with specific line ranges from the index
4. **Don't expand everything**: Only load patterns relevant to the files being reviewed

---

## Related Resources

| Resource                       | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `resources/skills/_index.md`      | Index of skills with reference codes   |
| `resources/patterns/_index.md`    | Index of patterns with reference codes |
| `resources/core/_index.md`        | Index of core rules with reference codes |
| `review-code-skill.md`        | Skill that executes the review         |
| `review-pr-patterns.md`       | Review patterns and guidelines         |

