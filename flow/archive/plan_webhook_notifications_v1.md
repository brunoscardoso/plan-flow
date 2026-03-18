# Plan: Webhook Notifications (Telegram/Discord/Slack)

**Project**: [[cli]]

## Overview

Add webhook notification delivery to the existing notification router. When `webhook_url` is configured in `.flowconfig`, the router sends HTTP POST requests to external services (Telegram, Discord, Slack) alongside existing channels (log, events, desktop). Platform is auto-detected from the URL pattern, and messages are formatted per-platform.

**Based on Discovery**: `flow/discovery/discovery_webhook_notifications_v1.md`

## Goals

- Deliver notification events to external webhook endpoints (Telegram, Discord, Slack, generic)
- Auto-detect platform from URL and format messages accordingly
- Support multiple webhook URLs via comma-separated config
- Follow existing fire-and-forget pattern — never block, never crash

## Non-Goals

- Retry logic or delivery guarantees (fire-and-forget only)
- Secrets management for webhook URLs
- Custom webhook payload templates
- Bidirectional communication with webhook services

## Requirements Summary

### Functional Requirements

- [FR-1]: Add `webhook_url` setting to `.flowconfig` (string, comma-separated for multiple)
- [FR-2]: Auto-detect platform from URL (Telegram, Discord, Slack, generic)
- [FR-3]: Send HTTP POST from notification router for qualifying events
- [FR-4]: Payload: task name, status, message, PR link (if applicable), timestamp
- [FR-5]: Platform-specific formatting (Telegram markdown, Discord embeds, Slack blocks)
- [FR-6]: `/flow webhook_url=<url>` support
- [FR-7]: Same routing rules as desktop (error | task_blocked | task_complete)

### Non-Functional Requirements

- [NFR-1]: Graceful fallback — webhook failures never crash daemon
- [NFR-2]: Fire-and-forget — non-blocking
- [NFR-3]: 5-second HTTP timeout via AbortSignal
- [NFR-4]: No new runtime dependencies — use native fetch()
- [NFR-5]: Console error logging on failure

### Constraints

- [C-1]: Follow fire-and-forget pattern from desktop-notifier
- [C-2]: No external HTTP dependencies
- [C-3]: ESM testing with jest.unstable_mockModule

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Telegram requires chat_id not in standard webhook URL | Medium | Document URL format with chat_id query param |
| Native fetch unavailable on Node < 18 | Low | Project already targets Node 18+ |

## Phases

### Phase 1: TypeScript Types and Config Parser

**Scope**: Add `webhook_url` field to FlowConfig interface and parser.
**Complexity**: 2/10
**Dependencies**: None

- [ ] Add `webhook_url: string` to `FlowConfig` interface in `src/cli/state/types.ts` (default: `""`)
  <verify>npx tsc --noEmit src/cli/state/types.ts</verify>
- [ ] Add `webhook_url` to `DEFAULT_CONFIG` in `src/cli/state/flowconfig-parser.ts`
  <verify>npx tsc --noEmit src/cli/state/flowconfig-parser.ts</verify>
- [ ] Add `extractString(content, 'webhook_url')` parsing in `parseFlowConfig()` in `src/cli/state/flowconfig-parser.ts`
  <verify>npx tsc --noEmit src/cli/state/flowconfig-parser.ts</verify>

**Build Verification**: Run `npm run build`

### Phase 2: Webhook Sender Module

**Scope**: Create the webhook-sender module with platform detection, message formatting, and HTTP dispatch.
**Complexity**: 6/10
**Dependencies**: None

- [ ] Create `src/cli/daemon/webhook-sender.ts` with:
  - `detectPlatform(url: string)` — returns `'telegram' | 'discord' | 'slack' | 'generic'` based on URL regex
  - `formatTelegram(event: NotificationEvent)` — returns `{ chat_id, text, parse_mode }` body for Telegram Bot API
  - `formatDiscord(event: NotificationEvent)` — returns Discord embed payload with color-coded severity (green=info, yellow=warn, red=error)
  - `formatSlack(event: NotificationEvent)` — returns Slack Block Kit payload with sections and fields
  - `formatGeneric(event: NotificationEvent)` — returns plain JSON `{ task, type, level, message, timestamp }`
  - `sendWebhookNotification(event: NotificationEvent, webhookUrls: string)` — public export, fire-and-forget, splits comma-separated URLs, detects platform per URL, formats and sends via native `fetch()` with 5s `AbortSignal.timeout()`, catches all errors
  <verify>npx tsc --noEmit src/cli/daemon/webhook-sender.ts</verify>

**Build Verification**: Run `npm run build`

### Phase 3: Notification Router Integration

**Scope**: Update the notification router to accept FlowConfig and dispatch webhook notifications.
**Complexity**: 4/10
**Dependencies**: Phase 1, Phase 2

- [ ] Update `notify()` signature in `src/cli/daemon/notification-router.ts` to accept optional `webhookUrls?: string` parameter (backward-compatible — callers without it still work)
  <verify>npx tsc --noEmit src/cli/daemon/notification-router.ts</verify>
- [ ] Add conditional webhook dispatch: if `webhookUrls` is non-empty and event qualifies (same `shouldNotifyDesktop` check), call `sendWebhookNotification(event, webhookUrls)` fire-and-forget
  <verify>npx tsc --noEmit src/cli/daemon/notification-router.ts</verify>
- [ ] Update heartbeat daemon (`src/cli/daemon/heartbeat-daemon.ts`) to pass `config.webhook_url` to `notify()` calls
  <verify>npx tsc --noEmit src/cli/daemon/heartbeat-daemon.ts</verify>

**Build Verification**: Run `npm run build`

### Phase 4: Flow Command Documentation

**Scope**: Update flow command to document webhook_url setting.
**Complexity**: 1/10
**Dependencies**: Phase 1

- [ ] Add `webhook_url` to the SETTINGS table in `.claude/commands/flow.md` with description, type (string), default (""), and examples
- [ ] Add webhook_url example to the EXAMPLES section in `.claude/commands/flow.md`

**Build Verification**: N/A (documentation only)

### Phase 5: CLAUDE.md Documentation

**Scope**: Update CLAUDE.md to mention webhook notifications feature.
**Complexity**: 1/10
**Dependencies**: Phase 1

- [ ] Add webhook notification mention under the notification/heartbeat section in `CLAUDE.md`

**Build Verification**: N/A (documentation only)

### Phase 6: Tests

**Scope**: Write comprehensive tests for all new code.
**Complexity**: 5/10
**Dependencies**: Phase 1, Phase 2, Phase 3, Phase 4, Phase 5

- [ ] Add flowconfig parser tests for `webhook_url` in `src/cli/state/flowconfig-parser.test.ts`: default value, explicit value, comma-separated URLs
  <verify>npx jest src/cli/state/flowconfig-parser.test.ts --no-coverage</verify>
- [ ] Create `src/cli/daemon/webhook-sender.test.ts` with tests for:
  - `detectPlatform()` — Telegram, Discord, Slack, generic URL detection
  - `formatTelegram()` — correct payload shape with parse_mode
  - `formatDiscord()` — embed with severity colors
  - `formatSlack()` — Block Kit layout
  - `formatGeneric()` — plain JSON payload
  - `sendWebhookNotification()` — mocked fetch, multiple URLs, error handling (non-throwing), timeout
  <verify>npx jest src/cli/daemon/webhook-sender.test.ts --no-coverage</verify>
- [ ] Update `src/cli/daemon/notification-router.test.ts` to test webhook dispatch: mock webhook-sender, verify it's called for qualifying events with webhookUrls, verify it's NOT called when webhookUrls is empty
  <verify>npx jest src/cli/daemon/notification-router.test.ts --no-coverage</verify>

**Build Verification**: Run `npm run build && npm run test`

## Key Changes

1. **New Module**: `src/cli/daemon/webhook-sender.ts` — platform detection, formatters, HTTP dispatch
2. **Config Extension**: `webhook_url` field added to FlowConfig interface and parser
3. **Router Update**: `notify()` accepts optional `webhookUrls` parameter for webhook dispatch
4. **Daemon Update**: Heartbeat daemon passes `config.webhook_url` to `notify()` calls
5. **Documentation**: Flow command and CLAUDE.md updated with webhook_url setting
