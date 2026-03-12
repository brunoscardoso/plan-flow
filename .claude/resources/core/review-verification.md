
# Review Verification

## Purpose

Second-pass verification step for `/review-code` and `/review-pr`. After the initial analysis produces findings, each finding is re-examined against surrounding code context to filter false positives. Reduces noise, improves trust in the final review output.

**Scope**: `/review-code` (Step 5b) and `/review-pr` (Step 3b). Applied after analysis, before document generation.

**Goal**: Surface only actionable findings. A review that cries wolf on false positives trains developers to ignore it. Verification ensures every reported finding is worth the developer's attention.

---

## Verification Step Definition

For each finding from the initial analysis:

1. Re-read **15 lines above and 15 lines below** the flagged line (30 lines of context total)
2. Evaluate **3 standard verification questions** (same for every finding)
3. Evaluate **1 category-specific question** (based on the finding's category)
4. Classify the finding as **Confirmed**, **Likely**, or **Dismissed**

Apply this process to every finding before generating the review document.

---

## Standard Verification Questions

Ask these three questions for every finding, regardless of category:

**Q1 — Is this actually a bug/issue, or does the surrounding code handle it?**
Check if adjacent code (error handling, guards, fallbacks, input validation) already addresses the concern raised. Look 15 lines above for upstream guards and 15 lines below for downstream handling.

**Q2 — Is there a test that covers this case?**
Look for test files related to the flagged code. If a test explicitly covers the scenario being flagged, the finding may be a false positive — the behavior is intentional and validated.

**Q3 — Would a senior developer agree this is a real issue?**
Apply the experienced developer filter. Trivial style preferences, subjective choices, or extremely minor nits that would not appear in a real code review should be dismissed. If the concern is valid but low-stakes, it may still qualify as a Suggestion.

---

## Category-Specific Verification Questions

After the three standard questions, evaluate one additional question based on the finding's category:

| Category | Verification Question |
|----------|----------------------|
| Security | Is there actually an exploit path, or is this internal-only code with no user input reaching the flagged point? |
| Logic bug | Can this code path actually be reached with the flagged state? Trace the call chain from entry points. |
| Performance | Is this in a hot path (called per-request, inside a loop, on every render), or is it called once during init/setup? |
| Pattern violation | Does the surrounding code intentionally deviate for a documented reason (comment, TODO, legacy marker, explicit override)? |
| Missing test | Is this logic already covered by integration or e2e tests, even if no unit test exists for this specific function? |
| Error handling | Is the error actually possible at this point, or is it prevented by upstream validation or type constraints? |
| Type safety | Does the runtime context guarantee the type, even if TypeScript cannot prove it statically? |

---

## Classification Criteria

| Classification | Criteria | Action |
|---------------|----------|--------|
| **Confirmed** | Clear issue with evidence from context. At least 2 of 3 standard questions support the finding. | Keep in output as-is |
| **Likely** | Probable issue but context is ambiguous. 1 of 3 standard questions supports; others are uncertain. | Keep in output with `[Likely]` tag |
| **Dismissed** | False positive. Context clearly shows the code is correct. All 3 standard questions fail to support the finding. | Remove from output |

### Conservative Classification Rules

**Rule 1 — When in doubt, choose Likely over Dismissed.**
It is better to show an ambiguous finding to the user than to hide a real issue. Only dismiss when context clearly resolves the concern.

**Rule 2 — Never dismiss a Critical severity finding.**
Critical findings can be downgraded to Likely at most. A Critical finding that appears to be a false positive should be tagged `[Likely]` and explained — never silently removed.

---

## Output Format

### Verification Summary Template

Include this block in the review document, after the Review Summary metrics table:

```markdown
## Verification Summary

| Metric | Count |
|--------|-------|
| Initial findings | {N} |
| Confirmed | {N} |
| Likely (needs human judgment) | {N} |
| Dismissed (false positives filtered) | {N} |
| **False positive rate** | **{N}%** |
```

### Finding Tag Format

Likely findings get `[Likely]` prepended to their title:

```markdown
### [Likely] Finding Title
```

Confirmed findings have no special tag — they are the default and need no marker.

Dismissed findings are removed entirely from the output. They do not appear in the final review document.

### Review Summary Metrics Update

The existing Review Summary metrics table should reflect post-verification counts:

```markdown
| Metric | Value |
|--------|-------|
| Total findings (before verification) | {N} |
| **Findings after verification** | **{N}** |
| Critical | {N} |
| Major | {N} |
| Minor | {N} |
| Suggestion | {N} |
```

---

## Insertion Points

### For review-code-skill.md

Insert as **Step 5b: Verify Findings** — after Step 5 (Pattern Conflicts), before Step 6b (Pattern Review).

### For review-pr-skill.md

Insert as **Step 3b: Verify Findings** — after Step 3 (Analyze Code Changes), before Step 4 (Generate Document).

### Logic (same for both)

```
1. Collect all findings from the analysis step
2. For each finding:
   a. Re-read surrounding context (15 lines above + 15 lines below)
   b. Evaluate 3 standard verification questions
   c. Evaluate 1 category-specific question
   d. Classify as Confirmed / Likely / Dismissed
3. Remove Dismissed findings from the findings list
4. Tag Likely findings with [Likely] prefix in their title
5. Generate Verification Summary stats
6. Proceed to document generation with the filtered findings list
```

---

## Related Files

| File | Purpose |
|------|---------|
| `.claude/resources/skills/review-code-skill.md` | Add Step 5b (Verify Findings) |
| `.claude/resources/skills/review-pr-skill.md` | Add Step 3b (Verify Findings) |
| `.claude/resources/patterns/review-code-templates.md` | Add Verification Summary to review document template |
| `.claude/commands/review-code.md` | Add verification reference |
| `.claude/commands/review-pr.md` | Add verification reference |
