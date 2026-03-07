---
description: This command executes an implementation plan phase by phase, using complexity scores to determine ex
---

# Execute Implementation Plan

## Command Description

This command executes an implementation plan phase by phase, using complexity scores to determine execution strategy. The command validates inputs and orchestrates the execution process by invoking the `execute-plan` skill.

**Output**: Implements all phases from the plan, updates progress, and auto-archives the completed plan and its discovery document.

---


## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/execute-plan - Execute Implementation Plan

DESCRIPTION:
  Executes an implementation plan phase by phase, using complexity scores
  to determine execution strategy. Switches to Plan mode for each phase.

USAGE:
  /execute-plan <plan_file>
  /execute-plan -help

ARGUMENTS:
  plan_file   Path to the plan file in flow/plans/

EXAMPLES:
  /execute-plan @flow/plans/plan_user_auth_v1.md
  /execute-plan @flow/plans/plan_dark_mode_v2.md

OUTPUT:
  - Implements all phases from the plan
  - Updates plan file with completed tasks
  - Runs build/test verification at the end
  - Auto-archives completed plan and discovery

WORKFLOW:
  1. Reads and parses the plan file
  2. Groups phases by complexity score
  3. For EACH phase:
     - Auto-switches to Plan mode
     - Presents phase details for approval
     - Implements after approval
     - Updates progress in plan file
  4. Runs build and test verification using detected language commands (ONLY at the end)
  5. Auto-archives plan and discovery to flow/archive/

EXECUTION STRATEGIES:
  Combined Score <= 6   Aggregate phases together
  Combined Score 7-10   Cautious, 1-2 phases at a time
  Combined Score > 10   Sequential, one phase at a time
  Tests Phase           Always executed separately

SAFETY:
  - Database/ORM commands are NEVER run directly
  - User is asked to execute migrations manually
  - Prevents accidental data loss

RECOMMENDED MODEL:
  Claude Opus 4.6 or Sonnet 4.5 for best results

RELATED COMMANDS:
  /create-plan       Create a plan first
  /discovery-plan    Run discovery before planning
```

---

> ⚠️ **AUTOPILOT MODE CHECK**
>
> Before proceeding, check if `flow/.autopilot` exists.
> - **If YES**: Autopilot is ON. After completing execution (build + test pass), **auto-proceed** to `/review-code`. Do NOT stop and wait.
> - **If NO**: Follow the standard rules below (stop and wait for user).

> **MODE: Dev**
> Code first, test after. Prefer Edit/Write/Bash tools. Run build/test after changes.
> Move efficiently. Verify with tests, not exploration.

> **AGENT_PROFILE: full-access**
> See `.claude/resources/core/agent-profiles.md` for tool access rules.

## Critical Rules

| Rule                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| **Build ONLY at End**    | Do NOT run build after each phase - only at the very end |
| **No Direct DB/ORM**     | NEVER run ORM or database commands directly              |
| **Complete and Stop**    | After execution, STOP and wait for user (unless autopilot ON) |

---

## CRITICAL RULE: No Direct Database or ORM Commands

**NEVER execute any of the following commands directly:**

- `prisma migrate`
- `prisma db push`
- `prisma db seed`
- `prisma generate` (allowed - this is safe)
- `npx prisma ...` (except generate)
- `python manage.py migrate`
- `alembic upgrade`
- `sequelize db:migrate`
- `typeorm migration:run`
- `drizzle-kit push`
- Any direct SQL execution
- Any database connection/query commands

**ALWAYS ask the user to execute these commands manually:**

```markdown
## Action Required: Database Migration

The following command needs to be executed manually:

\`\`\`bash
npx prisma migrate dev --name add_user_table
\`\`\`

**Why manual execution is required:**
- Database operations can be destructive
- User should verify the migration before applying
- Prevents accidental data loss

Please run this command and let me know when it's complete.
```

**Safe commands (can be executed directly):**
- `prisma generate` - Only generates client, no DB changes
- `prisma format` - Only formats schema file
- Reading schema files

---

## CRITICAL RULE: Build Verification ONLY at the End

**DO NOT run the project's build command after each phase or group.**

**Build and test commands MUST ONLY be executed at the very end, after ALL phases (including Tests) are complete.** Use `.claude/resources/core/tech-detection.md` to determine the correct commands for the project's language.

**Structured Verification Format**: When running final verification, output:

```
VERIFICATION: [PASS/FAIL]
Build:    [OK/FAIL - details]
Types:    [OK/X errors]
Tests:    [X/Y passed]
Ready for PR: [YES/NO]
```

Append this to the plan file under `## Verification Report`.

---

## Instructions

### Step 1: Validate Inputs

| Input       | Required | Description                        |
| ----------- | -------- | ---------------------------------- |
| `plan_file` | Yes      | Path to plan file in `flow/plans/` |

If no plan is specified, list available plans in `flow/plans/` and ask user to select one.

**Important**: NEVER read or reference files in `flow/archive/` - these are outdated plans.

---

### Step 2: Validate Plan File

1. Read the specified plan file
2. Verify it contains phases with complexity scores
3. If complexity scores are missing, prompt user to add them

---

### Step 3: Invoke Execute Plan Skill

The skill will:

1. Parse the plan and extract phases
2. Analyze complexity and determine execution strategy
3. Present execution plan summary
4. For each phase:
   - Auto-switch to Plan mode
   - Present phase details
   - Get user approval
   - Implement the phase
   - Update progress
5. Run final build and test verification
6. Present completion summary

See: `.claude/resources/skills/execute-plan-skill.md`

---

### Step 4: Handle Completion

After the skill completes:

1. Present summary of all changes made
2. Confirm all tests pass
3. **Auto-archive** the completed plan and its discovery document to `flow/archive/`:
   - Move the plan file from `flow/plans/` to `flow/archive/`
   - Find and move the matching discovery document from `flow/discovery/` to `flow/archive/`
   - Do NOT ask the user — archive automatically
4. Present completion summary:

```markdown
Execution Complete!

**Summary**:
- X phases completed
- All tests passing
- Build successful
- Archived: plan and discovery moved to flow/archive/
```

---

## Flow Diagram

```
+------------------------------------------+
|        /execute-plan COMMAND             |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 1: Validate Inputs                  |
| - Check for plan file                    |
| - List available plans if needed         |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 2: Validate Plan File               |
| - Verify phases have complexity scores   |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 3: Invoke Execute Plan Skill        |
| - Skill handles all execution logic      |
| - See execute-plan-skill.md             |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 4: Handle Completion                |
| - Present summary                        |
| - Auto-archive plan and discovery        |
+------------------------------------------+
```

---

## Example Usage

**User**: `/execute-plan @flow/plans/plan_realtime_notifications_v1.md`

**Execution**:

1. Validate input: plan file provided
2. Verify plan has complexity scores
3. Invoke execute-plan skill
4. Skill executes all phases with Plan mode
5. Final build and test verification
6. Auto-archive plan and discovery to flow/archive/

---

## Context Optimization

This command uses hierarchical context loading to reduce context consumption. Instead of loading full files, load indexes first and expand specific sections on-demand.

### Recommended Loading Order

1. **Always load first**: This command file (`commands/execute-plan.md`)
2. **Load indexes**: Load `_index.md` files for relevant folders
3. **Expand on-demand**: Use reference codes to load specific sections when needed

### Index Files for Plan Execution

| Index | When to Load |
|-------|--------------|
| `resources/skills/_index.md` | To understand execution workflow |
| `resources/core/_index.md` | For complexity scoring reference |
| `resources/tools/_index.md` | When switching to Plan mode |

### Reference Codes for Plan Execution

| Code | Description | When to Expand |
|------|-------------|----------------|
| SKL-EXEC-1 | Execution workflow | Understanding full process |
| SKL-EXEC-2 | Complexity-based grouping | Determining execution strategy |
| COR-CS-1 | Complexity scoring table | Interpreting phase complexity |
| TLS-PLN-1 | Plan mode switching | Before each phase |
| TLS-PLN-2 | Plan mode workflow | Presenting phase details |

### Expansion Instructions

When executing this command:

1. **Start with indexes**: Read `resources/skills/_index.md` and `resources/core/_index.md`
2. **Identify needed codes**: Based on current phase, identify which codes are relevant
3. **Expand as needed**: Use the Read tool with specific line ranges from the index
4. **Don't expand everything**: Only load content required for the current phase

---

## Related Resources

| Resource                   | Purpose                           |
| -------------------------- | --------------------------------- |
| `resources/skills/_index.md`  | Index of skills with reference codes |
| `resources/core/_index.md`    | Index of core rules with reference codes |
| `resources/tools/_index.md`   | Index of tools with reference codes |
| `execute-plan-skill.md`   | Skill that executes the plan      |
| `core/tech-detection.md`  | Language-adaptive build/test commands |
| `plans-patterns.md`       | Rules and patterns for plans      |
| `complexity-scoring.md`   | Complexity scoring system         |
| `plan-mode-tool.md`       | Plan mode switching instructions  |
| `/create-plan` command     | Create a plan first               |
| `/discovery-plan` command  | Run discovery before planning     |

---

## Cleanup Pass (De-Sloppify)

After ALL phases complete and build/tests pass, run an automatic cleanup pass to remove development artifacts. This runs before code review (in autopilot) or before archive.

### Target Patterns (ONLY remove these)

1. **Debug statements**: `console.log`, `console.debug`, `console.warn` used for debugging (not intentional application logging)
2. **Commented-out code**: Code blocks that are commented out (not documentation comments or TODO/FIXME markers)
3. **Language-behavior tests**: Test assertions that verify language or framework behavior rather than business logic (e.g., testing that `typeof` returns expected values, testing that `Array.map` works)
4. **Redundant type checks**: Runtime type checks that duplicate compile-time TypeScript guarantees (e.g., `if (typeof x === 'string')` when `x` is already typed as `string`)
5. **Unused imports**: Import statements added during development that are no longer referenced

### Safety Protocol

1. Make all cleanup changes
2. Run the full test suite (using the detected test command)
3. **If ANY test fails** → revert ALL cleanup changes and report: "Cleanup reverted — {N} test(s) failed after removing {description}"
4. **If all tests pass** → report: "Cleanup: removed {X} debug statements, {Y} commented blocks, {Z} redundant tests. All tests passing."

### Skip Option

The cleanup pass runs by default but can be skipped. If the user requests skipping, proceed directly to archive/review.

---

## Brain Capture

After each phase completes (and after full execution), append brain-capture blocks. See `.claude/resources/core/brain-capture.md` for processing rules.

**Capture the following per phase**:

```
<!-- brain-capture
skill: execute-plan
feature: [feature name]
phase: [phase number and name]
status: [completed/failed]
data:
  complexity: [phase complexity score]
  errors_hit: [list of errors encountered, if any]
  user_corrections: [any user interventions]
  files_changed: [list of files modified/created]
-->
```

**Capture at execution end**:

```
<!-- brain-capture
skill: execute-plan
feature: [feature name]
status: [completed/partial/failed]
data:
  phases_completed: [X of Y]
  build_result: [pass/fail]
  test_result: [pass/fail]
-->
```

Update `flow/brain/features/[feature-name].md` with execution results. If errors were hit, create/update `flow/brain/errors/[error-name].md`.

---

## Tasklist Updates

Update `flow/tasklist.md` at these points. See `.claude/resources/core/project-tasklist.md` for full rules.

1. **On start**: Add "Execute: {feature}" to **In Progress** (or move it from To Do if it already exists)
2. **On complete**: Move "Execute: {feature}" to **Done** with today's date
3. **Next step**: Add "Review code for {feature}" to **To Do**

---

## Learn Recommendations

After execution completes (or at the end of each phase), check for learning opportunities. See `.claude/resources/core/learn-recommendations.md` for the full system.

**Quick checks at phase end**:
- Were new dependencies added? → Recommend `/learn <dependency>`
- Were non-trivial errors resolved (3+ attempts)? → Recommend `/learn` (pattern extraction)
- Did the user correct the approach? → Recommend `/learn <corrected-topic>`
- Was a new technology/pattern introduced? → Recommend `/learn <topic>`

**Present batched recommendations** at the end of execution, before the final summary. Do NOT interrupt phase execution.

---

## Resource Capture

During this skill's execution, watch for valuable reference materials worth preserving. See `.claude/resources/core/resource-capture.md` for capture rules, file format, and naming conventions.

At natural break points, if you encounter information that could be useful for future development (API specs, architecture notes, config references, domain knowledge, etc.), ask the user: "I found something that could be useful for future reference: _{brief description}_. Should I save it to `flow/resources/`?"

Only save if the user approves. Do not re-ask if declined.

---

## Handoff

### Consumption

Before starting execution, check for `flow/handoffs/handoff_<feature>_plan_to_execute.md`. If it exists, read it silently and use its focus guidance to prioritize execution. If it doesn't exist, proceed normally (backward compatible).

### Production

After ALL phases complete and build/test verification passes, produce a handoff for the review step.

**Output**: `flow/handoffs/handoff_<feature>_execute_to_review.md`

Include: feature name, workflow type, phases completed, build/test status, plan path, and **Plan Alignment Data** — list of planned files (from plan tasks) vs actually modified files (from `git diff --name-only`), noting scope drift and missing changes.
