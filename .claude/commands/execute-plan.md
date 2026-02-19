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

See: `.claude/resources/skills/execute-plan-skill.md`

---

### Step 4: Handle Completion

After the skill completes:

1. Present summary of all changes made
2. Confirm all tests pass
3. Ask if the plan should be archived using the `AskUserQuestion` tool:

```markdown
Execution Complete!

**Summary**:
- X phases completed
- All tests passing
- Build successful
```

```typescript
AskUserQuestion({
  questions: [{
    question: "Would you like to archive this completed plan?",
    header: "Archive",
    options: [
      { label: "Yes, archive it", description: "Move the plan to flow/archive/ - recommended for completed plans" },
      { label: "No, keep it", description: "Keep the plan in flow/plans/ for reference" }
    ],
    multiSelect: false
  }]
})
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
| `plans-patterns.md`       | Rules and patterns for plans      |
| `complexity-scoring.md`   | Complexity scoring system         |
| `plan-mode-tool.md`       | Plan mode switching instructions  |
| `/create-plan` command     | Create a plan first               |
| `/discovery-plan` command  | Run discovery before planning     |

