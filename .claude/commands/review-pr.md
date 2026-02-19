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

---

## Context Optimization

This command uses hierarchical context loading to reduce context consumption. Instead of loading full files, load indexes first and expand specific sections on-demand.

### Recommended Loading Order

1. **Always load first**: This command file (`commands/review-pr.md`)
2. **Load indexes**: Load `_index.md` files for relevant folders
3. **Expand on-demand**: Use reference codes to load specific sections when needed

### Index Files for PR Review

| Index | When to Load |
|-------|--------------|
| `resources/skills/_index.md` | To understand review workflow |
| `resources/tools/_index.md` | For authentication tool |
| `resources/patterns/_index.md` | For review patterns |
| `resources/core/_index.md` | For allowed/forbidden patterns |

### Reference Codes for PR Review

| Code | Description | When to Expand |
|------|-------------|----------------|
| SKL-PR-1 | Review PR skill workflow | Understanding full process |
| TLS-AUTH-1 | Auth tool configuration | Setting up authentication |
| TLS-AUTH-2 | Authentication workflow | Authenticating to platform |
| PTN-PR-1 | PR review patterns | Creating review output |
| COR-AP-1 | Allowed patterns overview | Checking pattern compliance |
| COR-FP-1 | Forbidden patterns overview | Identifying anti-patterns |

### Expansion Instructions

When executing this command:

1. **Start with indexes**: Read `resources/skills/_index.md` and `resources/tools/_index.md`
2. **Expand auth first**: Load TLS-AUTH-* codes for authentication
3. **Then expand review patterns**: Load PTN-PR-* codes for review structure
4. **Don't expand everything**: Only load patterns relevant to the PR being reviewed

---

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

