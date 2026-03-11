# Discovery: Model Routing with Complexity Scores

**Project**: [[plan-flow]]

## Context

Plan-flow's execute-plan skill already has a sophisticated complexity scoring system (0-10) that determines execution strategy (aggregate, cautious, sequential). But the model powering each phase is always the same — regardless of whether the phase is a trivial type alias (complexity 2) or a complex multi-system integration (complexity 9). This wastes cost on simple phases and potentially under-powers complex ones.

This feature adds automatic model routing at phase boundaries during `/execute-plan`, selecting the appropriate model tier based on the phase's complexity score. The routing is platform-agnostic, defining abstract tiers that map to each platform's model lineup.

## Referenced Documents

| Document | Key Findings |
|----------|-------------|
| `.claude/resources/core/complexity-scoring.md` | Full scoring system: 0-2 trivial, 3-4 low, 5-6 medium, 7-8 high, 9-10 very high. Execution strategy rules, aggregation rules, scoring criteria modifiers. |
| `.claude/resources/skills/execute-plan-skill.md` | Phase boundary logic at Step 4 (execute phases) and Step 5b (context check). Agent tool used for Plan mode per phase. Clear boundaries where model switching could be injected. |
| `.claude/commands/execute-plan.md` | Command orchestration. References git control, brain capture, pattern capture at boundaries. Model routing would slot in alongside these. |
| `.claude/commands/flow.md` | Central config hub at `flow/.flowconfig`. YAML format with `autopilot`, `commit`, `push`, `branch` keys. Natural place to add model routing config. |
| `scripts/hooks/cost-tracker.cjs` | Knows model pricing: haiku ($0.80/$4.00), sonnet ($3.00/$15.00), opus ($15.00/$75.00). Already tracks per-response model usage. |
| `scripts/hooks/cost-display.cjs` | Same pricing structure. Displays per-response cost. Would automatically reflect savings from model routing. |

## Code Context Analysis

### Agent Tool — Model Override Capability

The Agent tool (available in Claude Code) supports a `model` parameter with values `"sonnet"`, `"opus"`, `"haiku"`. This is the mechanism for routing phases to different models — spawn each phase's implementation as a subagent with the model selected by complexity score.

### Phase Boundary Injection Points

| File | Location | What Happens | Routing Hook |
|------|----------|-------------|--------------|
| `execute-plan-skill.md` | Step 4 (Execute Each Phase) | Auto-switch to Plan mode, present phase, implement | Before implementation, select model based on complexity |
| `execute-plan-skill.md` | Step 5b (Phase-Boundary Context Check) | Context management between phases | After routing decision, before next phase |

### Existing Configuration Mechanism

| File | Purpose |
|------|---------|
| `flow/.flowconfig` | YAML config with autopilot, commit, push, branch |
| `.claude/settings.json` | Claude Code settings, hooks registration |
| `scripts/hooks/cost-tracker.cjs` | Already tracks model per response |

### Existing Complexity Thresholds

The scoring system already defines execution strategy thresholds:

| Adjacent Score | Strategy |
|---------------|----------|
| ≤ 6 | Aggregate |
| 7-10 | Cautious |
| > 10 | Sequential |

Model routing adds a new dimension: which model powers the phase, not just how many phases run together.

**Total References**: 8 files across 4 categories (skills, commands, hooks, config)

### Key Patterns Observed

- Phase boundaries are well-defined — clear injection point for model selection
- Agent tool already supports model override — no new tooling needed
- Cost tracking already knows model pricing — savings will be visible immediately
- `.flowconfig` is the config hub — model routing config belongs here

## Requirements Gathered

### Functional Requirements

- **[FR-1]**: Define three model tiers mapped to complexity score ranges: Fast (0-3), Standard (4-5), Powerful (6-10) (Source: brainstorm Q&A)
- **[FR-2]**: Each platform maps tiers to its own models — Claude Code: haiku/sonnet/opus; Codex: equivalent mapping; other platforms: equivalent mapping (Source: brainstorm Q&A)
- **[FR-3]**: During `/execute-plan`, at each phase boundary, determine the model tier from the phase's complexity score and route the phase implementation to that model (Source: brainstorm Q&A)
- **[FR-4]**: Model routing applies ONLY to `/execute-plan` — not to discovery, review, or other skills (Source: brainstorm Q&A)
- **[FR-5]**: Model routing is automatic — no user prompt or confirmation needed at each phase (Source: brainstorm Q&A)
- **[FR-6]**: When phases are aggregated (combined complexity ≤ 6), use the highest individual phase complexity to determine the model tier (Source: implied — aggregate shouldn't downgrade)
- **[FR-7]**: The execute-plan skill instructions must tell the LLM to spawn phase implementation as an Agent subagent with the appropriate `model` parameter (Source: technical analysis)

### Non-Functional Requirements

- **[NFR-1]**: Cost savings should be visible in the existing cost-tracker hooks — no additional cost tracking needed (Source: existing infrastructure)
- **[NFR-2]**: Model routing must not break the existing phase execution flow — it's an enhancement to Step 4, not a restructuring (Source: minimal disruption)
- **[NFR-3]**: Platform model mappings must be easy to update as new models are released (Source: future-proofing)

### Constraints

- **[C-1]**: Model routing is scoped to `/execute-plan` only — other skills don't have pre-defined complexity scores (Source: brainstorm Q&A)
- **[C-2]**: No `plan-flow init` changes — init is a one-off, not worth optimizing (Source: brainstorm Q&A)
- **[C-3]**: The Agent tool's `model` parameter is the routing mechanism — no custom model switching infrastructure needed (Source: technical analysis)
- **[C-4]**: Tests phase routing follows the same rules — use its complexity score like any other phase (Source: consistency)

## Open Questions

| # | Category | Question | Status | Answer |
|---|----------|----------|--------|--------|
| 1 | Technical | Can the Agent tool's `model` parameter be used reliably from within skill instructions (markdown), or does it require code changes? | Assumed | Yes — skill instructions direct the LLM to use Agent tool with model param. The LLM follows these instructions. |
| 2 | Technical | Should model routing be configurable per-project via `.flowconfig`? | Assumed | Yes — add `model_routing: true/false` to `.flowconfig` so users can disable it. Default: true. |
| 3 | Technical | What if a platform doesn't support all three tiers? | Assumed | Fall back to the closest available model (e.g., if no haiku equivalent, use standard tier) |
| 4 | Functional | Should the execution summary show which model was used per phase? | Assumed | Yes — useful for cost awareness. Show in the completion summary. |

## Technical Considerations

### Architecture Fit

- **Pure markdown change**: The routing logic lives entirely in the execute-plan skill instructions. The LLM reads complexity scores and spawns Agent subagents with the appropriate `model` parameter.
- **No TypeScript changes needed** for the core routing (skills are markdown instructions)
- **Config changes**: Add `model_routing` key to `.flowconfig` schema and `/flow` command
- **Platform mappings**: Define in a new resource file or within the execute-plan skill

### Model Tier Mapping

| Tier | Complexity | Claude Code | Codex (OpenAI) | Cursor |
|------|-----------|-------------|----------------|--------|
| Fast | 0-3 | haiku | gpt-4.1-mini | auto (fast) |
| Standard | 4-5 | sonnet | gpt-4.1 | auto (normal) |
| Powerful | 6-10 | opus | o3 | auto (max) |

### Cost Impact Estimate

Assuming a typical 6-phase plan:
- 2 trivial phases (0-3) → haiku: ~90% savings vs opus
- 2 medium phases (4-5) → sonnet: ~80% savings vs opus
- 2 complex phases (6+) → opus: no change

Estimated overall cost reduction: **50-70%** per plan execution.

### Integration with Existing Phase Logic

The model routing decision slots into the existing Step 4 flow:

```
For Each Phase:
1. Auto-switch to Plan mode (always uses current model — planning is cheap)
2. Present phase details
3. Wait for approval
4. ** NEW: Determine model tier from complexity score **
5. ** NEW: Spawn implementation as Agent subagent with model={tier} **
6. Capture patterns (silent)
7. Update progress
8. Continue to next phase
```

### Dependencies

- Agent tool `model` parameter (already available)
- Complexity scores in plan files (already required)
- `.flowconfig` for enable/disable (already exists)

### Potential Challenges

- **Context transfer**: When spawning a subagent for phase implementation, the subagent needs sufficient context about the plan, current phase, and files modified so far. The Agent tool's `prompt` parameter must include this.
- **Aggregated phases**: When multiple phases are aggregated, the subagent handles all of them. Use the highest individual complexity to pick the tier.
- **Plan mode interaction**: Plan mode (approval step) should always use the current session model, not the routed model. Only the implementation step gets routed.

## Proposed Approach

1. **Create model routing resource** (`.claude/resources/core/model-routing.md`) — defines tiers, platform mappings, and routing rules
2. **Update execute-plan skill** — inject model selection logic at Step 4 (phase execution), spawn implementation via Agent tool with `model` param
3. **Update `.flowconfig` schema** — add `model_routing: true` (default enabled)
4. **Update `/flow` command** — support `model_routing=true/false` setting
5. **Update execution summary** — show model used per phase in completion output

### Alternative Approaches Considered

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| Environment variable per phase | Simple | Can't change mid-session, requires restart | Rejected |
| Hook-based model switching | Automatic | Hooks can't control model selection | Rejected |
| Agent tool `model` param | Native, per-call, no restart | Requires spawning subagents | **Recommended** |
| Manual user switch | No code changes | Breaks flow, poor UX | Rejected |

## Risks and Unknowns

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Subagent context loss | High | Medium | Include comprehensive context in Agent prompt (plan file, current phase, modified files list) |
| Haiku can't handle complexity 3 tasks | Medium | Low | Complexity 0-3 are by definition trivial/low — haiku is sufficient. If it fails, the skill can detect and retry with sonnet. |
| Agent tool overhead per phase | Low | Medium | Agent spawning has some overhead, but phases are typically minutes long — seconds of overhead is negligible |
| Platform model names change | Low | Medium | Keep mappings in a single resource file for easy updates |

### Unknowns (Require Further Investigation)

- [x] All questions resolved during discovery Q&A

## Next Steps

- [ ] Create implementation plan: `flow/plans/plan_model_routing_v1.md`
- [ ] Implementation: model routing resource, execute-plan skill update, flowconfig update, flow command update, execution summary update
