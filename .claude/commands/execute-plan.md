---
description: This command executes an implementation plan phase by phase, using complexity scores and wave-based parallel execution to determine ex
---

# Execute Implementation Plan

## Command Description

This command executes an implementation plan phase by phase, using complexity scores to determine execution strategy. When `wave_execution: true` in `.flowconfig` (default), phases are analyzed for dependencies, grouped into **waves** of independent phases, and executed in parallel within each wave using Agent sub-agents. Tasks with `<verify>` tags are verified immediately after completion — failures are auto-diagnosed by debug sub-agents and repaired in place (up to `max_verify_retries` attempts). The command validates inputs and orchestrates the execution process by invoking the `execute-plan` skill.

**Output**: Implements all phases from the plan (sequentially or in parallel waves), updates progress, and auto-archives the completed plan and its discovery document.

---


## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/execute-plan - Execute Implementation Plan

DESCRIPTION:
  Executes an implementation plan phase by phase, using complexity scores
  to determine execution strategy. Analyzes phase dependencies and groups
  independent phases into parallel waves for faster execution. Switches
  to Plan mode for each phase.

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
  2b. Analyzes dependencies and groups into waves (if wave_execution enabled)
  3. Presents wave execution summary (waves, parallelism, estimated speedup)
  4. For EACH wave:
     - Approves each phase in Plan mode (sequential)
     - Executes wave phases in parallel (or sequential if single phase)
     - Collects results, detects file conflicts
     - Commits sequentially in phase order (if git enabled)
  5. Runs npm run build && npm run test (ONLY at the end)
  6. Auto-archives plan and discovery to flow/archive/

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
| **Compact at Boundaries**| After each phase, if context is heavy, run `/compact` with execution state (see Step 5b in skill) |
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

## Per-Task Verification

When plan phases include tasks with `<verify>` tags, each task is verified immediately after completion using targeted commands (e.g., `npx tsc --noEmit <file>`). Failed verifications trigger a debug sub-agent (haiku) for diagnosis, and the implementation sub-agent applies repairs automatically.

### Configuration

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| `max_verify_retries` | `2` | `1-5` | Max repair attempts per task verification failure |

Set via `/flow max_verify_retries=3` or directly in `flow/.flowconfig`.

Plans without `<verify>` tags work unchanged — verification is fully backward compatible.

See `.claude/resources/core/per-task-verification.md` for verify tag syntax, debug sub-agent details, and JSON schemas.

---

## Git Control

On execution start, check if `flow/.flowconfig` exists — if yes, read git control settings (`commit`, `push`, `branch`) from it. Fallback: check `flow/.gitcontrol` for backward compatibility. If neither exists, no git operations are performed.

### Git Control Settings

```yaml
# flow/.gitcontrol
commit: true     # Auto-commit after each completed phase
push: true       # Auto-push after all phases complete (requires commit: true)
branch: develop  # Target branch (optional, defaults to current branch)
```

### Git Behavior During Execution

| Setting | Behavior |
|---------|----------|
| `commit: true` | After each phase completes successfully, run `git add -A && git commit -m "Phase N: <phase name> — <feature>"` |
| `commit: false` or no `.gitcontrol` | No automatic git operations (default behavior) |
| `push: true` | After ALL phases complete AND build/test pass, run `git push origin <branch>` |
| `push: false` or not set | No automatic push |
| `branch: <name>` | Use this branch for push (default: current branch) |

### Git Safety Rules

| Rule | Description |
|------|-------------|
| **Commit only on success** | Only commit after a phase completes successfully. Never commit broken code. |
| **Push only after build+test** | Push only after `npm run build && npm run test` pass at the very end. |
| **No force push** | NEVER use `--force`. If push fails, stop and ask the user. |
| **Commit message format** | `Phase N: <phase name> — <feature>` (e.g., "Phase 2: API endpoints — user-auth") |
| **Final commit** | After build+test pass, make one final commit: `Complete: <feature> — all phases done, build passing` |
| **Include flow artifacts** | Commits should include updated plan files with progress markers |

### Example Flow with `commit=true push=true`

```
Phase 1: Setup types → completes → git commit "Phase 1: Setup types — user-auth"
Phase 2: API endpoints → completes → git commit "Phase 2: API endpoints — user-auth"
Phase 3: Frontend UI → completes → git commit "Phase 3: Frontend UI — user-auth"
Phase 4: Tests → completes → git commit "Phase 4: Tests — user-auth"
Build + Test → pass → git commit "Complete: user-auth — all phases done, build passing"
                     → git push origin development
```

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
| Step 2b: Wave Analysis (if enabled)      |
| - Parse Dependencies from each phase     |
| - Build dependency graph                 |
| - Group independent phases into waves    |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 3: Invoke Execute Plan Skill        |
| - Present wave execution summary         |
| - Execute waves (parallel or sequential) |
| - See execute-plan-skill.md             |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 4: Handle Completion                |
| - Present summary with wave stats        |
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
| SKL-EXEC-2 | Critical rules (build, DB) | Need build/DB command restrictions |
| SKL-EXEC-4 | Analyze complexity | Determining execution strategy |
| SKL-EXEC-6 | Execute phase with Plan mode | Running a specific phase |
| SKL-EXEC-8 | Phase-boundary compaction | Compacting between phases |
| SKL-EXEC-9 | Handle tests phase | Executing the tests phase |
| SKL-EXEC-10 | Build and test verification | Final verification step |
| SKL-EXEC-11 | Complexity-based behavior | Need low/medium/high behavior details |
| SKL-EXEC-12 | Error handling | Build/test failure or cancellation |
| COR-CS-1 | Complexity scoring table | Interpreting phase complexity |
| TLS-PLN-1 | Plan mode switching | Before each phase |
| TLS-PLN-2 | Plan mode workflow | Presenting phase details |
| COR-CG-1 | Compaction guide purpose | When compacting at phase boundaries |
| COR-CG-2 | Preserve rules | Crafting compact summary — what to keep |
| COR-CG-3 | Discard rules | Crafting compact summary — what to drop |
| COR-CG-4 | Compact summary template | Structuring compact instructions |
| COR-PI-1 | Phase isolation architecture | Understanding isolated sub-agent flow |
| COR-PI-2 | Sub-agent context template | Preparing focused prompt for sub-agent |
| COR-PI-3 | Return format schema | Parsing sub-agent JSON response |
| COR-PI-4 | Coordinator processing rules | Handling success/failure/partial returns |
| COR-WAVE-1 | Wave execution architecture and dependency syntax | Need wave execution architecture or dependency declaration syntax |
| COR-WAVE-2 | Wave grouping algorithm (topological sort) | Need wave grouping algorithm or backward compatibility rules |
| COR-WAVE-3 | Parallel spawning rules and wave summary format | Need parallel spawning rules or wave execution summary format |
| COR-WAVE-4 | Wave coordinator behavior and failure handling | Need wave coordinator behavior, file conflict detection, or failure handling |
| COR-WAVE-5 | Wave execution configuration and interaction matrix | Need wave execution configuration, interaction matrix, or aggregation rules |
| COR-PTV-1 | Per-task verification architecture and verify tag syntax | Need verification system overview or `<verify>` tag parsing rules |
| COR-PTV-2 | Debug sub-agent prompt template and return schema | Need debug sub-agent configuration or diagnosis JSON format |
| COR-PTV-3 | Verification loop flow and retry behavior | Need verification loop details or retry/escalation rules |
| COR-PTV-4 | Task verifications JSON return field schema | Need `task_verifications` array format or field descriptions |

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
| `per-task-verification.md` | Per-task verification system, debug sub-agents, JSON schemas |
| `execute-plan-skill.md`   | Skill that executes the plan      |
| `plans-patterns.md`       | Rules and patterns for plans      |
| `complexity-scoring.md`   | Complexity scoring system         |
| `plan-mode-tool.md`       | Plan mode switching instructions  |
| `/create-plan` command     | Create a plan first               |
| `/discovery-plan` command  | Run discovery before planning     |

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

## Pattern Capture

During execution, silently watch for recurring conventions, anti-patterns, workarounds, and user corrections. Append captured patterns to `flow/resources/pending-patterns.md` without interrupting work.

After all phases complete (before brain-capture), present any buffered patterns for user approval. Approved patterns are written to `.claude/rules/core/allowed-patterns.md` or `.claude/rules/core/forbidden-patterns.md`.

See `.claude/resources/core/pattern-capture.md` for buffer format, capture triggers, conflict detection, and the full review protocol.

---

## Design Awareness

During execution, when a phase involves UI work and the discovery document contains a `## Design Context` section, auto-inject the design tokens into the phase implementation prompt. This ensures UI phases follow the established design system.

See `.claude/resources/core/design-awareness.md` for UI phase detection heuristics and injection rules.

---

## Model Routing

When `model_routing: true` in `flow/.flowconfig` (default), each phase is automatically routed to the most cost-effective model based on its complexity score:

| Complexity | Tier | Claude Code Model |
|-----------|------|-------------------|
| 0-3 | Fast | haiku |
| 4-5 | Standard | sonnet |
| 6-10 | Powerful | opus |

Routing happens at Step 4 of the execution skill — the phase implementation is spawned as an Agent subagent with the appropriate `model` parameter. Planning/approval steps always use the session model.

Disable with `/flow model_routing=false`. See `.claude/resources/core/model-routing.md` for full tier table, platform mappings, and aggregation rules.

---

## Wave Execution

When `wave_execution: true` in `flow/.flowconfig` (default), the coordinator analyzes phase dependencies, groups independent phases into **waves**, and executes phases within each wave **in parallel** using Agent sub-agents. Waves are sequenced — Wave N+1 starts only after all Wave N phases complete.

Key behaviors:
- **Planning stays sequential** — each phase is approved in Plan mode before wave execution begins
- **Tests never parallel** — tests phase always runs alone in the final wave
- **Backward compatible** — plans without `Dependencies` fields execute sequentially (no behavior change)
- **File conflict detection** — overlapping files_modified between parallel phases are flagged for user resolution
- **Deterministic commits** — git commits happen sequentially in phase order after each wave completes

User can always choose sequential execution at the wave summary prompt. Disable globally with `/flow wave_execution=false`.

See `.claude/resources/core/wave-execution.md` for the full dependency analysis rules, wave grouping algorithm, parallel spawning rules, coordinator behavior, and configuration.

---

## Phase Isolation

When `phase_isolation: true` in `flow/.flowconfig` (default), each phase implementation runs in an **isolated Agent sub-agent** with a clean context window. The sub-agent receives only: phase spec, files modified so far, pattern file paths, and design context (if UI phase). It returns a structured JSON summary (1-2K tokens) with status, files changed, decisions, errors, and captured patterns.

This eliminates context rot — phase 7 has the same quality as phase 1. Planning/approval stays in the main session; only the implementation step is isolated.

Disable with `/flow phase_isolation=false`. See `.claude/resources/core/phase-isolation.md` for the full context template, return format schema, and coordinator processing rules.

