# Plan: Suggest Compact Hook

**Feature**: [[suggest-compact-hook]]
**Project**: [[plan-flow]]
**Created**: 2026-03-10
**Based on Discovery**: `flow/discovery/discovery_suggest_compact_hook_v1.md`

## Goals

- Warn users before auto-compaction fires so they can compact proactively with custom instructions
- Track context window usage via `input_tokens` from the transcript and display threshold-based warnings
- Auto-save session state before compaction so nothing is lost
- Auto-install both hooks during `plan-flow init`

## Non-Goals

- Budget enforcement or blocking responses
- Triggering `/compact` programmatically (not possible via hooks)
- Custom compaction instructions (future enhancement)

## Requirements Summary

### Functional Requirements

- [FR-1]: Stop hook reads `input_tokens` from last assistant entry — yellow at 70%, red at 80%
- [FR-2]: Secondary signal: suggest `/compact` every ~50 tool calls
- [FR-3]: Suppress duplicate warnings (require 10K token growth); always show critical
- [FR-4]: PreCompact hook saves session state to `~/.claude/metrics/precompact-{session_id}.md`
- [FR-5]: Auto-install both hooks during `plan-flow init`

### Constraints

- [C-1]: CommonJS `.cjs`, Node.js built-ins only
- [C-2]: Suggest Compact must be synchronous (no `async` flag) for immediate display
- [C-3]: Extend existing `installCostHooks()` in `claude.ts`

## Phases

### Phase 1: Suggest Compact Stop Hook

**Scope**: Create the core Stop hook that monitors context usage and displays warnings
**Complexity**: 4/10

- [ ] Create `scripts/hooks/suggest-compact.cjs` — synchronous Stop hook that:
  - Reads stdin JSON for `transcript_path`, `session_id`, `cwd`
  - Reads transcript from end, finds last `type: "assistant"` entry with `message.usage`
  - Extracts `input_tokens` and calculates ratio against 200K window
  - At 70% (140K): yellow warning via stderr — `⚠ Context 72% full (144K/200K) — consider /compact soon`
  - At 80% (160K): red warning via stderr — `⚠ Context 83% full (166K/200K) — /compact NOW before auto-compaction`
  - Counts `tool_use` content blocks across all assistant messages for tool call signal
  - Every 50 tool calls (if below 70% threshold): dim suggestion — `⟐ 52 tool calls — /compact if conversation feels slow`
- [ ] Make script executable (`chmod +x`)
- [ ] Implement state persistence to `~/.claude/metrics/compact-state.json`:
  - Keyed by `session_id`
  - Stores `last_suggested_at` (token count when last warned) and `tool_calls_at_last_suggest`
  - Suppress warnings unless context grew by 10K+ tokens since last warning
  - Always show critical (80%+) warnings regardless of suppression
- [ ] Wrap all logic in try/catch, always exit 0

**Build Verification**: Manual test with mock transcript data

### Phase 2: Pre-Compact State Saver

**Scope**: Create PreCompact hook that saves session context before compaction
**Complexity**: 5/10

- [ ] Create `scripts/hooks/pre-compact-save.cjs` — PreCompact hook that:
  - Reads stdin JSON for `transcript_path`, `session_id`, `trigger` ("auto"/"manual"), `custom_instructions`
  - Reads `flow/tasklist.md` from `cwd` if it exists — extracts "In Progress" items
  - Scans transcript for recently modified files (from `tool_use` entries with `Write`/`Edit` tool names)
  - Scans transcript for the active plan file reference (if in `/execute-plan`)
  - Writes state summary to `~/.claude/metrics/precompact-{session_id}.md` with:
    - Trigger type (auto/manual)
    - Timestamp
    - Active tasklist items
    - Files modified this session
    - Active plan reference (if any)
    - Custom instructions passed to `/compact` (if manual)
- [ ] Make script executable
- [ ] Limit transcript scan to last 500 lines for performance (skip full scan on large transcripts)
- [ ] Wrap all logic in try/catch, always exit 0

**Build Verification**: Manual test with mock transcript and tasklist

### Phase 3: Init Integration

**Scope**: Register both hooks in `plan-flow init` and rename the install function
**Complexity**: 3/10

- [ ] Update `src/cli/handlers/claude.ts`:
  - Add `suggest-compact.cjs` and `pre-compact-save.cjs` to `hookScripts` array
  - Register Stop hook for suggest-compact (synchronous — no `async` flag)
  - Register PreCompact hook for pre-compact-save (both "auto" and "manual" matchers)
  - Rename `installCostHooks()` to `installHooks()` since it now handles more than cost tracking
  - Update the call site in `initClaude()` to use new function name
  - Update log messages to say "hooks" instead of "cost tracking hooks"
- [ ] Copy hooks to `.claude/hooks/` in this project for immediate use

**Build Verification**: `npm run build`

### Phase 4: Tests

**Scope**: Unit tests for both hooks and updated init integration
**Complexity**: 4/10

- [ ] Unit tests for `suggest-compact.cjs`:
  - Warns at 70% context usage (yellow)
  - Warns at 80% context usage (red)
  - No warning below 70%
  - Suppresses duplicate warnings within 10K token window
  - Always shows critical warnings regardless of suppression
  - Tool call count signal at 50 call intervals
  - Handles missing/malformed transcript gracefully
- [ ] Unit tests for `pre-compact-save.cjs`:
  - Saves state file with correct structure
  - Extracts tasklist items from `flow/tasklist.md`
  - Extracts modified files from transcript tool_use entries
  - Handles missing tasklist gracefully
  - Handles missing transcript gracefully
- [ ] Update init integration tests in `claude.test.ts`:
  - Verify suggest-compact.cjs copied to `.claude/hooks/`
  - Verify pre-compact-save.cjs copied to `.claude/hooks/`
  - Verify Stop hook registered (synchronous)
  - Verify PreCompact hook registered
  - Update hook count assertions for existing tests

**Build Verification**: `npm run build && npm run test`

## Key Changes

1. **New hook script**: `scripts/hooks/suggest-compact.cjs` — context usage warnings
2. **New hook script**: `scripts/hooks/pre-compact-save.cjs` — pre-compaction state preservation
3. **Init handler update**: Rename `installCostHooks()` → `installHooks()`, register new hooks
4. **New state file**: `~/.claude/metrics/compact-state.json` for warning suppression
5. **New state file**: `~/.claude/metrics/precompact-{session_id}.md` for pre-compact snapshots

## Complexity Summary

| Phase | Name | Complexity |
|-------|------|------------|
| 1 | Suggest Compact Stop Hook | 4/10 |
| 2 | Pre-Compact State Saver | 5/10 |
| 3 | Init Integration | 3/10 |
| 4 | Tests | 4/10 |
| **Total** | **4 phases** | **Avg: 4.0/10** |
