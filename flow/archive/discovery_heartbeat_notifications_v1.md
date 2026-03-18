# Discovery: Heartbeat Notification System

**Feature**: heartbeat_notifications
**Version**: 1
**Date**: 2026-03-17
**Status**: Ready for planning
**Based on Brainstorm**: `flow/brainstorms/brainstorm_heartbeat-notifications_v1.md`

---

## Problem Statement

The heartbeat daemon runs scheduled tasks in the background (possibly while the user is away or in another terminal), providing zero visibility into what's happening, whether tasks succeeded, or if they need attention. Users must manually run `npx planflow-ai heartbeat status` or inspect `flow/.heartbeat.log` to check on background work.

---

## Codebase Analysis

### Existing Daemon Architecture

- **Entry point**: `src/cli/daemon/heartbeat-daemon.ts` (315 lines)
- **Parser**: `src/cli/daemon/heartbeat-parser.ts` (195 lines)
- **CLI command**: `src/cli/commands/heartbeat.ts` (196 lines)
- **Types**: `src/cli/types.ts` — `HeartbeatTask`, `ScheduleConfig`, `HeartbeatOptions`
- **Process model**: Detached Node.js process, PID file at `flow/.heartbeat.pid`, 5-min keepalive refresh
- **Task execution**: Spawns `claude` CLI with `--dangerously-skip-permissions`, sequential (mutex), exit code check
- **Current logging**: Internal `flow/.heartbeat.log` (ISO timestamps, 100KB rotation, last 500 lines)
- **IPC**: None — fire-and-forget spawns, no inter-process communication
- **Dependencies**: Only `commander` (production), all daemon code uses Node.js built-ins

### Session Start Behaviors (existing)

Files loaded silently on session start (defined in CLAUDE.md):
- `flow/ledger.md`, `flow/brain/index.md`, `flow/tasklist.md`, `flow/memory.md`, `flow/.scratchpad.md`
- Autopilot check: `flow/.flowconfig` / `flow/.autopilot`

### Test Coverage

- `heartbeat-daemon.test.ts`: 8 tests (scheduling logic)
- `heartbeat-parser.test.ts`: 24 tests (schedule parsing)
- `heartbeat.test.ts`: 6 tests (PID/status management)
- Total: 38 tests, no notification/event tests

### Related Files

| File | Relevance |
|------|-----------|
| `src/cli/daemon/heartbeat-daemon.ts` | Main daemon — needs notification hooks |
| `src/cli/daemon/heartbeat-parser.ts` | Task parsing — no changes needed |
| `src/cli/commands/heartbeat.ts` | CLI — may need status enhancements |
| `src/cli/types.ts` | Types — needs new notification types |
| `src/cli/utils/logger.ts` | Console logger — no changes needed |
| `flow/log.md` | User-facing log — needs auto-appending |
| `flow/.flowconfig` | Autopilot config — read for blocking behavior |
| `CLAUDE.md` | Session start behaviors — needs new entries |

---

## Functional Requirements

### FR-1: Notification Router

Severity-based channel dispatcher that routes events to appropriate channels:

| Event | flow/log.md | Desktop (node-notifier) |
|-------|-------------|------------------------|
| Task started | Yes (`✅`) | No |
| Phase complete | Yes (`✅`) | No |
| Task complete | Yes (`✅`) | No |
| Failure/error | Yes (`❌`) | Yes |
| Blocked/waiting | Yes (`⏸️`) | Yes |

### FR-2: Log Writer

Append timestamped one-liners to `flow/log.md`:
- Format: `[YYYY-MM-DD HH:MM] {emoji} {task-name}: {message}`
- Keep existing `flow/.heartbeat.log` as internal daemon debug log (separate concern)
- Log writer is append-only, does not manage rotation (log.md is human-curated)

### FR-3: Desktop Notifier

Cross-platform desktop notifications via `node-notifier` (production dependency):
- Triggered only for failures (`❌`) and blocked/waiting (`⏸️`)
- Notification content: task name + short message
- Title: "Plan-Flow Heartbeat"
- No action buttons required (informational only)

### FR-4: Event File System

File-based event stream for IPC between daemon and sessions:
- Daemon writes events to `flow/.heartbeat-events.jsonl` (append-only, one JSON object per line)
- Each event: `{timestamp, task, type, phase, message, level}`
- Session start hook reads this file for unread events
- Separate from log.md (machine-readable vs human-readable)

### FR-5: Prompt File System (Interactive Blocking)

When autopilot is OFF and a task needs user input:
- Daemon detects via **exit code convention** (exit code 2 = needs input)
- Daemon writes `flow/.heartbeat-prompt.md` with question context from last stdout/stderr
- Desktop notification alerts user
- Task pauses until user responds
- On resolution: archive prompt to `flow/archive/heartbeat-prompts/` with timestamp, then resume task

### FR-6: Session Start Integration

Two new session start behaviors added to CLAUDE.md:

1. **Heartbeat log summary**: Read `flow/.heartbeat-events.jsonl`, compare against `lastReadTimestamp` in `flow/.heartbeat-state.json`, summarize unread events
2. **Prompt detection**: Check for `flow/.heartbeat-prompt.md`. If present, display the pending question immediately for user to respond

### FR-7: Autopilot-Driven Blocking

- `autopilot: true` in `.flowconfig` → fully autonomous, skip decisions with best-guess defaults
- `autopilot: false` → interactive mode, pause on decisions, write prompt file + desktop notify
- No per-task mode field — single config controls both sessions and background tasks

---

## Non-Functional Requirements

### NFR-1: Performance

- Log appending and event file writing must be non-blocking (async I/O)
- Desktop notifications must not block daemon execution (fire-and-forget)
- Event file should not grow unbounded — rotate or truncate periodically

### NFR-2: Reliability

- If node-notifier fails (e.g., no display server), log the failure but don't crash the daemon
- If flow/log.md doesn't exist, create it with a header
- If .heartbeat-state.json is corrupted, treat all events as unread

### NFR-3: Cross-Platform

- Desktop notifications via node-notifier: Linux (notify-send), macOS (osascript), Windows (toast)
- File paths use Node.js path module for OS compatibility

---

## Technical Considerations

### New Types Needed

```
NotificationEvent: { id, timestamp, task, type, level, phase?, message }
NotificationLevel: 'info' | 'warn' | 'error'
NotificationType: 'task_started' | 'phase_complete' | 'task_complete' | 'task_failed' | 'task_blocked'
HeartbeatState: { lastReadTimestamp, lastSessionId }
```

### Exit Code Convention

| Exit Code | Meaning | Daemon Action |
|-----------|---------|---------------|
| 0 | Success | Log ✅, continue |
| 1 | Failure | Log ❌, desktop notify |
| 2 | Needs input | Log ⏸️, write prompt file, desktop notify, pause |

### File Inventory (new files)

| File | Purpose |
|------|---------|
| `flow/.heartbeat-events.jsonl` | Machine-readable event stream |
| `flow/.heartbeat-state.json` | Session read position tracking |
| `flow/.heartbeat-prompt.md` | Pending user input (temporary) |
| `flow/archive/heartbeat-prompts/` | Archived resolved prompts |

### Integration Points

1. **heartbeat-daemon.ts**: Add notification calls after task spawn completion
2. **types.ts**: Add NotificationEvent, HeartbeatState types
3. **New file: notification-router.ts**: Severity-based dispatcher
4. **New file: log-writer.ts**: Append to flow/log.md
5. **New file: desktop-notifier.ts**: node-notifier wrapper
6. **New file: event-writer.ts**: Append to .heartbeat-events.jsonl
7. **New file: prompt-manager.ts**: Write/read/archive .heartbeat-prompt.md
8. **CLAUDE.md**: Add session start behaviors for log summary + prompt detection
9. **package.json**: Add node-notifier dependency

---

## Constraints

- Must not break existing daemon behavior — additive changes only
- Must not add IPC complexity — file-based communication only
- Must work with the existing detached process model (no parent-child pipes)
- node-notifier is the only new production dependency
- Internal `.heartbeat.log` remains unchanged (backward compatible)

---

## Risks and Unknowns

| Risk | Impact | Mitigation |
|------|--------|------------|
| node-notifier fails on headless servers | No desktop notifications | Graceful fallback — log the failure, don't crash |
| .heartbeat-events.jsonl grows unbounded | Disk space | Rotate after N entries or N days |
| Exit code 2 convention conflicts with Claude CLI | Wrong pause detection | Verify Claude's exit code semantics first |
| Prompt file race condition (daemon writes while session reads) | Corrupted prompt | Use atomic write (write to temp, rename) |
| Log.md gets large over months | Slow session start | Only read last N lines or use state timestamp to skip |

---

## High-Level Approach

### Phase 1: Core Types and Event Infrastructure
Add notification types to types.ts. Create the event writer (JSONL) and log writer (flow/log.md) modules.

### Phase 2: Notification Router
Create the severity-based dispatcher that routes events to log + desktop based on level. Integrate node-notifier.

### Phase 3: Daemon Integration
Wire notification hooks into heartbeat-daemon.ts — emit events on task start, phase complete, task complete, failure, and blocked states. Add exit code 2 detection.

### Phase 4: Prompt File System
Create prompt-manager.ts for writing, reading, and archiving .heartbeat-prompt.md. Wire into daemon for interactive blocking (autopilot OFF).

### Phase 5: Session Start Integration
Add two new session start behaviors to CLAUDE.md and create the .heartbeat-state.json tracking. Summarize unread events and detect pending prompts.

### Phase 6: Tests
Unit tests for notification router, log writer, desktop notifier, event writer, prompt manager. Integration tests for daemon notification flow.

---

## Suggested Learning

No new technologies detected — node-notifier is a standard npm package and all other patterns (JSONL, file-based events, exit codes) are standard Node.js patterns already familiar to this project.
