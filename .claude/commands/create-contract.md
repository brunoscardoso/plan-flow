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
  Claude Opus 4.5 or Sonnet 4.5 for best results

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

See: `.claude/rules/skills/create-contract-skill.md`

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
| `rules/patterns/_index.md` | To find contract patterns |
| `rules/skills/_index.md` | To understand skill workflow |
| `rules/tools/_index.md` | When using interactive questions |

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

1. **Start with indexes**: Read `rules/patterns/_index.md` and `rules/skills/_index.md`
2. **Identify needed codes**: Based on current step, identify which codes are relevant
3. **Expand as needed**: Use the Read tool with specific line ranges from the index
4. **Don't expand everything**: Only load content required for the current step

---

## Related Resources

| Resource                       | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `rules/skills/_index.md`      | Index of skills with reference codes   |
| `rules/patterns/_index.md`    | Index of patterns with reference codes |
| `rules/tools/_index.md`       | Index of tools with reference codes    |
| `create-contract-skill.md`    | Skill that creates the contract        |
| `contract-patterns.md`        | Rules and patterns for contracts       |
| `interactive-questions-tool.md` | Interactive Questions UI workflow    |
| `/discovery-plan` command      | Create discovery from contract         |
| `/create-plan` command         | Create plan from discovery             |

---

# Implementation Details


## Restrictions - CONTRACT CREATION ONLY

This skill is **strictly for creating contract documents**. The process:

1. **Fetches** information from the source URL
2. **Analyzes** the API structure and schemas
3. **Asks** clarifying questions via Interactive Questions Tool
4. **Generates** a contract markdown file

**No code, no implementation, no source file modifications.**

### NEVER Do These Actions

| Forbidden Action                       | Reason                              |
| -------------------------------------- | ----------------------------------- |
| Create/edit source code files          | Contract creation only              |
| Write implementation code              | Contracts describe, not implement   |
| Modify configuration files             | No codebase changes                 |
| Run build or test commands             | No execution commands               |
| Create files outside `flow/contracts/` | Only write contract documents       |

### Allowed Actions

| Allowed Action                         | Purpose                              |
| -------------------------------------- | ------------------------------------ |
| Use Web Search tool                    | Fetch documentation from URLs        |
| Read repository files                  | Analyze API structure                |
| Use Interactive Questions Tool         | Gather requirements from user        |
| Write to `flow/contracts/`             | Save contract document               |
| Read project rule files                | Understand patterns to follow        |

> **Important**: The ONLY writable location is `flow/contracts/`. No source code or other files should be modified.

---

## Inputs

| Input         | Required | Description                                          |
| ------------- | -------- | ---------------------------------------------------- |
| `source_url`  | Yes      | Documentation URL or repository URL                  |
| `description` | Yes      | What the user wants to integrate on the frontend     |

---

## Workflow

### Step 1: Detect Source Type

Analyze the provided URL to determine the source type:

| Source Type      | Detection                                      |
| ---------------- | ---------------------------------------------- |
| Documentation    | Contains `/docs`, `/api`, swagger, openapi     |
| Repository       | Contains github.com, gitlab.com, bitbucket.org |
| OpenAPI Spec     | Ends with `.json`, `.yaml`, `/swagger`         |

---

### Step 2A: Handle Documentation URL

If the source is a documentation URL:

1. Use Web Search tool to fetch documentation content
2. Extract key information:
   - API endpoints
   - Request/response schemas
   - Authentication methods
   - Error formats
   - Rate limits

---

### Step 2B: Handle Repository URL

If the source is a repository URL:

1. Analyze repository structure
2. Identify relevant files:
   - API route definitions
   - Type definitions
   - Schema files
   - README/docs
3. Read and extract key information

---

### Step 3: Ask Clarifying Questions

**Use Interactive Questions Tool** to gather requirements.

Follow `.claude/rules/tools/interactive-questions-tool.md`:

1. Call `SwitchMode` tool to enter Plan mode
2. Call `Ask the user directly in conversation` tool for each question about:
   - **Scope**: Which specific endpoints/features are needed?
   - **Authentication**: How will the FE authenticate?
   - **Error Handling**: How should the FE handle errors?
   - **Caching**: Any caching requirements?
3. Wait for all responses
4. Call `SwitchMode` tool to return to Agent mode
5. Document answers for use in the contract document

---

### Step 4: Generate Contract Document

Create the contract with all gathered information:

**Location**: `flow/contracts/<service_name>_contract.md`

**Required Sections**:

1. Overview
2. Authentication
3. Endpoints (with request/response schemas)
4. Error Handling
5. Integration Notes
6. Usage Examples

---

## Output Format

### Contract Template

```markdown
# Integration Contract: [Service Name]

## Overview

**Source**: [URL]
**Description**: [What this integration provides]
**Version**: [API version if applicable]

## Authentication

**Method**: [Bearer token, API key, OAuth, etc.]
**Header**: [Authorization header format]
**Token Source**: [Where FE gets the token]

## Endpoints

### [Endpoint Name]

**Method**: [GET/POST/PUT/DELETE]
**URL**: [Endpoint URL]
**Description**: [What this endpoint does]

**Request**:
```typescript
interface RequestBody {
  // Request schema
}
```

**Response**:
```typescript
interface Response {
  // Response schema
}
```

**Example**:
```bash
curl -X POST /api/endpoint \
  -H "Authorization: Bearer token" \
  -d '{"field": "value"}'
```

## Error Handling

| Status Code | Meaning              | FE Action                 |
| ----------- | -------------------- | ------------------------- |
| 400         | Bad Request          | Show validation error     |
| 401         | Unauthorized         | Redirect to login         |
| 404         | Not Found            | Show not found message    |
| 500         | Server Error         | Show generic error        |

## Integration Notes

### Rate Limits
[Any rate limiting information]

### Caching
[Caching recommendations]

### Pagination
[Pagination format if applicable]

## Usage Examples

### [Use Case 1]
[Code example or description]
```

---

## Validation Checklist

Before completing the contract, verify:

- [ ] Contract is saved in `flow/contracts/` folder
- [ ] File uses naming: `<service_name>_contract.md`
- [ ] All requested endpoints are documented
- [ ] Authentication method is clear
- [ ] Request/response schemas are defined
- [ ] Error handling is documented
- [ ] **NO implementation code is included**
- [ ] **NO source files were created or modified**

---

## Related Files

| File                                               | Purpose                           |
| -------------------------------------------------- | --------------------------------- |
| `.claude/rules/patterns/contract-patterns.md`     | Rules and patterns for contracts  |
| `.claude/rules/tools/interactive-questions-tool.md` | Interactive Questions workflow  |
| `flow/contracts/`                                  | Output folder for contracts       |
