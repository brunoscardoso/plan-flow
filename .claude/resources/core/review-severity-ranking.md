
# Review Severity Re-Ranking

## Purpose

After all findings are collected and verified, re-rank them by actual impact rather than listing in file order. Group related findings across files and present critical issues first. This applies to **all review modes** (lightweight findings are already minimal, but if multiple issues are found, they should still be severity-ordered).

**Scope**: `/review-code` (Step 5c) and `/review-pr` (Step 3c). Applied after verification, before generating the output document.

**Goal**: Ensure the most impactful findings appear first. Reviewers should never have to scan past 10 minor style issues to find a critical security bug.

---

## Ranking Algorithm

After verification classifies findings as Confirmed or Likely, sort using this priority:

1. **Severity** (primary): Critical → Major → Minor → Suggestion
2. **Confidence** (secondary, within same severity): Confirmed → Likely
3. **Fix complexity** (tertiary, within same confidence): Lower complexity first (quick wins surface earlier)

This ranking applies regardless of which file the finding came from.

---

## Grouping Related Findings

Before final output, scan the sorted findings for groupable patterns:

| Pattern | Group Condition | Example Group Title |
|---------|----------------|---------------------|
| Same issue type in multiple files | ≥ 2 findings with matching issue category | "Missing input validation in 3 API endpoints" |
| Same root cause | ≥ 2 findings traceable to one underlying problem | "Inconsistent error handling (5 occurrences)" |
| Causal chain | Findings where one enables/causes another | "Auth bypass: missing check → unprotected route → data exposure" |

### Grouping Rules

- **Only group when genuinely related** — don't force-group unrelated findings just because they share a severity level
- **Small reviews (1-3 findings)**: No grouping. Keep findings individual.
- **Use the highest severity in the group** as the group's severity level
- **Show individual occurrences** within the group with `file:line` references
- **Provide a single suggested fix** that addresses all occurrences when possible

### Grouped Finding Format

```markdown
### Finding N: {Group Title} ({count} occurrences)

| Field          | Value                                            |
| -------------- | ------------------------------------------------ |
| Severity       | {Highest severity in group}                      |
| Fix Complexity | {Average complexity}/10 - {Level}                |
| Pattern        | {Reference to pattern from rules, if applicable} |

**Occurrences**:

| # | File | Line | Status |
|---|------|------|--------|
| 1 | `{file_path}` | {line} | {Confirmed/Likely} |
| 2 | `{file_path}` | {line} | {Confirmed/Likely} |
| 3 | `{file_path}` | {line} | {Confirmed/Likely} |

**Description**:
{Explanation of the shared issue pattern}

**Suggested Fix**:
\`\`\`{language}
// Single fix pattern that addresses all occurrences
\`\`\`
```

---

## Executive Summary Trigger

| Review Mode | Trigger |
|-------------|---------|
| **Lightweight** | Never (too few findings to warrant) |
| **Standard** | When total findings ≥ 5 |
| **Deep** | Always (built into deep template) |

When triggered in standard mode, prepend this before the findings section:

```markdown
## Executive Summary

**Risk level**: {Low | Medium | High}

**Top issues to address**:

1. {Finding title} ({Severity}) — `{file}:{line}`
2. {Finding title} ({Severity}) — `{file}:{line}`
3. {Finding title} ({Severity}) — `{file}:{line}`
```

Show up to 3 top findings. Derive risk level from:
- **High**: Any Critical finding, or ≥ 3 Major findings
- **Medium**: Any Major finding, or ≥ 5 Minor findings
- **Low**: Only Minor/Suggestion findings, fewer than 5 total

---

## Output Structure

All review modes now use severity-grouped output instead of per-file ordering:

```markdown
## Critical Findings
### 1. {Finding title}
...

## Major Findings
### 2. {Finding title}
...

## Minor Findings
### 3. {Finding title}
...

## Suggestions
### 4. {Finding title}
...
```

**Empty sections**: Omit severity sections that have no findings (e.g., if no Critical findings, skip the "Critical Findings" heading entirely).

---

## Insertion Points

### For review-code-skill.md

Insert as **Step 5c: Re-Rank and Group Findings** — after Step 5b (Verify Findings), before Step 6b (Pattern Review).

### For review-pr-skill.md

Insert as **Step 3c: Re-Rank and Group Findings** — after Step 3b (Verify Findings), before Step 4 (Generate Document).

---

## Related Files

| File | Purpose |
|------|---------|
| `.claude/resources/skills/review-code-skill.md` | Add Step 5c (Re-Rank and Group) |
| `.claude/resources/skills/review-pr-skill.md` | Add Step 3c (Re-Rank and Group) |
| `.claude/resources/patterns/review-code-templates.md` | Standard template uses severity grouping |
| `.claude/resources/core/review-adaptive-depth.md` | Deep mode already severity-groups; this extends to standard |
| `.claude/resources/core/review-verification.md` | Verification runs before re-ranking |
