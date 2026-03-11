# Tasklist

**Project**: [[cli]]
**Created**: 2026-03-11
**Last Updated**: 2026-03-11

## In Progress

- [ ] **Execute: brainstorm interactive questions** — `flow/plans/plan_brainstorm_interactive_questions_v1.md`

## To Do
- [ ] **UI design awareness** — Integrate interface-design plugin into discovery/execution for UI features. Brainstorm: `flow/brainstorms/brainstorm_ui-design-awareness_v1.md`
- [ ] **Review: Verification pass** — Add a second-pass verification step to `/review-code` and `/review-pr` that re-examines each finding against surrounding context to filter false positives. Ref: `flow/resources/review-verification-pass.md`
- [ ] **Review: Adaptive depth by PR size** — Scale review depth based on changeset size: lightweight (<50 lines), standard (50-500), deep (500+). Ref: `flow/resources/review-adaptive-depth.md`
- [ ] **Review: Severity re-ranking** — Re-rank findings by impact (critical first), group related findings across files, add executive summary for 5+ findings. Ref: `flow/resources/review-severity-ranking.md`
- [ ] **Review: Multi-agent parallel review** — For large PRs (500+ lines), spawn specialized subagents (security, logic, performance, patterns) in parallel, then merge/deduplicate/verify. Depends on adaptive depth + verification pass. Ref: `flow/resources/review-multi-agent.md`

## Done

- [x] **Model routing with complexity scores** — Auto-select model per phase in `/execute-plan` (2026-03-11)
