---
description: This command creates a discovery document for gathering and clarifying requirements before creating 
---

# Create Discovery Document

## Command Description

This command creates a discovery document for gathering and clarifying requirements before creating an implementation plan. The command validates inputs and orchestrates the discovery process by invoking the `discovery` skill.

**Output**: A markdown file at `flow/discovery/discovery_<feature_name>_v<version>.md`

---

> ⚠️ **AUTOPILOT MODE CHECK**
>
> Before proceeding, check if `flow/.autopilot` exists.
> - **If YES**: Autopilot is ON. After completing discovery and user Q&A, **auto-proceed** to `/create-plan` with the discovery output. Do NOT ask "Would you like to proceed?" - just continue.
> - **If NO**: Follow the standard rules below (stop and wait for user).

> ⚠️ **IMPORTANT - DISCOVERY ONLY**
>
> This command ONLY creates a discovery document. It does NOT:
> - Create implementation plans (use `/create-plan` for that)
> - Execute code or implementation steps (use `/execute-plan` for that)
> - Write any source code files
> - Auto-chain to the next command (unless autopilot mode is ON)
>
> After creating the discovery document, the command STOPS and waits for user review (unless autopilot mode is ON).

---


## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/discovery-plan - Create Discovery Document

DESCRIPTION:
  Creates a discovery document for gathering and clarifying requirements
  before creating an implementation plan. This is the recommended first step.

USAGE:
  /discovery-plan <reference_document>
  /discovery-plan <feature_description>
  /discovery-plan -help

ARGUMENTS:
  reference_document   Contract, spec, or any document to analyze
  feature_description  Description of what you want to build

EXAMPLES:
  /discovery-plan @flow/contracts/api_contract.md
  /discovery-plan "User authentication with OAuth2"
  /discovery-plan @docs/feature-spec.md "Focus on the payment flow"

OUTPUT:
  Creates: flow/discovery/discovery_<feature_name>_v<version>.md

WORKFLOW:
  1. Reads all referenced documents
  2. Finds all related code references in codebase
  3. Asks clarifying questions (via Plan mode Questions UI)
  4. Documents requirements (FR, NFR, Constraints)
  5. Proposes high-level approach (no code)
  6. Creates discovery document for review
  7. Asks user if they want to proceed to /create-plan
  8. Waits for user confirmation before proceeding

RECOMMENDED MODEL:
  Claude Opus 4.6 or Sonnet 4.5 for best results

RELATED COMMANDS:
  /create-contract   Create contract from API docs first
  /create-plan       Create plan from discovery document
```

---

## Critical Rules

These rules are mandatory. For detailed patterns and guidelines, see `.claude/resources/patterns/discovery-patterns.md`.

| Rule                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| **No Code**              | NEVER write, edit, or generate code during discovery     |
| **Only Markdown Output** | The ONLY deliverable is the discovery markdown file      |
| **Ask Questions**        | When in doubt, ask - don't assume                        |
| **Read First**           | Read all referenced documents before asking questions    |
| **High-Level Only**      | Technical considerations are conceptual, not code        |
| **Allow Refinement**     | User reviews and refines discovery before plan creation  |
| **Ask Before Proceeding**| ASK user if they want to proceed to /create-plan (unless autopilot ON) |
| **No Auto-Execution**    | Do NOT auto-invoke commands without user confirmation (unless autopilot ON) |
| **NO PLANNING**          | Do NOT create implementation plans during discovery      |
| **NO EXECUTION**         | Do NOT execute any implementation steps                  |

---

## Instructions

### Step 1: Validate Inputs

| Input                | Required | Description                                         |
| -------------------- | -------- | --------------------------------------------------- |
| `reference_document` | Optional | Contract, spec, or any document to analyze          |
| `feature_description`| Optional | Description of what to build (if no doc provided)   |

**At least one must be provided.** If neither is clear, ask:

```markdown
To start the discovery process, I need to understand:

1. **What feature or topic are we exploring?**
2. **What triggered this need?** (new requirement, bug, enhancement)
3. **Are there any documents I should review?** (API contracts, specs, designs)
4. **What do you already know about the requirements?**
5. **Are there any constraints I should be aware of?**
```

---

### Step 2: Extract Feature Name

From the user input, extract or derive a feature name for the discovery document.

**Examples**:
- `@flow/contracts/api_contract.md` → `api_integration`
- `"User authentication with OAuth2"` → `user_authentication`

---

### Step 3: Check for Existing Discovery

Check `flow/discovery/` for existing discovery documents for this feature:

1. If found, ask if user wants to create a new version or continue existing
2. Increment version number if creating new version

**Important**: NEVER read or reference files in `flow/archive/` - these are outdated documents.

---

### Step 4: Invoke Discovery Skill

The skill will:

1. Read all referenced documents
2. Find all related code references in the codebase
3. Ask clarifying questions via Interactive Questions Tool
4. Track question status
5. Document requirements (FR, NFR, Constraints)
6. Identify technical considerations
7. Propose high-level approach
8. Document risks and unknowns
9. Generate discovery document
10. Ask user if they want to proceed to /create-plan
11. Wait for user confirmation before proceeding

See: `.claude/resources/skills/discovery-skill.md`

---

### Step 5: Present Results

After the skill completes, present the discovery document to the user:

```markdown
Discovery Complete!

**Summary**:
- X functional requirements gathered
- X non-functional requirements identified
- X risks documented
- X questions resolved

**Deliverable Created**: `flow/discovery/discovery_<feature>_v1.md`

**Next Steps**:
1. Review the discovery document above
2. Request any refinements or additions (if needed)
3. Proceed to planning when ready
```

**Now ask the user using the `AskUserQuestion` tool**:

```typescript
AskUserQuestion({
  questions: [{
    question: "Would you like me to proceed with creating the implementation plan?",
    header: "Next step",
    options: [
      { label: "Yes, create plan", description: "I'll invoke /create-plan with the discovery document" },
      { label: "No, review first", description: "You can review the discovery and invoke /create-plan when ready" },
      { label: "Refine discovery", description: "Let me know what needs to be adjusted in the discovery" }
    ],
    multiSelect: false
  }]
})
```

⚠️ **WAIT for user response before proceeding**

Do NOT auto-invoke `/create-plan` without user confirmation.

---

## Flow Diagram

```
+------------------------------------------+
|        /discovery-plan COMMAND           |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 1: Validate Inputs                  |
| - Check for reference doc or description |
| - Ask clarifying questions if needed     |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 2-3: Extract Feature & Check Exists |
| - Derive feature name                    |
| - Check for existing discovery docs      |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 4: Invoke Discovery Skill           |
| - Skill handles all gathering logic      |
| - See discovery-skill.md                |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 5: Present Results                  |
| - Show summary to user                   |
| - Allow refinement                       |
| - Link to /create-plan command           |
+------------------------------------------+
```

---

## Example Usage

**User**: `/discovery-plan @flow/contracts/api-contract.md`

**Execution**:

1. Validate input: reference document provided
2. Extract feature name: `api_integration`
3. Check `flow/discovery/` for existing versions
4. Invoke discovery skill
5. Present discovery document and summary
6. User reviews and requests refinements (if any)
7. User invokes `/create-plan` when ready

---

## Context Optimization

This command uses hierarchical context loading to reduce context consumption. Instead of loading full files, load indexes first and expand specific sections on-demand.

### Recommended Loading Order

1. **Always load first**: This command file (`commands/discovery-plan.md`)
2. **Load indexes**: Load `_index.md` files for relevant folders
3. **Expand on-demand**: Use reference codes to load specific sections when needed

### Index Files for Discovery

| Index | When to Load |
|-------|--------------|
| `resources/patterns/_index.md` | To find discovery templates and patterns |
| `resources/skills/_index.md` | To understand skill workflow |
| `resources/tools/_index.md` | When using interactive questions |

### Reference Codes for Discovery

| Code | Description | When to Expand |
|------|-------------|----------------|
| PTN-DIS-1 | Discovery document structure | Creating new discovery doc |
| PTN-DIS-2 | Requirements gathering example | Need example format |
| PTN-DIST-1 | Discovery template | Creating output file |
| SKL-DIS-1 | Discovery skill workflow | Understanding full process |
| TLS-IQ-2 | How to switch to Plan mode | Before asking questions |
| TLS-IQ-3 | How to ask questions | When gathering requirements |

### Expansion Instructions

When executing this command:

1. **Start with indexes**: Read `resources/patterns/_index.md` and `resources/skills/_index.md`
2. **Identify needed codes**: Based on current step, identify which codes are relevant
3. **Expand as needed**: Use the Read tool with specific line ranges from the index
4. **Don't expand everything**: Only load content required for the current step

**Example expansion**:
```
# To get the discovery template
Read: resources/patterns/discovery-templates.md (lines from PTN-DIST-1)

# To understand question workflow
Read: resources/tools/interactive-questions-tool.md (lines from TLS-IQ-3)
```

---

## Related Resources

| Resource                       | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `resources/skills/_index.md`      | Index of skills with reference codes   |
| `resources/patterns/_index.md`    | Index of patterns with reference codes |
| `resources/tools/_index.md`       | Index of tools with reference codes    |
| `discovery-skill.md`          | Skill that executes the discovery      |
| `discovery-patterns.md`       | Rules and patterns for discovery       |
| `discovery-templates.md`      | Document templates                     |
| `interactive-questions-tool.md` | Interactive Questions UI workflow    |
| `/create-plan` command         | Creates plan from discovery document   |

