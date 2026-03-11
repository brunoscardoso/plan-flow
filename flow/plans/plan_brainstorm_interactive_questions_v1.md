# Plan: Brainstorm Interactive Questions

**Discovery**: [[discovery_brainstorm_interactive_questions_v1]]
**Feature**: brainstorm-interactive-questions
**Created**: 2026-03-11

---

## Summary

Replace the brainstorm skill's one-question-at-a-time conversational loop with batched `AskUserQuestion` rounds (3-4 questions with options and recommended choices), keeping commentary between batches for creative energy. Step 1 (open-ended first round) and Steps 3-7 (end detection, summary, output) remain unchanged.

**Key Changes**:
- Rewrite: `.claude/resources/skills/brainstorm-skill.md` Step 2 — structured exploration loop with `AskUserQuestion`
- Update: `.claude/commands/brainstorm.md` — help text and critical rules
- Update: `.claude/resources/skills/_index.md` — description if needed

---

## Phase 1: Rewrite Brainstorm Skill Step 2

**Scope**: Replace the conversational loop with a structured exploration loop using `AskUserQuestion` batches + commentary
**Complexity**: 5/10

This is the main change — rewriting the core interaction loop.

- [x] Rewrite Step 2 in `.claude/resources/skills/brainstorm-skill.md`:
  - Rename from "Conversational Loop" to "Structured Exploration Loop"
  - New flow: formulate 3-4 questions with 2-4 options each → call `AskUserQuestion` → wait for responses → process answers and update silent tracking → provide commentary (react, connect dots, challenge, suggest) → check for end signals → repeat or proceed to Step 3
  - Each question must have a recommended option as the first option with "(Recommended)" suffix
  - Reference `.claude/resources/tools/interactive-questions-tool.md` for tool usage
  - Keep the five question types (Clarifying, Challenging, Expanding, Constraining, Connecting) as guidance for what kind of questions to formulate — a good batch mixes types
  - Allow open-ended questions (without options) when the idea is too vague — LLM uses judgment
  - Preserve silent tracking behavior (core idea, decisions, questions, constraints, inspirations, rejected)
  - Add note: commentary between batches should feel like a thinking partner — insights, connections, challenges — not just a transition to the next batch
  - Add note: end detection works via "Other" field responses or commentary responses — user can type "done"/"wrap up" at any point
- [x] Update validation checklist at bottom of brainstorm-skill.md:
  - Change "Conversation followed one-question-per-turn pattern" to "Questions presented in batches with options via AskUserQuestion"
  - Add "Commentary provided between question batches"

---

## Phase 2: Update Brainstorm Command and Index

**Scope**: Update help text, critical rules, and skills index to reflect the new interaction pattern
**Complexity**: 2/10

- [x] Update `.claude/commands/brainstorm.md`:
  - Help section: change "LLM asks one question at a time (not batched)" to "LLM presents batched questions with options (3-4 per round, with recommended choices)"
  - Help section: update WORKFLOW step 2 accordingly
  - Critical rules table: change "One question per turn. Never batch 3-4 questions." to "Questions in batches of 3-4 with options. Commentary between batches."
  - Help WHAT IT IS section: update "challenges, suggests, connects" to include "presents structured options"
- [x] Update `.claude/resources/skills/_index.md`:
  - Update brainstorm skill description in Skill Complexity table if it references "conversational" — should mention structured questions

---

## Phase 3: Tests

**Scope**: Verify build passes and no regressions
**Complexity**: 1/10

- [ ] Verify `npm run build` passes
- [ ] Verify `npm run test` passes

---

## Execution Order

1. Phase 1 → Skill rewrite (core change)
2. Phase 2 → Command and index updates (references Phase 1)
3. Phase 3 → Tests (validates everything)

---

## Complexity Summary

| Phase | Score | Level |
|-------|-------|-------|
| 1. Rewrite Brainstorm Skill Step 2 | 5 | Medium |
| 2. Update Command and Index | 2 | Trivial |
| 3. Tests | 1 | Trivial |
| **Total** | **8** | |

**Execution Strategy**: Phases 1+2 cautious (combined 7), Phase 3 separate (tests).

---

## Verification

1. Inspect `brainstorm-skill.md` Step 2 — verify `AskUserQuestion` batches with options and recommended choices
2. Inspect `brainstorm-skill.md` — verify commentary between batches is described
3. Inspect `brainstorm.md` command — verify help text and critical rules updated
4. Run `npm run build` — verify no compile errors
5. Run `npm run test` — verify no regressions
