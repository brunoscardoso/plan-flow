# Tasklist

**Project**: [[cli]]
**Created**: 2026-03-11
**Last Updated**: 2026-03-18



## In Progress


## To Do

## Done

- [x] **Telegram typing indicator** — sendChatAction keepalive loop (4s), TTL safety net (5 min), try/finally cleanup, 428 tests passing (2026-03-19)
- [x] **Test blocked-task Telegram flow** — One-shot test task with exit code 2 to verify prompt → Telegram → reply → resume flow (2026-03-19)

- [x] **Two-way Telegram conversation via adaptive polling** — Add `getUpdates` polling to the heartbeat daemon with two modes: idle (every 60s) and conversation (every 3-5s). Refactored Telegram config to separate `telegram_bot_token` and `telegram_chat_id` fields. Auto-migration from embedded URL. 417 tests passing. (2026-03-18)


- [x] **Webhook notifications (Telegram/Discord/Slack)** — Webhook URL config, platform auto-detection, per-platform formatting (Telegram markdown, Discord embeds, Slack blocks), fire-and-forget HTTP dispatch via native fetch (2026-03-18)

- [x] **Auto-PR on task completion** — Add `pr=true|false` setting to `.flowconfig` (default: false). When enabled, after `/execute-plan` completes (build+test pass), automatically create a feature branch and open a PR via `gh pr create`. (2026-03-18)

- [x] **Atomic commits per task** — Commit after each individual task within a phase (not per phase). Enables `git bisect`, independent reverts, and clearer git history. Format: `feat(phase-task): description`. (2026-03-18)
- [x] **Unified STATE.md for session resumability** — Single file tracking decisions, blockers, current position, and active phase. Enables `/resume-work` to rebuild full context from stored files after context resets. (2026-03-18)
- [x] **Deterministic state script** — Move config/state parsing (flowconfig, phase calculations, file checks) from LLM prompts to a Node.js script that returns JSON. Deterministic logic in code, not prompts. (2026-03-18)
- [x] **Per-task verification** — Per-task `<verify>` tags in plan phases with debug sub-agents for auto-diagnosis and repair (2026-03-18)
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
