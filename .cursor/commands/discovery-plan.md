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

> **MODE: Research**
> Explore before concluding. Read 3x more than you write. Prefer Read/Grep/Glob/WebSearch tools.
> Ask clarifying questions when uncertain. Don't jump to implementation.

> **AGENT_PROFILE: read-only**
> See `.claude/resources/core/agent-profiles.md` for tool access rules.

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
  /discovery-plan [flags] <reference_document>
  /discovery-plan [flags] <feature_description>
  /discovery-plan -help

ARGUMENTS:
  reference_document   Contract, spec, or any document to analyze
  feature_description  Description of what you want to build

WORKFLOW FLAGS (optional):
  -security   Focus on threat model, attack surface, compliance needs,
              and security requirements gathering.
  -refactor   Focus on refactoring scope, target patterns, success criteria,
              and what to preserve during restructuring.

  Without a flag, performs standard feature requirements gathering.

EXAMPLES:
  /discovery-plan @flow/contracts/api_contract.md
  /discovery-plan "User authentication with OAuth2"
  /discovery-plan @docs/feature-spec.md "Focus on the payment flow"
  /discovery-plan -security "Review payment system security"
  /discovery-plan -refactor "Restructure the API layer"

OUTPUT:
  Creates: flow/discovery/discovery_<feature_name>_v<version>.md

WORKFLOW:
  1. Reads all referenced documents
  2. Finds all related code references in codebase
  3. Asks clarifying questions (via Plan mode Questions UI)
  4. Documents requirements (FR, NFR, Constraints)
  5. Proposes high-level approach (no code)
  6. Creates discovery document for review
  7. Asks user if they want to proceed, refine, or stop
  8. Supports iterative refinement (max 3 rounds)
  9. Waits for user confirmation before proceeding

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
| **Only Markdown Output** | The ONLY deliverable is the discovery markdown file. Do NOT display it in chat. Save the `.md` file and report its path only. |
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

### Step 0: Parse Workflow Flag

Check if the user input starts with a workflow flag:

| Flag | Discovery Focus |
|------|----------------|
| `-security` | **Threat model and security requirements**. Questions focus on: auth flows, data sensitivity, encryption needs, access control, vulnerability surface, compliance requirements (SOC2, GDPR, PCI), and trust boundaries. Discovery document includes a "Threat Model" section and "Security Requirements" subsection. |
| `-refactor` | **Refactoring scope and target patterns**. Questions focus on: current pain points, desired patterns, migration strategy, backward compatibility, what to preserve, success criteria, and acceptable breakage. Discovery document includes a "Baseline Assessment" section and "Target Architecture" subsection. |
| (none) | Standard feature requirements gathering |

If a flag is found:
1. Set the **discovery focus** for this execution
2. Remove the flag from the input (the rest is the user's prompt/reference)
3. The focus affects the questions asked in Step 4 and the structure of the output document

If no flag is found: proceed with standard discovery (backward compatible).

---

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

### Step 1.5: Search for Existing Solutions

**Before recommending implementation**, check if the problem is already solved:

1. **Project code**: Use Grep/Glob to search for existing implementations, similar patterns, or utilities that already address part of the requirement
2. **Package registries**: Use WebSearch to check npm (for JS/TS projects) or PyPI (for Python projects) for established libraries
   - Search: `"{problem description} npm package"` or `"{problem description} python library"`
   - Evaluate: maintenance status (last publish date), weekly downloads, compatibility with project stack
3. **Document findings** in an "Existing Solutions Analysis" section in the discovery document

**Decision criteria**:
- If an existing library covers **>80%** of the need → recommend using it instead of building from scratch
- If **<80%** → note what it covers and what custom work remains

**Graceful degradation**: If WebSearch is unavailable, skip registry search and note "Package registry search skipped — WebSearch unavailable" in the discovery document. Always perform the project code search.

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
10. Support iterative refinement (max 3 rounds) if user requests it
11. Ask user if they want to proceed to /create-plan
12. Wait for user confirmation before proceeding

See: `.claude/resources/skills/discovery-skill.md`

---

### Step 5: Save File and Stop

After the skill completes:

1. **Save the discovery document** to `flow/discovery/discovery_<feature>_v<version>.md`
2. **Report only the file path and a brief summary** — do NOT display the full document content in chat
3. **STOP** — do NOT create a plan, do NOT offer to build, do NOT show implementation steps

**Output to the user** (this is the ONLY thing to show):

```markdown
Discovery complete.

**Summary**:
- X functional requirements gathered
- X non-functional requirements identified
- X risks documented
- X questions resolved

**Created**: `flow/discovery/discovery_<feature>_v1.md`

Next: review the file, then run `/create-plan` when ready.
If you want to refine the discovery first, just tell me what to adjust.
```

⚠️ **CRITICAL**: After saving the file, the command is DONE. Do NOT:
- Show the full discovery document content in chat
- Create or suggest an implementation plan
- Offer to build or execute anything
- Auto-invoke `/create-plan` or trigger any planning mode
- Enter Cursor's plan/execute mode

The user will read the `.md` file themselves and decide when to proceed.

#### Refinement (if user asks)

If the user asks to refine after seeing the summary:

1. **Accept feedback**: Ask what areas need adjustment (requirements, approach, scope, risks)
2. **Follow-up questions**: Ask 1-3 targeted questions about the refinement areas only
3. **Update document**: Modify the discovery document in-place
4. **Re-present**: Show the updated summary and file path (NOT the full content)
5. **Max 3 rounds**: After 3 refinement rounds, save and stop

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

---

## Tasklist Updates

Update `flow/tasklist.md` at these points. See `.claude/resources/core/project-tasklist.md` for full rules.

1. **On start**: Add "Discovery: {feature}" to **In Progress** (or move it from To Do if it already exists)
2. **On complete**: Move "Discovery: {feature}" to **Done** with today's date
3. **Next step**: Add "Create plan for {feature}" to **To Do**

---

## Learn Recommendations

After discovery completes, check for learning opportunities. See `.claude/resources/core/learn-recommendations.md` for the full system.

**Discovery-specific checks**:
- Does the proposed approach introduce **new technologies** the project hasn't used before?
- Are there **unfamiliar APIs or services** in the requirements?
- Did the user mention switching from one pattern/tool to another?

**If new tech is detected**, add a "Suggested Learning" section to the discovery document:

```markdown
## Suggested Learning

The following topics are new to this project and may benefit from structured learning before implementation:

| Topic | Why | Suggested Command |
|-------|-----|-------------------|
| Langfuse | New observability tool not previously used | `/learn langfuse` |
| WebSocket | Real-time communication pattern new to project | `/learn websockets` |

These are optional but recommended to reduce implementation friction.
```

**Detection**: Compare proposed technologies against `flow/references/tech-foundation.md` and existing `package.json` / `pyproject.toml` dependencies. If a technology is not in the current stack, flag it.

**Presentation**: Include the section in the discovery document itself (not as a chat message). This ensures the learning suggestion persists and is visible when the user reviews the document.

---

## Compaction Suggestion

After discovery completes, suggest context cleanup:

> Discovery complete. Consider running `/compact` before creating a plan to free context for the planning phase.

Only suggest if the discovery was substantial (> 5 requirements gathered). Skip if autopilot is ON (context will be managed automatically).

---

## Brain Capture

After discovery completes successfully, append a brain-capture block. See `.claude/resources/core/brain-capture.md` for processing rules.

**Capture the following**:

```
<!-- brain-capture
skill: discovery
feature: [feature name from discovery]
status: completed
data:
  user_prompt: [original user request]
  questions_asked: [count]
  questions_answered: [count]
  requirements_fr: [count of functional requirements]
  requirements_nfr: [count of non-functional requirements]
  discovery_doc: [path to discovery document]
-->
```

Write/update `flow/brain/features/[feature-name].md` with discovery context and update `flow/brain/index.md`.

---

## Resource Capture

During this skill's execution, watch for valuable reference materials worth preserving. See `.claude/resources/core/resource-capture.md` for capture rules, file format, and naming conventions.

At natural break points, if you encounter information that could be useful for future development (API specs, architecture notes, config references, domain knowledge, etc.), ask the user: "I found something that could be useful for future reference: _{brief description}_. Should I save it to `flow/resources/`?"

Only save if the user approves. Do not re-ask if declined.

---

## Handoff Production

After discovery completes, produce a handoff document for the next step. See `.claude/resources/patterns/handoff-patterns.md` [PTN-HND-1] for the template.

**Output**: `flow/handoffs/handoff_<feature>_discovery_to_plan.md`

Include: feature name, workflow type, requirements summary (FR/NFR/C counts), key decisions from Q&A, top risks, discovery doc path, and focus guidance for planning.

Create the `flow/handoffs/` directory if it doesn't exist.
