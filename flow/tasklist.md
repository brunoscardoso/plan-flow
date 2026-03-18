# Tasklist

**Project**: [[cli]]
**Created**: 2026-03-11
**Last Updated**: 2026-03-18

## In Progress

- [ ] **Execute: per-task verification** — Executing plan (6 phases, 4 waves)

## To Do

- [ ] **Deterministic state script** — Move config/state parsing (flowconfig, phase calculations, file checks) from LLM prompts to a Node.js script that returns JSON. Deterministic logic in code, not prompts.
- [ ] **Unified STATE.md for session resumability** — Single file tracking decisions, blockers, current position, and active phase. Enables `/resume-work` to rebuild full context from stored files after context resets.
- [ ] **Atomic commits per task** — Commit after each individual task within a phase (not per phase). Enables `git bisect`, independent reverts, and clearer git history. Format: `feat(phase-task): description`.

## Done

- [x] **Wave-based parallel execution** — Dependency-aware parallel phase execution in /execute-plan with wave grouping, coordinator, and file conflict detection (2026-03-18)
- [x] **Heartbeat notifications** — Notification system with multi-channel routing, desktop alerts, prompt files, session start integration (2026-03-17)

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
- [x] **Sub-agent execute-plan** — Isolated sub-agents per phase with clean context, core resource + skill + command updates (2026-03-13)
- [x] **Discovery sub-agents** — Parallel codebase exploration during /discovery-plan, core resource + skill + command updates (2026-03-13)
