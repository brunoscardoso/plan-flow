---
description: This command creates a structured implementation plan based on a discovery document or user input. T
---

# Create Implementation Plan

## Command Description

This command creates a structured implementation plan based on a discovery document or user input. The command validates inputs and orchestrates the planning process by invoking the `create-plan` skill.

**Output**: A markdown file at `flow/plans/plan_<feature_name>_v<version>.md`

---


## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/create-plan - Create Implementation Plan

DESCRIPTION:
  Creates a structured implementation plan with phases, complexity scores,
  and tasks based on a discovery document or user input.

USAGE:
  /create-plan <discovery_document>
  /create-plan <feature_description>
  /create-plan -help

ARGUMENTS:
  discovery_document   Path to discovery document (recommended)
  feature_description  Direct description of feature to plan (if no discovery)

EXAMPLES:
  /create-plan @flow/discovery/discovery_user_auth_v1.md
  /create-plan "Add dark mode toggle to settings page"
  /create-plan @flow/contracts/api_contract.md

OUTPUT:
  Creates: flow/plans/plan_<feature_name>_v<version>.md

WORKFLOW:
  1. Validates discovery document exists (or prompts for discovery first)
  2. Extracts requirements from discovery document
  3. Creates phases with complexity scores (0-10)
  4. Assigns tasks to each phase
  5. Tests phase is always last

RECOMMENDED MODEL:
  Claude Opus 4.6 or Sonnet 4.5 for best results

RELATED COMMANDS:
  /discovery-plan    Run discovery first (recommended)
  /execute-plan      Execute the created plan
```

---

> ⚠️ **AUTOPILOT MODE CHECK**
>
> Before proceeding, check if `flow/.autopilot` exists.
> - **If YES**: Autopilot is ON. After creating the plan and getting user approval, **auto-proceed** to `/execute-plan` with the plan output. Do NOT wait for manual invocation.
> - **If NO**: Follow the standard rules below (stop and wait for user).

## Critical Rules

| Rule                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| **Discovery Required**   | NEVER create a plan without a discovery document. If none exists, run `/discovery-plan` first. No exceptions. |
| **No Auto-Chaining**     | NEVER auto-invoke /execute-plan - user must invoke it (unless autopilot ON) |
| **File Only**            | Save the `.md` file and report its path. Do NOT show full content in chat. |
| **Complete and Stop**    | After presenting results, STOP and wait for user (unless autopilot ON) |

---

## Instructions

### Step 1: Validate Inputs

| Input                | Required | Description                                        |
| -------------------- | -------- | -------------------------------------------------- |
| `discovery_document` | Optional | Path to discovery document (recommended)           |
| `feature_description`| Optional | Direct description of feature (if no discovery)    |

**At least one must be provided.**

---

### Step 2: Validate Discovery Phase Completion (HARD BLOCK)

**A discovery document is REQUIRED before creating any plan. No exceptions.**

1. Check user input for a discovery document reference (`@flow/discovery/...`)
2. If no reference provided, search `flow/discovery/` for a matching discovery document
3. **If NO discovery document exists**: **STOP immediately.** Do NOT create a plan. Instead:
   - Inform the user that discovery is required before planning
   - Invoke `/discovery-plan` to start the discovery process
   - Example response:
     ```
     A discovery document is required before creating a plan. Discovery refines your idea,
     gathers requirements, and identifies risks — skipping it leads to incomplete plans.

     Starting discovery now...
     ```
   - Then run the discovery process for the user's feature
4. If a discovery document IS found: Proceed with plan creation using that document

**Important**: NEVER read or reference files in `flow/archive/` - these are outdated.
**Important**: NEVER create a plan without a discovery document. This rule has NO exceptions.

---

### Step 3: Determine Plan Version

Check `flow/plans/` for existing plans with the same feature name:

1. If existing plans found, increment version number
2. If no existing plans, use version 1

---

### Step 4: Invoke Create Plan Skill

The skill will:

1. Extract requirements from discovery document (or user input)
2. Analyze scope and complexity
3. Structure phases with complexity scores
4. Add key changes summary
5. Generate plan document

See: `.claude/resources/skills/create-plan-skill.md`

---

### Step 5: Save File and Stop

After the skill completes:

1. **Save the plan document** to `flow/plans/plan_<feature>_v<version>.md`
2. **Report only the file path** — do NOT display the full plan content in chat
3. **STOP** — do NOT execute the plan, do NOT offer to build

**Output to the user** (this is the ONLY thing to show):

```markdown
Plan created.

**Created**: `flow/plans/plan_<feature>_v<version>.md`

Next: review the file, then run `/execute-plan` when ready.
```

⚠️ **CRITICAL**: After saving the file, the command is DONE. Do NOT:
- Show the full plan content in chat
- Auto-invoke `/execute-plan`
- Offer to start building or implementing
- Show implementation steps or code

The user will read the `.md` file themselves and decide when to proceed.

---

## Flow Diagram

```
+------------------------------------------+
|         /create-plan COMMAND             |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 1: Validate Inputs                  |
| - Check for discovery doc or description |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 2: Validate Discovery Completion    |
| - Check for discovery indicators         |
| - Recommend /discovery-plan if missing   |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 3: Determine Plan Version           |
| - Check existing plans                   |
| - Increment version if needed            |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 4: Invoke Create Plan Skill         |
| - Skill handles all planning logic       |
| - See create-plan-skill.md              |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 5: Save File and Stop               |
| - Save .md file to flow/plans/           |
| - Report file path only                  |
| - STOP (no execute, no build)            |
+------------------------------------------+
```

---

## Example Usage

**User**: `/create-plan @flow/discovery/discovery_user_auth_v1.md`

**Execution**:

1. Validate input: discovery document provided
2. Verify discovery was completed
3. Check for existing plans, determine version
4. Invoke create-plan skill
5. Present plan summary
6. User reviews and proceeds to `/execute-plan`

---

## Context Optimization

This command uses hierarchical context loading to reduce context consumption. Instead of loading full files, load indexes first and expand specific sections on-demand.

### Recommended Loading Order

1. **Always load first**: This command file (`commands/create-plan.md`)
2. **Load indexes**: Load `_index.md` files for relevant folders
3. **Expand on-demand**: Use reference codes to load specific sections when needed

### Index Files for Plan Creation

| Index | When to Load |
|-------|--------------|
| `resources/patterns/_index.md` | To find plan patterns and templates |
| `resources/skills/_index.md` | To understand skill workflow |
| `resources/core/_index.md` | For complexity scoring reference |

### Reference Codes for Plan Creation

| Code | Description | When to Expand |
|------|-------------|----------------|
| PTN-PLN-1 | Plan document structure | Creating new plan |
| PTN-PLN-2 | Phase organization | Structuring phases |
| PTN-PLNT-1 | Plan template | Creating output file |
| SKL-PLN-1 | Create plan skill workflow | Understanding full process |
| COR-CS-1 | Complexity scoring table | Assigning complexity scores |

### Expansion Instructions

When executing this command:

1. **Start with indexes**: Read `resources/patterns/_index.md` and `resources/core/_index.md`
2. **Identify needed codes**: Based on current step, identify which codes are relevant
3. **Expand as needed**: Use the Read tool with specific line ranges from the index
4. **Don't expand everything**: Only load content required for the current step

---

## Related Resources

| Resource                    | Purpose                           |
| --------------------------- | --------------------------------- |
| `resources/skills/_index.md`   | Index of skills with reference codes |
| `resources/patterns/_index.md` | Index of patterns with reference codes |
| `resources/core/_index.md`     | Index of core rules with reference codes |
| `create-plan-skill.md`     | Skill that creates the plan       |
| `plans-patterns.md`        | Rules and patterns for plans      |
| `plans-templates.md`       | Plan templates                    |
| `complexity-scoring.md`    | Complexity scoring system         |
| `/discovery-plan` command   | Run discovery first               |
| `/execute-plan` command     | Execute the created plan          |

---

## Brain Capture

After plan creation completes successfully, append a brain-capture block. See `.claude/resources/core/brain-capture.md` for processing rules.

**Capture the following**:

```
<!-- brain-capture
skill: create-plan
feature: [feature name]
status: completed
data:
  phase_count: [number of phases]
  total_complexity: [sum of complexity scores]
  highest_phase: [phase name with highest score]
  discovery_link: [[discovery-feature-name]]
  plan_doc: [path to plan document]
-->
```

Update `flow/brain/features/[feature-name].md` with plan details and link to discovery entry.

---

## Resource Capture

During this skill's execution, watch for valuable reference materials worth preserving. See `.claude/resources/core/resource-capture.md` for capture rules, file format, and naming conventions.

At natural break points, if you encounter information that could be useful for future development (API specs, architecture notes, config references, domain knowledge, etc.), ask the user: "I found something that could be useful for future reference: _{brief description}_. Should I save it to `flow/resources/`?"

Only save if the user approves. Do not re-ask if declined.

