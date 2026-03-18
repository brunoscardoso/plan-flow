/**
 * Webhook sender — formats and dispatches notification events to external platforms.
 * Fire-and-forget: never throws, never blocks.
 * Supports Telegram, Discord, Slack, and generic JSON webhooks.
 */

import type { NotificationEvent } from '../types.js';

export type WebhookPlatform = 'telegram' | 'discord' | 'slack' | 'generic';

const WEBHOOK_TIMEOUT_MS = 5000;

/**
 * Detect the target platform from a webhook URL.
 *
 * - Telegram: contains `api.telegram.org`
 * - Discord: contains `discord.com/api/webhooks` or `discordapp.com/api/webhooks`
 * - Slack: contains `hooks.slack.com`
 * - Generic: anything else
 */
export function detectPlatform(url: string): WebhookPlatform {
  if (/api\.telegram\.org/i.test(url)) return 'telegram';
  if (/discord(?:app)?\.com\/api\/webhooks/i.test(url)) return 'discord';
  if (/hooks\.slack\.com/i.test(url)) return 'slack';
  return 'generic';
}

/**
 * Format a notification event for the Telegram Bot API.
 * Extracts `chat_id` from the URL query parameter.
 */
export function formatTelegram(
  event: NotificationEvent,
  webhookUrl: string,
): { chat_id: string; text: string; parse_mode: string } {
  const url = new URL(webhookUrl);
  const chatId = url.searchParams.get('chat_id') ?? '';

  const levelEmoji =
    event.level === 'error' ? '🔴' : event.level === 'warn' ? '🟡' : '🟢';

  const text = [
    `${levelEmoji} *Plan-Flow: ${event.type.replace(/_/g, ' ')}*`,
    `Task: ${event.task}`,
    event.phase ? `Phase: ${event.phase}` : null,
    `Message: ${event.message}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { chat_id: chatId, text, parse_mode: 'Markdown' };
}

const DISCORD_COLORS = {
  info: 0x2ecc71,
  warn: 0xf1c40f,
  error: 0xe74c3c,
} as const;

/**
 * Format a notification event as a Discord embed payload.
 * Color-coded by severity level.
 */
export function formatDiscord(event: NotificationEvent): {
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    fields: Array<{ name: string; value: string; inline: boolean }>;
    timestamp: string;
  }>;
} {
  const fields: Array<{ name: string; value: string; inline: boolean }> = [
    { name: 'Task', value: event.task, inline: true },
    { name: 'Type', value: event.type.replace(/_/g, ' '), inline: true },
    { name: 'Level', value: event.level, inline: true },
  ];

  if (event.phase) {
    fields.push({ name: 'Phase', value: event.phase, inline: true });
  }

  return {
    embeds: [
      {
        title: 'Plan-Flow Notification',
        description: event.message,
        color: DISCORD_COLORS[event.level],
        fields,
        timestamp: event.timestamp.toISOString(),
      },
    ],
  };
}

/**
 * Format a notification event as a Slack Block Kit payload.
 * Uses header + section blocks with fields.
 */
export function formatSlack(event: NotificationEvent): {
  blocks: Array<Record<string, unknown>>;
} {
  const levelEmoji =
    event.level === 'error' ? ':red_circle:' : event.level === 'warn' ? ':warning:' : ':white_check_mark:';

  const fields: Array<{ type: string; text: string }> = [
    { type: 'mrkdwn', text: `*Task:*\n${event.task}` },
    { type: 'mrkdwn', text: `*Type:*\n${event.type.replace(/_/g, ' ')}` },
    { type: 'mrkdwn', text: `*Level:*\n${event.level}` },
  ];

  if (event.phase) {
    fields.push({ type: 'mrkdwn', text: `*Phase:*\n${event.phase}` });
  }

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${levelEmoji} Plan-Flow: ${event.type.replace(/_/g, ' ')}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: event.message,
        },
        fields,
      },
    ],
  };
}

/**
 * Format a notification event as a plain JSON payload.
 */
export function formatGeneric(event: NotificationEvent): {
  task: string;
  type: string;
  level: string;
  message: string;
  timestamp: string;
} {
  return {
    task: event.task,
    type: event.type,
    level: event.level,
    message: event.message,
    timestamp: event.timestamp.toISOString(),
  };
}

/**
 * Send a webhook notification for the given event.
 *
 * - Splits comma-separated URLs and sends to each
 * - Detects platform per URL and formats accordingly
 * - Fire-and-forget — does not await the result
 * - Uses AbortSignal.timeout(5000) for HTTP timeout
 * - Catches ALL errors; logs to console.error but never throws
 */
export function sendWebhookNotification(
  event: NotificationEvent,
  webhookUrls: string,
): void {
  // Intentionally not awaited — fire-and-forget
  void (async () => {
    const urls = webhookUrls
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);

    for (const url of urls) {
      try {
        const platform = detectPlatform(url);

        let body: unknown;
        switch (platform) {
          case 'telegram':
            body = formatTelegram(event, url);
            break;
          case 'discord':
            body = formatDiscord(event);
            break;
          case 'slack':
            body = formatSlack(event);
            break;
          default:
            body = formatGeneric(event);
            break;
        }

        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
        });
      } catch (error) {
        console.error(`Webhook notification failed for ${url} (non-fatal):`, error);
      }
    }
  })();
}
