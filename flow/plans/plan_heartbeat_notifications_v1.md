# Plan: Heartbeat Notification System

**Feature**: heartbeat_notifications
**Version**: 1
**Date**: 2026-03-17
**Based on Discovery**: `flow/discovery/discovery_heartbeat_notifications_v1.md`
**Total Phases**: 6
**Total Complexity**: 30/60

---

## Phase 1: Core Types and Event/Log Writers

**Complexity**: 4/10
**Scope**: Add notification types to types.ts. Create event-writer.ts (JSONL append) and log-writer.ts (flow/log.md append).

### Tasks

- [x] Add `NotificationEvent`, `NotificationLevel`, `NotificationType`, and `HeartbeatState` types to `src/cli/types.ts`
- [x] Create `src/cli/daemon/event-writer.ts` — async append of JSON events to `flow/.heartbeat-events.jsonl` with atomic write
- [x] Create `src/cli/daemon/log-writer.ts` — async append of formatted one-liners to `flow/log.md` with auto-create if missing
- [x] Add `.heartbeat-events.jsonl` and `.heartbeat-state.json` to `.gitignore`

### Files

| File | Action |
|------|--------|
| `src/cli/types.ts` | Modify — add notification types |
| `src/cli/daemon/event-writer.ts` | Create |
| `src/cli/daemon/log-writer.ts` | Create |
| `.gitignore` | Modify |

---

## Phase 2: Desktop Notifier and Notification Router

**Complexity**: 5/10
**Scope**: Install node-notifier. Create desktop-notifier.ts wrapper with graceful fallback. Create notification-router.ts that dispatches events to log + desktop based on severity.

### Tasks

- [x] Add `node-notifier` as production dependency in `package.json` and install
- [x] Add `@types/node-notifier` as dev dependency
- [x] Create `src/cli/daemon/desktop-notifier.ts` — node-notifier wrapper, title "Plan-Flow Heartbeat", fire-and-forget, catch errors gracefully (log failure, don't crash)
- [x] Create `src/cli/daemon/notification-router.ts` — severity-based dispatcher: all events → log-writer + event-writer; error/blocked events → also desktop-notifier
- [x] Export a single `notify(event: NotificationEvent)` function from the router

### Files

| File | Action |
|------|--------|
| `package.json` | Modify — add node-notifier |
| `src/cli/daemon/desktop-notifier.ts` | Create |
| `src/cli/daemon/notification-router.ts` | Create |

---

## Phase 3: Daemon Integration

**Complexity**: 6/10
**Scope**: Wire notification hooks into heartbeat-daemon.ts. Emit events on task start, complete, fail, and blocked. Add exit code 2 detection for "needs input". Read autopilot config from .flowconfig.

### Tasks

- [x] Import notification router into `src/cli/daemon/heartbeat-daemon.ts`
- [x] Emit `task_started` event when spawning a task
- [x] Emit `task_complete` event on exit code 0
- [x] Emit `task_failed` event on exit code 1
- [x] Add exit code 2 handling — emit `task_blocked` event, trigger prompt file creation
- [x] Read `autopilot` setting from `flow/.flowconfig` to determine blocking behavior
- [x] Capture last N lines of stdout/stderr from spawned process for prompt context
- [x] Ensure all notification calls are non-blocking (don't delay task scheduling)

### Files

| File | Action |
|------|--------|
| `src/cli/daemon/heartbeat-daemon.ts` | Modify — add notification hooks and exit code handling |

---

## Phase 4: Prompt File System

**Complexity**: 5/10
**Scope**: Create prompt-manager.ts for writing, reading, and archiving .heartbeat-prompt.md. Wire into daemon for interactive blocking when autopilot is OFF.

### Tasks

- [x] Create `src/cli/daemon/prompt-manager.ts` with functions: `writePrompt(task, context, options)`, `readPrompt()`, `archivePrompt()`, `hasPrompt()`
- [x] `writePrompt`: atomic write (write to temp file, rename) to `flow/.heartbeat-prompt.md`
- [x] `archivePrompt`: move to `flow/archive/heartbeat-prompts/prompt_{task}_{timestamp}.md`
- [x] Create `flow/archive/heartbeat-prompts/` directory if not exists
- [x] Wire into daemon: on exit code 2 + autopilot OFF → `writePrompt()` + desktop notify
- [x] Wire into daemon: on exit code 2 + autopilot ON → skip prompt, log warning, continue

### Files

| File | Action |
|------|--------|
| `src/cli/daemon/prompt-manager.ts` | Create |
| `src/cli/daemon/heartbeat-daemon.ts` | Modify — wire prompt manager |

---

## Phase 5: Session Start Integration and Documentation

**Complexity**: 4/10
**Scope**: Add two new session start behaviors to CLAUDE.md. Create .heartbeat-state.json tracking for unread event detection. Update flow directory documentation.

### Tasks

- [x] Add **Heartbeat Log** session start behavior to `CLAUDE.md`: read `flow/.heartbeat-events.jsonl`, compare against `lastReadTimestamp` in `flow/.heartbeat-state.json`, summarize unread events, update timestamp
- [x] Add **Heartbeat Prompt** session start behavior to `CLAUDE.md`: check for `flow/.heartbeat-prompt.md`, present pending question if found
- [x] Document `.heartbeat-state.json` format: `{ "lastReadTimestamp": "ISO8601", "lastSessionId": "string" }`
- [x] Update flow directory structure documentation in `CLAUDE.md` with new files (`.heartbeat-events.jsonl`, `.heartbeat-state.json`, `.heartbeat-prompt.md`)
- [x] Update `.claude/resources/core/heartbeat.md` with notification system documentation
- [x] Add `flow/archive/heartbeat-prompts/` to flow directory structure

### Files

| File | Action |
|------|--------|
| `CLAUDE.md` | Modify — session start behaviors + directory structure |
| `.claude/resources/core/heartbeat.md` | Modify — notification docs |

---

## Phase 6: Tests

**Complexity**: 6/10
**Scope**: Unit tests for all new modules. Integration test for daemon notification flow.

### Tasks

- [ ] Create `src/cli/daemon/event-writer.test.ts` — test JSONL append, file creation, atomic write
- [ ] Create `src/cli/daemon/log-writer.test.ts` — test one-liner format, file auto-creation, append behavior
- [ ] Create `src/cli/daemon/desktop-notifier.test.ts` — test notification dispatch, graceful fallback on error
- [ ] Create `src/cli/daemon/notification-router.test.ts` — test severity routing (info → log only, error → log + desktop)
- [ ] Create `src/cli/daemon/prompt-manager.test.ts` — test write, read, archive, hasPrompt, atomic write safety
- [ ] Add notification integration tests to `src/cli/daemon/heartbeat-daemon.test.ts` — test exit code handling (0, 1, 2), event emission, autopilot-driven blocking

### Files

| File | Action |
|------|--------|
| `src/cli/daemon/event-writer.test.ts` | Create |
| `src/cli/daemon/log-writer.test.ts` | Create |
| `src/cli/daemon/desktop-notifier.test.ts` | Create |
| `src/cli/daemon/notification-router.test.ts` | Create |
| `src/cli/daemon/prompt-manager.test.ts` | Create |
| `src/cli/daemon/heartbeat-daemon.test.ts` | Modify — add notification tests |

---

## Key Changes Summary

| Area | Change |
|------|--------|
| **New dependency** | `node-notifier` (production), `@types/node-notifier` (dev) |
| **New modules** | event-writer, log-writer, desktop-notifier, notification-router, prompt-manager (5 files) |
| **Modified modules** | heartbeat-daemon.ts (notification hooks + exit code handling), types.ts (new types) |
| **New runtime files** | `.heartbeat-events.jsonl`, `.heartbeat-state.json`, `.heartbeat-prompt.md` |
| **Documentation** | CLAUDE.md (session start behaviors), heartbeat.md (notification docs) |
| **New tests** | 5 new test files + expanded daemon tests |

---

## Execution Strategy

| Group | Phases | Combined Complexity | Strategy |
|-------|--------|-------------------|----------|
| 1 | Phase 1 + Phase 2 | 9/10 | Cautious — execute separately |
| 2 | Phase 3 | 6/10 | Sequential |
| 3 | Phase 4 | 5/10 | Sequential |
| 4 | Phase 5 | 4/10 | Sequential |
| 5 | Phase 6 (Tests) | 6/10 | Always separate |
