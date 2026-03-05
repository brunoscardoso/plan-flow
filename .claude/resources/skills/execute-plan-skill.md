
# Execute Plan Skill

## Purpose

Execute an implementation plan **phase by phase**, using complexity scores to determine execution strategy. Each phase triggers **Plan mode** for collaborative design before implementation.

This skill **implements the plan** by:

- Reading and parsing the plan file
- Grouping phases by complexity
- Switching to Plan mode for each phase
- Implementing after user approval
- Updating progress in the plan file

---

## Tool Access

This skill uses the **full-access** agent profile. See `agent-profiles.md` [COR-AG-1] for full details.

**Quick reference**: All tools allowed. Additional per-skill restrictions below (build timing, database commands).

---

## CRITICAL RULE: Build Verification ONLY at the End

**DO NOT run the project's build command after each phase or group.**

**Build and test commands MUST ONLY be executed at the very end, after ALL phases (including Tests) are complete.**

**Why**:

- Running build after each phase wastes time and breaks flow
- Intermediate phases may have temporary type errors that get resolved in later phases
- The final build verification ensures everything works together

**The ONLY time to run build/test**:

- After ALL phases are complete → run the detected build and test commands (see `.claude/resources/core/tech-detection.md`)

---

## CRITICAL RULE: No Direct Database or ORM Commands

**NEVER execute any ORM or database commands directly. ALWAYS ask the user to run them manually.**

### Forbidden Commands (NEVER execute directly)

| Category        | Commands                                              |
| --------------- | ----------------------------------------------------- |
| **Prisma**      | `prisma migrate`, `prisma db push`, `prisma db seed`  |
| **Django**      | `python manage.py migrate`, `python manage.py dbshell`|
| **Alembic**     | `alembic upgrade`, `alembic downgrade`                |
| **Sequelize**   | `sequelize db:migrate`, `sequelize db:seed`           |
| **TypeORM**     | `typeorm migration:run`, `typeorm migration:revert`   |
| **Drizzle**     | `drizzle-kit push`, `drizzle-kit drop`                |
| **Raw SQL**     | Any direct SQL execution, psql, mysql, sqlite3        |
| **Connections** | Any database connection or query commands             |

### When Database Commands Are Needed

**ALWAYS present the command to the user and wait for confirmation:**

```markdown
## Action Required: Database Migration

The following command needs to be executed manually:

\`\`\`bash
[command here]
\`\`\`

**Why manual execution is required:**
- Database operations can be destructive and irreversible
- User should review the migration before applying
- Prevents accidental data loss in development/production

Please run this command and let me know when it's complete, or if you encounter any issues.
```

### Safe Commands (CAN be executed directly)

| Command               | Why It's Safe                              |
| --------------------- | ------------------------------------------ |
| `prisma generate`     | Only generates client code, no DB changes  |
| `prisma format`       | Only formats schema file                   |
| `prisma validate`     | Only validates schema                      |
| Reading schema files  | Read-only operation                        |

### Why This Rule Exists

1. **Data Safety**: Database migrations can delete or modify data
2. **Reversibility**: Some operations cannot be undone
3. **Environment Awareness**: User knows if this is dev/staging/prod
4. **Verification**: User can review the migration before applying
5. **Error Handling**: User can handle errors appropriately

---

## Inputs

| Input       | Required | Description                          |
| ----------- | -------- | ------------------------------------ |
| `plan_file` | Yes      | Path to plan file in `flow/plans/`   |

---

## Workflow

### Step 0: Detect Project Language

Before beginning execution, read `flow/references/tech-foundation.md` to detect the project's language, package manager, and test framework. Use `.claude/resources/core/tech-detection.md` to map these to the correct build, test, and lint commands.

All subsequent references to "build command" and "test command" in this skill use the detected commands, NOT hardcoded `npm` commands.

---

### Step 1: Parse the Plan

1. Read the specified plan file
2. Parse all phases with their complexity scores and tasks
3. Validate that all phases have complexity scores

**Important**: NEVER read or reference files in `flow/archive/` - these are outdated plans.

---

### Step 2: Analyze Complexity and Determine Execution Strategy

Parse each phase and calculate execution groups based on complexity scores:

**Execution Strategy Rules**:

| Total Adjacent Score | Execution Strategy                                          |
| -------------------- | ----------------------------------------------------------- |
| <= 6                 | **Aggregate**: Execute multiple phases together in one pass |
| 7-10                 | **Cautious**: Execute 1-2 phases, then continue             |
| > 10                 | **Sequential**: Execute one phase at a time                 |

**Aggregation Rules**:

1. **Can aggregate** phases when their combined complexity <= 6
2. **Never aggregate** across a phase with complexity >= 8
3. **Always execute separately**: Tests phase (regardless of score)
4. **Prefer aggregation** for trivial consecutive phases (0-2 each)

**Example Analysis**:

```
Phase 1: Types and Schemas - Complexity: 3/10
Phase 2: Utility Functions - Complexity: 2/10
Phase 3: API Route - Complexity: 7/10
Phase 4: UI Components - Complexity: 6/10
Phase 5: Integration - Complexity: 4/10
Phase 6: Tests - Complexity: 5/10

Execution Groups:

- Group 1: Phase 1 + Phase 2 (combined: 5) -> Aggregate
- Group 2: Phase 3 (7) -> Execute alone
- Group 3: Phase 4 + Phase 5 (combined: 10) -> Execute together
- Group 4: Phase 6 (Tests) -> Always separate
```

---

### Step 3: Present Execution Plan Summary

Before starting, present the execution plan to the user:

```markdown
## Execution Plan Summary

**Plan**: [Plan Name]
**Total Phases**: X
**Total Complexity**: XX/XX

### Execution Groups:

| Group | Phases           | Combined Complexity | Strategy   |
| ----- | ---------------- | ------------------- | ---------- |
| 1     | Phase 1, Phase 2 | 5/10                | Aggregate  |
| 2     | Phase 3          | 7/10                | Sequential |
| 3     | Phase 4, Phase 5 | 10/10               | Cautious   |
| 4     | Phase 6 (Tests)  | 5/10                | Sequential |

**Build Verification**: Only at the end, after ALL phases complete

Ready to begin execution?
```

Wait for user confirmation before proceeding.

**Tasklist Update**: Before beginning execution, update `flow/tasklist.md` — add the feature under `## In Progress` if not already listed.

---

### Step 4: Execute Each Phase with Plan Mode

**CRITICAL RULE**: Use the [Plan Mode Tool](../tools/plan-mode-tool.md) to switch to Plan mode for **EACH individual phase**.

**REMINDER**: Do NOT run the project's build command between phases.

**For Each Phase**:

1. **Auto-switch to Plan mode** - Call `SwitchMode` tool
2. **Present phase details** - Show scope, tasks, and approach
3. **Wait for approval** - Get user confirmation
4. **Run pre-phase hooks** - If `flow/hooks.json` exists, run pre-phase hooks (see Phase Lifecycle Hooks below)
5. **Implement** - Execute the phase following approved approach
6. **Update progress** - Mark tasks complete in plan file
7. **Run post-phase hooks** - If `flow/hooks.json` exists, run post-phase hooks
8. **Continue to next phase** - NO BUILD between phases

**Phase Presentation Template**:

```markdown
## Phase Execution: Phase X - [Phase Name]

**Complexity**: X/10
**Scope**: [Phase scope description]

### Tasks to Complete:
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### Implementation Approach:
[Discuss the approach, patterns to follow, and any decisions needed]

### Rules Checklist:
- [ ] Following allowed patterns
- [ ] Avoiding forbidden patterns
- [ ] Using appropriate language patterns

---

**Ready to implement this phase?**
```

---

### Step 5: Update Progress After Each Phase

Mark completed tasks in the plan file:

```markdown
- [x] Task 1
- [x] Task 2
```

**Phase Checkpoint**: After marking tasks complete, create a checkpoint commit:

- **Autopilot mode ON** (`flow/.autopilot` exists): Auto-commit without asking:
  `git add -A && git commit -m "planflow: phase N - [phase-name] [VERIFIED]"`
- **Autopilot mode OFF**: Ask the user using the `AskUserQuestion` tool:

```typescript
AskUserQuestion({
  questions: [{
    question: "Phase N complete and verified. Create a checkpoint commit? This enables rollback via git reset --hard <sha> if needed.",
    header: "Commit",
    options: [
      { label: "Yes, commit (Recommended)", description: "Run git add -A && git commit with planflow message" },
      { label: "No, skip", description: "Continue to next phase without committing" }
    ],
    multiSelect: false
  }]
})
```

  - If user selects "Yes": `git add -A && git commit -m "planflow: phase N - [phase-name] [VERIFIED]"`
  - If user selects "No": continue without committing
- Log to `flow/state/checkpoints.log`: `timestamp | phase N | sha | tests-status`

Then continue to the next phase (NO BUILD HERE).

**Compaction Boundary**: If the **next** phase has complexity >= 7, suggest:

> Phase N complete. The next phase (complexity: X/10) is high-complexity. Consider running `/compact` to free context before proceeding.

**Never** suggest compaction during active phase execution — only between phases. Skip if autopilot is ON.

---

### Phase Lifecycle Hooks

Users can define custom shell commands that run at phase boundaries by creating `flow/hooks.json`:

```json
{
  "hooks": {
    "pre-phase": [
      { "command": "echo 'Starting phase $PLANFLOW_PHASE'" }
    ],
    "post-phase": [
      { "command": "npm run lint", "fatal": true }
    ],
    "on-verification-fail": [
      { "command": "npm run lint:fix" }
    ]
  }
}
```

**Hook Events**:
- `pre-phase`: Runs after plan mode approval, before implementation begins
- `post-phase`: Runs after phase tasks are completed and progress is updated
- `on-verification-fail`: Runs when final build/test verification fails (Step 7)

**How to invoke**: Import and call `runPhaseHooks` from `src/cli/utils/phase-hooks.ts`:
```typescript
import { runPhaseHooks } from '../utils/phase-hooks.js';

runPhaseHooks('pre-phase', {
  phase: currentPhaseNumber,
  phaseName: 'Phase Name',
  plan: 'plan_feature_v1',
  targetDir: target,
  totalPhases: totalPhaseCount,
});
```

**Behavior**:
- If `flow/hooks.json` doesn't exist, hooks are silently skipped (no error)
- Non-fatal hooks (default) log a warning on failure but don't block execution
- Hooks with `"fatal": true` throw an error on failure, stopping execution
- Each hook has a 30s default timeout (configurable via `"timeout": 60000`)
- Hook results are logged to `flow/state/hooks.log`

**Environment variables** passed to hook commands: `PLANFLOW_PHASE`, `PLANFLOW_PHASE_NAME`, `PLANFLOW_PLAN`, `PLANFLOW_TARGET_DIR`, `PLANFLOW_EVENT`, `PLANFLOW_TOTAL_PHASES`

---

### Step 6: Handle Tests Phase

The Tests phase is **always executed separately**, regardless of complexity score:

1. Switch to Plan mode
2. Present the testing strategy
3. Discuss test coverage and edge cases
4. Get user approval
5. Implement tests
6. **DO NOT run tests yet** - Continue to Step 7

---

### Step 7: Completion - Build and Test Verification

**This is the ONLY place where build and tests are run.**

After ALL phases are complete (including Tests phase):

1. **Run each verification check independently** using the detected commands from Step 0 (a build failure should NOT skip type/test checks). Refer to `.claude/resources/core/tech-detection.md` for the language-specific commands.

2. **Output structured verification report**:

```
VERIFICATION: [PASS/FAIL]
Build:    [OK/FAIL - details]
Types:    [OK/X errors]
Tests:    [X/Y passed]
Ready for PR: [YES/NO]
```

3. **Append to plan file** under a `## Verification Report` section with the structured output above.

4. **Handle failures**:
   - Run `on-verification-fail` hooks (if `flow/hooks.json` exists) before attempting fixes
   - If build fails: Fix the issue, re-run verification
   - If tests fail: Fix the issue, re-run verification
   - Only proceed after everything passes

---

### Step 7.5: Cleanup Pass (De-Sloppify)

After build/tests pass, run an automatic cleanup pass:

1. **Remove only these patterns**: debug console.logs, commented-out code, language-behavior tests, redundant type checks, unused imports
2. **Run full test suite** after cleanup
3. **If ANY test fails** → revert ALL cleanup changes
4. **Report** cleanup results: items removed by category
5. **Skip** if user requests it

---

### Step 7.75: Extract Instincts

After cleanup pass, automatically extract reusable instincts from execution data:

1. **Review brain-capture data** from all completed phases — look at `errors_hit` and `user_corrections` fields
2. **Identify patterns** worth preserving as instincts:
   - Errors that were hit and resolved (trigger: the situation, action: the fix)
   - User corrections to AI behavior (trigger: what was done wrong, action: what to do instead)
   - Workarounds discovered during implementation
3. **Filter criteria** — only extract from errors and corrections, NOT routine work:
   - Skip trivial fixes (typos, import order, formatting)
   - Skip patterns already in the ledger (check with `readLedger()`)
   - Maximum **3 instincts per execution**
4. **Write instincts** using the ledger utility:
   ```typescript
   import { readLedger, writeInstinct, Instinct } from '../utils/ledger.js';

   const instinct: Instinct = {
     id: 'kebab-case-descriptive-id',
     confidence: 0.3,
     trigger: 'When [specific situation]',
     action: '[What to do]',
     evidence: '[What confirmed this — reference the phase/error]',
     lastUpdated: 'YYYY-MM-DD',
   };
   const result = writeInstinct(targetDir, instinct);
   // result is 'created' or 'updated' (if duplicate, confidence bumped +0.1)
   ```
5. **Present summary** to user:
   ```
   Instincts extracted: X
   - instinct-id-1 [0.3] — brief description (created)
   - instinct-id-2 [0.4] — brief description (updated, confidence bumped)
   ```
6. **In autopilot mode**: Skip user confirmation, write directly
7. **If no meaningful patterns found**: Skip silently — not every execution produces instincts

---

### Step 7.8: Auto Security Scan

After instinct extraction, run an automatic lightweight security scan on files changed during execution. See `security-scan-patterns.md` [PTN-SEC-1] for pattern details.

#### Scan Scope

Only scan files modified during execution (from `git diff --name-only` against the pre-execution state). Do NOT scan the entire codebase.

#### What to Check

1. **Hardcoded secrets** (PTN-SEC-1): Apply secret detection patterns to changed files:
   - API keys, tokens, passwords as string literals
   - AWS Access Key IDs, PEM private keys
   - Bearer tokens in source code
2. **Exclusions** (PTN-SEC-1): Skip environment variable references, test fixtures with fake values, example files

#### Reporting

Add a **Security** line to the verification report:

```
VERIFICATION: [PASS/FAIL]
Build:    [OK/FAIL]
Types:    [OK/X errors]
Tests:    [X/Y passed]
Security: [PASS/WARN — N findings]
Ready for PR: [YES/NO/CONDITIONAL]
```

- **PASS**: No security findings in changed files
- **WARN**: Findings detected (list file paths and pattern types, never show actual values)

#### Non-Blocking Behavior

Security scan results are **informational by default**:
- WARN does not prevent archiving or completion
- Findings are included in the handoff to review-code for human attention
- In security workflows, findings feed into the Step 5 security verification checkpoint

#### Handoff Integration

If findings exist, append to the execute-to-review handoff document:

```markdown
## Auto Security Scan Results

**Status**: [PASS|WARN]
**Files Scanned**: [count of changed files]

### Findings
| File | Pattern | Severity |
|------|---------|----------|
| `src/config.ts` | API key | Major |

> Values are NOT shown — only file locations and pattern types.
```

---

### Step 8: Archive and Complete

1. **Present summary** of completed work

2. **List all key changes** made

3. **Ask if the plan should be archived**:

```bash
mv flow/plans/plan_feature_name_v1.md flow/archive/
```

---

### Step 9: Knowledge Capture

After all phases complete and verification passes, capture knowledge for the project brain. See `.claude/resources/core/brain-capture.md` for file templates and index cap rules.

1. **Session file** (most recent `.md` in `flow/brain/sessions/`, or create new per-session file): Append entry with time, skill name (`execute-plan`), feature name, status, and files changed count
2. **Feature file** (`flow/brain/features/{feature-name}.md`): Create if new feature (use feature template), or append Timeline entry if exists
3. **Errors** (`flow/brain/errors/{error-name}.md`): Create for each non-trivial error encountered during build/test failures and how it was resolved
4. **Decisions** (`flow/brain/decisions/{decision-name}.md`): Create if significant implementation decisions were made during execution
5. **Index** (`flow/brain/index.md`): Add new feature/error/decision entries. Enforce caps (5 errors, 3 decisions)
6. **Tasklist** (`flow/tasklist.md`): Move the feature from "In Progress" to "Done" (or remove if already tracked)
7. **Log** (`flow/log.md`): Under today's date heading (create if absent), append: `- execute-plan: {feature} — {outcome}`

> **Emphasis**: Execution often surfaces **errors** from build/test failures. Capture each non-trivial error with its resolution so future sessions can avoid the same issues.

---

## Execution Flow Within a Group

```
Group 1: Phase 1 + Phase 2 (combined complexity: 5)
|
+-- AUTO-SWITCH to Plan Mode for Phase 1
+-- Present Phase 1 details
+-- Get user approval
+-- Implement Phase 1
+-- Update Phase 1 progress in plan file
|
+-- AUTO-SWITCH to Plan Mode for Phase 2
+-- Present Phase 2 details
+-- Get user approval
+-- Implement Phase 2
+-- Update Phase 2 progress in plan file
|
+-- Continue to next group (NO BUILD HERE)
```

---

## Complexity-Based Behavior

### Low Complexity Phases (0-4)

- Can be grouped with adjacent low-complexity phases
- Still requires Plan mode for each individual phase
- Quick planning discussion
- Focus on consistency with existing patterns

### Medium Complexity Phases (5-6)

- May be grouped if combined score <= 6
- Moderate planning discussion
- Review key decisions and patterns

### High Complexity Phases (7-8)

- Execute alone or with one adjacent phase if combined <= 10
- Detailed planning discussion
- Consider multiple approaches

### Very High Complexity Phases (9-10)

- **Always execute alone**
- Extensive planning discussion
- Break down into sub-tasks if needed
- Consider spikes or prototypes first

---

## Error Handling

### Build Failures (at Completion)

If the project's build command fails at Step 7:

1. Analyze the error
2. Determine which phase introduced the issue
3. Fix the issue
4. Re-run build verification
5. Only complete after successful build

### Test Failures (at Completion)

If the project's test command fails at Step 7:

1. Analyze failing tests
2. Determine if it's a test issue or implementation bug
3. Fix the issue
4. Re-run tests
5. Only complete after all tests pass

### User Cancellation

If the user wants to stop execution:

1. Save current progress in the plan file
2. Note which phases are complete
3. The plan can be resumed later from the last completed phase
4. When resuming, run build verification first

---

## Audit Trail

Append structured JSONL entries to `flow/audit.log` during execution. See `.claude/resources/core/audit-trail.md` [COR-AUD-1] for event type definitions.

**Events to log**:

1. **command_start**: At execution begin — `{"ts":"...","event":"command_start","command":"execute-plan","feature":"<feature>","workflow":"<type>"}`
2. **phase_start**: Before each phase — `{"ts":"...","event":"phase_start","phase":<N>,"name":"<name>","complexity":<score>}`
3. **file_created/file_modified/file_deleted**: After each phase, run `git diff --name-only --diff-filter=A/M/D` to detect changes. Log one entry per source file (skip `flow/` directory files).
4. **phase_end**: After each phase — `{"ts":"...","event":"phase_end","phase":<N>,"name":"<name>","status":"completed","files_changed":<count>}`
5. **verification**: After build/test — `{"ts":"...","event":"verification","build":"pass/fail","tests":"pass/fail","test_count":"<passed>/<total>"}`
6. **checkpoint**: After git commits — `{"ts":"...","event":"checkpoint","sha":"<short-sha>","message":"<msg>"}`
7. **error**: On errors — `{"ts":"...","event":"error","message":"<desc>","phase":<N>,"recoverable":<bool>}`
8. **command_end**: At completion — `{"ts":"...","event":"command_end","command":"execute-plan","status":"completed","summary":"<X> phases completed"}`

**Rules**: Create `flow/audit.log` if it doesn't exist. Always append, never truncate.

---

## Handoff Consumption

Before starting execution, check for a handoff document from the planning step.

**Input**: `flow/handoffs/handoff_<feature>_plan_to_execute.md`

**Behavior**:
- If handoff exists: read it silently and use its focus guidance to inform execution priorities
- If handoff doesn't exist: proceed normally using the plan file directly (backward compatible)

---

## Handoff Production

After ALL phases complete and build/test verification passes, produce a handoff document for the review step.

**Output**: `flow/handoffs/handoff_<feature>_execute_to_review.md`

**Content to include**:
- Feature name and workflow type
- Phases completed (X of Y)
- Build and test verification status
- Plan document path
- **Plan Alignment Data** (for plan-aware review):
  - List of files expected to change (extracted from plan phase tasks)
  - List of files actually modified (from `git diff --name-only`)
  - Files changed but not in plan (scope drift)
  - Planned files not modified (missing changes)
- Focus guidance for review: areas that had high complexity or required workarounds

**When to produce**: After build/test verification passes, before auto-proceeding to review-code.

---

## Summary of Key Rules

| Rule                         | Description                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| **Auto-switch to Plan mode** | Switch immediately for each phase, no asking                |
| **Build ONLY at end**        | Build and test commands run once, after ALL phases (see `tech-detection.md`) |
| **No intermediate builds**   | Never run build between phases or groups                    |
| **Tests phase separate**     | Always execute Tests phase individually                     |
| **Update progress**          | Mark tasks complete in plan file after each phase           |

---

## Phase Access Enforcement

When executing each phase, check the `**Access**` field:

1. **Parse**: Look for `**Access**: full-access` or `**Access**: read-only` in the phase header
2. **Default**: If no `**Access**` field exists, use `full-access` (backward compatible)
3. **Enforce**:
   - **full-access**: No restrictions — use all tools as normal
   - **read-only**: Restrict to Read, Grep, Glob tools only. Do NOT use Edit, Write, or Bash (write commands). Output only to `flow/` directories.
4. **Display**: When presenting phase details in Plan mode, include the access level:
   ```
   Phase 3: Security Audit
   Complexity: 4/10
   Access: read-only (Read/Grep/Glob only)
   ```
5. **Phase boundary**: Access level resets at each phase boundary — each phase uses its own access level

---

## High-Complexity Verification Check

After completing any phase with complexity ≥ 7, perform a brief read-only scope check:

1. **Compare planned vs actual files**:
   - Extract file paths mentioned in the phase tasks
   - Run `git diff --name-only` to get actually modified files
   - Identify: scope drift (unexpected files), missing changes (planned but not modified)
2. **Report findings** as a brief note:
   ```
   Scope check (Phase 3, complexity 7):
   - Planned: src/api/routes.ts, src/types/user.ts
   - Modified: src/api/routes.ts, src/types/user.ts, src/utils/auth.ts
   - Note: src/utils/auth.ts not in plan (minor scope drift)
   ```
3. **Do NOT block execution** — this is informational only
4. **Append to brain-capture** data for the phase (include in `files_changed` and add a `scope_drift` field if any)
5. **Skip** if the phase access is already `read-only` (nothing to verify)

---

## Related Files

| File                                        | Purpose                          |
| ------------------------------------------- | -------------------------------- |
| `.claude/resources/patterns/plans-patterns.md` | Plan patterns and rules          |
| `.claude/resources/core/complexity-scoring.md`  | Complexity scoring system        |
| `.claude/resources/tools/plan-mode-tool.md` | Plan mode switching instructions |
| `flow/plans/`                               | Input plan documents             |
| `flow/archive/`                             | Completed plans destination      |
