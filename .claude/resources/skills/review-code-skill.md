
# Review Code Skill

## Purpose

Perform a comprehensive **read-only analysis** of locally changed files (uncommitted changes) using established patterns and guidelines, then generate a structured review document.

This skill **only produces a markdown file** with findings. It does NOT:

- Modify any code
- Make commits
- Execute any scripts beyond git commands

---

## Tool Access

This skill uses the **read-only** agent profile. See `agent-profiles.md` [COR-AG-1] for full details.

**Quick reference**: Read/Grep/Glob allowed. Edit/Write/Bash(write) forbidden. Bash read commands allowed: `git status`, `git diff`, `git log`. Output to `flow/reviewed-code/` only (plus `flow/brain/` and `flow/log.md` for knowledge capture).

---

## Inputs

| Input       | Required | Description                                          |
| ----------- | -------- | ---------------------------------------------------- |
| `file_path` | Optional | Specific file(s) to review (defaults to all changed) |
| `language`  | Optional | Primary language (auto-detected if not provided)     |
| `scope`     | Optional | `all` (default), `staged`, or `unstaged` changes     |

---

## Workflow

### Step 1: Identify Changed Files

1. Run `git status` to identify all changed files
2. Run `git diff --name-only` to get list of unstaged changes
3. Run `git diff --cached --name-only` to get list of staged changes
4. If `file_path` is provided, filter to only those files
5. If `scope` is provided, filter to staged or unstaged only

### Step 2: Load Review Patterns

1. Read `.claude/resources/patterns/review-pr-patterns.md` for general review guidelines
2. Based on the detected language(s), load the appropriate pattern file:
   - **TypeScript/JavaScript**: Load `.claude/resources/languages/typescript-patterns.md`
   - **Python**: Load `.claude/resources/languages/python-patterns.md`
3. Cross-reference with `.claude/rules/core/forbidden-patterns.md` for anti-patterns to flag
4. Cross-reference with `.claude/rules/core/allowed-patterns.md` for best practices to encourage
5. Use the [`complexity-scoring` pattern](../core/complexity-scoring.md) for fix complexity scoring

### Step 3: Find Similar Implementations in Codebase

**This is a critical step that differentiates this from PR review.**

For each changed file:

1. **Identify the type of code being written**:

   - Component? Search for similar components
   - Utility function? Search for similar utilities
   - API route? Search for similar routes
   - Hook? Search for similar hooks
   - Type/interface? Search for similar type definitions

2. **Search for existing patterns in the codebase**:

   ```bash
   # Example searches to find similar code
   # For components:
   grep -r "export const" --include="*.tsx" src/components/

   # For hooks:
   grep -r "export function use" --include="*.ts" src/hooks/

   # For API routes:
   grep -r "export async function" --include="route.ts" src/app/api/
   ```

3. **Document the reference implementations found**:

   - File path of similar code
   - Key patterns used in that code
   - How the new code differs (if at all)

4. **Flag pattern inconsistencies**:
   - New code uses a different pattern than existing code
   - New code introduces a pattern not documented in rules
   - New code conflicts with established patterns

### Step 4: Analyze Code Changes

For each changed file:

1. Review the diff/changes using `git diff {file_path}`
2. Check for violations of forbidden patterns
3. Verify adherence to allowed patterns
4. Apply language-specific checks
5. **Compare against similar implementations found in Step 3**
6. Identify security, performance, and maintainability concerns
7. **Flag any pattern conflicts with existing codebase**

### Step 5: Identify Pattern Conflicts

**This is unique to local code review.**

When a pattern conflict is found:

1. **Document the conflict**:

   - What pattern the new code uses
   - What pattern exists in similar code
   - Which file(s) contain the reference pattern

2. **Determine the correct resolution**:

   - If existing pattern is better -> recommend changing new code
   - If new pattern is better -> recommend updating rules AND existing code
   - If unclear -> flag for team discussion

3. **Generate rule update recommendations**:
   - Suggest additions to `.claude/rules/core/allowed-patterns.md`
   - Suggest additions to `.claude/rules/core/forbidden-patterns.md`

### Step 6: Generate Review Document

Create a markdown file in `flow/reviewed-code/` with the naming convention:

```
code-review-{date}-{sanitized-description}.md
```

**Example**: For changes related to user authentication:

```
flow/reviewed-code/code-review-2026-01-14-user-authentication.md
```

**Output Format**: Use the templates from `.claude/resources/patterns/review-code-templates.md`

---

### Step 7: Knowledge Capture

After generating the review document, capture knowledge for the project brain. See `.claude/resources/core/brain-capture.md` for file templates and index cap rules.

1. **Session file** (most recent `.md` in `flow/brain/sessions/`, or create new per-session file): Append entry with time, skill name (`review-code`), scope reviewed, status, and finding count
2. **Feature file** (`flow/brain/features/{feature-name}.md`): If the reviewed changes relate to a known feature, append Timeline entry
3. **Log** (`flow/log.md`): Under today's date heading (create if absent), append: `- review-code: {scope} — {finding_count} findings ({critical}/{major}/{minor})`

> **Note**: Review-code uses a lighter capture — session, log, and feature only. Skip errors and decisions unless a critical pattern conflict was identified.

---

## Severity Levels

| Level      | Description                                              |
| ---------- | -------------------------------------------------------- |
| Critical   | Security vulnerabilities, data loss risks, blocking bugs |
| Major      | Significant issues affecting functionality or quality    |
| Minor      | Code style, minor improvements, non-critical concerns    |
| Suggestion | Nice-to-have improvements, optional enhancements         |

---

## Pattern Conflict Resolution

When a conflict is found between new code and existing patterns:

### Option 1: Update New Code (Recommended for established patterns)

If the existing pattern is:

- Documented in rules files
- Used consistently across the codebase
- Has clear benefits

**Action**: Update the new code to match the existing pattern.

### Option 2: Update Rules (For better new patterns)

If the new pattern is:

- Demonstrably better than existing
- More maintainable or readable
- Follows best practices that existing code doesn't

**Action**:

1. Document the new pattern in `allowed-patterns.md`
2. Add the old pattern to `forbidden-patterns.md`
3. Create a task to refactor existing code (optional)

### Option 3: Team Discussion (For unclear cases)

If:

- Both patterns have valid trade-offs
- Team preference is unclear
- Architectural decision is required

**Action**: Flag for team discussion before committing.

---

## Finding Similar Implementations

### Search Strategies by Code Type

| Code Type       | Search Strategy                                          |
| --------------- | -------------------------------------------------------- |
| React Component | Search `src/components/` for similar component structure |
| Custom Hook     | Search `src/hooks/` for similar hook patterns            |
| Utility         | Search `src/utils/` for similar utility functions        |
| API Route       | Search `src/app/api/` for similar route handlers         |
| Type Definition | Search `src/types/` for similar type structures          |
| Store/State     | Search `src/stores/` for similar state management        |
| Test File       | Search `__tests__/` for similar test patterns            |

### Key Aspects to Compare

When comparing new code with reference implementations:

1. **Naming Conventions**: Do variable/function names follow the same pattern?
2. **Error Handling**: Is error handling consistent?
3. **Type Definitions**: Are types structured similarly?
4. **Code Organization**: Is the file structure consistent?
5. **Comments/Documentation**: Does documentation follow the same style?
6. **Import Structure**: Are imports organized the same way?
7. **Export Patterns**: Default vs named exports consistency?

---

## Quick Reference Commands

```bash
# Review all uncommitted changes
review-code

# Review specific file
review-code src/services/userService.ts

# Review only staged changes
review-code --scope staged

# Review only unstaged changes
review-code --scope unstaged

# Review with explicit language
review-code --language typescript
```

---

## Audit Trail

Append structured JSONL entries to `flow/audit.log`. See `.claude/resources/core/audit-trail.md` [COR-AUD-1] for event type definitions.

**Events to log**:
1. **command_start**: `{"ts":"...","event":"command_start","command":"review-code","feature":"<feature>","workflow":"<type>"}`
2. **file_created**: For the review document — `{"ts":"...","event":"file_created","path":"flow/reviewed-code/review_<scope>.md"}`
3. **command_end**: `{"ts":"...","event":"command_end","command":"review-code","status":"completed","summary":"<X> findings (<critical>/<major>/<minor>)"}`

Create `flow/audit.log` if it doesn't exist. Always append, never truncate.

---

## Handoff Consumption — Plan-Aware Review

Before starting the review, check for a handoff document from the execution step.

**Input**: `flow/handoffs/handoff_<feature>_execute_to_review.md`

**Behavior**:
- If handoff exists: enable **plan-aware review mode**
  - Read the Plan Alignment Data section
  - Check for scope drift: flag files that were changed but not listed in the plan
  - Check for missing changes: flag files that were planned but not modified
  - Add a **Plan Alignment** section to the review output:
    ```markdown
    ## Plan Alignment

    **Plan**: `[plan path]`
    **Phases completed**: [X of Y]

    ### Scope Drift
    [Files changed but not in plan, or "None — all changes align with plan"]

    ### Missing Changes
    [Planned files not modified, or "None — all planned changes implemented"]

    ### Verdict
    [ALIGNED / MINOR DRIFT / SIGNIFICANT DRIFT]
    ```
  - Use the handoff's focus guidance to prioritize review attention
- If handoff doesn't exist: proceed with standard review (backward compatible)

---

## Handoff Production — Review Variants

For workflows where review-code runs as the **first step** (bugfix diagnostic, refactor baseline, security audit), produce a handoff for the next step.

**Output**:
- Bugfix: `flow/handoffs/handoff_<feature>_review_to_plan.md`
- Refactor/Security: `flow/handoffs/handoff_<feature>_review_to_discovery.md`

**Content to include**:
- Feature name and workflow type
- Review variant (diagnostic/baseline/security audit)
- Key findings summary (top issues, root cause for bugfix, patterns for refactor, vulnerabilities for security)
- Affected files list
- Focus guidance for the next step

**When to produce**: After the review document is generated, when review-code is used as a workflow's first step (not the final review).

---

## Related Files

| File                                               | Purpose                              |
| -------------------------------------------------- | ------------------------------------ |
| `.claude/resources/patterns/review-pr-patterns.md`  | Main review checklist and guidelines |
| `.claude/resources/patterns/review-code-templates.md` | Output templates for review docs     |
| `.claude/rules/core/forbidden-patterns.md`          | Anti-patterns to flag                |
| `.claude/rules/core/allowed-patterns.md`            | Best practices to encourage          |
| `.claude/resources/languages/typescript-patterns.md` | TypeScript-specific checks           |
| `.claude/resources/languages/python-patterns.md`    | Python-specific checks               |
| `.claude/resources/core/complexity-scoring.md`          | Fix complexity scoring system        |
| `flow/reviewed-code/`                              | Output folder for review documents   |

---

## Workflow Integration

After running this command:

1. **Review the generated document** in `flow/reviewed-code/`
2. **Address Critical and Major findings** before committing
3. **Resolve pattern conflicts** by choosing the appropriate resolution
4. **Update rule files** if recommended (add to allowed/forbidden patterns)
5. **Commit changes** once review concerns are addressed

> The goal is not just to review current changes, but to **improve the codebase patterns over time** by documenting good patterns and preventing anti-patterns from spreading.
