---
name: discovery
description: Create a discovery document to gather and clarify requirements
metadata: {"openclaw":{"requires":{"bins":["git"]}}}
user-invocable: true
---

# Discovery

Create a discovery document for gathering and clarifying requirements before creating an implementation plan.

## What It Does

1. Gathers functional and non-functional requirements
2. Documents constraints and dependencies
3. Identifies open questions that need answers
4. Proposes a high-level approach
5. Documents risks and unknowns

## Usage

```
/discovery <topic>
```

**Arguments:**
- `topic` (required): The feature or topic to discover requirements for

## Output

Creates: `flow/discovery/discovery_<topic>_v<version>.md`

## Document Structure

```markdown
# Discovery: [Topic]

**Project**: [[{project-name}]]

## Context
Why this discovery is needed

## Requirements Gathered
### Functional Requirements
- [FR-1]: Description

### Non-Functional Requirements
- [NFR-1]: Description

### Constraints
- [C-1]: Description

## Open Questions
| # | Question | Status | Answer |
|---|----------|--------|--------|
| 1 | Question | Open   | -      |

## Technical Considerations
Architecture, dependencies, patterns

## Proposed Approach
High-level recommendation

## Risks and Unknowns
Identified risks with mitigation strategies

## Next Steps
Follow-up actions
```

## Example

```
/discovery user authentication with OAuth
```

**Creates:** `flow/discovery/discovery_user_authentication_with_oauth_v1.md`

## Critical Rules

- **No Code**: Discovery is for gathering requirements only. No implementation.
- **Ask Questions**: Use interactive questions to clarify unclear requirements.
- **Mark Assumptions**: Always explicitly mark assumptions for validation.

## Next Command

After discovery, run `/create-plan @flow/discovery/discovery_<topic>_v1.md` to create an implementation plan.

---

## Resource Capture

During this skill's execution, watch for valuable reference materials worth preserving. See the resource-capture rules for capture criteria, file format, and naming conventions.

At natural break points, if you encounter information that could be useful for future development (API specs, architecture notes, config references, domain knowledge, etc.), ask the user: "I found something that could be useful for future reference: _{brief description}_. Should I save it to `flow/resources/`?"

Only save if the user approves. Do not re-ask if declined.
