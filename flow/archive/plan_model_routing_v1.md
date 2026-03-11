# Plan: Model Routing with Complexity Scores

**Discovery**: [[discovery_model_routing_v1]]
**Feature**: model-routing
**Created**: 2026-03-11

---

## Summary

Add automatic model routing at phase boundaries during `/execute-plan`, selecting the appropriate model tier based on the phase's complexity score. The routing is platform-agnostic, defining abstract tiers (Fast/Standard/Powerful) that map to each platform's model lineup. Expected cost reduction: 50-70% per plan execution.

**Key Changes**:
- New resource: `.claude/resources/core/model-routing.md` — tiers, platform mappings, routing rules
- Update skill: `.claude/resources/skills/execute-plan-skill.md` — inject model selection at Step 4, spawn implementation via Agent tool with `model` param
- Update config: `.flowconfig` schema gains `model_routing` key; `/flow` command supports it
- Update output: execution summary shows model used per phase

---

## Phase 1: Create Model Routing Resource

**Scope**: Define tiers, platform mappings, routing rules, and aggregation behavior in a central reference doc
**Complexity**: 4/10

This is the foundation — all other phases reference it.

- [x] Create `.claude/resources/core/model-routing.md` with:
  - Purpose section: automatic model selection based on complexity scores during `/execute-plan`
  - Model Tier Table: Fast (0-3 → haiku), Standard (4-5 → sonnet), Powerful (6-10 → opus)
  - Platform Mapping Table: Claude Code (haiku/sonnet/opus), Codex (gpt-4.1-mini/gpt-4.1/o3), Cursor (auto fast/normal/max)
  - Routing Rules: read phase complexity → look up tier → spawn Agent subagent with `model` param
  - Aggregation Rule: when phases are aggregated, use the highest individual phase complexity to determine tier
  - Plan Mode Rule: planning step (approval) always uses the current session model — only the implementation step gets routed
  - Enable/Disable: controlled by `model_routing` key in `.flowconfig` (default: `true`)
  - Fallback: if platform doesn't support a tier, fall back to closest available model (upward)
- [x] Update `.claude/resources/core/_index.md`:
  - Add `model-routing.md` entry with reference codes (COR-MR-1 through COR-MR-3)
  - Update file count and total lines

---

## Phase 2: Update Execute-Plan Skill

**Scope**: Inject model selection logic at Step 4 (phase execution) so each phase spawns as a subagent with the appropriate model
**Complexity**: 6/10

This is the core integration — changes how phases are executed.

- [x] Update `.claude/resources/skills/execute-plan-skill.md`:
  - Add model routing sub-step to Step 4 (between "wait for approval" and "implement"):
    - Check if `model_routing` is enabled in `.flowconfig` (default: true)
    - Read phase complexity score
    - Look up model tier from `.claude/resources/core/model-routing.md`
    - Spawn implementation as Agent subagent with `model={tier}` parameter
    - Include in Agent prompt: plan file path, current phase details, files modified so far, project context
  - Update aggregated phase handling: when multiple phases are aggregated, use highest individual complexity for tier selection
  - Add reference to `.claude/resources/core/model-routing.md`
- [x] Update `.claude/commands/execute-plan.md`:
  - Add `## Model Routing` section (similar to existing Brain Capture, Pattern Capture sections)
  - Brief description: automatic model selection per phase based on complexity scores
  - Reference to core resource
  - Note: disabled when `model_routing: false` in `.flowconfig`
- [x] Update `.claude/resources/skills/_index.md`:
  - Add note about model routing capability in execute-plan skill entry

---

## Phase 3: Update FlowConfig and Flow Command

**Scope**: Add `model_routing` setting to `.flowconfig` schema and `/flow` command
**Complexity**: 3/10

- [x] Update `.claude/commands/flow.md`:
  - Add `model_routing` to the valid keys table: `model_routing | true, false | true | Auto-select model per phase based on complexity`
  - Add to help text SETTINGS section
  - Add example: `/flow model_routing=false` to disable
- [x] Update CLAUDE.md:
  - Add `model_routing` mention in the `/flow` command description (both Quick Start sections)

---

## Phase 4: Update Execution Summary

**Scope**: Show which model was used per phase in the completion output
**Complexity**: 2/10

- [x] Update `.claude/resources/skills/execute-plan-skill.md` completion summary (Step 7):
  - Add "Model" column to the phase completion table
  - Example format:
    ```
    | Phase | Complexity | Model | Status |
    |-------|-----------|-------|--------|
    | 1. Setup types | 2/10 | haiku | Done |
    | 2. API endpoints | 7/10 | opus | Done |
    | 3. Tests | 4/10 | sonnet | Done |
    ```
  - Add estimated cost savings line: "Model routing saved ~X% vs all-opus execution"

---

## Phase 5: Tests

**Scope**: Verify build passes and no regressions
**Complexity**: 2/10

- [x] Verify `npm run build` passes
- [x] Verify `npm run test` passes (163 tests, 13 suites)
- [x] Manual verification: inspect execute-plan-skill.md for correct model routing logic at Step 4

---

## Execution Order

1. Phase 1 → Model routing resource (foundation — defines all tiers and rules)
2. Phase 2 → Execute-plan skill update (references Phase 1 resource)
3. Phase 3 → FlowConfig and flow command (references the setting used in Phase 2)
4. Phase 4 → Execution summary (references model info from Phase 2)
5. Phase 5 → Tests (validates everything)

---

## Complexity Summary

| Phase | Score | Level |
|-------|-------|-------|
| 1. Model Routing Resource | 4 | Low |
| 2. Execute-Plan Skill Update | 6 | Medium |
| 3. FlowConfig and Flow Command | 3 | Low |
| 4. Execution Summary | 2 | Trivial |
| 5. Tests | 2 | Trivial |
| **Total** | **17** | |

**Execution Strategy**: Phases 1+2 cautious (combined 10), Phases 3+4 aggregate (combined 5), Phase 5 separate (tests).

---

## Verification

1. Inspect `.claude/resources/core/model-routing.md` — verify tier table, platform mappings, routing rules
2. Inspect execute-plan-skill.md Step 4 — verify model selection logic before implementation spawn
3. Inspect flow.md — verify `model_routing` in valid keys table
4. Run `npm run build` — verify no compile errors
5. Run `npm run test` — verify no regressions
6. Check CLAUDE.md — verify model routing mentioned in `/flow` description
