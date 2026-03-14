
# Discovery Skill

## Purpose

Perform a comprehensive **requirements gathering and documentation** process that reads referenced documents, asks clarifying questions, and produces a structured discovery document.

This skill **only produces a markdown file** in `flow/discovery/`. It does NOT:

- Write any code
- Modify any source files
- Create implementation plans
- Execute any implementation

---

## Restrictions - DISCOVERY ONLY

This skill is **strictly for gathering and documenting requirements**. The process:

1. **Reads** all referenced documents and contracts
2. **Asks** clarifying questions via Interactive Questions Tool
3. **Documents** requirements (FR, NFR, Constraints)
4. **Identifies** technical considerations (high-level only)
5. **Proposes** approach (conceptual, no code)
6. **Generates** a discovery markdown file

**No code, no implementation, no source file modifications.**

### NEVER Do These Actions

| Forbidden Action                       | Reason                                    |
| -------------------------------------- | ----------------------------------------- |
| Create/edit source code files          | Discovery is requirements gathering only  |
| Write implementation code in responses | No code during discovery                  |
| Create implementation plans            | Plans come after discovery                |
| Modify configuration files             | No codebase changes                       |
| Run build or test commands             | No execution commands                     |
| Create files outside `flow/discovery/` | Only write discovery documents            |

### Allowed Actions

| Allowed Action                         | Purpose                              |
| -------------------------------------- | ------------------------------------ |
| Read any project file                  | Understand existing implementation   |
| Read referenced documents              | Extract requirements and constraints |
| Search codebase (grep, glob, semantic) | Find existing patterns               |
| Use Interactive Questions Tool         | Gather requirements from user        |
| Write to `flow/discovery/`             | Save discovery document              |
| Read project rule files                | Understand patterns to follow        |

> **Important**: The ONLY writable locations are `flow/discovery/`, `flow/resources/pending-patterns.md`, and `.claude/rules/core/*.md` (for approved patterns). No source code, configuration files, or any other project files should be modified.

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
3. **If a brainstorm file** (`flow/brainstorms/brainstorm_*.md`): parse the "For Discovery" section — inherit resolved decisions, use open questions as investigation starting points, and skip rejected alternatives
4. Extract key information (requirements, constraints, contracts)
5. Summarize findings for each source
6. **Capture patterns**: While reading existing code and documents, watch for recurring conventions and established patterns. Silently append to `flow/resources/pending-patterns.md`. See `.claude/resources/core/pattern-capture.md` for buffer format and capture triggers.

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

### Step 1b: Spawn Exploration Sub-Agents

After reading referenced documents, spawn three parallel Agent sub-agents to explore the codebase. These run in parallel and return condensed findings that inform the clarifying questions in Step 2.

**Actions**:

1. **Prepare context summary**: Distill Step 1 findings into a brief context paragraph (feature name, key requirements, relevant technologies mentioned)
2. **Spawn 3 sub-agents in parallel** using the Agent tool:
   - **Similar Features** agent — finds existing code with related functionality
   - **API/Data Patterns** agent — maps API endpoints, service patterns, data flow
   - **Schema/Types** agent — explores type definitions, schemas, shared interfaces
3. Each sub-agent uses `model: "haiku"` and `subagent_type: "Explore"`
4. Each receives: feature name, context summary, and agent-specific exploration instructions

See `.claude/resources/core/discovery-sub-agents.md` for prompt templates, return format schema, and full agent definitions (`COR-DSA-1`).

**Spawning pattern**:
```
Launch in parallel:
- Agent(model: "haiku", subagent_type: "Explore", prompt: similar_features_prompt)
- Agent(model: "haiku", subagent_type: "Explore", prompt: api_data_prompt)
- Agent(model: "haiku", subagent_type: "Explore", prompt: schema_types_prompt)
```

---

### Step 1c: Collect and Merge Exploration Findings

After all sub-agents return, process their findings:

1. **Parse returns**: Extract JSON from each sub-agent response
2. **Handle failures**: If a sub-agent returns `status: "failure"` or invalid JSON, skip its findings and continue. Log the failure but do not block discovery.
3. **Filter**: If more than 15 total findings, remove `relevance: "low"` entries
4. **Merge patterns**: Collect all `patterns_noticed` entries, deduplicate, and append to `flow/resources/pending-patterns.md`
5. **Build Codebase Analysis**: Format merged findings into a `## Codebase Analysis` section (see template in `COR-DSA-2`)
6. **Inform Step 2**: Use findings to formulate better clarifying questions — reference specific existing code when asking about patterns to follow

If all sub-agents fail or return no findings, skip the Codebase Analysis section entirely. Discovery continues normally — findings are supplementary, not required.

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

**Design Awareness Questions**:

After standard clarifying questions, check for UI work. See `.claude/resources/core/design-awareness.md` for the full question flow.

1. **Always ask** (as part of the standard question batch): "Does this feature involve any UI or visual interface work?"
   - If **Yes** or **Partially**: Add a follow-up question batch via `AskUserQuestion`:
     - "Do you have an existing design to follow?" (screenshots/mockups, existing design system, or need new design direction)
     - "What design personality fits this feature?" (only if no existing design — Stark, Aura, Neo, Zen, Flux, Terra)
     - "What's the primary layout pattern?" (dashboard, content+sidebar, form workflow, data table)
   - If **No**: Skip design questions entirely
2. **If user provides screenshots**: Analyze visually and extract structured design tokens (colors, typography, spacing, component patterns). See token extraction rules in `.claude/resources/core/design-awareness.md`.
3. **If user picks a personality**: Use the personality's default tokens from `.claude/resources/core/design-awareness.md`.
4. **Plugin detection**: Check if `.interface-design/system.md` exists. If found, offer to use it as the design source.

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

Document high-level technical insights (NO implementation code).

**While analyzing technical considerations**, watch for conventions in the existing codebase that should be captured as patterns. Silently append to `flow/resources/pending-patterns.md`.

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

### Step 8b: Pattern Review

After generating the discovery document but before completing the skill, run the pattern review protocol:

1. Read `flow/resources/pending-patterns.md`
2. If the buffer has entries, present grouped patterns for user approval
3. Write approved patterns to `.claude/rules/core/allowed-patterns.md` or `.claude/rules/core/forbidden-patterns.md`
4. Clear the buffer

See `.claude/resources/core/pattern-capture.md` for the full end-of-skill review protocol.

---

### Step 8: Generate Discovery Document

Create the discovery markdown file:

**Location**: `flow/discovery/discovery_<feature_name>_v<version>.md`

**Use Template**: See `.claude/resources/patterns/discovery-templates.md`

**Required Sections**:

1. Context
2. Referenced Documents
3. Codebase Analysis (from Step 1c — omit if no findings)
4. Requirements Gathered (FR, NFR, Constraints)
5. Open Questions (all answered)
6. Technical Considerations
7. Proposed Approach
8. Risks and Unknowns
9. Next Steps

**Codebase Analysis**: Include the merged findings from Step 1c. Use the Codebase Analysis section format from `.claude/resources/core/discovery-sub-agents.md` (`COR-DSA-2`). Omit this section if all sub-agents failed or returned no findings.

**Design Context**: If UI work was confirmed during questioning, append a `## Design Context` section to the discovery document using the template from `.claude/resources/core/design-awareness.md`. Populate with extracted tokens (from screenshots), personality defaults, or existing design system values.

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
- [ ] If UI work detected: `## Design Context` section included with structured tokens
- [ ] **NO implementation code is included**
- [ ] **NO source files were created or modified**

---

## Related Files

| File                                              | Purpose                           |
| ------------------------------------------------- | --------------------------------- |
| `.claude/resources/patterns/discovery-patterns.md` | Rules and patterns for discovery  |
| `.claude/resources/patterns/discovery-templates.md` | Document templates                |
| `.claude/resources/tools/interactive-questions-tool.md` | Interactive Questions UI workflow |
| `flow/discovery/`                                 | Output folder for discovery docs  |
