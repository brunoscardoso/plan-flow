
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
4. **Select model tier** - If `model_routing` is enabled in `flow/.flowconfig` (default: `true`):
   - Read the phase's complexity score
   - Look up model tier: **0-3 → Fast (haiku)**, **4-5 → Standard (sonnet)**, **6-10 → Powerful (opus)**
   - For aggregated phases, use the **highest individual phase complexity** to determine the tier
   - Spawn implementation as an **Agent subagent** with `model={tier}` parameter
   - Include in Agent prompt: plan file path, current phase details, files modified so far, allowed/forbidden patterns
   - If `model_routing` is `false` or key is missing, skip routing and implement directly (use session model)
   - See `.claude/resources/core/model-routing.md` for full tier table, platform mappings, and rules
5. **Inject design context** - Before implementing, check if the discovery doc (from plan's "Based on Discovery" field) has a `## Design Context` section. If present and the phase involves UI work (see UI Phase Detection Heuristics in `.claude/resources/core/design-awareness.md`), prepend the Design Context to the implementation prompt with: "Follow these design tokens when implementing UI elements. Use the exact color values, typography, and spacing from the Design Context." If no Design Context or phase is not UI-related, skip this step.
6. **Implement** - Execute the phase following approved approach (via subagent if model routing is active, or directly if not)
7. **Capture patterns** - While implementing, watch for recurring conventions, anti-patterns, and workarounds. Silently append to `flow/resources/pending-patterns.md`. See `.claude/resources/core/pattern-capture.md` for buffer format and capture triggers.
8. **Update progress** - Mark tasks complete in plan file
9. **Record model used** - Track which model tier was used for this phase (for the completion summary)
10. **Continue to next phase** - NO BUILD between phases

**Phase Presentation Template**:

```markdown
## Phase Execution: Phase X - [Phase Name]

**Complexity**: X/10
**Scope**: [Phase scope description]
**Design Context**: Available / Not applicable

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

### Step 5: Update Progress After Each Phase

Mark completed tasks in the plan file:

```markdown
- [x] Task 1
- [x] Task 2
```

Then continue to the next phase (NO BUILD HERE).

---

### Step 5b: Phase-Boundary Context Check

**After each phase completes**, check context window usage by looking at the token count from the last response. If you notice the conversation is getting long (many phases completed, lots of file reads/edits), **proactively run `/compact`** with a summary of remaining work.

**When to compact** (at phase boundaries):
- Context feels heavy (many tool calls, large file reads accumulated)
- Multiple phases completed and more remain
- You're about to start a complex phase (complexity >= 6)

**How to compact at a phase boundary**:

Run `/compact` with instructions that preserve execution state:

```
/compact Executing plan: [plan file path]. Completed phases: [list]. Next phase: [name and scope]. Key files modified: [list]. Active tasklist items: [list from flow/tasklist.md]. Resume execution from phase [N].
```

**Rules**:
- NEVER compact mid-phase — only at phase boundaries (between phases)
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

---

### Step 7b: Pattern Review

After all phases are complete but **before** build/test verification, run the pattern review protocol:

1. Read `flow/resources/pending-patterns.md`
2. If the buffer has entries, present grouped patterns for user approval
3. Write approved patterns to `.claude/rules/core/allowed-patterns.md` or `.claude/rules/core/forbidden-patterns.md`
4. Clear the buffer

See `.claude/resources/core/pattern-capture.md` for the full end-of-skill review protocol.

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

3. **Present summary** of completed work, including model routing info if enabled:

```markdown
| Phase | Complexity | Model | Status |
|-------|-----------|-------|--------|
| 1. Setup types | 2/10 | haiku | Done |
| 2. Core logic | 5/10 | sonnet | Done |
| 3. Integration | 7/10 | opus | Done |
| 4. Tests | 4/10 | sonnet | Done |

**Model routing**: Saved ~X% vs all-opus execution
```

4. **List all key changes** made

5. **Ask if the plan should be archived**:

```bash
mv flow/plans/plan_feature_name_v1.md flow/archive/
```

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
| `.claude/resources/patterns/plans-patterns.md` | Plan patterns and rules          |
| `.claude/resources/core/complexity-scoring.md`  | Complexity scoring system        |
| `.claude/resources/tools/plan-mode-tool.md` | Plan mode switching instructions |
| `flow/plans/`                               | Input plan documents             |
| `flow/archive/`                             | Completed plans destination      |
