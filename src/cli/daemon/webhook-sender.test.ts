/**
 * Tests for webhook-sender — platform detection, formatting, and dispatch
 */

import { jest } from '@jest/globals';
import type { NotificationEvent } from '../types.js';
import {
  detectPlatform,
  formatTelegram,
  formatDiscord,
  formatSlack,
  formatGeneric,
  sendWebhookNotification,
} from './webhook-sender.js';

function makeEvent(overrides: Partial<NotificationEvent> = {}): NotificationEvent {
  return {
    id: 'webhook-test-id',
    timestamp: new Date('2026-03-18T10:00:00Z'),
    task: 'build-feature',
    type: 'task_complete',
    level: 'info',
    message: 'Feature build completed successfully',
    ...overrides,
  };
}

describe('detectPlatform', () => {
  it('should detect Telegram URLs', () => {
    expect(detectPlatform('https://api.telegram.org/bot123:ABC/sendMessage?chat_id=456')).toBe('telegram');
  });

  it('should detect Telegram URLs case-insensitively', () => {
    expect(detectPlatform('https://API.TELEGRAM.ORG/bot123/sendMessage')).toBe('telegram');
  });

  it('should detect Discord webhook URLs', () => {
    expect(detectPlatform('https://discord.com/api/webhooks/123456/abcdef')).toBe('discord');
  });

  it('should detect legacy discordapp.com webhook URLs', () => {
    expect(detectPlatform('https://discordapp.com/api/webhooks/123456/abcdef')).toBe('discord');
  });

  it('should detect Slack webhook URLs', () => {
    expect(detectPlatform('https://hooks.slack.com/services/T00/B00/xxx')).toBe('slack');
  });

  it('should return generic for unrecognized URLs', () => {
    expect(detectPlatform('https://my-server.example.com/webhook')).toBe('generic');
  });

  it('should return generic for localhost URLs', () => {
    expect(detectPlatform('http://localhost:3000/webhook')).toBe('generic');
  });
});

describe('formatTelegram', () => {
  it('should use direct chatId parameter', () => {
    const event = makeEvent();
    const result = formatTelegram(event, '456');

    expect(result.chat_id).toBe('456');
  });

  it('should return empty chat_id when empty string is passed', () => {
    const event = makeEvent();
    const result = formatTelegram(event, '');

    expect(result.chat_id).toBe('');
  });

  it('should set parse_mode to Markdown', () => {
    const event = makeEvent();
    const result = formatTelegram(event, '123');

    expect(result.parse_mode).toBe('Markdown');
  });

  it('should include task and message in text', () => {
    const event = makeEvent({ task: 'deploy-api', message: 'Deployment done' });
    const result = formatTelegram(event, '123');

    expect(result.text).toContain('deploy-api');
    expect(result.text).toContain('Deployment done');
  });

  it('should include phase when present', () => {
    const event = makeEvent({ phase: 'Phase 3' });
    const result = formatTelegram(event, '123');

    expect(result.text).toContain('Phase 3');
  });

  it('should not include phase line when absent', () => {
    const event = makeEvent();
    const result = formatTelegram(event, '123');

    expect(result.text).not.toContain('Phase:');
  });
});

describe('formatDiscord', () => {
  it('should produce an embed with correct severity color for info', () => {
    const event = makeEvent({ level: 'info' });
    const result = formatDiscord(event);

    expect(result.embeds).toHaveLength(1);
    expect(result.embeds[0].color).toBe(0x2ecc71);
  });

  it('should use warn color for warn-level events', () => {
    const event = makeEvent({ level: 'warn' });
    const result = formatDiscord(event);

    expect(result.embeds[0].color).toBe(0xf1c40f);
  });

  it('should use error color for error-level events', () => {
    const event = makeEvent({ level: 'error' });
    const result = formatDiscord(event);

    expect(result.embeds[0].color).toBe(0xe74c3c);
  });

  it('should include Task, Type, and Level fields', () => {
    const event = makeEvent({ task: 'my-task', type: 'task_failed', level: 'error' });
    const result = formatDiscord(event);

    const fields = result.embeds[0].fields;
    expect(fields).toContainEqual({ name: 'Task', value: 'my-task', inline: true });
    expect(fields).toContainEqual({ name: 'Type', value: 'task failed', inline: true });
    expect(fields).toContainEqual({ name: 'Level', value: 'error', inline: true });
  });

  it('should include Phase field when present', () => {
    const event = makeEvent({ phase: 'Phase 2' });
    const result = formatDiscord(event);

    const fields = result.embeds[0].fields;
    expect(fields).toContainEqual({ name: 'Phase', value: 'Phase 2', inline: true });
  });

  it('should not include Phase field when absent', () => {
    const event = makeEvent();
    const result = formatDiscord(event);

    const fields = result.embeds[0].fields;
    expect(fields.find((f) => f.name === 'Phase')).toBeUndefined();
  });

  it('should include ISO timestamp', () => {
    const event = makeEvent();
    const result = formatDiscord(event);

    expect(result.embeds[0].timestamp).toBe('2026-03-18T10:00:00.000Z');
  });

  it('should set description to event message', () => {
    const event = makeEvent({ message: 'Build failed due to type errors' });
    const result = formatDiscord(event);

    expect(result.embeds[0].description).toBe('Build failed due to type errors');
  });
});

describe('formatSlack', () => {
  it('should produce header and section blocks', () => {
    const event = makeEvent();
    const result = formatSlack(event);

    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0].type).toBe('header');
    expect(result.blocks[1].type).toBe('section');
  });

  it('should include event type in header text', () => {
    const event = makeEvent({ type: 'task_complete' });
    const result = formatSlack(event);

    const header = result.blocks[0] as { text: { text: string } };
    expect(header.text.text).toContain('task complete');
  });

  it('should include message in section text', () => {
    const event = makeEvent({ message: 'All tests passed' });
    const result = formatSlack(event);

    const section = result.blocks[1] as { text: { text: string } };
    expect(section.text.text).toBe('All tests passed');
  });

  it('should include Task, Type, Level fields in section', () => {
    const event = makeEvent({ task: 'lint-check', type: 'task_started', level: 'info' });
    const result = formatSlack(event);

    const section = result.blocks[1] as { fields: Array<{ type: string; text: string }> };
    expect(section.fields).toContainEqual({ type: 'mrkdwn', text: '*Task:*\nlint-check' });
    expect(section.fields).toContainEqual({ type: 'mrkdwn', text: '*Type:*\ntask started' });
    expect(section.fields).toContainEqual({ type: 'mrkdwn', text: '*Level:*\ninfo' });
  });

  it('should include Phase field when present', () => {
    const event = makeEvent({ phase: 'Phase 5' });
    const result = formatSlack(event);

    const section = result.blocks[1] as { fields: Array<{ type: string; text: string }> };
    expect(section.fields).toContainEqual({ type: 'mrkdwn', text: '*Phase:*\nPhase 5' });
  });
});

describe('formatGeneric', () => {
  it('should include task, type, level, message, and ISO timestamp', () => {
    const event = makeEvent({
      task: 'run-tests',
      type: 'task_failed',
      level: 'error',
      message: 'Tests failed',
    });
    const result = formatGeneric(event);

    expect(result).toEqual({
      task: 'run-tests',
      type: 'task_failed',
      level: 'error',
      message: 'Tests failed',
      timestamp: '2026-03-18T10:00:00.000Z',
    });
  });

  it('should produce a valid ISO timestamp', () => {
    const event = makeEvent();
    const result = formatGeneric(event);

    expect(() => new Date(result.timestamp)).not.toThrow();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});

describe('sendWebhookNotification', () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn<typeof fetch>().mockResolvedValue(new Response('ok', { status: 200 }));
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should call fetch for a single URL', async () => {
    const event = makeEvent();
    sendWebhookNotification(event, 'https://my-server.example.com/webhook');

    // Allow the fire-and-forget async to run
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://my-server.example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('should call fetch for each comma-separated URL', async () => {
    const event = makeEvent();
    const urls = 'https://hooks.slack.com/services/T00/B00/xxx,https://discord.com/api/webhooks/123/abc';
    sendWebhookNotification(event, urls);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should skip empty entries in comma-separated URLs', async () => {
    const event = makeEvent();
    sendWebhookNotification(event, 'https://example.com/hook,,  ,https://other.com/hook');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should not throw when fetch rejects', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const event = makeEvent();

    // Should not throw
    expect(() => {
      sendWebhookNotification(event, 'https://failing-server.com/webhook');
    }).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should send JSON body as string', async () => {
    const event = makeEvent();
    sendWebhookNotification(event, 'https://my-server.example.com/webhook');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1].body as string);
    expect(body).toHaveProperty('task', 'build-feature');
    expect(body).toHaveProperty('type', 'task_complete');
  });

  it('should use Slack format for hooks.slack.com URLs', async () => {
    const event = makeEvent();
    sendWebhookNotification(event, 'https://hooks.slack.com/services/T00/B00/xxx');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1].body as string);
    expect(body).toHaveProperty('blocks');
  });

  it('should use Discord format for discord.com webhook URLs', async () => {
    const event = makeEvent();
    sendWebhookNotification(event, 'https://discord.com/api/webhooks/123/abc');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1].body as string);
    expect(body).toHaveProperty('embeds');
  });

  it('should use Telegram format for api.telegram.org URLs', async () => {
    const event = makeEvent();
    sendWebhookNotification(event, 'https://api.telegram.org/bot123:ABC/sendMessage?chat_id=456');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1].body as string);
    expect(body).toHaveProperty('chat_id');
    expect(body).toHaveProperty('parse_mode', 'Markdown');
  });

  it('should send to Telegram via separate bot token and chat ID fields', async () => {
    const event = makeEvent();
    sendWebhookNotification(event, '', 'bot999:XYZ', '-100555');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe('https://api.telegram.org/botbot999:XYZ/sendMessage');
    const body = JSON.parse(call[1].body as string);
    expect(body.chat_id).toBe('-100555');
    expect(body.parse_mode).toBe('Markdown');
  });

  it('should send to both separate Telegram fields AND webhook URLs', async () => {
    const event = makeEvent();
    sendWebhookNotification(event, 'https://hooks.slack.com/services/T00/B00/xxx', 'bot999:XYZ', '-100555');

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should have 2 calls: one for Telegram via separate fields, one for Slack via URL
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should fall back to webhook_url when no separate Telegram fields provided', async () => {
    const event = makeEvent();
    sendWebhookNotification(event, 'https://api.telegram.org/bot123:ABC/sendMessage?chat_id=456');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe('https://api.telegram.org/bot123:ABC/sendMessage?chat_id=456');
    const body = JSON.parse(call[1].body as string);
    expect(body.chat_id).toBe('456');
  });

  it('should not send separate Telegram request when only token is provided without chatId', async () => {
    const event = makeEvent();
    sendWebhookNotification(event, '', 'bot999:XYZ', '');

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Empty webhookUrls and empty chatId — no Telegram call
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
