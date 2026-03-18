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

ADAPTIVE DEPTH:
  < 50 lines    Lightweight (security, logic bugs, breaking changes only)
  50-500 lines  Standard (full review)
  500+ lines    Deep (multi-pass, severity-grouped, executive summary)

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
| SKL-REV-1 | Purpose and restrictions | Understanding allowed actions |
| SKL-REV-2 | Identify changed files | Starting the review |
| SKL-REV-3 | Determine review depth | Adaptive depth selection |
| SKL-REV-5 | Find similar implementations | Searching for comparable code |
| SKL-REV-7 | Pattern conflicts + verify + re-rank | Processing findings |
| SKL-REV-8 | Generate review document | Creating the output file |
| SKL-REV-9 | Severity and conflict resolution | Severity levels and resolution options |
| PTN-REV-1 | Review document structure | Creating review output |
| COR-AP-1 | Allowed patterns overview | Checking pattern compliance |
| COR-FP-1 | Forbidden patterns overview | Identifying anti-patterns |
| COR-MA-1 | Multi-agent subagent definitions | Deep mode parallel review setup |
| COR-MA-2 | Coordinator dedup and merge | Deep mode result processing |
| COR-SR-1 | Severity re-ranking algorithm | Ordering findings by impact |
| COR-SR-2 | Finding grouping rules | Grouping related findings |
| COR-AD-1 | Adaptive depth size detection | Determining review mode |
| COR-AD-2 | Lightweight review mode | Changeset < 50 lines |
| COR-AD-3 | Deep review mode | Changeset 500+ lines |
| COR-CG-1 | Compaction guide | Load when compacting mid-review |

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

## Tasklist Updates

Update `flow/tasklist.md` at these points. See `.claude/resources/core/project-tasklist.md` for full rules.

1. **On start**: Add "Review: {scope}" to **In Progress** (or move it from To Do if it already exists)
2. **On complete**: Move "Review: {scope}" to **Done** with today's date

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

## STATE.md Updates

Update `flow/STATE.md` at these transition points to enable session resumability.

| Transition Point | Action |
|-----------------|--------|
| **Review start** | Create `flow/STATE.md` with `Active Skill: review-code`, `Active Plan: none`, `Current Phase: none`, `Current Task: reviewing {scope}`, `Next Action: Analyze changes and generate review` |
| **Review complete** | Delete `flow/STATE.md` (skill is done, no state to preserve) |

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

## Multi-Agent Parallel Review

For Deep mode reviews (500+ lines), the review is split into 4 specialized subagents running in parallel:

| Agent | Focus | Model |
|-------|-------|-------|
| Security | Vulnerabilities, secrets, injection, auth bypass | sonnet |
| Logic & Bugs | Edge cases, null handling, race conditions, wrong logic | sonnet |
| Performance | N+1 queries, memory leaks, blocking I/O, re-renders | sonnet |
| Pattern Compliance | Forbidden/allowed patterns, naming, consistency | haiku |

The coordinator merges results, deduplicates overlapping findings, then runs verification and re-ranking.

See `.claude/resources/core/review-multi-agent.md` for full rules.

---

## Adaptive Depth

Review depth scales automatically based on changeset size:

| Lines Changed | Mode | Behavior |
|--------------|------|----------|
| < 50 | **Lightweight** | Quick-scan for security, logic bugs, breaking changes only. Skips pattern loading, similar implementations, verification pass. |
| 50–500 | **Standard** | Full review (current behavior, no changes). |
| 500+ | **Deep** | Multi-pass review with file categorization, severity-grouped output, executive summary, and mandatory verification pass. |

Thresholds are hardcoded. The detected mode is displayed before the review starts.

See `.claude/resources/core/review-adaptive-depth.md` for full rules and `.claude/resources/patterns/review-code-templates.md` for lightweight and deep templates.

---

## Verification Pass

After initial analysis, all findings undergo a second-pass verification. Each finding is re-examined against 15 lines of surrounding context and classified as Confirmed, Likely, or Dismissed. False positives are filtered before output. A Verification Summary shows filter stats.

See `.claude/resources/core/review-verification.md` for classification criteria, category-specific questions, and output format.

---

## Pattern Capture

During code review, silently watch for anti-patterns found in changed code, good patterns that should be documented, and pattern conflicts between new and existing code. Append captured patterns to `flow/resources/pending-patterns.md` without interrupting work.

After analysis, present any buffered patterns for user approval. Approved patterns are written to `.claude/rules/core/allowed-patterns.md` or `.claude/rules/core/forbidden-patterns.md`.

See `.claude/resources/core/pattern-capture.md` for buffer format, capture triggers, conflict detection, and the full review protocol.
