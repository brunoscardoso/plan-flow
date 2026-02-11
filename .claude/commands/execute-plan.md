---
description: This command executes an implementation plan phase by phase, using complexity scores to determine ex
---

# Execute Implementation Plan

## Command Description

This command executes an implementation plan phase by phase, using complexity scores to determine execution strategy. The command validates inputs and orchestrates the execution process by invoking the `execute-plan` skill.

**Output**: Implements all phases from the plan, updates progress, and optionally archives the completed plan.

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
  - Optionally archives completed plan

WORKFLOW:
  1. Reads and parses the plan file
  2. Groups phases by complexity score
  3. For EACH phase:
     - Auto-switches to Plan mode
     - Presents phase details for approval
     - Implements after approval
     - Updates progress in plan file
  4. Runs npm run build && npm run test (ONLY at the end)
  5. Archives plan if requested

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
  Claude Opus 4.5 or Sonnet 4.5 for best results

RELATED COMMANDS:
  /create-plan       Create a plan first
  /discovery-plan    Run discovery before planning
```

---

## Critical Rules

| Rule                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| **Build ONLY at End**    | Do NOT run build after each phase - only at the very end |
| **No Direct DB/ORM**     | NEVER run ORM or database commands directly              |
| **Complete and Stop**    | After execution, STOP and wait for user                  |

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

**DO NOT run `npm run build` after each phase or group.**

**`npm run build` and `npm run test` MUST ONLY be executed at the very end, after ALL phases (including Tests) are complete.**

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

See: `.claude/rules/skills/execute-plan-skill.md`

---

### Step 4: Handle Completion

After the skill completes:

1. Present summary of all changes made
2. Confirm all tests pass
3. Ask if the plan should be archived:

```markdown
Execution Complete!

**Summary**:
- X phases completed
- All tests passing
- Build successful

**Archive the plan?**
This will move the plan to `flow/archive/`:
```bash
mv flow/plans/plan_<feature>_v1.md flow/archive/
```

Would you like to archive this plan?
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
| - Offer to archive plan                  |
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
6. Present summary and archive prompt

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
| `rules/skills/_index.md` | To understand execution workflow |
| `rules/core/_index.md` | For complexity scoring reference |
| `rules/tools/_index.md` | When switching to Plan mode |

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

1. **Start with indexes**: Read `rules/skills/_index.md` and `rules/core/_index.md`
2. **Identify needed codes**: Based on current phase, identify which codes are relevant
3. **Expand as needed**: Use the Read tool with specific line ranges from the index
4. **Don't expand everything**: Only load content required for the current phase

---

## Related Resources

| Resource                   | Purpose                           |
| -------------------------- | --------------------------------- |
| `rules/skills/_index.md`  | Index of skills with reference codes |
| `rules/core/_index.md`    | Index of core rules with reference codes |
| `rules/tools/_index.md`   | Index of tools with reference codes |
| `execute-plan-skill.md`   | Skill that executes the plan      |
| `plans-patterns.md`       | Rules and patterns for plans      |
| `complexity-scoring.md`   | Complexity scoring system         |
| `plan-mode-tool.md`       | Plan mode switching instructions  |
| `/create-plan` command     | Create a plan first               |
| `/discovery-plan` command  | Run discovery before planning     |

---

# Implementation Details


## CRITICAL RULE: Build Verification ONLY at the End

**DO NOT run `npm run build` after each phase or group.**

**`npm run build` and `npm run test` MUST ONLY be executed at the very end, after ALL phases (including Tests) are complete.**

**Why**:

- Running build after each phase wastes time and breaks flow
- Intermediate phases may have temporary type errors that get resolved in later phases
- The final build verification ensures everything works together

**The ONLY time to run build/test**:

- After ALL phases are complete → `npm run build && npm run test`

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
| ≤ 6                  | **Aggregate**: Execute multiple phases together in one pass |
| 7-10                 | **Cautious**: Execute 1-2 phases, then continue             |
| > 10                 | **Sequential**: Execute one phase at a time                 |

**Aggregation Rules**:

1. **Can aggregate** phases when their combined complexity ≤ 6
2. **Never aggregate** across a phase with complexity ≥ 8
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

- Group 1: Phase 1 + Phase 2 (combined: 5) → Aggregate
- Group 2: Phase 3 (7) → Execute alone
- Group 3: Phase 4 + Phase 5 (combined: 10) → Execute together
- Group 4: Phase 6 (Tests) → Always separate
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

---

### Step 4: Execute Each Phase with Plan Mode

**CRITICAL RULE**: Use the [Plan Mode Tool](../tools/plan-mode-tool.md) to switch to Plan mode for **EACH individual phase**.

**REMINDER**: Do NOT run `npm run build` between phases.

**For Each Phase**:

1. **Auto-switch to Plan mode** - Call `SwitchMode` tool
2. **Present phase details** - Show scope, tasks, and approach
3. **Wait for approval** - Get user confirmation
4. **Implement** - Execute the phase following approved approach
5. **Update progress** - Mark tasks complete in plan file
6. **Continue to next phase** - NO BUILD between phases

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

### Cursor Rules Checklist:
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

Then continue to the next phase (NO BUILD HERE).

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

1. **Run final verification**:

```bash
npm run build && npm run test
```

2. **Handle failures**:
   - If build fails: Fix the issue, re-run verification
   - If tests fail: Fix the issue, re-run verification
   - Only proceed after everything passes

3. **Present summary** of completed work

4. **List all key changes** made

5. **Ask if the plan should be archived**:

```bash
mv flow/plans/plan_feature_name_v1.md flow/archive/
```

---

## Execution Flow Within a Group

```
Group 1: Phase 1 + Phase 2 (combined complexity: 5)
│
├── AUTO-SWITCH to Plan Mode for Phase 1
├── Present Phase 1 details
├── Get user approval
├── Implement Phase 1
├── Update Phase 1 progress in plan file
│
├── AUTO-SWITCH to Plan Mode for Phase 2
├── Present Phase 2 details
├── Get user approval
├── Implement Phase 2
├── Update Phase 2 progress in plan file
│
└── Continue to next group (NO BUILD HERE)
```

---

## Complexity-Based Behavior

### Low Complexity Phases (0-4)

- Can be grouped with adjacent low-complexity phases
- Still requires Plan mode for each individual phase
- Quick planning discussion
- Focus on consistency with existing patterns

### Medium Complexity Phases (5-6)

- May be grouped if combined score ≤ 6
- Moderate planning discussion
- Review key decisions and patterns

### High Complexity Phases (7-8)

- Execute alone or with one adjacent phase if combined ≤ 10
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

---

## Summary of Key Rules

| Rule                         | Description                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| **Auto-switch to Plan mode** | Switch immediately for each phase, no asking                |
| **Build ONLY at end**        | `npm run build && npm run test` runs once, after ALL phases |
| **No intermediate builds**   | Never run build between phases or groups                    |
| **Tests phase separate**     | Always execute Tests phase individually                     |
| **Update progress**          | Mark tasks complete in plan file after each phase           |

---

## Related Files

| File                                        | Purpose                          |
| ------------------------------------------- | -------------------------------- |
| `.claude/rules/patterns/plans-patterns.md` | Plan patterns and rules          |
| `.claude/rules/core/complexity-scoring.md` | Complexity scoring system        |
| `.claude/rules/tools/plan-mode-tool.md`    | Plan mode switching instructions |
| `flow/plans/`                               | Input plan documents             |
| `flow/archive/`                             | Completed plans destination      |
