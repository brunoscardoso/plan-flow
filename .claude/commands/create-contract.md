---
description: This command creates an integration contract document by fetching information from a documentation U
---

# Create Integration Contract

## Command Description

This command creates an integration contract document by fetching information from a documentation URL or analyzing a project repository. The command validates inputs and orchestrates the contract creation process by invoking the `create-contract` skill.

**Output**: A markdown file at `flow/contracts/<service_name>_contract.md`

---


## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/create-contract - Create Integration Contract

DESCRIPTION:
  Creates an integration contract document by fetching information from a
  documentation URL or analyzing a project repository.

USAGE:
  /create-contract <source_url> <description>
  /create-contract -help

ARGUMENTS:
  source_url    Documentation URL (API docs, Swagger, OpenAPI) or repository URL
  description   What you want to integrate on the frontend

EXAMPLES:
  /create-contract https://api.example.com/docs "User authentication endpoints"
  /create-contract https://github.com/org/api-service "Payment processing integration"
  /create-contract @https://swagger.io/spec.json "Order management API"

OUTPUT:
  Creates: flow/contracts/<service_name>_contract.md

WORKFLOW:
  1. Fetches and analyzes the source URL
  2. Asks clarifying questions about scope, auth, error handling
  3. Generates contract document with endpoints, schemas, and integration notes

RECOMMENDED MODEL:
  Claude Opus 4.6 or Sonnet 4.5 for best results

RELATED COMMANDS:
  /discovery-plan    Create discovery document from contract
  /create-plan       Create implementation plan from discovery
```

---

## Critical Rules

| Rule                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| **No Auto-Chaining**     | NEVER auto-invoke /discovery-plan - user must invoke it  |
| **Complete and Stop**    | After presenting results, STOP and wait for user         |

---

## Instructions

### Step 1: Validate Inputs

| Input         | Required | Description                                          |
| ------------- | -------- | ---------------------------------------------------- |
| `source_url`  | Yes      | Documentation URL or repository URL                  |
| `description` | Yes      | What the user wants to integrate on the frontend     |

**Both inputs are required.** If either is missing, ask:

```markdown
To create an integration contract, I need:

1. **Source URL**: Where can I find the API documentation?
   - API docs URL (e.g., https://api.example.com/docs)
   - Swagger/OpenAPI spec URL
   - Repository URL (GitHub, GitLab, etc.)

2. **Description**: What do you want to integrate?
   - Which specific endpoints/features are needed?
   - What's the use case on the frontend?
```

---

### Step 2: Detect Source Type

Analyze the URL to determine source type:

| Source Type    | Detection                                |
| -------------- | ---------------------------------------- |
| Documentation  | Contains `/docs`, `/api`, swagger        |
| Repository     | Contains github.com, gitlab.com          |
| OpenAPI Spec   | Ends with `.json`, `.yaml`               |

---

### Step 3: Invoke Create Contract Skill

The skill will:

1. Fetch information from the source URL
2. Analyze API structure and schemas
3. Ask clarifying questions via Interactive Questions Tool
4. Generate contract document

See: `.claude/resources/skills/create-contract-skill.md`

---

### Step 4: Present Results

After the skill completes, confirm file creation:

```markdown
Contract Created!

**Deliverable**: `flow/contracts/<service_name>_contract.md`

**Summary**:
- X endpoints documented
- Authentication: [method]
- Error handling documented

**Next Steps** (user must invoke manually):
1. Review the contract above
2. Request any refinements
3. When ready, invoke `/discovery-plan @flow/contracts/<service_name>_contract.md`
```

**CRITICAL**: This command is now complete. Do NOT auto-invoke `/discovery-plan`. Wait for the user to explicitly invoke it.

---

## Flow Diagram

```
+------------------------------------------+
|       /create-contract COMMAND           |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 1: Validate Inputs                  |
| - Check for source URL and description   |
| - Ask for missing inputs if needed       |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 2: Detect Source Type               |
| - Documentation, Repository, or OpenAPI  |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 3: Invoke Create Contract Skill     |
| - Skill handles all contract logic       |
| - See create-contract-skill.md          |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 4: Present Results                  |
| - Show summary                           |
| - Link to /discovery-plan command        |
+------------------------------------------+
```

---

## Example Usage

**User**: `/create-contract https://api.example.com/docs "User authentication endpoints"`

**Execution**:

1. Validate inputs: URL and description provided
2. Detect source type: Documentation
3. Invoke create-contract skill
4. Present contract summary
5. User reviews and proceeds to `/discovery-plan`

---

## Context Optimization

This command uses hierarchical context loading to reduce context consumption. Instead of loading full files, load indexes first and expand specific sections on-demand.

### Recommended Loading Order

1. **Always load first**: This command file (`commands/create-contract.md`)
2. **Load indexes**: Load `_index.md` files for relevant folders
3. **Expand on-demand**: Use reference codes to load specific sections when needed

### Index Files for Contract Creation

| Index | When to Load |
|-------|--------------|
| `resources/patterns/_index.md` | To find contract patterns |
| `resources/skills/_index.md` | To understand skill workflow |
| `resources/tools/_index.md` | When using interactive questions |

### Reference Codes for Contract Creation

| Code | Description | When to Expand |
|------|-------------|----------------|
| PTN-CON-1 | Contract document structure | Creating new contract |
| PTN-CON-2 | Endpoint documentation format | Documenting API endpoints |
| SKL-CON-1 | Contract skill workflow | Understanding full process |
| TLS-IQ-2 | How to switch to Plan mode | Before asking questions |
| TLS-IQ-3 | How to ask questions | When gathering scope info |

### Expansion Instructions

When executing this command:

1. **Start with indexes**: Read `resources/patterns/_index.md` and `resources/skills/_index.md`
2. **Identify needed codes**: Based on current step, identify which codes are relevant
3. **Expand as needed**: Use the Read tool with specific line ranges from the index
4. **Don't expand everything**: Only load content required for the current step

---

## Related Resources

| Resource                       | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `resources/skills/_index.md`      | Index of skills with reference codes   |
| `resources/patterns/_index.md`    | Index of patterns with reference codes |
| `resources/tools/_index.md`       | Index of tools with reference codes    |
| `create-contract-skill.md`    | Skill that creates the contract        |
| `contract-patterns.md`        | Rules and patterns for contracts       |
| `interactive-questions-tool.md` | Interactive Questions UI workflow    |
| `/discovery-plan` command      | Create discovery from contract         |
| `/create-plan` command         | Create plan from discovery             |

