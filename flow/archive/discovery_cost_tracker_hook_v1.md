# Discovery: Cost Tracker Hook

**Project**: [[cli]]

**Feature**: [[cost-tracker-hook]]
**Project**: [[plan-flow]]
**Created**: 2026-03-09
**Status**: Complete

## Context

Token spend across plan-flow sessions is invisible — there's no way to know how much a session cost, which model was used, or where tokens went. Without this data, every other token optimization (compaction, model routing, thinking budget) is guesswork. This discovery explores implementing a Claude Code Stop hook that logs token usage and estimated cost per response to a JSONL file.

Inspired by the `cost-tracker.js` pattern from [everything-claude-code](https://github.com/affaan-m/everything-claude-code/).

## Referenced Documents Analysis

### Claude Code Hooks API (Official)

**Key Findings**:
- 18 hook event types available: `SessionStart`, `Stop`, `PreToolUse`, `PostToolUse`, `PreCompact`, `SessionEnd`, etc.
- Hook handlers: `command` (shell), `http`, `prompt` (LLM), `agent` (multi-turn)
- Hooks configured in `~/.claude/settings.json` (global) or `.claude/settings.json` (project)
- **Critical limitation**: The official hooks API does NOT provide token counts or usage data in the hook input
- All hooks receive: `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`
- The `transcript_path` JSONL file contains raw conversation data including API responses

### everything-claude-code Cost Tracker

**Key Findings**:
- Uses a `Stop` hook (fires after each Claude response)
- Reads `input.usage.input_tokens` and `input.usage.output_tokens` from stdin — **but these fields are NOT in the official API**
- Falls back to zero tokens gracefully
- Reads model from `input.model` or `$CLAUDE_MODEL` env var
- Writes to `~/.claude/metrics/costs.jsonl`
- Uses per-model pricing tables for cost estimation

### Existing plan-flow Hook Infrastructure

**Key Findings**:
- `.claude/settings.json` exists with empty `"hooks": {}`
- `flow/hooks.json.example` defines plan-flow specific phase hooks (pre-phase, post-phase)
- Compiled hook utilities exist in `dist/` but source scripts (`scripts/hooks/*.cjs`) are not created yet
- The heartbeat daemon strips `CLAUDECODE` env var and uses `--dangerously-skip-permissions`

## Code Context Analysis

### Existing Hook Configuration

| File | Usage |
|------|-------|
| `.claude/settings.json` | Empty hooks config — ready for cost tracker |
| `flow/hooks.json.example` | Phase lifecycle hooks template |
| `dist/cli/utils/hooks.js` | Compiled hook utilities (references unwritten scripts) |
| `dist/cli/utils/phase-hooks.js` | Phase execution hooks (not yet integrated) |

### Settings Files

| File | Purpose |
|------|---------|
| `~/.claude/settings.json` | Global user settings (env vars, preferences) |
| `.claude/settings.json` | Project-level hook configuration |
| `.claude/settings.local.json` | Project-local (gitignored) overrides |

## Requirements Gathered

### Functional Requirements

- [FR-1]: Hook fires after every Claude response (Stop event) and logs usage data
- [FR-2]: Log format is JSONL with one entry per response: timestamp, session_id, model, input_tokens, output_tokens, estimated_cost
- [FR-3]: Token data extracted by parsing the `transcript_path` JSONL file (since hook stdin doesn't provide usage data)
- [FR-4]: Per-model pricing table for cost estimation (Haiku, Sonnet, Opus rates)
- [FR-5]: Log file location: `~/.claude/metrics/costs.jsonl` (global, not per-project)
- [FR-6]: Hook must be non-blocking — errors silently caught, never interrupts Claude
- [FR-7]: `plan-flow init` should auto-install the hook into `.claude/settings.json` for each project
- [FR-8]: A `/flow cost` command or summary that reads the JSONL and shows spend per session/day/project

### Non-Functional Requirements

- [NFR-1]: Hook execution time < 500ms (must not delay response display)
- [NFR-2]: JSONL file should be rotatable — support max file size or line count
- [NFR-3]: Hook must work with `claude -p` (print mode) used by heartbeat daemon
- [NFR-4]: No external dependencies — use only Node.js built-ins

### Constraints

- [C-1]: Official hooks API does NOT provide token counts in stdin — must parse transcript JSONL
- [C-2]: Transcript JSONL format is not officially documented — may change between Claude Code versions
- [C-3]: Hook must be CommonJS (`.cjs`) since Claude Code spawns hooks as shell commands
- [C-4]: `async: true` hooks run in background — use this to avoid blocking the response

## Open Questions

| # | Category | Question | Status | Answer |
|---|----------|----------|--------|--------|
| 1 | Technical | Does transcript JSONL contain token usage per message? | Assumed | Yes — API responses include `usage` field with `input_tokens` and `output_tokens` |
| 2 | Technical | What format is the transcript JSONL? | Assumed | One JSON object per line — each API response includes a `usage` object |
| 3 | Functional | Should cost tracking be opt-in or default? | Assumed | Default ON — installed during `plan-flow init`, can be disabled via `/flow` |
| 4 | Functional | Global metrics file or per-project? | Answered | Global at `~/.claude/metrics/costs.jsonl` — cross-project visibility |
| 5 | Technical | Should we use Stop hook or SessionEnd? | Answered | Stop — fires per response, giving granular data. SessionEnd for summary. |

## Technical Considerations

### Architecture

The cost tracker fits into the existing Claude Code hooks system via `.claude/settings.json`. It runs as a `Stop` hook (fires after each Claude response) with `async: true` to avoid blocking.

**Data flow**:
1. Claude finishes a response → `Stop` hook fires
2. Hook receives `transcript_path` via stdin JSON
3. Hook reads the last entry in the transcript JSONL
4. Extracts `usage.input_tokens`, `usage.output_tokens`, model name
5. Calculates cost using pricing table
6. Appends JSONL entry to `~/.claude/metrics/costs.jsonl`

### Two-Hook Strategy

| Hook | Event | Purpose |
|------|-------|---------|
| `cost-tracker.cjs` | `Stop` (async) | Per-response token logging — granular data |
| `session-summary.cjs` | `SessionEnd` | End-of-session summary — total tokens, total cost, duration |

### Pricing Table (per 1M tokens, as of 2026)

| Model | Input | Output |
|-------|-------|--------|
| claude-haiku-4-5 | $0.80 | $4.00 |
| claude-sonnet-4-6 | $3.00 | $15.00 |
| claude-opus-4-6 | $15.00 | $75.00 |

### Dependencies

- Node.js built-ins only (`fs`, `path`, `os`)
- Reads transcript JSONL (path provided by Claude Code)
- Writes to `~/.claude/metrics/` directory

### Integration with plan-flow init

During `plan-flow init --claude`, the hook scripts are copied to the target project's `.claude/hooks/` directory and registered in `.claude/settings.json`.

### Patterns to Apply

- Non-blocking async hook execution
- Graceful error handling (never crash, never block Claude)
- JSONL for append-only structured logging
- CommonJS format (`.cjs`) for Claude Code hook compatibility

### Challenges Identified

- **Transcript format is undocumented** — need to inspect actual transcript files to determine exact structure
- **Token counts may not be in transcript** — if API responses don't include `usage`, we'll need an alternative approach (e.g., estimate based on text length)
- **Model detection** — need reliable way to identify which model generated each response

## Proposed Approach

Based on the requirements, the recommended approach is:

1. **Create `scripts/hooks/cost-tracker.cjs`** — A Stop hook that reads transcript JSONL, extracts token usage from the last API response, and appends to the global metrics file
2. **Create `scripts/hooks/session-summary.cjs`** — A SessionEnd hook that aggregates all entries for the current session and logs a summary line
3. **Update `plan-flow init`** — Copy hook scripts to `.claude/hooks/` and register them in `.claude/settings.json`
4. **Add `/flow cost` reporting** — Read the JSONL and display spend summaries

### Alternative Approaches Considered

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| Stop hook + transcript parsing | Per-response granularity, real data | Transcript format undocumented | **Yes — primary approach** |
| SessionEnd only | Simpler, one hook | Only session totals, no per-response data | Supplement only |
| Estimate tokens from text length | No dependency on transcript format | Inaccurate, no model info | Fallback only |
| External API call to Anthropic usage endpoint | Accurate billing data | Requires API key, network call, latency | Future enhancement |

## Risks and Unknowns

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Transcript JSONL format changes between Claude Code versions | Hook breaks silently | Medium | Graceful fallback — log zero tokens if parsing fails |
| Token data not in transcript | No cost data | Low | Fallback to text-length estimation |
| Hook slows down response display | Bad UX | Low | Use `async: true` for background execution |
| JSONL file grows unbounded | Disk usage | Medium | Add rotation — keep last N days or max file size |

### Unknowns (Require Further Investigation)

- [ ] Inspect actual transcript JSONL to confirm token usage fields exist
- [ ] Determine if `claude -p` (heartbeat mode) generates transcript files
- [ ] Check if Claude Code provides model name in hook input or env vars

## Next Steps

1. `/create-plan` to design implementation phases
2. Inspect a real transcript JSONL file to confirm data availability
3. Implement cost-tracker.cjs and session-summary.cjs
4. Integrate into `plan-flow init` installation flow
5. Add `/flow cost` reporting command
