# Discovery: Suggest Compact Hook

**Project**: [[cli]]

**Feature**: [[suggest-compact-hook]]
**Project**: [[plan-flow]]
**Created**: 2026-03-10
**Status**: Complete

## Context

Claude Code has a 200,000-token context window. Auto-compaction triggers at ~83.5% usage (~167K tokens), summarizing older conversation to free space. When auto-compaction fires, **details are lost** — progress tracking, in-flight decisions, file contents loaded early in the session.

Best practice is to compact proactively at **70-75%** usage, giving buffer for complex final operations and letting the user control what gets preserved via `/compact <instructions>`. Currently, there's no mechanism to warn the user before auto-compaction hits.

This feature adds two hooks:
1. **Suggest Compact** (Stop hook) — monitors context usage and warns the user
2. **Pre-Compact State Saver** (PreCompact hook) — auto-saves session state before compaction

## User Request

> A Stop hook that monitors context window usage (input_tokens from the last assistant message) and tool call count, then suggests /compact when thresholds are hit. Should pair with a PreCompact hook that auto-saves session state before compaction.

## Requirements

### Functional Requirements

- [FR-1]: Stop hook reads `message.usage.input_tokens` from the last assistant entry in the transcript to determine current context window usage
- [FR-2]: Display a **yellow warning** when context reaches 70% (140K tokens) — "consider running /compact soon"
- [FR-3]: Display a **red warning** when context reaches 80% (160K tokens) — "run /compact NOW before auto-compaction"
- [FR-4]: Track tool call count from transcript and suggest `/compact` every ~50 tool calls as a secondary signal (even if context isn't at threshold)
- [FR-5]: Avoid spamming — suppress repeated warnings unless context has grown by at least 10K tokens since last warning. Always show critical (80%+) warnings.
- [FR-6]: Persist per-session state (last warning token count, tool call count at last warning) to avoid duplicate warnings across hook invocations
- [FR-7]: PreCompact hook fires before compaction (auto or manual) and saves: current plan progress, active tasklist items, key decisions made, and files being edited
- [FR-8]: PreCompact state is saved to `~/.claude/metrics/precompact-{session_id}.md` so it can be referenced after compaction

### Non-Functional Requirements

- [NFR-1]: Suggest Compact hook must be **synchronous** (no `async` flag) so the warning displays immediately after the response
- [NFR-2]: Hook execution < 200ms — must not noticeably delay response display
- [NFR-3]: No external dependencies — Node.js built-ins only (consistent with existing hooks)
- [NFR-4]: Graceful fallback — if transcript is unreadable or usage data is missing, exit silently
- [NFR-5]: PreCompact hook must complete quickly — it's blocking compaction

### Constraints

- [C-1]: Hook scripts must be CommonJS (`.cjs`) — consistent with existing hooks
- [C-2]: Stop hook receives `transcript_path`, `session_id`, `cwd` via stdin JSON
- [C-3]: PreCompact hook receives `transcript_path`, `session_id`, `trigger` ("auto" or "manual"), `custom_instructions` via stdin JSON
- [C-4]: Output via `process.stderr.write()` for display — stdout is reserved for JSON control responses
- [C-5]: Must integrate with existing `installCostHooks()` in `src/cli/handlers/claude.ts` for auto-installation during `plan-flow init`
- [C-6]: Existing hooks (`cost-tracker.cjs`, `cost-display.cjs`, `session-summary.cjs`) must not be affected

## Existing Infrastructure

### Reusable Patterns from Current Hooks

| Pattern | Source | Reuse |
|---------|--------|-------|
| Read stdin JSON | `cost-display.cjs:115-121` | Same pattern for both new hooks |
| Find last assistant entry | `cost-display.cjs:97-113` | Reuse for reading `message.usage.input_tokens` |
| stderr display with ANSI colors | `cost-display.cjs:145-162` | Same pattern for warnings |
| Format tokens (K/M) | `cost-display.cjs:58-62` | Reuse for display |
| Hook registration in settings.json | `claude.ts:283-336` | Extend `installCostHooks()` |
| `hasHookCommand()` idempotency check | `claude.ts:341-348` | Reuse for new hooks |

### Hook Registration Points

The `installCostHooks()` function in `claude.ts` already:
1. Copies scripts from `scripts/hooks/` to `.claude/hooks/`
2. Registers them in `.claude/settings.json`
3. Handles idempotent re-registration

Adding new hooks means:
- Adding filenames to `hookScripts` array (line 255)
- Adding registration blocks for the new Stop and PreCompact events

### Transcript JSONL Structure

Each assistant entry contains:
```json
{
  "type": "assistant",
  "message": {
    "model": "claude-opus-4-6",
    "usage": {
      "input_tokens": 145000,
      "output_tokens": 3200,
      "cache_creation_input_tokens": 9821,
      "cache_read_input_tokens": 45000
    },
    "content": [...]
  }
}
```

Tool calls appear as `content` blocks with `"type": "tool_use"` inside assistant messages.

## Technical Considerations

### Context Window Math

| Metric | Value |
|--------|-------|
| Total window | 200,000 tokens |
| Auto-compact buffer | ~33,000 tokens (16.5%) |
| Auto-compact trigger | ~167,000 tokens (83.5%) |
| **Warn threshold** | **140,000 tokens (70%)** |
| **Critical threshold** | **160,000 tokens (80%)** |
| Tool call interval | Every 50 tool calls |

### State Persistence

The suggest-compact hook needs to remember when it last warned to avoid spamming. Options:
- **File-based** (`~/.claude/metrics/compact-state.json`): Simple, persists across hook invocations within a session. Keyed by `session_id`.
- One file for all sessions, overwritten per session (only current session matters)

### PreCompact State Capture

The PreCompact hook should capture enough context for the LLM to resume after compaction:
- Active plan file path and current phase (if in `/execute-plan`)
- Active tasklist items from `flow/tasklist.md`
- List of files modified in this session (from transcript tool_use entries)
- Key decisions or notes from the conversation

This is written to a markdown file that the LLM can reference in the compacted context.

### Display UX

Warning messages should be visually distinct from the cost-display line:
- **Yellow (70%)**: `⚠ Context 72% full (144K/200K) — consider /compact soon`
- **Red (80%)**: `⚠ Context 83% full (166K/200K) — /compact NOW before auto-compaction`
- **Tool calls (dim)**: `⟐ 52 tool calls — /compact if conversation feels slow`

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `input_tokens` doesn't reflect true context usage | Warnings are inaccurate | `input_tokens` is the best proxy available; includes all context sent to the API |
| Hook slows down response display | User annoyance | Keep execution < 200ms; avoid full transcript scan when possible (read from end) |
| PreCompact state capture is too slow | Delays compaction | Limit capture scope; skip if transcript > 5MB |
| Warning spam annoys users | Ignore warnings | Suppress duplicates; require 10K token growth between warnings |
| State file corruption | Missed warnings | Wrap all state I/O in try/catch; recreate on error |

## High-Level Approach

1. **`scripts/hooks/suggest-compact.cjs`** — Synchronous Stop hook:
   - Read transcript from end, find last assistant `message.usage.input_tokens`
   - Compare against 70%/80% thresholds
   - Count tool_use blocks for secondary signal
   - Load/save state to `~/.claude/metrics/compact-state.json`
   - Display colored warnings via stderr

2. **`scripts/hooks/pre-compact-save.cjs`** — PreCompact hook:
   - Read transcript to extract: active files, recent decisions
   - Read `flow/tasklist.md` for active items
   - Write state summary to `~/.claude/metrics/precompact-{session_id}.md`
   - Matcher: both "auto" and "manual" triggers

3. **Init integration** — Extend `installCostHooks()`:
   - Add both scripts to `hookScripts` array
   - Register Stop hook (synchronous) for suggest-compact
   - Register PreCompact hook for pre-compact-save
   - Rename function to `installHooks()` since it's no longer just cost hooks

4. **Tests** — Unit tests for both hooks and updated init integration tests

## Out of Scope

- Budget enforcement (blocking responses when over budget) — future
- Automatic compaction (triggering `/compact` programmatically) — not possible via hooks
- Custom compaction instructions (telling `/compact` what to preserve) — future enhancement
