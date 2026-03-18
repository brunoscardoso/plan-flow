# Discovery: Webhook Notifications (Telegram/Discord/Slack)

**Project**: [[cli]]

## Context

Add external webhook notification delivery to the existing notification system. Currently, plan-flow dispatches `NotificationEvent`s to three channels: log-writer (flow/log.md), event-writer (.heartbeat-events.jsonl), and desktop-notifier (node-notifier). This feature adds a fourth channel — webhook sender — that delivers HTTP POST payloads to external services (Telegram, Discord, Slack) based on URL auto-detection.

Triggered by: user request for remote notification delivery beyond desktop alerts.

## Codebase Analysis

### Notification Architecture

| File | Purpose |
|------|---------|
| `src/cli/types.ts` | Defines `NotificationEvent`, `NotificationLevel`, `NotificationType` |
| `src/cli/daemon/notification-router.ts` | Central dispatcher — routes events to channels based on severity |
| `src/cli/daemon/log-writer.ts` | Appends formatted entries to `flow/log.md` |
| `src/cli/daemon/event-writer.ts` | Appends JSONL to `.heartbeat-events.jsonl` (atomic writes) |
| `src/cli/daemon/desktop-notifier.ts` | Fire-and-forget OS notifications via node-notifier |
| `src/cli/daemon/prompt-manager.ts` | Manages `.heartbeat-prompt.md` for human-in-the-loop |

### Configuration System

| File | Purpose |
|------|---------|
| `src/cli/state/types.ts` | `FlowConfig` interface (9 fields currently) |
| `src/cli/state/flowconfig-parser.ts` | Regex-based `.flowconfig` parser with legacy fallbacks |
| `.claude/commands/flow.md` | `/flow` command docs — manages settings via `key=value` |

### Key Patterns Observed

- **Fire-and-forget async**: Desktop notifier uses `void (async () => { ... })()` — never blocks, catches all errors
- **Lazy dynamic import**: Cached module import with null fallback for optional dependencies
- **Atomic file I/O**: Event writer uses write-to-temp-then-rename for crash safety
- **Severity-based routing**: Router dispatches to desktop only for `error | task_blocked | task_complete`
- **Config key addition pattern**: Add to FlowConfig interface → DEFAULT_CONFIG → parseFlowConfig extraction → tests → flow.md docs
- **No HTTP dependencies**: Project uses only `commander` and `node-notifier` at runtime; Node.js 18+ native `fetch()` available

### NotificationEvent Shape

```typescript
interface NotificationEvent {
  id: string;
  timestamp: Date;
  task: string;
  type: NotificationType; // task_started | phase_complete | task_complete | task_failed | task_blocked
  level: NotificationLevel; // info | warn | error
  phase?: string;
  message: string;
}
```

### Current FlowConfig Fields

autopilot, commit, push, pr, branch, wave_execution, phase_isolation, model_routing, max_verify_retries

## Requirements Gathered

### Functional Requirements

- [FR-1]: Add `webhook_url` setting to `.flowconfig` for one or more webhook URLs
- [FR-2]: Auto-detect platform from URL pattern:
  - Telegram: `https://api.telegram.org/bot<token>/sendMessage`
  - Discord: `https://discord.com/api/webhooks/...` or `https://discordapp.com/api/webhooks/...`
  - Slack: `https://hooks.slack.com/services/...`
  - Generic: Any other HTTPS URL — send plain JSON
- [FR-3]: Send HTTP POST requests from the notification router alongside existing channels
- [FR-4]: Payload includes: task name, status (type), message, PR link (if applicable), timestamp
- [FR-5]: Support multiple webhook URLs (comma-separated in config)
- [FR-6]: Platform-specific message formatting:
  - Telegram: Markdown-formatted text via `sendMessage` API (`parse_mode: "Markdown"`)
  - Discord: Embed objects with color-coded severity
  - Slack: Block Kit layout with sections and fields
  - Generic: Plain JSON payload
- [FR-7]: Add `/flow webhook_url=<url>` support for setting webhooks via the flow command
- [FR-8]: Routing: webhook notifications triggered by the same events as desktop notifications (`error | task_blocked | task_complete`)

### Non-Functional Requirements

- [NFR-1]: Graceful fallback — webhook failures must never crash the daemon or block task execution
- [NFR-2]: Fire-and-forget pattern — webhook sends should not block the notification router
- [NFR-3]: Reasonable timeout — HTTP requests should timeout after 5 seconds to avoid hanging
- [NFR-4]: No new runtime dependencies — use Node.js native `fetch()` (available since Node 18)
- [NFR-5]: Console error logging on failure (matching desktop-notifier pattern)

### Constraints

- [C-1]: Must follow existing fire-and-forget pattern from desktop-notifier
- [C-2]: Must not add external HTTP client dependencies (no axios, node-fetch)
- [C-3]: Must follow existing config key addition pattern (types → parser → tests → docs)
- [C-4]: Webhook URLs stored plaintext in `.flowconfig` — no secrets management
- [C-5]: Must follow ESM testing patterns (`jest.unstable_mockModule`)

## Open Questions

| # | Category | Question | Status | Answer |
|---|----------|----------|--------|--------|
| 1 | Technical | Should webhooks use same routing rules as desktop (error/blocked/complete)? | Assumed | Yes — same severity-based routing as desktop notifications |
| 2 | Technical | Should there be a master enable/disable switch separate from URL? | Assumed | No — presence of webhook_url enables webhooks; empty/absent disables |
| 3 | Functional | Should PR link be included in webhook payload? | Assumed | Yes — include if available (from FlowConfig `pr` + `branch`) |
| 4 | Functional | What about chat_id for Telegram? | Assumed | User includes chat_id as query param: `https://api.telegram.org/bot<token>/sendMessage?chat_id=<id>` |
| 5 | Technical | Retry failed webhooks? | Assumed | No — fire-and-forget with error logging, consistent with desktop-notifier |

## Technical Considerations

### Architecture

The webhook sender fits cleanly as a new module in `src/cli/daemon/webhook-sender.ts`, following the same pattern as `desktop-notifier.ts`. The notification router adds a conditional call based on webhook_url presence in config.

Key change: the `notify()` function needs access to FlowConfig (currently only takes `event` and `flowDir`). Options:
1. Parse config inside webhook-sender (reads `.flowconfig` each call) — wasteful
2. Pass config to `notify()` — cleaner, but changes the function signature
3. Pass only `webhook_url` string to `notify()` — minimal change

**Recommended**: Option 2 — pass FlowConfig to `notify()`. The heartbeat daemon already has access to config. This is a small signature change with high value (future channels may also need config).

### Dependencies

- Node.js native `fetch()` — no external packages needed
- Platform detection is URL-pattern-based — simple regex matching
- Message formatting is per-platform string/JSON construction — no template engine needed

### Patterns to Follow

- Fire-and-forget async (void IIFE with try/catch) from desktop-notifier
- Config key extraction pattern from flowconfig-parser
- ESM mock testing pattern from notification-router.test.ts

### Potential Challenges

- **Telegram API quirk**: Requires `chat_id` in addition to bot token. User must encode this in the URL or config.
- **Discord embed color**: Needs numeric color values for severity (green/yellow/red).
- **Multiple URLs**: Comma-separated parsing must handle URLs with commas in query params (unlikely but possible). Simple split on comma should suffice for webhook URLs.
- **AbortController timeout**: Native fetch timeout requires `AbortSignal.timeout(ms)` — available in Node 18.

## Proposed Approach

1. **New module**: Create `src/cli/daemon/webhook-sender.ts` with platform detection and formatters
2. **Config extension**: Add `webhook_url: string` to FlowConfig (default: `""`)
3. **Router update**: Modify `notify()` to accept FlowConfig and call webhook sender for qualifying events
4. **Platform formatters**: Implement Telegram, Discord, Slack, and Generic JSON formatters as pure functions
5. **Flow command**: Update `.claude/commands/flow.md` to document `webhook_url` setting
6. **Tests**: Unit tests for platform detection, message formatting, routing integration, and config parsing

### Alternative Approaches Considered

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| Single webhook-sender module with inline formatters | Simple, all-in-one | Slightly large file | **Recommended** |
| Separate module per platform (telegram.ts, discord.ts, slack.ts) | Clean separation | Over-engineering for ~20 lines each | Not recommended |
| Plugin/adapter pattern with registry | Extensible | Way too much abstraction for 3 platforms | Not recommended |
| Pass webhook_url directly to notify() instead of full config | Minimal signature change | Less future-proof | Not recommended |

## Risks and Unknowns

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Telegram requires chat_id not in webhook URL | Medium | Medium | Document URL format with chat_id query param |
| Webhook endpoint rate limiting | Low | Low | Fire-and-forget pattern naturally spaces requests |
| Native fetch not available (Node < 18) | Medium | Low | Project already targets Node 18+; add engines check if needed |

### Unknowns

- [x] All resolved — no blocking unknowns

## Next Steps

- [ ] Create implementation plan: `flow/plans/plan_webhook_notifications_v1.md`
