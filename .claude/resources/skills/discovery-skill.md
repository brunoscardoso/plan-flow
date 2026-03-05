
# Discovery Skill

## Purpose

Perform a comprehensive **requirements gathering and documentation** process that reads referenced documents, asks clarifying questions, and produces a structured discovery document.

This skill **only produces a markdown file** in `flow/discovery/`. It does NOT:

- Write any code
- Modify any source files
- Create implementation plans
- Execute any implementation

---

## Tool Access

This skill uses the **read-only** agent profile. See `agent-profiles.md` [COR-AG-1] for full details.

**Quick reference**: Read/Grep/Glob/WebSearch allowed. Edit/Write/Bash(write) forbidden. Output to `flow/discovery/` only (plus `flow/brain/` and `flow/log.md` for knowledge capture).

---

## Inputs

| Input                | Required | Description                                           |
| -------------------- | -------- | ----------------------------------------------------- |
| `feature_name`       | Yes      | Name of the feature or topic to explore               |
| `context`            | Optional | Why this discovery is needed                          |
| `referenced_docs`    | Optional | List of documents to review (@mentions, file paths)   |
| `known_requirements` | Optional | Any requirements already known                        |

---

## Workflow

### Step 1: Read All Referenced Documents

**BEFORE asking detailed questions**, read every referenced document.

**Actions**:

1. Identify references (look for @mentions, file paths, URLs)
2. Read each file using the Read tool
3. Extract key information (requirements, constraints, contracts)
4. Summarize findings for each source

**Document Analysis Format**:

```markdown
## Referenced Documents Analysis

### `flow/contracts/api-contract.md`

**Key Findings**:
- [Key point 1]
- [Key point 2]

**Questions Raised**:
- [Gap or unclear aspect]
```

**Important**: NEVER read or reference files in `flow/archive/` - these are outdated documents.

---

### Step 1.5: Search for Existing Solutions

**Before asking questions**, check if the problem is already solved:

1. **Project code search**: Use Grep/Glob to find existing implementations, similar patterns, or reusable code in the codebase
2. **Package registry search**: Use WebSearch to check npm/PyPI for established libraries that address the need
3. **Document findings**: Include an "Existing Solutions Analysis" section in the discovery document

**Decision rule**: If an existing library covers >80% of the need, recommend using it. If <80%, note coverage and gaps.

**If WebSearch unavailable**: Skip registry search, note limitation, proceed with project code search only.

---

### Step 2: Ask Clarifying Questions

Ask questions about gaps identified in documents and unclear requirements.

**Question Categories**:

| Category   | Focus                              |
| ---------- | ---------------------------------- |
| Functional | What the feature must do           |
| NFR        | Performance, security, scalability |
| Technical  | Architecture, dependencies         |
| UI/UX      | User interface and experience      |

**Use Interactive Questions Tool**:

Follow `.claude/resources/tools/interactive-questions-tool.md`:

1. Call `SwitchMode` tool to enter Plan mode
2. Call `AskQuestion` tool for each question (2-6 options, A/B/C/D format)
3. Wait for responses
4. Call `SwitchMode` tool to return to Agent mode

**Skip Interactive Questions If**:

- All questions answered in chat already
- User confirmed all assumptions
- No blocked or open questions remain

---

### Step 3: Track Question Status

Maintain a question tracking table:

```markdown
## Open Questions

| #   | Category   | Question                   | Status   | Answer            |
| --- | ---------- | -------------------------- | -------- | ----------------- |
| 1   | Functional | Max steps per workflow?    | Answered | 20 steps maximum  |
| 2   | Technical  | Use existing store or new? | Open     | -                 |
| 3   | NFR        | Required response time?    | Assumed  | <500ms (validate) |
```

**Status Legend**:

- **Open**: Awaiting answer
- **Answered**: Response received
- **Assumed**: Made assumption (needs validation)
- **Blocked**: Cannot proceed without answer

---

### Step 4: Document Requirements

Categorize requirements as they are gathered:

```markdown
## Requirements Gathered

### Functional Requirements
- [FR-1]: [Description] (Source: [document or user])

### Non-Functional Requirements
- [NFR-1]: [Description]

### Constraints
- [C-1]: [Description]
```

---

### Step 5: Identify Technical Considerations

Document high-level technical insights (NO implementation code):

```markdown
## Technical Considerations

### Architecture Fit
- [How this fits into existing system]

### Dependencies
- [What this relies on]

### Patterns to Apply
- [Relevant patterns from rules]

### Challenges Identified
- [Potential difficulties]
```

---

### Step 6: Propose High-Level Approach

Suggest an approach based on findings (NO implementation code):

```markdown
## Proposed Approach

Based on the requirements gathered, I recommend:

1. [High-level approach point 1]
2. [High-level approach point 2]

### Alternative Approaches Considered

| Approach | Pros | Cons | Recommendation |
| -------- | ---- | ---- | -------------- |
| [A]      | ...  | ...  | Yes/No         |
```

---

### Step 7: Document Risks and Unknowns

Capture risks discovered:

```markdown
## Risks and Unknowns

### Risks

| Risk | Impact | Likelihood | Mitigation |
| ---- | ------ | ---------- | ---------- |
| ...  | ...    | ...        | ...        |

### Unknowns (Require Further Investigation)
- [ ] [Unknown item]
```

---

### Step 8: Generate Discovery Document

Create the discovery markdown file:

**Location**: `flow/discovery/discovery_<feature_name>_v<version>.md`

**Use Template**: See `.claude/resources/patterns/discovery-templates.md`

**Required Sections**:

1. Context
2. Referenced Documents
3. Requirements Gathered (FR, NFR, Constraints)
4. Open Questions (all answered)
5. Technical Considerations
6. Proposed Approach
7. Risks and Unknowns
8. Next Steps

---

### Step 9: Knowledge Capture

After completing the discovery document, capture knowledge for the project brain. See `.claude/resources/core/brain-capture.md` for file templates and index cap rules.

1. **Session file** (most recent `.md` in `flow/brain/sessions/`, or create new per-session file): Append entry with time, skill name (`discovery`), feature name, status, and files changed count
2. **Feature file** (`flow/brain/features/{feature-name}.md`): Create if new feature (use feature template), or append Timeline entry if exists
3. **Decisions** (`flow/brain/decisions/{decision-name}.md`): Create for each significant decision made during user Q&A — especially when the user chose between alternative approaches, architectures, or trade-offs
4. **Index** (`flow/brain/index.md`): Add new feature/decision entries. Enforce caps (5 errors, 3 decisions)
5. **Log** (`flow/log.md`): Under today's date heading (create if absent), append: `- discovery: {feature} — {outcome}`

> **Emphasis**: Discovery often surfaces important **decisions** from user Q&A. Capture each decision where the user chose between alternatives with meaningful trade-offs.

---

## Output Format

The discovery document should follow the template in `.claude/resources/patterns/discovery-templates.md`.

**Naming Convention**: `discovery_<feature_name>_v<version>.md`

**Examples**:
- `discovery_workflow_editor_v1.md`
- `discovery_user_authentication_v1.md`

---

## Validation Checklist

Before completing discovery, verify:

- [ ] All referenced documents have been read
- [ ] Document is saved in `flow/discovery/` folder
- [ ] File uses correct naming convention
- [ ] Open questions table has no "Blocked" status
- [ ] Requirements are categorized (FR, NFR, Constraints)
- [ ] Technical considerations are documented
- [ ] Risks and unknowns are identified
- [ ] Proposed approach is documented (high-level only)
- [ ] Next steps are defined (pointing to `/create-plan`)
- [ ] **NO implementation code is included**
- [ ] **NO source files were created or modified**

---

## Audit Trail

Append structured JSONL entries to `flow/audit.log`. See `.claude/resources/core/audit-trail.md` [COR-AUD-1] for event type definitions.

**Events to log**:
1. **command_start**: `{"ts":"...","event":"command_start","command":"discovery","feature":"<feature>","workflow":"<type>"}`
2. **file_created**: For the discovery document — `{"ts":"...","event":"file_created","path":"flow/discovery/discovery_<feature>_v1.md"}`
3. **command_end**: `{"ts":"...","event":"command_end","command":"discovery","status":"completed","summary":"<X> requirements gathered"}`

Create `flow/audit.log` if it doesn't exist. Always append, never truncate.

---

## Handoff Production

After discovery completes, produce a handoff document for the planning step. See `.claude/resources/patterns/handoff-patterns.md` [PTN-HND-1] for the template.

**Output**: `flow/handoffs/handoff_<feature>_discovery_to_plan.md`

**Content to include**:
- Feature name and workflow type
- Requirements summary: count of FR, NFR, and Constraints gathered
- Key decisions made during discovery Q&A
- Top risks identified
- Discovery document path
- Focus guidance for planning: what the plan should prioritize based on discovery findings

**When to produce**: After the discovery document is saved and validated, before auto-proceeding to create-plan.

**Backward compatibility**: If `flow/handoffs/` doesn't exist, create it.

---

## Related Files

| File                                              | Purpose                           |
| ------------------------------------------------- | --------------------------------- |
| `.claude/resources/patterns/discovery-patterns.md` | Rules and patterns for discovery  |
| `.claude/resources/patterns/discovery-templates.md` | Document templates                |
| `.claude/resources/tools/interactive-questions-tool.md` | Interactive Questions UI workflow |
| `flow/discovery/`                                 | Output folder for discovery docs  |
