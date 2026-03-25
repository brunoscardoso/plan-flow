# Plan: Multi-Agent Coordination

**Feature**: multi_agent_coordination
**Version**: 1
**Date**: 2026-03-24
**Based on Discovery**: `flow/discovery/discovery_multi_agent_coordination_v1.md`
**Total Phases**: 6
**Total Complexity**: 28/60

---

## Phase 1: Core Resource and Types

**Complexity**: 5/10
**Dependencies**: None
**Scope**: Create the shared context system reference document and define TypeScript types for context entries.

### Tasks

- [ ] Create `.claude/resources/core/shared-context.md` — full system reference covering: purpose, context entry types (contract, decision, progress), JSONL file format, lifecycle (create per wave, inject before spawn, collect from returns, clear between waves), contract conflict detection algorithm, and reference codes
- [ ] Add `ContextEntry`, `ContextEntryType`, `ContractKind`, `ContractData`, `DecisionData`, `ProgressData` types to `src/cli/state/types.ts`
- [ ] Create `src/cli/daemon/shared-context.ts` — module with functions: `createContextFile(flowDir)`, `appendContextEntry(flowDir, entry)`, `readContextEntries(flowDir)`, `clearContextFile(flowDir)`, `detectContractConflicts(entries)`. Use atomic append pattern from event-writer.

### Files

| File | Action |
|------|--------|
| `.claude/resources/core/shared-context.md` | Create |
| `src/cli/state/types.ts` | Modify — add context entry types |
| `src/cli/daemon/shared-context.ts` | Create |

---

## Phase 2: Phase Isolation Template Extension

**Complexity**: 4/10
**Dependencies**: Phase 1
**Scope**: Update the phase-isolation context template (COR-PI-2) with shared context section and emission instructions.

### Tasks

- [ ] Add "Shared Context from Sibling Phases" section to `.claude/resources/core/phase-isolation.md` context template — includes injected entries and instructions to review before each task
- [ ] Add emission instructions: "If you define a new API endpoint, type interface, or make an architectural decision, include it in your `context_entries` return array"
- [ ] Add `context_entries: ContextEntry[]` to the return format schema (COR-PI-3) as optional field
- [ ] Document that context injection only happens for multi-phase waves (single-phase waves and sequential mode skip it)

### Files

| File | Action |
|------|--------|
| `.claude/resources/core/phase-isolation.md` | Modify |

---

## Phase 3: Execute-Plan Skill Integration

**Complexity**: 6/10
**Dependencies**: Phase 1, Phase 2
**Scope**: Wire shared context into execute-plan-skill.md — Step 4b (spawn with context), Step 4c (collect entries + detect contract conflicts).

### Tasks

- [ ] Update Step 4b (Parallel Spawning): before spawning each sub-agent, read `.wave-context.jsonl`, filter entries from other phases, inject as inline content in the prompt
- [ ] Update Step 4c (Post-Wave Processing): after processing each phase return, extract `context_entries` from JSON, append to `.wave-context.jsonl`
- [ ] Add contract conflict detection to Step 4c: for each pair of phases, check for contract entries with same `name` but different `signature`/`fields`
- [ ] Add conflict presentation: show both versions, offer options (pick one, merge, stop)
- [ ] Update wave lifecycle: create `.wave-context.jsonl` at wave start, clear between waves, delete after execution
- [ ] Ensure backward compatibility: skip shared context for single-phase waves and when `context_entries` is absent from return

### Files

| File | Action |
|------|--------|
| `.claude/resources/skills/execute-plan-skill.md` | Modify |

---

## Phase 4: Wave Execution Resource Update

**Complexity**: 4/10
**Dependencies**: Phase 3
**Scope**: Update wave-execution.md with shared context lifecycle, contract conflict detection, and updated flow diagrams.

### Tasks

- [ ] Add "Shared Context" section to `.claude/resources/core/wave-execution.md` — describes the `.wave-context.jsonl` file, its lifecycle per wave, and how it enables cross-phase coordination
- [ ] Update the wave flow diagram to show context file creation, injection, and collection
- [ ] Add contract conflict detection to the "File Conflict Detection" section (or create a sibling section)
- [ ] Update summary rules table with shared context rules

### Files

| File | Action |
|------|--------|
| `.claude/resources/core/wave-execution.md` | Modify |

---

## Phase 5: Documentation

**Complexity**: 3/10
**Dependencies**: Phase 4
**Scope**: Update CLAUDE.md with shared context feature description.

### Tasks

- [ ] Add "Multi-Agent Coordination" section to CLAUDE.md under Core Features — describe shared context, what agents share, and how it extends wave execution
- [ ] Update the wave execution description to mention shared context
- [ ] Add `.wave-context.jsonl` to flow directory structure (both copies in CLAUDE.md)

### Files

| File | Action |
|------|--------|
| `CLAUDE.md` | Modify |

---

## Phase 6: Tests

**Complexity**: 6/10
**Dependencies**: Phase 1
**Scope**: Unit tests for shared-context.ts module (JSONL operations, conflict detection).

### Tasks

- [ ] Create `src/cli/daemon/shared-context.test.ts`
- [ ] Test: createContextFile creates empty file
- [ ] Test: appendContextEntry appends JSONL line with atomic write
- [ ] Test: readContextEntries returns parsed array
- [ ] Test: clearContextFile removes the file
- [ ] Test: detectContractConflicts finds same-name different-signature conflicts
- [ ] Test: detectContractConflicts returns empty for no conflicts
- [ ] Test: detectContractConflicts ignores non-contract entries
- [ ] Test: backward compat — empty context file returns empty array

### Files

| File | Action |
|------|--------|
| `src/cli/daemon/shared-context.test.ts` | Create |

---

## Key Changes Summary

| Area | Change |
|------|--------|
| **New resource** | `shared-context.md` — full system reference |
| **New module** | `shared-context.ts` — JSONL operations + conflict detection |
| **Modified resources** | phase-isolation.md (template), wave-execution.md (lifecycle), execute-plan-skill.md (steps 4b/4c) |
| **New types** | `ContextEntry`, `ContractData`, `DecisionData`, `ProgressData` |
| **New runtime file** | `flow/.wave-context.jsonl` (per-wave, temporary) |
| **Documentation** | CLAUDE.md (feature description + directory structure) |
| **New tests** | `shared-context.test.ts` |

---

## Execution Strategy

| Group | Phases | Combined Complexity | Strategy |
|-------|--------|-------------------|----------|
| 1 | Phase 1 | 5/10 | Sequential |
| 2 | Phase 2 | 4/10 | Sequential (depends on Phase 1) |
| 3 | Phase 3 | 6/10 | Sequential (depends on Phase 1+2) |
| 4 | Phase 4 + Phase 5 | 7/10 | Cautious (both depend on Phase 3) |
| 5 | Phase 6 (Tests) | 6/10 | Always separate (depends on Phase 1) |
