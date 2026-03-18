# Plan: Per-Task Verification

**Project**: [[cli]]

## Overview

Add per-task verification to `/execute-plan` so that each task in a plan phase can include a `<verify>` section. After completing each task, the verification command runs immediately. If verification fails, a debug sub-agent (haiku) diagnoses the failure and creates a repair plan. This catches errors early instead of waiting until the final build+test step.

**Based on Discovery**: `flow/discovery/discovery_per_task_verification_v1.md`

## Goals

- Detect task-level failures immediately after each task completes
- Auto-diagnose verification failures with debug sub-agents
- Auto-repair failures with up to N retries before escalating to user
- Maintain backward compatibility — plans without `<verify>` sections work unchanged
- Provide verification result telemetry in phase JSON returns

## Non-Goals

- Replacing the final Step 7 build+test verification (it remains unchanged)
- Running full builds per task (only targeted checks)
- Modifying wave coordinator logic (verification is internal to phase sub-agents)
- Adding verification to inline (non-isolated) phase execution mode

## Requirements Summary

### Functional Requirements

- [FR-1]: Tasks can include optional `<verify>` sections with a verification command
- [FR-2]: Verification runs immediately after each task completes
- [FR-3]: Failed verification spawns a debug sub-agent for diagnosis
- [FR-4]: Debug sub-agent returns diagnosis + repair actions as JSON
- [FR-5]: Implementation sub-agent applies repairs and re-verifies (up to max retries)
- [FR-6]: Phase JSON return includes `task_verifications` array with results
- [FR-7]: `/create-plan` auto-generates `<verify>` sections based on task type heuristics
- [FR-8]: Tasks without `<verify>` skip verification (backward compatible)

### Non-Functional Requirements

- [NFR-1]: Minimal overhead for passing verifications (fast feedback)
- [NFR-2]: Debug sub-agents use haiku for cost-effective diagnosis
- [NFR-3]: Max retries configurable via `max_verify_retries` in `.flowconfig` (default: 2)
- [NFR-4]: Works with sequential and wave execution modes

### Constraints

- [C-1]: No full builds per task — only targeted checks (tsc single file, jest single file, etc.)
- [C-2]: Extend existing phase isolation JSON return (don't replace)
- [C-3]: `<verify>` sections are additive/optional in plan format
- [C-4]: Debug sub-agents are read-only for diagnosis; repairs executed by implementation sub-agent

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Verification commands slow down execution | Medium | Use targeted checks, make `<verify>` optional |
| Debug sub-agent misdiagnoses failure | Medium | Limit retries, escalate to user on persistent failure |
| Incorrect auto-generated verify commands | Low | Heuristic-based generation with fallback to no verify |

## Phases

### Phase 1: Core Resource File

**Scope**: Create the core resource documenting the per-task verification system, debug sub-agent pattern, JSON schemas, and configuration.
**Complexity**: 5/10
**Dependencies**: None

- [x] Create `.claude/resources/core/per-task-verification.md` with:
  - Purpose and architecture overview
  - `<verify>` tag syntax and parsing rules
  - Debug sub-agent prompt template and JSON return schema
  - Verification loop flow (verify → diagnose → repair → re-verify)
  - `task_verifications` JSON return field schema
  - Configuration: `max_verify_retries` in `.flowconfig`
  - Error handling: max retries exceeded → escalate to user
  - Interaction with wave mode (internal to sub-agent, transparent to coordinator)
- [x] Add reference codes (COR-PTV-1 through COR-PTV-4) to `.claude/resources/core/_index.md`

### Phase 2: Plan Template Extension

**Scope**: Extend the plan template and create-plan skill to support `<verify>` sections in tasks.
**Complexity**: 4/10
**Dependencies**: None

- [x] Update `.claude/resources/patterns/plans-templates.md` to document optional `<verify>` tag syntax in task definitions
- [x] Update `.claude/resources/skills/create-plan-skill.md` to add heuristics for auto-generating `<verify>` sections:
  - File creation tasks → `npx tsc --noEmit <file>`
  - Test writing tasks → `npx jest <test-file> --no-coverage`
  - Schema/type tasks → `npx tsc --noEmit <type-file>`
  - Config tasks → no verify (manual review)
  - Generic tasks → no verify (default)

### Phase 3: Phase Isolation Integration

**Scope**: Update phase isolation context template and JSON return format to support per-task verification.
**Complexity**: 6/10
**Dependencies**: Phase 1

- [ ] Update `.claude/resources/core/phase-isolation.md`:
  - Extend context template instructions section to include verification workflow
  - Add `<verify>` parsing instructions to sub-agent prompt
  - Add debug sub-agent spawning instructions (nested haiku agent)
  - Extend return format schema with `task_verifications` field
  - Add verification-related fields to field descriptions table
- [ ] Update `.claude/resources/core/wave-execution.md`:
  - Note that verification is internal to phase sub-agents (no wave coordinator changes)
  - Add `task_verifications` to coordinator processing documentation (display in wave summary)

### Phase 4: Execute-Plan Skill Updates

**Scope**: Update the execute-plan skill to process verification results from sub-agent returns and display verification summaries.
**Complexity**: 5/10
**Dependencies**: Phase 1, Phase 3

- [ ] Update `.claude/resources/skills/execute-plan-skill.md`:
  - Step 4 (sequential mode): Add verification result processing after sub-agent return
  - Step 4c (wave mode): Add verification result display in wave completion report
  - Step 7 (completion): Include verification stats in completion summary
  - Add verification result display template (pass/fail counts, repairs applied)
- [ ] Update `.claude/commands/execute-plan.md`:
  - Add per-task verification to feature descriptions
  - Add `max_verify_retries` to configuration reference
  - Add reference codes for per-task verification sections

### Phase 5: Configuration and CLAUDE.md Updates

**Scope**: Update `.flowconfig` documentation, CLAUDE.md, and the `/flow` command to support the new `max_verify_retries` setting.
**Complexity**: 3/10
**Dependencies**: Phase 1

- [ ] Update CLAUDE.md (both root and cli) to document per-task verification feature
- [ ] Update `.claude/commands/flow.md` (or flow skill) to support `max_verify_retries` setting
- [ ] Document default value (`max_verify_retries: 2`) and valid range (1-5)

### Phase 6: Tests (Final)

**Scope**: Write tests validating per-task verification resource files exist, contain required sections, and reference codes are indexed.
**Complexity**: 4/10
**Dependencies**: Phase 1, Phase 2, Phase 3, Phase 4, Phase 5

- [ ] Create test for `per-task-verification.md` resource (exists, has required sections: Purpose, Architecture, Verify Tag Syntax, Debug Sub-Agent, JSON Schema, Configuration, Error Handling)
- [ ] Create test for updated `phase-isolation.md` (contains `task_verifications` field documentation)
- [ ] Create test for updated `plans-templates.md` (contains `<verify>` tag documentation)
- [ ] Create test for updated `execute-plan-skill.md` (contains verification result processing)
- [ ] Create test for `_index.md` reference codes (COR-PTV-1 through COR-PTV-4 are indexed)
- [ ] Run full test suite to verify no regressions

**Build Verification**: Run `npm run build && npm run test`

## Key Changes

1. **New Core Resource**: `.claude/resources/core/per-task-verification.md` — complete system documentation for per-task verification, debug sub-agents, and repair loops
2. **Plan Template Extension**: `<verify>` tag syntax added to task definitions in plans-templates.md
3. **Phase Isolation Extension**: Context template and JSON return format extended with verification workflow and `task_verifications` field
4. **Execute-Plan Enhancement**: Verification result processing and display in phase summaries and completion reports
5. **Create-Plan Enhancement**: Auto-generation of `<verify>` sections based on task type heuristics
6. **Configuration**: New `max_verify_retries` setting in `.flowconfig`

## Complexity Summary

| Phase | Complexity | Description |
|-------|-----------|-------------|
| 1 | 5/10 | Core resource file |
| 2 | 4/10 | Plan template extension |
| 3 | 6/10 | Phase isolation integration |
| 4 | 5/10 | Execute-plan skill updates |
| 5 | 3/10 | Configuration and CLAUDE.md |
| 6 | 4/10 | Tests |

**Total Phases**: 6
**Average Complexity**: 4.5/10
**Highest Complexity**: Phase 3 at 6/10

<!-- brain-capture
skill: create-plan
feature: per-task-verification
status: completed
data:
  phase_count: 6
  total_complexity: 27
  highest_phase: "Phase 3: Phase Isolation Integration (6/10)"
  discovery_link: [[discovery-per-task-verification]]
  plan_doc: flow/plans/plan_per_task_verification_v1.md
-->
