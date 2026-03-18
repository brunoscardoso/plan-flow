/**
 * Notification router — dispatches NotificationEvents to the appropriate channels
 * based on severity.
 *
 * Routing rules:
 *   ALL events        → log-writer + event-writer
 *   error | blocked | task_complete → also desktop-notifier
 */

import type { NotificationEvent } from '../types.js';
import { appendLog } from './log-writer.js';
import { appendEvent } from './event-writer.js';
import { sendDesktopNotification } from './desktop-notifier.js';
import { sendWebhookNotification } from './webhook-sender.js';

/**
 * Determine whether an event should trigger a desktop notification.
 */
function shouldNotifyDesktop(event: NotificationEvent): boolean {
  return event.level === 'error' || event.type === 'task_blocked' || event.type === 'task_complete';
}

/**
 * Dispatch a notification event to all relevant channels.
 *
 * @param event             - The notification event to route
 * @param flowDir           - The flow directory (for log-writer and event-writer)
 * @param webhookUrls       - Optional comma-separated webhook URLs for external notifications
 * @param telegramBotToken  - Optional Telegram bot token (separate field, avoids full-URL requirement)
 * @param telegramChatId    - Optional Telegram chat ID (separate field, avoids full-URL requirement)
 */
export async function notify(
  event: NotificationEvent,
  flowDir: string,
  webhookUrls?: string,
  telegramBotToken?: string,
  telegramChatId?: string,
): Promise<void> {
  // Always write to log and event store (run in parallel)
  await Promise.all([
    appendLog(flowDir, event),
    appendEvent(flowDir, event),
  ]);

  // Desktop notification for high-severity events (fire-and-forget)
  if (shouldNotifyDesktop(event)) {
    sendDesktopNotification(event);

    // Webhook notification for the same qualifying events (fire-and-forget)
    if (webhookUrls || (telegramBotToken && telegramChatId)) {
      sendWebhookNotification(event, webhookUrls ?? '', telegramBotToken, telegramChatId);
    }
  }
}
