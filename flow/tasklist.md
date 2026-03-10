# Tasklist

**Project**: [[plan-flow]]
**Created**: 2026-03-06
**Last Updated**: 2026-03-09

## In Progress

## Backlog

### High Impact — Token Cost Control

- [ ] **Suggest Compact Hook** — Hook that monitors tool call count and suggests `/compact` every ~50 invocations to prevent context bloat
- [ ] **Pre-Compact Hook** — Auto-saves important session state (progress, decisions, remaining work) before compaction so nothing is lost
- [ ] **Token Budget Config** — Add `thinking_tokens` setting to `/flow` config (`.flowconfig`) to control `MAX_THINKING_TOKENS` (default 10,000 vs 31,999)
- [ ] **Model Routing Rules** — Add `model` setting to `/flow` config with guidance rules: Haiku for exploration agents, Sonnet for coding, Opus for architecture/security only

### Medium Impact — Context Optimization

- [ ] **Subagent Model Routing** — Configure exploration/research subagents to run on Haiku instead of inheriting the parent model
- [ ] **Strategic Compaction Guide** — Resource file documenting when to compact (phase boundaries) vs when not to (mid-implementation)
- [ ] **Replace MCPs with Skills** — Wrap common MCP tools (GitHub, Supabase) as plan-flow skills to free context window space

### Lower Priority — Advanced

- [ ] **Content-Hash File Cache** — Cache file processing results using SHA-256 hashes to avoid re-reading unchanged files across sessions
- [ ] **Iterative Retrieval for Subagents** — Dispatch → Evaluate → Refine pattern for subagent context gathering to reduce wasted tokens

## To Do

- [ ] Review code for cost_tracker_hook

## Done

- [x] Execute: cost_tracker_hook — completed 2026-03-09
- [x] Plan: cost_tracker_hook — completed 2026-03-09
- [x] Discovery: cost_tracker_hook — completed 2026-03-09

- [x] Full vault sync for memory, heartbeat, ledger, and tasklist — completed 2026-03-09
- [x] Heartbeat daemon env fix (CLAUDECODE var + permissions) — completed 2026-03-09
- [x] Git control for execution plan — auto-commit per phase, optional push — completed 2026-03-07
