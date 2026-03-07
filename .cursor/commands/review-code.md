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
  /review-code [flags] [file_path] [--scope <staged|unstaged>]
  /review-code -help

ARGUMENTS:
  file_path   Optional. Specific file to review (reviews all if not provided)
  --scope     Optional. "staged" or "unstaged" (reviews both if not provided)

WORKFLOW FLAGS (optional):
  -bugfix     Diagnostic review: focus on root cause analysis, broken behavior,
              affected files. Use when investigating a bug.
  -security   Security audit: focus on vulnerabilities, auth flows, data handling,
              input validation. Use for security assessments.
  -refactor   Baseline review: focus on current patterns, code smells, quality
              metrics. Use before refactoring to document the current state.

  Without a flag, performs a standard review (general quality, pattern compliance).

EXAMPLES:
  /review-code                              # Standard review of all changes
  /review-code --scope staged               # Review only staged changes
  /review-code src/services/userService.ts  # Review specific file
  /review-code -bugfix login timeout issue  # Diagnostic review for a bug
  /review-code -security auth module        # Security audit of auth code
  /review-code -refactor src/utils          # Baseline review before refactoring

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

> **MODE: Research**
> Explore before concluding. Read 3x more than you write. Prefer Read/Grep/Glob/WebSearch tools.
> Ask clarifying questions when uncertain. Don't jump to implementation.

> **AGENT_PROFILE: read-only**
> See `.claude/resources/core/agent-profiles.md` for tool access rules.

## Critical Rules

| Rule                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| **Read-Only Analysis**   | This command ONLY produces a review document             |
| **Complete and Stop**    | After presenting results, STOP and wait for user (unless autopilot ON) |

---

## Instructions

### Step 0: Parse Workflow Flag

Check if the user input starts with a workflow flag:

| Flag | Review Variant | Focus |
|------|---------------|-------|
| `-bugfix` | Diagnostic | Diagnose root cause, identify broken behavior, affected files, reproduction steps |
| `-security` | Security audit | Vulnerabilities, auth flows, data handling, input validation, secret exposure |
| `-refactor` | Baseline | Current patterns, code smells, quality metrics, complexity hotspots |
| (none) | Standard | General quality, pattern compliance |

If a flag is found:
1. Set the **review variant** for this execution
2. Remove the flag from the input (the rest is the user's prompt/file path)
3. The review variant affects the focus areas in Step 3

If no flag is found: proceed with standard review (backward compatible).

---

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

**Review Variant Focus** (from Step 0):
- **Diagnostic** (`-bugfix`): Prioritize identifying what's broken, root cause analysis, affected code paths, and potential regression points. The review output should include a "Root Cause Analysis" section.
- **Security audit** (`-security`): Prioritize OWASP top 10 checks, auth flow analysis, data handling, input validation, secret exposure, and dependency vulnerabilities. The review output should include a "Security Findings" section with severity ratings.
- **Baseline** (`-refactor`): Prioritize documenting current patterns, code smells, complexity metrics, duplication, and coupling. The review output should include a "Baseline Metrics" section for before/after comparison.
- **Standard** (no flag): General quality, pattern compliance, potential bugs, performance concerns.

**Confidence-Based Filtering Rules**:
- Each finding must include a **Confidence** percentage (e.g., 85%)
- **Only include findings with >80% confidence** in the main Findings section
- **Consolidate similar findings**: Group by issue type + same/related files (e.g., "5 functions missing error handling" instead of 5 separate findings)
- Findings below 80% confidence go in a collapsed "Low-Confidence Notes" section
- Include an **Approval Recommendation**: APPROVE (no critical/major), WARNING (major only), BLOCK (critical found)

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

---

## Brain Capture

After code review completes, append a brain-capture block. See `.claude/resources/core/brain-capture.md` for processing rules.

**Capture the following**:

```
<!-- brain-capture
skill: review-code
feature: [feature or scope reviewed]
status: completed
data:
  files_reviewed: [count]
  issues_found: [total count]
  severity_critical: [count]
  severity_warning: [count]
  severity_info: [count]
  pattern_conflicts: [list of pattern conflicts found, if any]
-->
```

Update `flow/brain/features/[feature-name].md` if reviewing a known feature. Log to `flow/brain/sessions/YYYY-MM-DD.md` otherwise.

---

## Resource Capture

During this skill's execution, watch for valuable reference materials worth preserving. See `.claude/resources/core/resource-capture.md` for capture rules, file format, and naming conventions.

At natural break points, if you encounter information that could be useful for future development (API specs, architecture notes, config references, domain knowledge, etc.), ask the user: "I found something that could be useful for future reference: _{brief description}_. Should I save it to `flow/resources/`?"

Only save if the user approves. Do not re-ask if declined.

---

## Learn Recommendations

After the review completes, check for learning opportunities. See `.claude/resources/core/learn-recommendations.md` for the full system.

**Review-specific checks** (scan the diff for):
- **New imports** from packages not previously used in the project
- **Pattern changes** (different state management, different API patterns, new testing approaches)
- **New configuration files** for tools not previously in the project (Docker, CI/CD, etc.)

Present recommendations at the end of the review document, after the summary:

```markdown
## Learn Opportunities

The following new technologies/patterns were detected in this changeset:

- `/learn zustand` — New state management library introduced (replaces Redux)
- `/learn` — Non-trivial error patterns worth capturing as reusable knowledge

Run any of these to build structured understanding before or after merging.
```

---

## Handoff

### Consumption — Plan-Aware Review

Before starting the review, check for `flow/handoffs/handoff_<feature>_execute_to_review.md`. If it exists, enable **plan-aware review** — read the Plan Alignment Data and add a "Plan Alignment" section to the review output showing scope drift (unplanned file changes) and missing changes (planned files not modified). If it doesn't exist, proceed with standard review (backward compatible).

### Production — Review Variants

When review-code runs as a workflow's **first step** (bugfix diagnostic, refactor baseline, security audit), produce a handoff for the next step:
- Bugfix: `flow/handoffs/handoff_<feature>_review_to_plan.md`
- Refactor/Security: `flow/handoffs/handoff_<feature>_review_to_discovery.md`

Include: feature name, workflow type, review variant, key findings, affected files, and focus guidance.
