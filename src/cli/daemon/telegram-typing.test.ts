/**
 * Tests for telegram-typing — Telegram typing indicator with interval, TTL, and fire-and-forget error handling.
 */

import { jest } from '@jest/globals';
import { startTyping } from './telegram-typing.js';

describe('startTyping', () => {
  let originalFetch: typeof globalThis.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    globalThis.fetch = mockFetch;
    jest.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('should return a handle with a stop() method', () => {
    const handle = startTyping('token', 'chatId');
    expect(handle).toHaveProperty('stop');
    expect(typeof handle.stop).toBe('function');
    handle.stop();
  });

  it('should send typing action immediately on start', () => {
    const handle = startTyping('token123', '456');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottoken123/sendChatAction',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: '456', action: 'typing' }),
      }),
    );
    handle.stop();
  });

  it('should send typing action again after 4 seconds', () => {
    const handle = startTyping('token', 'chat');

    expect(mockFetch).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(4_000);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(4_000);
    expect(mockFetch).toHaveBeenCalledTimes(3);

    handle.stop();
  });

  it('should stop sending after stop() is called', () => {
    const handle = startTyping('token', 'chat');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    handle.stop();

    jest.advanceTimersByTime(8_000);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should auto-clear after 5 minute TTL', () => {
    const handle = startTyping('token', 'chat');
    const initialCalls = mockFetch.mock.calls.length;

    // Advance to just before TTL (5 min = 300_000ms)
    jest.advanceTimersByTime(300_000);
    const callsAtTTL = mockFetch.mock.calls.length;

    // After TTL fires, no more calls should happen
    jest.advanceTimersByTime(8_000);
    expect(mockFetch.mock.calls.length).toBe(callsAtTTL);

    // stop() should not throw even after TTL already cleared
    expect(() => handle.stop()).not.toThrow();
  });

  it('should catch fetch errors without propagating', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));

    const handle = startTyping('token', 'chat');

    // Let the async IIFE settle
    await jest.advanceTimersByTimeAsync(0);

    // Should not throw — fire-and-forget
    jest.advanceTimersByTime(4_000);
    await jest.advanceTimersByTimeAsync(0);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    handle.stop();
  });

  it('should return no-op handle when botToken is undefined', () => {
    const handle = startTyping(undefined, 'chat');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(() => handle.stop()).not.toThrow();
  });

  it('should return no-op handle when botToken is empty string', () => {
    const handle = startTyping('', 'chat');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(() => handle.stop()).not.toThrow();
  });

  it('should return no-op handle when chatId is undefined', () => {
    const handle = startTyping('token', undefined);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(() => handle.stop()).not.toThrow();
  });

  it('should return no-op handle when chatId is empty string', () => {
    const handle = startTyping('token', '');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(() => handle.stop()).not.toThrow();
  });

  it('should return no-op handle when both are undefined', () => {
    const handle = startTyping(undefined, undefined);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(() => handle.stop()).not.toThrow();
  });
});
