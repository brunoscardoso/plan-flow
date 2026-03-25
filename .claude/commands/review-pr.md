---
description: This command reviews a Pull Request from GitHub or Azure DevOps by invoking the `review-pr` skill. T
---

# Review PR Command

## Command Description

This command reviews a Pull Request from GitHub or Azure DevOps by invoking the `review-pr` skill. The command validates inputs and orchestrates the review process.

---


## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/review-pr - Review Pull Request

DESCRIPTION:
  Reviews a Pull Request from GitHub or Azure DevOps. Authenticates,
  fetches PR details, and generates a detailed review document.

USAGE:
  /review-pr <pr_url>
  /review-pr -help

ARGUMENTS:
  pr_url   URL of the Pull Request to review

EXAMPLES:
  /review-pr https://github.com/org/repo/pull/123
  /review-pr https://dev.azure.com/org/project/_git/repo/pullrequest/456
  /review-pr https://github.com/myorg/myrepo/pull/789

SUPPORTED PLATFORMS:
  - GitHub (github.com)
  - Azure DevOps (dev.azure.com, visualstudio.com)

OUTPUT:
  Creates: flow/reviewed-pr/<pr_identifier>.md

WORKFLOW:
  1. Validates PR URL format
  2. Authenticates using auth-pr tool
  3. Fetches PR information and diff
  4. Loads review patterns from project rules
  5. Analyzes code changes
  6. Generates review document

ADAPTIVE DEPTH:
  < 50 lines    Lightweight (security, logic bugs, breaking changes only)
  50-500 lines  Standard (full review)
  500+ lines    Deep (multi-pass, severity-grouped, executive summary)

REVIEW INCLUDES:
  - Summary of changes
  - Pattern compliance check
  - Code quality issues
  - Suggestions for improvement
  - Approval recommendation

RECOMMENDED MODEL:
  Claude Opus 4.6 or Sonnet 4.5 for best results

RELATED COMMANDS:
  /review-code   Review local changes instead
```

---

## Critical Rules

| Rule                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| **Read-Only Analysis**   | This command ONLY produces a review document             |
| **Complete and Stop**    | After presenting results, STOP and wait for user         |

---

## Instructions

### Step 1: Validate Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `pr_link` | Yes | The URL of the Pull Request to review |
| `language` | Optional | Primary language (auto-detected if not provided) |

### Step 2: Validate PR URL Format

- **GitHub**: Must contain `github.com` and `/pull/`
- **Azure DevOps**: Must contain `dev.azure.com` or `visualstudio.com` and `pullrequest`

### Step 3: Invoke Review PR Skill

The skill will:
1. Authenticate using the `auth-pr` tool
2. Fetch PR information
3. Load review patterns
4. Analyze code changes
5. Generate review document

See: `.claude/resources/skills/review-pr-skill.md`

### Step 4: Present Results

**Review document created**: `flow/reviewed-pr/{filename}.md`

---

## Example Usage

```bash
# Review a GitHub PR
review-pr https://github.com/org/repo/pull/123

# Review an Azure DevOps PR
review-pr https://dev.azure.com/org/project/_git/repo/pullrequest/456
```

## Related Resources

| Resource                       | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `resources/skills/_index.md`      | Index of skills with reference codes   |
| `resources/tools/_index.md`       | Index of tools with reference codes    |
| `resources/patterns/_index.md`    | Index of patterns with reference codes |
| `resources/core/_index.md`        | Index of core rules with reference codes |
| `review-pr-skill.md`          | Skill that executes the review         |
| `auth-pr-tool.md`             | Authentication tool for PR platforms   |
| `review-pr-patterns.md`       | Review patterns and guidelines         |

---

## Tasklist Updates

Update `flow/tasklist.md` at these points. See `.claude/resources/core/project-tasklist.md` for full rules.

1. **On start**: Add "Review PR: #{number}" to **In Progress** (or move it from To Do if it already exists)
2. **On complete**: Move "Review PR: #{number}" to **Done** with today's date

---

## Learn Recommendations

After the PR review completes, check for learning opportunities. See `.claude/resources/core/learn-recommendations.md` for the full system.

**PR review-specific checks** (scan the diff for):
- **New imports** from packages not previously used in the project
- **Pattern changes** (different state management, different API patterns, new testing approaches)
- **New configuration files** for tools not previously in the project (Docker, CI/CD, etc.)
- **Framework migrations** (major version upgrades, framework switches)

Present recommendations at the end of the review document, after the summary:

```markdown
## Learn Opportunities

The following new technologies/patterns were detected in this PR:

- `/learn zustand` — New state management library introduced (replaces Redux)
- `/learn docker` — Docker configuration added to the project for the first time

Run any of these to build structured understanding before or after merging.
```

---

## STATE.md Updates

Update `flow/STATE.md` at these transition points to enable session resumability.

| Transition Point | Action |
|-----------------|--------|
| **Review start** | Create `flow/STATE.md` with `Active Skill: review-pr`, `Active Plan: none`, `Current Phase: none`, `Current Task: reviewing PR #{number}`, `Next Action: Authenticate, fetch PR, and analyze` |
| **Review complete** | Delete `flow/STATE.md` (skill is done, no state to preserve) |

---

## Brain Capture

After PR review completes, append a brain-capture block. See `.claude/resources/core/brain-capture.md` for processing rules.

**Capture the following**:

```
<!-- brain-capture
skill: review-pr
feature: [PR title or scope]
status: completed
data:
  pr_number: [PR number]
  pr_platform: [github/azure-devops]
  issues_found: [total count]
  review_outcome: [approved/changes-requested/commented]
  severity_critical: [count]
  severity_warning: [count]
-->
```

Log to `flow/brain/sessions/YYYY-MM-DD.md` with PR review summary.

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
| < 50 | **Lightweight** | Quick-scan for security, logic bugs, breaking changes only. Skips pattern loading, full analysis, verification pass. |
| 50–500 | **Standard** | Full review (current behavior, no changes). |
| 500+ | **Deep** | Multi-pass review with file categorization, severity-grouped output, executive summary, and mandatory verification pass. |

Thresholds are hardcoded. The detected mode is displayed before the review starts.

See `.claude/resources/core/review-adaptive-depth.md` for full rules.

---

## Verification Pass

After initial analysis, all findings undergo a second-pass verification. Each finding is re-examined against 15 lines of surrounding context and classified as Confirmed, Likely, or Dismissed. False positives are filtered before output. A Verification Summary shows filter stats.

See `.claude/resources/core/review-verification.md` for classification criteria, category-specific questions, and output format.
