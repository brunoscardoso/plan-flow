# Tasklist

**Project**: [[cli]]
**Created**: 2026-03-11
**Last Updated**: 2026-03-13

## In Progress

(none)

## To Do

- [ ] **Sub-agent execute-plan** — Run each plan phase in isolated sub-agent with clean context, return 1-2K token summary (Priority 4, High effort)
- [ ] **Discovery sub-agents** — Parallel codebase exploration during /discovery-plan with condensed findings (Priority 5, Medium effort)

## Done

- [x] **Model routing with complexity scores** — Auto-select model per phase in `/execute-plan` (2026-03-11)
- [x] **Brainstorm interactive questions** — Batched `AskUserQuestion` with options + commentary (2026-03-11)
- [x] **UI design awareness** — Design context capture in discovery + auto-injection in execute-plan (2026-03-11)
- [x] **Review: Verification pass** — Second-pass verification filters false positives in review-code and review-pr (2026-03-12)
- [x] **Review: Adaptive depth by PR size** — Scale review depth based on changeset size: lightweight (<50 lines), standard (50-500), deep (500+) (2026-03-12)
- [x] **Review: Severity re-ranking** — Re-rank findings by impact, group related findings, executive summary for 5+ findings (2026-03-12)
- [x] **Review: Multi-agent parallel review** — 4 specialized subagents (security, logic, performance, patterns) for Deep mode 500+ line reviews (2026-03-12)
- [x] **Smart compaction prompt** — Core resource file + hook update to guide compaction on what to preserve vs discard (2026-03-13)
- [x] **Micro-section skill loading** — Step-level reference codes for top 4 skills in _index.md + command file updates (2026-03-13)
- [x] **Session scratchpad** — Ephemeral per-session notes with promotion to ledger/brain, core resource + CLAUDE.md updates (2026-03-13)
