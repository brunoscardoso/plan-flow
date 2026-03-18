
# Execute Plan Skill

## Purpose

Execute an implementation plan **phase by phase**, using complexity scores to determine execution strategy. Each phase triggers **Plan mode** for collaborative design before implementation.

This skill **implements the plan** by:

- Reading and parsing the plan file
- Grouping phases by complexity
- Analyzing dependencies and grouping into parallel waves (when enabled)
- Switching to Plan mode for each phase
- Implementing after user approval
- Updating progress in the plan file

---

## CRITICAL RULE: Build Verification ONLY at the End

**DO NOT run `npm run build` after each phase or group.**

**`npm run build` and `npm run test` MUST ONLY be executed at the very end, after ALL phases (including Tests) are complete.**

**Why**:

- Running build after each phase wastes time and breaks flow
- Intermediate phases may have temporary type errors that get resolved in later phases
- The final build verification ensures everything works together

**The ONLY time to run build/test**:

- After ALL phases are complete -> `npm run build && npm run test`

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

### Step 2b: Wave Analysis (Wave Execution)

**Condition**: Only run this step when `wave_execution` is `true` in `flow/.flowconfig` (default: `true`). If `wave_execution` is `false` or the key is missing, skip entirely — proceed to Step 3 with sequential grouping only.

Read `.claude/resources/core/wave-execution.md` for the full system reference.

1. **Parse Dependencies**: For each phase, look for a `**Dependencies**:` line:
   - `Phase 1, Phase 3` → depends on those phases completing first
   - `None` → explicitly independent, can run in Wave 1 (if no other constraints)
   - Missing field → implicit dependency on Phase N-1 (Phase 1 has no implicit dependency)
   - Self-references and references to non-existent phases are ignored (warn on non-existent)

2. **Build dependency graph**: Map each phase to its dependency set (after applying defaults).

3. **Topological sort → assign wave numbers**:
   - Phases with no dependencies → Wave 1
   - For each remaining phase: `wave = max(wave of each dependency) + 1`
   - Tests phase exception: Move to its own final wave regardless of computed wave number
   - On circular dependency: warn user and **fall back to sequential execution**

4. **Apply aggregation to waves**: If phases within the same wave are adjacent and their combined complexity ≤ 6, aggregate them into a single sub-agent call (same aggregation rules as Step 2). Aggregated phases share one wave slot and one dependency set (union of all their dependencies).

5. **Estimate speedup**: Compare number of sequential phases vs number of waves.

6. **Store wave plan** for use in Steps 3 and 4.

**Backward compatibility**: Plans without any `Dependencies` fields produce a fully sequential wave plan (one phase per wave). This matches existing behavior exactly — no regression.

---

### Step 3: Present Execution Plan Summary

Before starting, present the execution plan to the user.

**When wave execution is disabled** (or wave plan is fully sequential), present the standard summary:

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

**When wave execution is enabled** and the wave plan contains at least one wave with multiple phases, present the wave execution summary:

```markdown
## Execution Plan Summary

**Plan**: [Plan Name]
**Total Phases**: X
**Total Complexity**: XX/XX
**Execution Mode**: Wave-based parallel

### Wave Execution Plan:

| Wave | Phases | Parallel |
|------|--------|----------|
| 1 | Phase 1: Types, Phase 2: Utilities | Yes (2 parallel) |
| 2 | Phase 3: API Integration | No (1 phase) |
| 3 | Phase 4: Config Updates | No (1 phase) |
| 4 | Phase 5: Tests | No (always sequential) |

**Sequential phases**: 5 → **Waves**: 4 → **Estimated speedup**: ~20%
**Build Verification**: Only at the end, after ALL phases complete

Proceed with wave execution? (yes/no/sequential)
```

User response options for wave execution:
- **yes**: Execute with wave parallelism
- **no**: Stop execution
- **sequential**: Fall back to sequential execution (ignore waves, use standard Step 4)

Wait for user confirmation before proceeding.

---

### Step 4: Execute Each Phase with Plan Mode

**CRITICAL RULE**: Use the [Plan Mode Tool](../tools/plan-mode-tool.md) to switch to Plan mode for **EACH individual phase**.

**REMINDER**: Do NOT run `npm run build` between phases.

#### Step 4 — Sequential Mode (default, or when wave_execution is disabled)

**For Each Phase**:

1. **Auto-switch to Plan mode** - Call `SwitchMode` tool
2. **Present phase details** - Show scope, tasks, and approach
3. **Wait for approval** - Get user confirmation
4. **Select model tier** - If `model_routing` is enabled in `flow/.flowconfig` (default: `false` — uses the most capable session model):
   - Read the phase's complexity score
   - Look up model tier: **0-3 → Fast (haiku)**, **4-5 → Standard (sonnet)**, **6-10 → Powerful (opus)**
   - For aggregated phases, use the **highest individual phase complexity** to determine the tier
   - If `model_routing` is `false` or key is missing, skip routing (use the most capable model from the active provider — e.g., opus for Anthropic, o3 for OpenAI)
   - See `.claude/resources/core/model-routing.md` for full tier table, platform mappings, and rules
5. **Inject design context** - Before implementing, check if the discovery doc (from plan's "Based on Discovery" field) has a `## Design Context` section. If present and the phase involves UI work (see UI Phase Detection Heuristics in `.claude/resources/core/design-awareness.md`), include the Design Context in the implementation prompt. If no Design Context or phase is not UI-related, skip this step.
6. **Implement (with phase isolation)** - Check `phase_isolation` in `flow/.flowconfig` (default: `true`):
   - **If `phase_isolation: true`**: Prepare an isolated context prompt and spawn as Agent subagent. See `.claude/resources/core/phase-isolation.md` for the full context template and return format schema. The prompt includes: phase spec (scope + tasks), files modified so far (paths only), pattern file paths (allowed/forbidden), design context (if UI phase), plan file path. The sub-agent returns a structured JSON summary.
   - **If `phase_isolation: false`**: Execute inline in the main session (legacy behavior). Pattern capture happens inline via step 7.
   - **Agent spawning** combines model routing AND isolation: use `model={tier}` parameter (from step 4) AND the focused context prompt (from isolation). If model routing is disabled, use session model with isolation. If both are disabled, execute inline.
7. **Process sub-agent return** (isolation mode only) - Parse the JSON summary returned by the sub-agent:
   - Check `status` field: `success` → continue; `failure` → present errors to user, ask retry/skip/stop; `partial` → present deviations, ask user
   - Accumulate `files_created` and `files_modified` into the running file list
   - Append `patterns_captured` entries to `flow/resources/pending-patterns.md`
   - Log `decisions` in phase completion message
   - If inline mode (no isolation), capture patterns directly per `.claude/resources/core/pattern-capture.md`
   - **Process task verifications** (if `task_verifications` array is present in the return):
     - Count pass/fail totals and sum repairs applied
     - Display a brief verification summary after the phase completion message:
       ```
       Task Verification: X/Y passed | Z repairs applied
       ```
     - If any task verification has `status: "fail"`, present each failed task with its last diagnosis and offer options:
       ```
       ⚠️ Task verification failed after N retries:
       **Task**: <task description>
       **Command**: <verify command>
       **Last diagnosis**: <root_cause from last_diagnosis>
       **Category**: <category from last_diagnosis>

       Options:
       1. Continue with remaining phases (issue noted)
       2. Stop and fix manually
       ```
8. **Update progress** - Mark tasks complete in plan file
   - **Note**: Sub-agent creates per-task commits directly (if `commit: true`). Coordinator does NOT create a phase-level commit. See `.claude/resources/core/atomic-commits.md` for commit format: `feat(phase-N.task-M): <desc> — <feature>`
9. **Record model used** - Track which model tier was used for this phase (for the completion summary)
10. **Continue to next phase** - NO BUILD between phases

#### Step 4 — Wave Mode (when wave_execution is enabled and user chose "yes")

Execute phases **wave by wave**. Within each wave, approve phases sequentially in Plan Mode, then spawn all wave phases as parallel Agent sub-agents.

**For Each Wave**:

##### 4a. Sequential Approval (Plan Mode)

For each phase in the current wave (in phase number order):

1. **Auto-switch to Plan mode** - Call `SwitchMode` tool
2. **Present phase details** - Show scope, tasks, approach, and wave context (e.g., "Wave 2 of 4, running in parallel with Phase 5")
3. **Wait for approval** - Get user confirmation
4. **Select model tier** - Same rules as sequential mode (step 4.4 above)
5. **Inject design context** - Same rules as sequential mode (step 4.5 above)

After ALL phases in the wave are approved, proceed to parallel spawning.

##### 4b. Parallel Spawning

Launch all approved wave phases simultaneously as independent Agent sub-agents:

1. **Prepare context for each phase**: Use the phase-isolation context template (see `.claude/resources/core/phase-isolation.md`). Key addition for wave execution: the `Files Modified in Previous Phases` section includes files from ALL completed waves (1 through N-1), not just the immediately preceding phase.
2. **No cross-phase awareness**: Sub-agents within the same wave do NOT know about each other. They receive no information about sibling phases.
3. **Spawn all in parallel**: Launch all wave phases simultaneously using Agent sub-agents with their respective model tiers.
4. **Wait for all to complete**: All sub-agents must return before post-wave processing.

##### 4c. Wave Coordinator — Post-Wave Processing

After all sub-agents in the wave return, process results **sequentially in phase number order**:

1. **Collect JSON returns**: Gather the structured JSON summary from each sub-agent
2. **Validate JSON**: Parse each return, check for required fields (status, phase, summary, files_created, files_modified)
3. **Detect file conflicts**: Check for `files_modified` overlap between phases in this wave:
   - For each pair of phases (A, B) in the wave: compute `overlap = A.files_modified ∩ B.files_modified`
   - If overlap is not empty → file conflict detected
4. **Handle file conflicts** (if any):
   - Present the conflicting files and which phases modified them
   - Offer options:
     - **(1) Accept as-is**: Last writer wins (the phase with the higher number committed last)
     - **(2) Re-run conflicting phases sequentially**: Re-execute only the conflicting phases in order
     - **(3) Stop execution**: Halt for manual resolution
   - File conflicts do NOT affect non-conflicting phases — their results are preserved
5. **Process each phase** (in phase number order):
   - Check `status` field: `success` → continue; `failure` → present errors, ask retry/skip/stop; `partial` → present deviations, ask user
   - Update plan file (mark tasks `[x]`)
   - Accumulate `files_created` and `files_modified` into running list
   - Buffer `patterns_captured` entries to `flow/resources/pending-patterns.md`
   - Git commit if enabled (sequential, one commit **per task** in phase/task order — see `.claude/resources/core/atomic-commits.md`). For each phase (in phase number order), iterate `tasks_completed` and commit: `git add -A && git commit -m "feat(phase-N.task-M): <desc> — <feature>"`
   - Log `decisions` in phase completion message
6. **Report wave completion**: Present summary of all phases in this wave, including task verification stats:
   - For each phase in the wave that returned `task_verifications`, include pass/fail counts and repairs applied
   - Wave completion report template:
     ```
     Wave N complete: X phases finished
     - Phase A: success (Task Verification: 3/3 passed | 1 repair applied)
     - Phase B: success (no verifications)
     - Phase C: partial (Task Verification: 2/3 passed, 1 failed | 0 repairs applied)
     ```
   - If any task verification failed, display the failed task details (same format as sequential mode step 7)

##### 4d. Wave Failure Handling

| Scenario | Behavior |
|----------|----------|
| One phase fails, others succeed | Process successful phases normally. Present failure to user. Offer: retry failed phase, skip it, or stop. |
| Multiple phases fail | Process any successful phases. Present all failures. Offer same options per failed phase. |
| All phases in wave fail | Present all failures. Offer: retry wave, skip wave, or stop. |
| Sub-agent timeout | Treat as failure for that phase. Other phases unaffected. |
| Invalid JSON return | Treat as failure for that phase. |

**Key rule**: A failed phase in a wave does NOT cancel other phases in the same wave. Parallel phases are independent — let them all complete.

##### 4e. Continue to Next Wave

After post-wave processing is complete (all commits done, failures handled), proceed to the next wave. Repeat from Step 4a.

**Phase Presentation Template**:

```markdown
## Phase Execution: Phase X - [Phase Name]

**Complexity**: X/10
**Scope**: [Phase scope description]
**Design Context**: Available / Not applicable
**Wave**: [Wave N of M] / [Sequential]
**Parallel with**: [Phase Y, Phase Z] / [None]

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
- [ ] Following design tokens from Design Context (if applicable)

---

**Ready to implement this phase?**
```

---

### Step 4f: STATE.md Phase Lifecycle Updates

Update `flow/STATE.md` at each phase transition to enable session resumability:

1. **Before phase starts**: Update `Current Phase: {N} — {Phase Name}`, `Current Task: first task`, `Next Action: Implement phase {N}`
2. **During phase** (inline mode only): Update `Current Task` as tasks progress; append decisions/blockers as they occur
3. **After phase completes**: Append to `Completed Phases`: `Phase N: Name — {outcome}`. Set `Current Phase: none`, `Current Task: none`. Append new files to `Files Modified`. Set `Next Action: Begin phase {N+1}` (or `Run build verification` if last phase)
4. **On phase failure**: Append to `Blockers`: `Phase {N} failed: {error} (status: open, tried: {attempts})`
5. **Wave mode**: Update STATE.md once before each wave (set current wave phases) and once after each wave completes (batch-update completed phases)

**Important**: In isolation mode, the coordinator (main session) handles STATE.md updates — sub-agents do not write to STATE.md.

---

### Step 5: Update Progress After Each Phase

Mark completed tasks in the plan file:

```markdown
- [x] Task 1
- [x] Task 2
```

Then continue to the next phase (NO BUILD HERE).

**Note**: In wave mode, progress updates happen during post-wave processing (Step 4c.5) rather than after each individual phase spawn. The coordinator handles updates sequentially in phase order after all wave sub-agents return.

---

### Step 5b: Phase-Boundary Context Check

**After each phase completes**, check context window usage by looking at the token count from the last response. If you notice the conversation is getting long (many phases completed, lots of file reads/edits), **proactively run `/compact`** with a summary of remaining work.

**When to compact** (at phase boundaries):
- Context feels heavy (many tool calls, large file reads accumulated)
- Multiple phases completed and more remain
- You're about to start a complex phase (complexity >= 6)

**In wave mode**: Compact at **wave boundaries** (between waves), not between phases within a wave. Include wave progress in the compact summary.

**How to compact at a phase boundary**:

Run `/compact` with instructions that preserve execution state:

```
/compact Executing plan: [plan file path]. Completed phases: [list]. Completed waves: [N of M]. Next wave: [wave N, phases: list]. Key files modified: [list]. Active tasklist items: [list from flow/tasklist.md]. Resume execution from wave [N] / phase [N].
```

**Rules**:
- NEVER compact mid-phase — only at phase boundaries (between phases)
- In wave mode, NEVER compact mid-wave — only at wave boundaries (between waves)
- Always include enough context in the compact instructions to resume
- After compaction, re-read the plan file and continue from the next phase
- In autopilot mode, compact automatically without asking — this is a maintenance action, not a user decision

**Compaction Guide**: For detailed preserve/discard rules, see `COR-CG-2` and `COR-CG-3`. Use the summary template from `COR-CG-4` to structure your `/compact` instructions.

---

### Step 6: Handle Tests Phase

The Tests phase is **always executed separately**, regardless of complexity score:

1. Switch to Plan mode
2. Present the testing strategy
3. Discuss test coverage and edge cases
4. Get user approval
5. Implement tests
6. **DO NOT run tests yet** - Continue to Step 7

**Wave mode note**: The tests phase always runs alone in its own final wave. This is enforced during wave analysis (Step 2b.3) — the tests phase is moved to a dedicated final wave regardless of its computed wave number.

---

### Step 7b: Pattern Review

After all phases are complete but **before** build/test verification, run the pattern review protocol:

1. Read `flow/resources/pending-patterns.md`
2. If the buffer has entries, present grouped patterns for user approval
3. Write approved patterns to `.claude/rules/core/allowed-patterns.md` or `.claude/rules/core/forbidden-patterns.md`
4. Clear the buffer

See `.claude/resources/core/pattern-capture.md` for the full end-of-skill review protocol.

### Step 7c: Auto-PR Creation

After pattern review completes, optionally create and push a Pull Request if enabled:

1. **Check if PR creation is enabled**: Read `flow/.flowconfig` and look for `pr: true`
   - If `pr` is not set or is `false`, skip this entire step
   - If `pr: true`, proceed to branch creation

2. **Create and push feature branch**:
   - Sanitize feature name: Convert plan name to lowercase, replace spaces and special characters (except hyphens) with hyphens, trim leading/trailing hyphens
   - Example: "Add User Authentication" → `add-user-authentication`, "Feature (WIP)" → `feature-wip`
   - Create branch: `git checkout -b feat/<sanitized-feature-name>`
   - Check for pre-existing branch: If the branch already exists, warn the user and skip branch creation — proceed with PR creation using the existing branch
   - Push branch: `git push -u origin feat/<sanitized-feature-name>`

3. **Determine base branch**:
   - Read `flow/.flowconfig` and check for `branch` setting
   - If `branch` is set, use that as the base branch
   - If `branch` is not set, detect the repository's default branch:
     ```bash
     gh repo view --json defaultBranchRef -q '.defaultBranchRef.name'
     ```
   - If `gh` CLI is not found or the command fails, default to `main`

4. **Create Pull Request**:
   - Title format: `feat: <plan-name>` (use the plan's name from the plan file)
   - Body format: Include plan overview and list of completed phases:
     ```markdown
     ## Overview
     <Summary of the plan>

     ## Completed Phases
     - Phase 1: <Phase Name>
     - Phase 2: <Phase Name>
     - Phase 3: <Phase Name>
     ```
   - Command:
     ```bash
     gh pr create --base <base-branch> --head feat/<sanitized-feature-name> --title "feat: <plan-name>" --body "<body>"
     ```
   - Capture the PR URL from the command output (format: `https://github.com/<owner>/<repo>/pull/<number>`)

5. **Handle PR creation errors gracefully**:
   - If `gh` CLI is not found or not installed, warn the user: `⚠️ GitHub CLI (gh) not found. Please create a PR manually: git push -u origin feat/<branch-name>`
   - If `gh pr create` fails with any error, warn the user with the error message and continue: `⚠️ Failed to create PR: <error message>. You can create it manually on GitHub.`
   - This is a best-effort feature — do not block execution if PR creation fails

6. **Store PR URL**: If PR is created successfully, store the URL for use in Step 7 completion summary

**Branch Naming Convention**:

Feature branches follow the pattern: `feat/<sanitized-feature-name>`

Sanitization rules:
- Convert to lowercase
- Replace spaces with hyphens
- Replace special characters (`/`, `\`, `.`, `@`, etc.) with hyphens (except leading/trailing)
- Collapse consecutive hyphens into a single hyphen
- Trim leading and trailing hyphens
- Result must be a valid git branch name

**PR Metadata**:

- **Title**: `feat: <plan-name>` — descriptive, follows conventional commits
- **Body**: Structured markdown with Overview and Completed Phases sections
- **Base branch**: Either from `.flowconfig` `branch` setting or detected default
- **Head branch**: `feat/<sanitized-feature-name>`

**Notification Enrichment**:

When a PR is successfully created, the completion notification event message should be enriched with the PR URL:
- Without PR: `"All done — plan execution complete"`
- With PR: `"All done — PR: https://github.com/owner/repo/pull/123"`

This allows users to quickly jump to the PR from notifications without needing to search for it.

---

### Step 7: Completion - Build and Test Verification

**This is the ONLY place where build and tests are run.**

After ALL phases are complete (including Tests phase):

1. **Run final verification**:

```bash
npm run build && npm run test
```

2. **Handle failures**:
   - If build fails: Fix the issue, re-run verification
   - If tests fail: Fix the issue, re-run verification
   - Only proceed after everything passes

3. **Present summary** of completed work, including model routing and wave execution info if enabled:

**Sequential mode summary**:

```markdown
| Phase | Complexity | Model | Verification | Status |
|-------|-----------|-------|--------------|--------|
| 1. Setup types | 2/10 | haiku | 2/2 passed | Done |
| 2. Core logic | 5/10 | sonnet | 3/3 passed (1 repair) | Done |
| 3. Integration | 7/10 | opus | 1/2 passed (1 failed) | Partial |
| 4. Tests | 4/10 | sonnet | — | Done |

**Task verification totals**: 8 verified, 7 passed, 1 failed, 1 repair applied
**Commits**: 8 atomic commits (per-task)
**Model routing**: Saved ~X% vs all-opus execution
**PR**: https://github.com/owner/repo/pull/123
```

**Wave mode summary** (when wave execution was used):

```markdown
| Wave | Phases | Parallel | Status |
|------|--------|----------|--------|
| 1 | Phase 1: Types (haiku), Phase 2: Utilities (haiku) | Yes (2 parallel) | Done |
| 2 | Phase 3: API Integration (opus) | No | Done |
| 3 | Phase 4: Config Updates (sonnet) | No | Done |
| 4 | Phase 5: Tests (sonnet) | No | Done |

**Wave execution stats**:
- Sequential phases: 5
- Waves executed: 4
- Parallel phases: 2 (in Wave 1)
- File conflicts: 0
- Failed phases: 0
- Estimated speedup: ~20%

**Task verification totals**: 8 verified, 7 passed, 1 failed, 1 repair applied
**Commits**: 8 atomic commits (per-task)
**Model routing**: Saved ~X% vs all-opus execution
**PR**: https://github.com/owner/repo/pull/123
```

4. **List all key changes** made

5. **Ask if the plan should be archived**:

```bash
mv flow/plans/plan_feature_name_v1.md flow/archive/
```

---

## Execution Flow Within a Group

### Sequential Mode

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

### Wave Mode

```
Wave 1: Phase 1 + Phase 2 (parallel, no dependencies)
|
+-- APPROVAL PHASE (sequential):
|   +-- AUTO-SWITCH to Plan Mode for Phase 1
|   +-- Present Phase 1 details (Wave 1 of 4, parallel with Phase 2)
|   +-- Get user approval
|   |
|   +-- AUTO-SWITCH to Plan Mode for Phase 2
|   +-- Present Phase 2 details (Wave 1 of 4, parallel with Phase 1)
|   +-- Get user approval
|
+-- EXECUTION PHASE (parallel):
|   +-- Spawn Agent: Phase 1 (model: haiku)  ──┐
|   +-- Spawn Agent: Phase 2 (model: haiku)  ──┤ (running simultaneously)
|   +-- Wait for all to return               ──┘
|
+-- POST-WAVE PROCESSING (sequential):
|   +-- Collect JSON returns
|   +-- Check for file conflicts
|   +-- Process Phase 1 result → update plan → git commit per task
|   +-- Process Phase 2 result → update plan → git commit per task
|   +-- Report wave completion
|
+-- Continue to Wave 2 (NO BUILD HERE)
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

## Per-Task Verification

When plans include tasks with `<verify>` tags, phase sub-agents run targeted verification after each task. If verification fails, a debug sub-agent (haiku) diagnoses the issue and the implementation sub-agent applies repairs automatically (up to `max_verify_retries` attempts, default: 2).

The execute-plan skill processes verification results at two levels:

1. **Phase level** (Steps 4/4c): After each sub-agent returns, display per-phase verification summaries and present failed tasks to the user
2. **Completion level** (Step 7): Aggregate verification stats across all phases in the final summary

Verification is internal to phase sub-agents — the coordinator and main session see only the `task_verifications` array in the JSON return. Plans without `<verify>` tags work unchanged (backward compatible).

See `.claude/resources/core/per-task-verification.md` for the full system reference: verify tag syntax, debug sub-agent prompt template, verification loop flow, JSON schemas, and configuration.

---

## Error Handling

### Build Failures (at Completion)

If `npm run build` fails at Step 7:

1. Analyze the error
2. Determine which phase introduced the issue
3. Fix the issue
4. Re-run build verification
5. Only complete after successful build

### Test Failures (at Completion)

If `npm run test` fails at Step 7:

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

**Wave mode cancellation**: If cancelled mid-wave, all running sub-agents complete (cannot be interrupted), but their results are discarded. Progress is saved up to the last fully completed wave.

---

## Summary of Key Rules

| Rule                         | Description                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| **Auto-switch to Plan mode** | Switch immediately for each phase, no asking                |
| **Build ONLY at end**        | `npm run build && npm run test` runs once, after ALL phases |
| **No intermediate builds**   | Never run build between phases or groups                    |
| **Tests phase separate**     | Always execute Tests phase individually, in its own final wave |
| **Update progress**          | Mark tasks complete in plan file after each phase           |
| **Wave fallback**            | When wave_execution disabled or all phases dependent, execute sequentially (no behavior change) |
| **Approve then spawn**       | In wave mode, approve ALL wave phases before spawning any   |
| **Deterministic commits**    | Git commits happen per-task in phase/task order after wave completes: `feat(phase-N.task-M): <desc> — <feature>` |
| **Failures are isolated**    | One failed phase does not cancel sibling phases in the same wave |
| **File conflicts presented** | Never silently resolve file conflicts, always ask the user  |

---

## Related Files

| File                                        | Purpose                          |
| ------------------------------------------- | -------------------------------- |
| `.claude/resources/patterns/plans-patterns.md` | Plan patterns and rules          |
| `.claude/resources/core/complexity-scoring.md`  | Complexity scoring system        |
| `.claude/resources/core/wave-execution.md`  | Wave-based parallel execution system |
| `.claude/resources/core/phase-isolation.md` | Phase isolation and sub-agent spawning |
| `.claude/resources/core/per-task-verification.md` | Per-task verification system and debug sub-agents |
| `.claude/resources/tools/plan-mode-tool.md` | Plan mode switching instructions |
| `flow/plans/`                               | Input plan documents             |
| `flow/archive/`                             | Completed plans destination      |
