# Discovery: Learn Recommendations System

**Project**: [[cli]]

**Feature**: learn_recommendations
**Date**: 2026-03-07
**Status**: Completed (implemented during discovery)

---

## Context

The user wanted to connect the `/learn` skill with the execution workflow so that learning opportunities are automatically detected and recommended during any plan-flow skill execution. When a user encounters new technologies, resolves non-trivial errors, or changes patterns during execution, the system should recommend `/learn` to deepen understanding rather than just fix and move on.

---

## Referenced Documents Analysis

### `.claude/commands/learn.md`

**Key Findings**:
- Learn has two modes: teaching (topic-based) and pattern extraction (no args)
- Teaching mode supports general knowledge, project implementation, or both
- Outputs stored globally (`~/plan-flow/brain/learns/`) or locally (`flow/brain/learning/`)
- Auto-indexed with LRN-* codes

### `.claude/commands/execute-plan.md`

**Key Findings**:
- Executes phases with brain-capture blocks tracking errors_hit, user_corrections, files_changed
- Natural break points exist at end of each phase and end of execution
- Already has Brain Capture and Resource Capture sections as cross-cutting concerns

### `.claude/resources/core/brain-capture.md`

**Key Findings**:
- Brain captures track errors, decisions, and feature progress
- Error files in `flow/brain/errors/` can indicate knowledge gaps
- Session tracking provides awareness of what happened during execution

---

## Requirements Gathered

### Functional Requirements

- [FR-1]: Detect when new dependencies are added during execution (Source: user)
- [FR-2]: Detect when patterns change (e.g., Redux to Zustand) (Source: user)
- [FR-3]: Detect when non-trivial errors are resolved after 3+ attempts (Source: user)
- [FR-4]: Detect when user corrects the AI's approach (Source: user)
- [FR-5]: Detect when new technologies/APIs are introduced to the project (Source: user)
- [FR-6]: Recommend `/learn <topic>` at natural break points, not interrupting flow (Source: user)
- [FR-7]: Batch multiple recommendations at end of execution (Source: user)
- [FR-8]: Check existing learns/patterns before recommending duplicates (Source: user)
- [FR-9]: Add "Suggested Learning" section to discovery documents when new tech detected (Source: user)
- [FR-10]: Add "Learn Opportunities" section to review documents (Source: user)

### Non-Functional Requirements

- [NFR-1]: Non-blocking — never interrupt current skill execution
- [NFR-2]: Once per topic per session — no repeated recommendations
- [NFR-3]: Context-aware — tailor recommendation to situation (error vs new tech)
- [NFR-4]: Respect user declining — don't re-ask if ignored

### Constraints

- [C-1]: Must integrate with existing brain-capture block data (errors_hit, user_corrections)
- [C-2]: Must check `~/plan-flow/brain/learns/_index.md` and `~/plan-flow/brain/patterns/_index.md` before recommending
- [C-3]: Must work across all plan-flow skills (execute, discovery, review-code, review-pr)

---

## Open Questions

| # | Category | Question | Status | Answer |
|---|----------|----------|--------|--------|
| 1 | Functional | Should recommendations be in chat or in output documents? | Answered | Both — discovery/review documents include sections; execution uses chat |
| 2 | Technical | How to detect new dependencies? | Answered | Monitor npm/pip installs, compare against lock file |
| 3 | Technical | How to detect pattern changes? | Answered | Monitor user language ("switch to", "replace with", "use instead") |
| 4 | NFR | Should recommendations persist across sessions? | Answered | No — session-level tracking only; existing learns/patterns checked for dedup |

---

## Technical Considerations

### Architecture Fit

- Implemented as a cross-cutting resource at `.claude/resources/core/learn-recommendations.md`
- Integrated into each command file via a "Learn Recommendations" section
- Follows the same pattern as Brain Capture and Resource Capture sections

### Dependencies

- Relies on existing brain-capture data (errors_hit, user_corrections)
- Relies on existing learns index (`~/plan-flow/brain/learns/_index.md`)
- Relies on existing patterns index (`~/plan-flow/brain/patterns/_index.md`)
- Relies on `flow/references/tech-foundation.md` for tech stack comparison

### Patterns Applied

- Cross-cutting concern pattern (same as brain-capture, resource-capture)
- Index-based deduplication (LRN-* and GLB-* codes)
- Natural break point presentation (end of phase, end of execution)

### Challenges Identified

- Detection of "new" dependencies requires comparing against existing lock file
- Pattern change detection relies on parsing user intent from natural language
- Balancing helpfulness with noise — too many recommendations could be annoying

---

## Proposed Approach

Based on the requirements gathered, the implementation consists of:

1. **Core resource file** (`learn-recommendations.md`) — defines trigger conditions, detection logic, recommendation format, and integration rules
2. **Command integrations** — each command file gets a "Learn Recommendations" section with skill-specific checks
3. **Discovery integration** — adds "Suggested Learning" section to discovery documents
4. **Review integration** — adds "Learn Opportunities" section to review documents
5. **Execution integration** — batched recommendations at end of execution

### Integration Points

| Skill | Integration Type | When |
|-------|-----------------|------|
| `/execute-plan` | Batched chat recommendations | End of execution, before summary |
| `/discovery-plan` | Document section ("Suggested Learning") | In discovery document |
| `/review-code` | Document section ("Learn Opportunities") | End of review document |
| `/review-pr` | Document section ("Learn Opportunities") | End of review document |

---

## Risks and Unknowns

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Too many recommendations annoy user | Medium | Low | Batch recommendations, once-per-topic rule |
| False positives (recommending already-known topics) | Low | Medium | Check existing learns/patterns indexes |
| Detection misses real learning opportunities | Low | Medium | User can always invoke `/learn` manually |

### Unknowns (Require Further Investigation)

- [x] All unknowns resolved during implementation

---

## Implementation Status

This feature was implemented during the discovery session:

| File | Change |
|------|--------|
| `.claude/resources/core/learn-recommendations.md` | Created — core resource file |
| `.claude/resources/core/_index.md` | Updated — added COR-LR-1, COR-LR-2 codes |
| `.claude/commands/execute-plan.md` | Updated — added Learn Recommendations section |
| `.claude/commands/discovery-plan.md` | Updated — added Learn Recommendations section |
| `.claude/commands/review-code.md` | Updated — added Learn Recommendations section |
| `.claude/commands/review-pr.md` | Updated — added Learn Recommendations section |
| `.cursor/commands/execute-plan.md` | Updated — added Learn Recommendations section |
| `.cursor/commands/discovery-plan.md` | Updated — added Learn Recommendations section |
| `.cursor/commands/review-code.md` | Updated — added Learn Recommendations section |
| `.cursor/commands/review-pr.md` | Updated — added Learn Recommendations section |

---

## Next Steps

- [x] Create core resource file
- [x] Integrate into all command files (Claude + Cursor)
- [x] Update core index with COR-LR-* codes
- [ ] Commit changes
