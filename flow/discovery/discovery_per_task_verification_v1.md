# Discovery: Per-Task Verification

**Project**: [[cli]]

## Context

Currently, `/execute-plan` runs build and test verification only at the very end (Step 7) after ALL phases are complete. This means failures caused by an early task aren't detected until much later, making debugging harder and wasting effort on subsequent tasks that may depend on the broken one.

The proposed feature adds a `<verify>` section to each task in a plan phase. After completing each task, the verification command runs immediately. If verification fails, a debug sub-agent diagnoses the failure and creates a repair plan — all before moving to the next task.

**Trigger**: Tasklist item — improving execution reliability and reducing debugging time.

## Codebase Analysis

### Similar Features
The codebase has extensive sub-agent patterns for parallel execution (wave execution, discovery-sub-agents, review-multi-agent) with structured JSON returns and coordinator post-processing. Current execute-plan skill runs verification (build+test) only at the very end; no per-task or per-phase verification exists. Phase isolation already returns JSON with status/files_created/files_modified fields. Review-verification shows how to diagnose and filter false positives via context-aware re-examination, applicable to task verification debugging.

| File | Description | Relevance |
|------|-------------|-----------|
| `.claude/resources/core/phase-isolation.md` | Sub-agent context template and JSON return format with status/files/decisions fields | High |
| `.claude/resources/core/wave-execution.md` | Wave coordinator pattern: spawn → collect → process results sequentially | High |
| `.claude/resources/core/review-verification.md` | Verification pattern for diagnosing and classifying findings (Confirmed/Likely/Dismissed) | High |
| `.claude/resources/core/review-multi-agent.md` | Multi-agent pattern: 4 specialized sub-agents with coordinator dedup/merge | High |
| `.claude/resources/skills/execute-plan-skill.md` | Current execution workflow — verification only at Step 7 | High |
| `.claude/resources/patterns/plans-templates.md` | Plan template with phase/task structure (`- [ ] Task N`) | High |

### API & Data Patterns
The execute-plan skill uses phase isolation with sub-agent spawning that returns structured JSON (status, files_modified, decisions, errors, patterns_captured). Wave execution coordinates parallel sub-agents, collecting all JSON before post-wave processing with file conflict detection. Build/test verification runs only at the very end.

| File | Description | Relevance |
|------|-------------|-----------|
| `.claude/resources/core/phase-isolation.md` | JSON return schema: status, files_created, files_modified, decisions, errors | High |
| `.claude/commands/execute-plan.md` | Command-level docs with wave summary, git control, failure handling | High |
| `.claude/resources/patterns/plans-patterns.md` | Plan rules: tests last, complexity required, aggregation rules | Medium |
| `flow/.flowconfig` | Runtime config: autopilot, commit, push, wave_execution, phase_isolation | Medium |

### Schema & Types
Task status is tracked via checklist mutation in plan markdown (`[ ]` → `[x]`). Sub-agent communication uses JSON schemas defined in markdown resource files (phase-isolation.md, wave-execution.md). Return format includes status enum (success/failure/partial) with deviations and errors fields.

| File | Description | Relevance |
|------|-------------|-----------|
| `.claude/resources/core/phase-isolation.md` | COR-PI-3: Sub-agent JSON return schema with status/files/decisions fields | High |
| `.claude/resources/patterns/plans-templates.md` | Phase sections: Scope, Complexity, Dependencies, task checklist format | High |
| `.claude/resources/core/pattern-capture.md` | COR-PC-1: Buffer format for pending-patterns.md with metadata structure | Medium |

## Requirements Gathered

### Functional Requirements

- [FR-1]: Each task in a plan phase can include a `<verify>` section specifying a verification command (Source: tasklist)
- [FR-2]: After completing each task, the system runs the verification command immediately (Source: tasklist)
- [FR-3]: If verification passes, the system proceeds to the next task (Source: inferred)
- [FR-4]: If verification fails, a debug sub-agent is spawned to diagnose the failure (Source: tasklist)
- [FR-5]: The debug sub-agent analyzes the error output, relevant files, and recent changes to identify the root cause (Source: tasklist)
- [FR-6]: The debug sub-agent produces a repair plan — a set of fix actions to resolve the verification failure (Source: tasklist)
- [FR-7]: After repair, verification is re-run to confirm the fix (Source: inferred)
- [FR-8]: Tasks without a `<verify>` section skip verification and proceed normally (backward compatibility) (Source: inferred)
- [FR-9]: The plan template must be extended to support optional `<verify>` sections per task (Source: inferred)
- [FR-10]: The `/create-plan` skill should generate `<verify>` sections for tasks where verification is meaningful (Source: inferred)
- [FR-11]: Verification results (pass/fail, attempts, repairs) are included in the phase isolation JSON return (Source: inferred)

### Non-Functional Requirements

- [NFR-1]: Verification overhead should be minimal for passing tasks (fast feedback)
- [NFR-2]: Debug sub-agents should use cost-effective models (haiku) for initial diagnosis, escalating to more capable models only if needed
- [NFR-3]: Maximum retry attempts per task should be configurable (default: 2 retries before escalating to user)
- [NFR-4]: Backward compatible — plans without `<verify>` sections execute identically to current behavior
- [NFR-5]: Works with both sequential and wave execution modes
- [NFR-6]: Works with both isolated and inline phase execution modes

### Constraints

- [C-1]: Must not change the "build only at end" rule — per-task verification uses targeted checks (e.g., type-check a single file, run a specific test), not full build
- [C-2]: Must integrate with existing phase isolation JSON return format (extend, not replace)
- [C-3]: Must not break existing plan format — `<verify>` sections are additive/optional
- [C-4]: Debug sub-agents must be read-only for diagnosis; repairs are executed by the implementation sub-agent
- [C-5]: Final Step 7 build+test verification remains unchanged — per-task verification is complementary, not a replacement

## Open Questions

| # | Category | Question | Status | Answer |
|---|----------|----------|--------|--------|
| 1 | Technical | What verification commands are appropriate per task type? | Assumed | TypeScript compile check (`npx tsc --noEmit`), specific test file (`npx jest path/to/test`), lint check (`npx eslint path/to/file`), or custom command |
| 2 | Technical | Should verification run inside the phase isolation sub-agent or back in the coordinator? | Assumed | Inside the sub-agent — keeps context local and avoids coordinator round-trips |
| 3 | Functional | How many repair attempts before escalating to user? | Assumed | 2 retries (configurable via `max_verify_retries` in .flowconfig) |
| 4 | Technical | Should debug sub-agents run as nested sub-agents within the phase sub-agent? | Assumed | Yes — debug diagnosis runs as a nested haiku sub-agent within the phase sub-agent, keeping repair context isolated |
| 5 | Functional | What information does the debug sub-agent receive? | Assumed | Error output, task description, files modified, recent changes diff, and the verify command that failed |
| 6 | Technical | How does this interact with wave execution? | Assumed | Each phase sub-agent handles its own task verification internally — wave coordinator sees final results only |
| 7 | Functional | Should the `<verify>` section be auto-generated by `/create-plan`? | Assumed | Yes — `/create-plan` generates appropriate verify sections based on task type (file creation → type check, test writing → test run) |

## Technical Considerations

### Architecture

Per-task verification operates **inside the phase isolation sub-agent**. The sub-agent already has full context for the phase (task list, files, patterns). After completing each task, it:

1. Parses the `<verify>` section for the task
2. Runs the verification command
3. If failure: spawns a nested debug sub-agent (haiku) for diagnosis
4. Applies the repair plan
5. Re-runs verification (up to max retries)
6. Records verification results in the JSON return

This keeps all verification logic encapsulated within the phase sub-agent, requiring no changes to the wave coordinator or sequential coordinator flow.

### Task Format Extension

Current task format:
```markdown
- [ ] Create type definitions in `/src/types/`
```

Extended format with verification:
```markdown
- [ ] Create type definitions in `/src/types/`
  <verify>npx tsc --noEmit src/types/feature.ts</verify>
```

The `<verify>` tag is inline with the task, making it parseable and human-readable. Tasks without `<verify>` skip verification.

### Debug Sub-Agent Pattern

The debug sub-agent follows the established sub-agent pattern:
- **Model**: haiku (cost-effective for error analysis)
- **Input**: Error output, task context, files changed, verify command
- **Output**: JSON with `diagnosis` (root cause) and `repair_actions` (list of fixes)
- **Scope**: Read-only diagnosis — does not make changes directly

The implementation sub-agent applies the repair actions and re-runs verification.

### JSON Return Extension

The phase isolation return format is extended with a `task_verifications` field:

```json
{
  "status": "success",
  "phase": "Phase 1: Core Types",
  "summary": "...",
  "files_created": [...],
  "files_modified": [...],
  "task_verifications": [
    {
      "task": "Create type definitions",
      "verify_command": "npx tsc --noEmit src/types/feature.ts",
      "result": "pass",
      "attempts": 1
    },
    {
      "task": "Create Zod schemas",
      "verify_command": "npx tsc --noEmit src/types/rest-inputs.ts",
      "result": "pass",
      "attempts": 2,
      "repairs": [
        {
          "attempt": 1,
          "error": "Type 'string' is not assignable to type 'number'",
          "diagnosis": "Schema field 'count' typed as string instead of number",
          "fix": "Changed z.string() to z.number() in countSchema"
        }
      ]
    }
  ]
}
```

### Dependencies

- Phase isolation sub-agent context template (needs `<verify>` awareness in instructions)
- Execute-plan skill (needs to display verification results in phase summary)
- Plan template (needs `<verify>` section documentation)
- Create-plan skill (needs to generate `<verify>` sections)
- `.flowconfig` (new `max_verify_retries` setting)

### Patterns to Follow

- Sub-agent coordination pattern: spawn → collect JSON → process (from wave execution)
- JSON return schema extension pattern (from phase isolation)
- Debug diagnosis pattern: context-aware re-examination (from review-verification)
- Cost-effective model selection: haiku for diagnosis (from discovery sub-agents)

### Potential Challenges

- **Verification command selection**: Choosing the right verify command per task type requires heuristics. Type-check, test run, lint — each has different use cases.
- **Nested sub-agent overhead**: Spawning a debug sub-agent within a phase sub-agent adds latency. Should be rare (only on failure).
- **Partial verification in wave mode**: If a task fails verification inside a wave sub-agent, the phase returns `partial` status. The coordinator must handle this alongside other wave results.
- **Verify command environment**: The sub-agent must have access to run build tools (tsc, jest, eslint). This should work since sub-agents already run bash commands.

## Proposed Approach

Based on the requirements and codebase analysis, the recommended approach is:

1. **Extend plan template**: Add optional `<verify>` tag support to task definitions in plans-templates.md
2. **Create core resource**: New `per-task-verification.md` resource documenting the verification system, debug sub-agent pattern, and JSON schema
3. **Update phase isolation**: Extend the sub-agent context template to include verification instructions and the JSON return schema with `task_verifications` field
4. **Update execute-plan skill**: Add verification result processing to coordinator (display results, handle partial status from verification failures)
5. **Update create-plan skill**: Add heuristics for generating `<verify>` sections based on task type
6. **Update .flowconfig**: Add `max_verify_retries` setting (default: 2)
7. **Update CLAUDE.md**: Document the per-task verification feature
8. **Tests**: Validate resource files exist, contain required sections, and reference codes are indexed

### Alternative Approaches Considered

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| Verification in coordinator (not sub-agent) | Coordinator has full session context | Round-trip overhead, breaks phase isolation encapsulation | Not recommended |
| Full build per task | Maximum confidence | Extremely slow, contradicts "build at end" rule | Not recommended |
| Verification per phase (not per task) | Simpler, fewer changes | Delays failure detection, still batch-oriented | Not recommended — per-task is the goal |
| Separate verify sub-agent (not nested) | Clean separation | Requires coordinator orchestration per task, high overhead | Not recommended |

## Risks and Unknowns

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Verification commands slow down execution | Medium | Medium | Use targeted checks (single file), not full builds. Make `<verify>` optional. |
| Debug sub-agent misdiagnoses failure | Medium | Low | Limit to 2 retries, escalate to user on persistent failure. Use error output + diff context for accurate diagnosis. |
| Nested sub-agent spawning fails | Low | Low | Fall back to presenting error to user (same as current failure handling) |
| Plan authors write incorrect verify commands | Low | Medium | `/create-plan` auto-generates appropriate commands. Manual overrides documented. |
| Interaction with wave mode edge cases | Medium | Low | Verification is internal to phase sub-agent — wave coordinator sees only final results. No new wave-level complexity. |

### Unknowns (Require Further Investigation)

- [x] How to detect task type for auto-generating verify commands — Assumed: heuristic based on task description keywords
- [x] Whether nested sub-agents (debug inside phase) work reliably — Assumed: yes, based on existing sub-agent patterns

## Next Steps

- [ ] Create implementation plan: `flow/plans/plan_per_task_verification_v1.md`
- [ ] Implement plan phases
- [ ] Update tests to cover new resource files

<!-- brain-capture
skill: discovery
feature: per-task-verification
status: completed
data:
  user_prompt: "Per-task verification — Each task in a plan phase includes a <verify> section. Run verification immediately after each task, not just at the end. Auto-diagnose failures with debug sub-agents and create repair plans."
  questions_asked: 7
  questions_answered: 7
  requirements_fr: 11
  requirements_nfr: 6
  discovery_doc: flow/discovery/discovery_per_task_verification_v1.md
-->
