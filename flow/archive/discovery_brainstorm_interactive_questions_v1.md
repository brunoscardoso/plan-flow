# Discovery: Brainstorm Interactive Questions

**Project**: [[plan-flow]]

## Context

The `/brainstorm` skill currently uses a pure one-question-at-a-time conversational loop. This works but creates too many rounds of back-and-forth for decisions that could be resolved faster with structured options. The `/discovery-plan` skill already uses the `AskUserQuestion` tool to present batched questions with numbered options and recommended choices — this feature brings the same UX to brainstorm.

## Referenced Documents

| Document | Key Findings |
|----------|-------------|
| `flow/brainstorms/brainstorm_brainstorm-interactive-questions_v1.md` | Core idea crystallized: replace one-at-a-time chat with batched questions (3-5) using `AskUserQuestion`, keep commentary between batches, open-ended first round. |
| `.claude/resources/skills/brainstorm-skill.md` | Current workflow: Step 1 (parse idea, open conversation), Step 2 (conversational loop — one question per turn, 70/30 question/suggestion mix, silent tracking), Step 3 (end detection), Steps 4-7 (summary, file generation, tasklist). |
| `.claude/resources/tools/interactive-questions-tool.md` | `AskUserQuestion` tool: 1-4 questions per call, 2-4 options each, `label` + `description` format, `multiSelect` option. Used by discovery and setup skills. |
| `.claude/resources/skills/discovery-skill.md` | Discovery's Q&A pattern: Step 2 uses `AskUserQuestion` for clarifying questions with A/B/C/D options. Processes responses and tracks question status. |

## Code Context Analysis

### Current Brainstorm Skill Structure

| Section | Lines | What It Does | Impact |
|---------|-------|-------------|--------|
| Step 1: Parse Idea | 57-77 | Restates idea, adds insight, asks one open question | **Keep as-is** — this becomes the open first round |
| Step 2: Conversational Loop | 81-123 | One question per turn, 70/30 question/suggestion, silent tracking | **Replace** with batched `AskUserQuestion` rounds + commentary |
| Step 3: End Detection | 126-150 | Watches for "done", "wrap up", etc. | **Keep** — end detection still works the same way |
| Steps 4-7: Summary/Output | 154-233 | Present summary, offer MD file, offer tasklist | **Keep as-is** — output workflow doesn't change |

### AskUserQuestion Tool Capabilities

| Feature | Detail |
|---------|--------|
| Questions per call | 1-4 |
| Options per question | 2-4 |
| Option format | `label` (1-5 words) + `description` (explanation) |
| Recommended option | First option in list + "(Recommended)" suffix on label |
| Multi-select | Optional per question |
| Preview | Optional markdown preview for visual comparison |
| Auto "Other" | Users can always type a custom answer |

### How Discovery Uses It

Discovery's Step 2 pattern:
1. Present analysis summary in regular chat
2. Call `AskUserQuestion` with 2-4 questions about gaps/requirements
3. Wait for responses
4. Process answers into requirements tracking
5. Repeat if more questions needed

### Key Difference: Brainstorm vs Discovery

| Aspect | Discovery | Brainstorm (proposed) |
|--------|-----------|----------------------|
| Purpose | Clarify requirements | Explore and shape ideas |
| First round | Structured from start | Open-ended conversational |
| Between batches | Minimal — move to next questions | Commentary — insights, connections, challenges |
| Question types | Functional, NFR, Technical, UI/UX | Clarifying, Challenging, Expanding, Constraining, Connecting |
| End trigger | All questions answered | User says "done" / "wrap up" |
| Tracking | Question status table | Silent category tracking (core idea, decisions, questions, etc.) |

## Requirements Gathered

### Functional Requirements

- **[FR-1]**: Replace brainstorm Step 2 (conversational loop) with batched `AskUserQuestion` rounds of 3-5 questions, each with numbered options and a recommended choice (Source: brainstorm)
- **[FR-2]**: Keep Step 1 (parse idea, open conversation) as an open-ended first round before switching to structured batches (Source: Q&A)
- **[FR-3]**: Between question batches, the LLM provides commentary in regular chat — insights, connections, challenges — before presenting the next batch (Source: Q&A)
- **[FR-4]**: Each question should have a recommended option marked with "(Recommended)" suffix as the first option (Source: brainstorm + `AskUserQuestion` tool convention)
- **[FR-5]**: Mix of option-based questions (when LLM can propose paths) and open-ended questions (when idea is too vague for options) — LLM uses judgment (Source: brainstorm)
- **[FR-6]**: Silent tracking of categories (core idea, decisions, questions, constraints, inspirations, rejected) continues throughout the batched rounds (Source: existing behavior to preserve)
- **[FR-7]**: End detection remains unchanged — user controls when to stop (Source: brainstorm)
- **[FR-8]**: The brainstorm skill file should reference `interactive-questions-tool.md` rather than duplicating its instructions (Source: Q&A)

### Non-Functional Requirements

- **[NFR-1]**: The brainstorm should still feel conversational and creative, not like a form to fill out — commentary between batches maintains the "thinking partner" feel (Source: brainstorm)
- **[NFR-2]**: The change is purely to the skill markdown file — no TypeScript code changes needed (Source: technical analysis)

### Constraints

- **[C-1]**: `AskUserQuestion` supports max 4 questions per call — batches of 5 would need two calls or the limit needs respecting. Recommend capping at 4 per call to match tool limits. (Source: tool analysis)
- **[C-2]**: Each question supports 2-4 options — not more (Source: `AskUserQuestion` tool spec)
- **[C-3]**: The "Other" option is automatically added by the tool — no need to include it manually (Source: tool spec)
- **[C-4]**: Steps 3-7 (end detection, summary, file generation, tasklist) remain unchanged (Source: brainstorm resolved decisions)

## Open Questions

| # | Category | Question | Status | Answer |
|---|----------|----------|--------|--------|
| 1 | Technical | `AskUserQuestion` supports max 4 questions — should batches be capped at 4 instead of 3-5? | Assumed | Cap at 3-4 per batch (respects tool limit while matching brainstorm intent) |
| 2 | Functional | Should the question types table (Clarifying, Challenging, Expanding, Constraining, Connecting) map to specific option patterns, or just guide the LLM's question framing? | Assumed | Guide framing only — the types inform what kind of question to ask, not the option structure |
| 3 | Functional | Should the validation checklist be updated from "one-question-per-turn" to "batched questions with options"? | Assumed | Yes — update to match new behavior |

## Technical Considerations

### Architecture Fit

- **Pure markdown change**: The entire change lives in `.claude/resources/skills/brainstorm-skill.md`. No TypeScript, no hooks, no config changes.
- **Tool already available**: `AskUserQuestion` is a native Claude Code tool — no new tooling needed.
- **Pattern already proven**: Discovery and setup skills already use this exact pattern successfully.

### Changes Required

| File | Change | Scope |
|------|--------|-------|
| `.claude/resources/skills/brainstorm-skill.md` | Rewrite Step 2 (conversational loop) to use `AskUserQuestion` batches + commentary | Main change |
| `.claude/resources/skills/brainstorm-skill.md` | Update validation checklist at bottom | Minor |
| `.claude/commands/brainstorm.md` | Update help text ("one question at a time" → "batched questions with options") and critical rules table | Minor |
| `.claude/resources/patterns/brainstorm-templates.md` | No change needed — output format stays the same | None |

### Proposed New Step 2 Flow

```
Step 1: Parse Idea (unchanged)
  → Open-ended first round: restate, insight, one question

Step 2: Structured Exploration Loop (NEW)
  → LLM formulates 3-4 questions with options based on idea context
  → Call AskUserQuestion with batch
  → Wait for responses
  → Process answers, update silent tracking
  → LLM commentary: react to answers, connect dots, challenge, suggest
  → Check for end signals in user responses
  → If not done: formulate next batch → repeat
  → If done: proceed to Step 3

Step 3-7: Unchanged
```

### Integration with Existing Patterns

- **Silent tracking**: Continues between and during batches — the LLM tracks categories internally while processing responses
- **End detection**: User can type "done" or "wrap up" in the "Other" field or in their response to commentary
- **Question types**: The five question types (Clarifying, Challenging, Expanding, Constraining, Connecting) guide what kind of questions appear in each batch — a good batch mixes types
- **70/30 mix**: Evolves from "70% questions / 30% suggestions" to "most questions have options, some are open-ended" — the LLM includes open-ended questions when the idea is too vague for options

## Proposed Approach

1. **Rewrite brainstorm-skill.md Step 2** — replace conversational loop with structured exploration loop using `AskUserQuestion`
2. **Update brainstorm command help text and critical rules** — reflect batched questions instead of one-at-a-time
3. **Update validation checklist** — change "one-question-per-turn" rule to "batched questions with options"
4. **Update skills index** — adjust description if needed

### Alternative Approaches Considered

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| Pure `AskUserQuestion` batches (no commentary) | Faster | Loses creative brainstorm feel | Rejected (brainstorm resolved) |
| Keep one-at-a-time but add options | Minimal change | Doesn't solve "too many rounds" problem | Rejected (brainstorm resolved) |
| Use `AskUserQuestion` with batches + commentary | Best of both worlds | Slightly more complex skill instructions | **Recommended** |

## Risks and Unknowns

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Brainstorm feels too structured / form-like | Medium | Low | Commentary between batches + open first round preserves conversational feel |
| `AskUserQuestion` 4-question limit constrains batch size | Low | Medium | Cap at 3-4 — matches tool limit and brainstorm intent |
| LLM struggles to formulate good options for vague ideas | Medium | Low | FR-5 allows open-ended questions when idea is too vague for options |

### Unknowns

- [x] All questions resolved during discovery Q&A

## Next Steps

- [ ] Create implementation plan: `flow/plans/plan_brainstorm_interactive_questions_v1.md`
- [ ] Implementation: rewrite Step 2, update command file, update validation checklist
