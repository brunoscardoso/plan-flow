# Plan: Unified STATE.md for Session Resumability

**Project**: [[cli]]

## Overview

Create a unified `flow/STATE.md` file that consolidates execution position, decisions, blockers, and file context into a single resumability document. Add a `/resume-work` skill that reads STATE.md to reconstruct full context after context resets. This replaces the fragmented `flow/state/current.md` and `flow/state/current.json` files with a richer, structured state tracker.

**Based on Discovery**: `flow/discovery/discovery_unified_state_md_v1.md`

## Goals

- Single file (`flow/STATE.md`) tracking all resumable session state
- Enable `/resume-work` to rebuild full context from STATE.md in under 3 tool calls
- Integrate with the deterministic state script (`planflow-ai state`)
- Update existing skills to write STATE.md at key transition points
- Replace `flow/state/current.md` and `flow/state/current.json`

## Non-Goals

- Replacing the scratchpad (observations/notes), ledger (learnings), or memory (artifact log)
- Tracking anything beyond execution position, decisions, blockers, files, and next action
- Adding a UI or interactive component

## Requirements Summary

### Functional Requirements

- [FR-1]: Single `flow/STATE.md` file tracking all resumable session state
- [FR-2]: Track active skill, plan path, current phase/task, completed phases
- [FR-3]: Track decisions made with rationale
- [FR-4]: Track blockers/unresolved issues
- [FR-5]: Track files modified during session
- [FR-6]: Track "next action" for immediate resume
- [FR-7]: `/resume-work` skill reads STATE.md and reconstructs context
- [FR-8]: Skills update STATE.md at key transition points
- [FR-9]: STATE.md cleared/archived when skill completes
- [FR-10]: Deterministic state script parses STATE.md

### Non-Functional Requirements

- [NFR-1]: Human-readable markdown format
- [NFR-2]: Parseable by deterministic state script (regex-based)
- [NFR-3]: Lightweight updates (single-line edits)
- [NFR-4]: Resume context in under 3 tool calls
- [NFR-5]: Under 80 lines

### Constraints

- [C-1]: Follow flow/ file conventions (markdown, wiki-links, ISO timestamps)
- [C-2]: Integrate with SessionState type and getSessionState()
- [C-3]: Additive — don't break existing session start behaviors
- [C-4]: Only main session writes STATE.md (not phase isolation sub-agents)
- [C-5]: Replaces flow/state/current.md and current.json

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Write overhead slows skill execution | Medium | Batch writes at phase boundaries only |
| Stale STATE.md misleads resume | High | Include timestamps, warn if >24h old |
| Scope creep duplicates scratchpad/ledger | Medium | Strict format with defined sections |
| Migration breaks existing sessions | Low | Additive first, remove old files last |

## Phases

### Phase 1: TypeScript Types and STATE.md Template

**Scope**: Define the `ExecutionState` TypeScript interface and the STATE.md markdown template format.
**Complexity**: 3/10
**Dependencies**: None

- [ ] Add `ExecutionState` interface to `src/cli/state/types.ts` with fields: `active_skill`, `active_plan`, `current_phase` (number, name), `current_task`, `completed_phases` (array of {number, name, outcome}), `decisions` (array of {decision, choice, reason}), `blockers` (array of {issue, status, tried}), `files_modified` (string array), `next_action`, `updated_at`
  <verify>npx tsc --noEmit src/cli/state/types.ts</verify>
- [ ] Add `execution?: ExecutionState` field to `StateOutput` interface in `src/cli/state/types.ts`
  <verify>npx tsc --noEmit src/cli/state/types.ts</verify>
- [ ] Add `state_md: boolean` to `SessionState.files_present` in `src/cli/state/types.ts`
  <verify>npx tsc --noEmit src/cli/state/types.ts</verify>

**Build Verification**: Run `npm run build`

### Phase 2: STATE.md Parser

**Scope**: Create a regex-based parser that reads `flow/STATE.md` and returns a typed `ExecutionState` object. Follow the same patterns as `flowconfig-parser.ts` and `plan-parser.ts`.
**Complexity**: 5/10
**Dependencies**: Phase 1

- [ ] Create `src/cli/state/state-md-parser.ts` with a `parseStateMd(flowDir: string): ExecutionState | null` function that returns null if STATE.md doesn't exist
  <verify>npx tsc --noEmit src/cli/state/state-md-parser.ts</verify>
- [ ] Parse markdown sections: `## Execution State` (key-value pairs), `## Decisions` (bullet list with decision/choice/reason), `## Blockers` (bullet list with issue/status/tried), `## Files Modified` (bullet list of paths), `## Next Action` (single line)
  <verify>npx tsc --noEmit src/cli/state/state-md-parser.ts</verify>

**Build Verification**: Run `npm run build`

### Phase 3: State Script Integration

**Scope**: Integrate the STATE.md parser into the deterministic state command and update the session state checker.
**Complexity**: 4/10
**Dependencies**: Phase 2

- [ ] Update `src/cli/state/session-state.ts` to check for `STATE.md` existence and set `state_md` boolean in `files_present`
  <verify>npx tsc --noEmit src/cli/state/session-state.ts</verify>
- [ ] Update `src/cli/commands/state.ts` to import and call `parseStateMd()`, adding execution state to `StateOutput` when STATE.md exists
  <verify>npx tsc --noEmit src/cli/commands/state.ts</verify>

**Build Verification**: Run `npm run build`

### Phase 4: `/resume-work` Skill

**Scope**: Create the `/resume-work` command file and skill resource that reads STATE.md and reconstructs session context.
**Complexity**: 5/10
**Dependencies**: Phase 1

- [ ] Create `.claude/commands/resume-work.md` — command file that validates STATE.md exists, reads it, reads the active plan file, and outputs a structured context summary for the LLM to resume work
- [ ] Create `.claude/resources/skills/resume-work-skill.md` — skill resource defining the resume workflow: read STATE.md → read active plan → identify next task → output context summary with decisions, blockers, and next action
- [ ] Add staleness check: if STATE.md `updated_at` is >24 hours old, warn the user that state may be stale and ask whether to resume or start fresh

**Build Verification**: N/A (markdown files only)

### Phase 5: Skill Command Updates

**Scope**: Update existing skill command files to write STATE.md at key transition points (phase start, phase complete, decision, blocker).
**Complexity**: 6/10
**Dependencies**: Phase 1

- [ ] Update `.claude/commands/execute-plan.md` — add STATE.md write instructions at: plan start (set active skill/plan), phase start (set current phase), phase complete (update completed phases), decision made (append to decisions), blocker encountered (append to blockers), plan complete (clear STATE.md)
- [ ] Update `.claude/resources/skills/execute-plan-skill.md` — add STATE.md update rules to phase lifecycle: write before phase, update after phase, clear on completion
- [ ] Update `.claude/commands/discovery-plan.md` — add STATE.md write at: discovery start (set active skill), question batch complete (update decisions), discovery complete (clear STATE.md)
- [ ] Update `.claude/commands/review-code.md` — add STATE.md write at: review start (set active skill), review complete (clear STATE.md)
- [ ] Update `.claude/commands/review-pr.md` — add STATE.md write at: review start (set active skill), review complete (clear STATE.md)
- [ ] Update `.claude/commands/create-plan.md` — add STATE.md write at: plan creation start (set active skill), plan complete (clear STATE.md)

**Build Verification**: N/A (markdown files only)

### Phase 6: CLAUDE.md and Compaction Guide Updates

**Scope**: Update CLAUDE.md with session start behavior for STATE.md, add `/resume-work` to command table, and update the compaction guide to reference STATE.md.
**Complexity**: 4/10
**Dependencies**: Phase 4, Phase 5

- [ ] Update `CLAUDE.md` — add STATE.md session start behavior: "If `flow/STATE.md` exists, read it silently. If active work is detected, present a brief summary and suggest `/resume-work`."
- [ ] Update `CLAUDE.md` — add `/resume-work` to the slash commands table
- [ ] Update `CLAUDE.md` — add `flow/STATE.md` to the flow directory structure listing
- [ ] Update `.claude/resources/core/compaction-guide.md` — add rule: "Before compaction, write current state to `flow/STATE.md`. After compaction, re-read `flow/STATE.md` to restore execution context."
- [ ] Update `.claude/resources/core/session-scratchpad.md` — add note clarifying that STATE.md tracks execution position while scratchpad tracks observations/notes (different purposes, coexist)

**Build Verification**: N/A (markdown files only)

### Phase 7: Migration — Deprecate flow/state/current.md and current.json

**Scope**: Remove the redundant `flow/state/current.md` and `flow/state/current.json` files and update any references.
**Complexity**: 2/10
**Dependencies**: Phase 3, Phase 6

- [ ] Remove `flow/state/current.md` and `flow/state/current.json`
- [ ] Search for any references to `flow/state/current` across the codebase and update them to point to `flow/STATE.md`
- [ ] Check if `flow/state/last-session.json` should also be consolidated or left as-is (it tracks different data — session summary, not execution position)

**Build Verification**: Run `npm run build`

### Phase 8: Tests

**Scope**: Write comprehensive tests for the STATE.md parser and state integration.
**Complexity**: 5/10
**Dependencies**: Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, Phase 7

- [ ] Create `src/cli/state/state-md-parser.test.ts` — test parsing of all sections: execution state fields, decisions list, blockers list, files modified, next action
  <verify>npx jest src/cli/state/state-md-parser.test.ts --no-coverage</verify>
- [ ] Test edge cases: empty STATE.md, missing sections, malformed content, null return when file doesn't exist
  <verify>npx jest src/cli/state/state-md-parser.test.ts --no-coverage</verify>
- [ ] Update `src/cli/state/session-state.test.ts` — add test for `state_md` boolean in `files_present`
  <verify>npx jest src/cli/state/session-state.test.ts --no-coverage</verify>

**Build Verification**: Run `npm run build && npm run test`

## Key Changes

1. **New file**: `flow/STATE.md` — unified session state tracker replacing `flow/state/current.md` and `flow/state/current.json`
2. **New types**: `ExecutionState` interface in `src/cli/state/types.ts` with execution position, decisions, blockers, files, next action
3. **New parser**: `src/cli/state/state-md-parser.ts` — regex-based parser consistent with existing parsers
4. **New skill**: `/resume-work` command + skill resource for context reconstruction
5. **State integration**: `planflow-ai state` command now includes execution state from STATE.md
6. **Skill updates**: execute-plan, discovery-plan, review-code, review-pr, create-plan all write STATE.md at transition points
7. **Compaction integration**: Compaction guide references STATE.md as the persistence mechanism
8. **Migration**: `flow/state/current.md` and `flow/state/current.json` removed

<!-- brain-capture
skill: create-plan
feature: unified-state-md
status: completed
data:
  phase_count: 8
  total_complexity: 34
  highest_phase: "Phase 5: Skill Command Updates (6/10)"
  discovery_link: [[unified-state-md]]
  plan_doc: flow/plans/plan_unified_state_md_v1.md
-->
