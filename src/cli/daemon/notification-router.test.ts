/**
 * Tests for notification-router — severity routing logic
 */

import { jest } from '@jest/globals';
import type { NotificationEvent } from '../types.js';

// Mock downstream modules before importing the router
const mockAppendLog = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockAppendEvent = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockSendDesktopNotification = jest.fn();
const mockSendWebhookNotification = jest.fn();

jest.unstable_mockModule('./log-writer.js', () => ({
  appendLog: mockAppendLog,
}));

jest.unstable_mockModule('./event-writer.js', () => ({
  appendEvent: mockAppendEvent,
}));

jest.unstable_mockModule('./desktop-notifier.js', () => ({
  sendDesktopNotification: mockSendDesktopNotification,
}));

jest.unstable_mockModule('./webhook-sender.js', () => ({
  sendWebhookNotification: mockSendWebhookNotification,
}));

// Import after mocks are set up
const { notify } = await import('./notification-router.js');

function makeEvent(overrides: Partial<NotificationEvent> = {}): NotificationEvent {
  return {
    id: 'test-id',
    timestamp: new Date('2026-03-17T14:30:00'),
    task: 'my-task',
    type: 'task_complete',
    level: 'info',
    message: 'All done',
    ...overrides,
  };
}

describe('notification-router', () => {
  const flowDir = '/tmp/test-flow';

  beforeEach(() => {
    mockAppendLog.mockClear();
    mockAppendEvent.mockClear();
    mockSendDesktopNotification.mockClear();
    mockSendWebhookNotification.mockClear();
  });

  it('should always call appendLog and appendEvent for info events', async () => {
    const event = makeEvent({ level: 'info', type: 'task_complete' });

    await notify(event, flowDir);

    expect(mockAppendLog).toHaveBeenCalledTimes(1);
    expect(mockAppendLog).toHaveBeenCalledWith(flowDir, event);
    expect(mockAppendEvent).toHaveBeenCalledTimes(1);
    expect(mockAppendEvent).toHaveBeenCalledWith(flowDir, event);
  });

  it('should send desktop notification for task_complete events', async () => {
    const event = makeEvent({ level: 'info', type: 'task_complete' });

    await notify(event, flowDir);

    expect(mockSendDesktopNotification).toHaveBeenCalledTimes(1);
    expect(mockSendDesktopNotification).toHaveBeenCalledWith(event);
  });

  it('should NOT send desktop notification for warn-level task_started', async () => {
    const event = makeEvent({ level: 'warn', type: 'task_started' });

    await notify(event, flowDir);

    expect(mockSendDesktopNotification).not.toHaveBeenCalled();
  });

  it('should send desktop notification for error-level events', async () => {
    const event = makeEvent({ level: 'error', type: 'task_failed' });

    await notify(event, flowDir);

    expect(mockAppendLog).toHaveBeenCalledTimes(1);
    expect(mockAppendEvent).toHaveBeenCalledTimes(1);
    expect(mockSendDesktopNotification).toHaveBeenCalledTimes(1);
    expect(mockSendDesktopNotification).toHaveBeenCalledWith(event);
  });

  it('should send desktop notification for task_blocked events regardless of level', async () => {
    const event = makeEvent({ level: 'warn', type: 'task_blocked' });

    await notify(event, flowDir);

    expect(mockSendDesktopNotification).toHaveBeenCalledTimes(1);
    expect(mockSendDesktopNotification).toHaveBeenCalledWith(event);
  });

  it('should send desktop notification for error-level task_blocked events', async () => {
    const event = makeEvent({ level: 'error', type: 'task_blocked' });

    await notify(event, flowDir);

    expect(mockSendDesktopNotification).toHaveBeenCalledTimes(1);
  });

  it('should NOT send desktop notification for info-level phase_complete', async () => {
    const event = makeEvent({ level: 'info', type: 'phase_complete' });

    await notify(event, flowDir);

    expect(mockSendDesktopNotification).not.toHaveBeenCalled();
  });

  it('should send webhook notification when webhookUrls is provided and event qualifies', async () => {
    const event = makeEvent({ level: 'error', type: 'task_failed' });
    const webhookUrls = 'https://hooks.slack.com/services/test';

    await notify(event, flowDir, webhookUrls);

    expect(mockSendWebhookNotification).toHaveBeenCalledTimes(1);
    expect(mockSendWebhookNotification).toHaveBeenCalledWith(event, webhookUrls, undefined, undefined);
  });

  it('should NOT send webhook notification when webhookUrls is undefined', async () => {
    const event = makeEvent({ level: 'error', type: 'task_failed' });

    await notify(event, flowDir);

    expect(mockSendWebhookNotification).not.toHaveBeenCalled();
  });

  it('should NOT send webhook notification when webhookUrls is empty string', async () => {
    const event = makeEvent({ level: 'error', type: 'task_failed' });

    await notify(event, flowDir, '');

    expect(mockSendWebhookNotification).not.toHaveBeenCalled();
  });

  it('should NOT send webhook notification for non-qualifying events', async () => {
    const event = makeEvent({ level: 'info', type: 'phase_complete' });
    const webhookUrls = 'https://hooks.slack.com/services/test';

    await notify(event, flowDir, webhookUrls);

    expect(mockSendWebhookNotification).not.toHaveBeenCalled();
  });

  it('should send webhook notification for task_complete events with webhookUrls', async () => {
    const event = makeEvent({ level: 'info', type: 'task_complete' });
    const webhookUrls = 'https://discord.com/api/webhooks/123/abc';

    await notify(event, flowDir, webhookUrls);

    expect(mockSendDesktopNotification).toHaveBeenCalledTimes(1);
    expect(mockSendWebhookNotification).toHaveBeenCalledTimes(1);
    expect(mockSendWebhookNotification).toHaveBeenCalledWith(event, webhookUrls, undefined, undefined);
  });

  it('should pass telegramBotToken and telegramChatId to sendWebhookNotification', async () => {
    const event = makeEvent({ level: 'error', type: 'task_failed' });

    await notify(event, flowDir, '', 'bot999:XYZ', '-100555');

    expect(mockSendWebhookNotification).toHaveBeenCalledTimes(1);
    expect(mockSendWebhookNotification).toHaveBeenCalledWith(event, '', 'bot999:XYZ', '-100555');
  });

  it('should send webhook with both webhookUrls and Telegram fields', async () => {
    const event = makeEvent({ level: 'error', type: 'task_failed' });
    const webhookUrls = 'https://hooks.slack.com/services/test';

    await notify(event, flowDir, webhookUrls, 'bot111:ABC', '-200');

    expect(mockSendWebhookNotification).toHaveBeenCalledTimes(1);
    expect(mockSendWebhookNotification).toHaveBeenCalledWith(event, webhookUrls, 'bot111:ABC', '-200');
  });

  it('should work without telegram fields (backward compat)', async () => {
    const event = makeEvent({ level: 'error', type: 'task_failed' });
    const webhookUrls = 'https://hooks.slack.com/services/test';

    await notify(event, flowDir, webhookUrls);

    expect(mockSendWebhookNotification).toHaveBeenCalledTimes(1);
    expect(mockSendWebhookNotification).toHaveBeenCalledWith(event, webhookUrls, undefined, undefined);
  });

  it('should send webhook when only Telegram fields are provided (no webhookUrls)', async () => {
    const event = makeEvent({ level: 'error', type: 'task_blocked' });

    await notify(event, flowDir, undefined, 'bot999:XYZ', '-100555');

    expect(mockSendWebhookNotification).toHaveBeenCalledTimes(1);
    expect(mockSendWebhookNotification).toHaveBeenCalledWith(event, '', 'bot999:XYZ', '-100555');
  });
});
