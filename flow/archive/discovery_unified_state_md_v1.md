# Discovery: Unified STATE.md for Session Resumability

**Project**: [[cli]]

## Context

Plan-flow currently spreads session state across multiple files: `flow/state/current.json`, `flow/state/current.md`, `flow/.scratchpad.md`, `flow/ledger.md`, `flow/memory.md`, `flow/tasklist.md`, and the compaction guide's mental model of what to preserve. When a context window resets (compaction, new session, crash), the LLM must re-read 5-8 files and reconstruct execution state from scattered sources. This is fragile, slow, and error-prone.

A unified `flow/STATE.md` file would consolidate execution position (active skill, phase, task), decisions made, blockers encountered, and file context into a single resumability document. A new `/resume-work` skill would read STATE.md and reconstruct full context in one step.

## Referenced Documents

| Document | Key Findings |
|----------|-------------|
| `CLAUDE.md` | Session start behaviors read 5+ files (ledger, brain, tasklist, memory, scratchpad, heartbeat). Compaction guide exists as resource. |
| `.claude/resources/core/session-scratchpad.md` | Ephemeral per-session notes, 50-line limit, promotion rules to ledger/brain. No execution position tracking. |
| `.claude/resources/core/compaction-guide.md` | Defines what to preserve during compaction: execution state, decision log, error context, user requirements, active file list. Template matches desired STATE.md structure. |
| `.claude/resources/core/project-memory.md` | Append-only completed skill tracker. Tracks outcomes, not in-progress state. |
| `.claude/resources/core/project-ledger.md` | Persistent learning journal. Cross-session lessons, not execution position. |
| `src/cli/state/types.ts` | TypeScript types: FlowConfig, SessionState (file existence booleans), PlanPhase, WaveGroup, ModelTier, StateOutput |
| `src/cli/state/session-state.ts` | Checks file existence only — no content parsing, no execution position |
| `flow/state/current.json` | Tracks lastCompaction, compactionCount, timestamp, lastSessionMessages — basic metadata only |
| `flow/state/current.md` | Tracks Plan (name), Progress (active phase), Completed (phases), Last Activity, Compactions — closest to desired STATE.md but very minimal |

## Codebase Analysis

### Similar Features

The project has extensive session state infrastructure split across multiple files. `flow/state/current.md` is the closest existing analog — it tracks plan name, progress, and completed phases, but lacks decisions, blockers, file context, and task-level granularity. The compaction guide's "Compact Summary Template" almost exactly describes the desired STATE.md structure (active skill, current phase, decisions made, unresolved issues, files modified, next action).

| File | Description | Relevance |
|------|-------------|-----------|
| `flow/state/current.json` | Basic session metadata (compaction count, timestamps) | High |
| `flow/state/current.md` | Minimal execution state (plan, progress, completed) | High |
| `.claude/resources/core/compaction-guide.md` | Template for what to preserve — nearly identical to STATE.md scope | High |
| `.claude/resources/core/session-scratchpad.md` | Ephemeral notes, complementary to STATE.md | High |
| `src/cli/state/session-state.ts` | File existence checker — needs STATE.md added | High |
| `src/cli/state/types.ts` | TypeScript state types — needs SessionExecutionState type | High |
| `src/cli/state/plan-parser.ts` | Plan markdown parser — execution position comes from plans | Medium |
| `src/cli/commands/state.ts` | Deterministic state CLI command — should include STATE.md data | Medium |

### API & Data Patterns

Plan-flow uses file-based state with dual formats: JSON for machine parsing and markdown for human readability. The `planflow-ai state` CLI command composes multiple parsers into a single `StateOutput` JSON. Flow files use regex-based parsing (no YAML library), markdown tables, wiki-links, and ISO timestamps. The heartbeat system demonstrates the compound-state pattern: `.heartbeat-state.json` (position tracker) + `.heartbeat-events.jsonl` (event log) + `.heartbeat-prompt.md` (blocking flag).

| File | Description | Relevance |
|------|-------------|-----------|
| `src/cli/state/flowconfig-parser.ts` | Regex-based YAML parsing with defaults and legacy fallback | High |
| `src/cli/state/heartbeat-state.ts` | Compound state: JSON position + JSONL events + markdown prompt | High |
| `src/cli/commands/state.ts` | Composition of parsers into single StateOutput JSON | High |
| `src/cli/daemon/event-writer.ts` | Atomic file writes (write-to-temp, rename) | Medium |

### Schema & Types

Core types in `src/cli/state/types.ts` define the complete state shape. `SessionState` currently only tracks file existence (boolean flags). `StateOutput` combines config, session, heartbeat, and optional plan data. The STATE.md feature would need new types: `ExecutionState` (active skill, phase, task, decisions, blockers, files) and updates to `SessionState` to include `state_md: boolean`.

| File | Description | Relevance |
|------|-------------|-----------|
| `src/cli/state/types.ts` | FlowConfig, SessionState, PlanPhase, StateOutput — needs extension | High |
| `flow/state/current.md` | Existing markdown state format — to be superseded by STATE.md | High |
| `flow/state/current.json` | Existing JSON state format — to be superseded or merged | High |

## Requirements Gathered

### Functional Requirements

- [FR-1]: A single `flow/STATE.md` file that tracks all resumable session state (Source: task description)
- [FR-2]: STATE.md must track: active skill, active plan path, current phase number/name, current task, completed phases with brief outcomes (Source: task description + compaction guide)
- [FR-3]: STATE.md must track decisions made during the session with rationale (Source: task description)
- [FR-4]: STATE.md must track blockers/unresolved issues with status and what was tried (Source: task description)
- [FR-5]: STATE.md must track files modified during the session (Source: compaction guide)
- [FR-6]: STATE.md must track the "next action" — what to do immediately on resume (Source: compaction guide)
- [FR-7]: A `/resume-work` skill that reads STATE.md and reconstructs full context (Source: task description)
- [FR-8]: Skills (`/execute-plan`, `/discovery-plan`, `/review-code`, etc.) must update STATE.md at key transition points (phase start, phase complete, decision made, blocker encountered) (Source: derived)
- [FR-9]: STATE.md must be cleared/archived when a skill completes successfully (Source: derived — stale state is dangerous)
- [FR-10]: The deterministic state script (`planflow-ai state`) should parse STATE.md and include execution state in its JSON output (Source: consistency with existing patterns)

### Non-Functional Requirements

- [NFR-1]: STATE.md must be human-readable markdown (consistent with all flow/ files)
- [NFR-2]: STATE.md should be parseable by the deterministic state script (regex-based, consistent with flowconfig-parser and plan-parser patterns)
- [NFR-3]: STATE.md updates must be lightweight — single-line edits, not full rewrites — to minimize token cost in LLM context
- [NFR-4]: `/resume-work` should reconstruct context in under 3 tool calls (read STATE.md, read plan file, read modified files list)
- [NFR-5]: STATE.md file should stay under 80 lines to remain quick to read

### Constraints

- [C-1]: Must follow existing flow/ file conventions: markdown format, wiki-links for references, ISO timestamps
- [C-2]: Must integrate with the existing `SessionState` type and `getSessionState()` function (add `state_md: boolean`)
- [C-3]: Must not break existing session start behaviors — STATE.md is additive, not a replacement for ledger/memory/scratchpad
- [C-4]: `/resume-work` is a new skill — requires command file, skill resource, CLAUDE.md updates
- [C-5]: Replaces `flow/state/current.md` and `flow/state/current.json` — those become redundant
- [C-6]: Must work with phase isolation (sub-agents don't write STATE.md — only the main session does)

## Open Questions

| # | Category | Question | Status | Answer |
|---|----------|----------|--------|--------|
| 1 | Functional | Should STATE.md persist across sessions or be cleared at session start? | Assumed | Persist — clearing would lose context from incomplete work. `/resume-work` reads it; completed skills clear it. |
| 2 | Functional | Should STATE.md replace the scratchpad or coexist? | Assumed | Coexist — scratchpad is for observations/notes, STATE.md is for execution position. Different purposes. |
| 3 | Technical | Should STATE.md have a paired JSON file like current.md/current.json? | Assumed | No — STATE.md should be the single source. The deterministic state script parses it into JSON on demand. One file, not two. |
| 4 | Functional | What happens when multiple skills run in sequence without clearing? | Assumed | Each skill overwrites the "Active Skill" section. Completed skill outcomes append to a "Completed This Session" section before clearing active state. |
| 5 | Technical | Should the compaction guide reference STATE.md? | Assumed | Yes — after compaction, re-read STATE.md instead of reconstructing state from scratch. The compaction guide's preserve rules become "write to STATE.md before compacting". |
| 6 | Functional | Does this feature involve any UI or visual interface work? | Assumed | No — this is entirely CLI/file-based infrastructure. No UI work. |

## Technical Considerations

### Architecture

STATE.md sits in the `flow/` root directory (not `flow/state/`) for consistency with other flow files (tasklist.md, memory.md, ledger.md). It replaces the `flow/state/current.md` and `flow/state/current.json` files, consolidating their data into a richer format.

The `/resume-work` skill is a lightweight context-rebuilder: it reads STATE.md, identifies the active work, reads the relevant plan/discovery file, and outputs a structured summary that puts the LLM back in context.

### Dependencies

- Existing state module (`src/cli/state/`) — needs new parser for STATE.md
- Existing session-state checker — needs `state_md` boolean added
- Existing `StateOutput` type — needs `execution` field added
- All skill command files — need STATE.md update instructions at key points
- Compaction guide — needs to reference STATE.md as the persistence mechanism
- CLAUDE.md — needs session start behavior for STATE.md + `/resume-work` command

### Patterns to Follow

- Regex-based markdown parsing (consistent with flowconfig-parser, plan-parser)
- TypeScript interfaces for parsed output (consistent with types.ts)
- File existence check in SessionState (consistent with session-state.ts)
- Markdown with structured sections (consistent with all flow/ files)
- ISO 8601 timestamps (consistent throughout project)
- Wiki-links for cross-references (consistent with brain/memory)

### Potential Challenges

- **Write frequency**: If every decision/blocker triggers a STATE.md write, it could add significant overhead to skill execution. Mitigation: batch writes at phase boundaries and key transition points only.
- **Stale state**: If a session crashes without clearing STATE.md, the next session may try to resume stale work. Mitigation: include timestamp; `/resume-work` warns if STATE.md is older than 24 hours.
- **Scope creep**: STATE.md could grow to duplicate scratchpad/ledger/memory. Mitigation: strict scope — only execution position, decisions, blockers, files, next action. No observations, no learnings, no artifact tracking.
- **Migration**: Existing `flow/state/current.md` and `flow/state/current.json` must be deprecated gracefully. Mitigation: Phase 1 creates STATE.md alongside them; later phase removes them.

## Proposed Approach

Based on the requirements gathered, the recommended approach is:

1. **Define STATE.md format and TypeScript types** — Create the markdown template with structured sections (Execution State, Decisions, Blockers, Files Modified, Next Action) and corresponding TypeScript interfaces
2. **Build a state-md parser** — Regex-based parser in `src/cli/state/` consistent with existing parsers (flowconfig-parser, plan-parser patterns)
3. **Integrate into deterministic state script** — Add `execution` field to `StateOutput`, update `SessionState` to detect STATE.md
4. **Update skill command files** — Add STATE.md write instructions to `/execute-plan`, `/discovery-plan`, `/review-code`, and `/review-pr` at key transition points
5. **Create `/resume-work` skill** — New command file + skill resource that reads STATE.md and reconstructs context
6. **Update compaction guide and CLAUDE.md** — Reference STATE.md in compaction preserve rules and session start behaviors
7. **Deprecate flow/state/current.md and current.json** — Remove redundant files, update any references
8. **Tests** — Unit tests for the parser and state integration

### Alternative Approaches Considered

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| Enhance existing current.md/current.json | Minimal new files | Two-file pattern (md+json) is redundant; current format too rigid | No |
| JSON-only state file | Machine-parseable, deterministic | Not human-readable; breaks convention of markdown flow/ files | No |
| Extend scratchpad with execution tracking | Fewer files | Scratchpad has 50-line limit; mixing purposes causes confusion | No |
| **New STATE.md with parser** | Single file, human-readable, parseable, clean separation | New file to maintain | **Yes — Recommended** |

## Risks and Unknowns

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Write overhead slows skill execution | Medium | Low | Batch writes at phase boundaries only, not every micro-step |
| Stale STATE.md misleads resume | High | Medium | Include timestamps, warn if >24h old, clear on skill completion |
| Scope creep duplicates scratchpad/ledger | Medium | Medium | Strict format with defined sections, no free-form notes |
| Migration breaks existing sessions | Low | Low | Additive first (keep current.md/json), remove in later phase |

### Unknowns

- [x] All questions resolved with assumptions (see Open Questions table)

## Next Steps

- [ ] Create implementation plan: `flow/plans/plan_unified_state_md_v1.md`
- [ ] Plan should include ~8 phases: types, parser, state integration, skill updates, resume-work skill, CLAUDE.md/compaction updates, migration, tests

<!-- brain-capture
skill: discovery
feature: unified-state-md
status: completed
data:
  user_prompt: "Unified STATE.md for session resumability — Single file tracking decisions, blockers, current position, and active phase. Enables /resume-work to rebuild full context from stored files after context resets."
  questions_asked: 6
  questions_answered: 6
  requirements_fr: 10
  requirements_nfr: 5
  discovery_doc: flow/discovery/discovery_unified_state_md_v1.md
-->
