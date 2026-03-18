/**
 * Tests for TelegramPoller — adaptive polling state machine for Telegram getUpdates API.
 */

import { jest } from '@jest/globals';
import { rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock prompt-manager before importing TelegramPoller
const mockWritePrompt = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
jest.unstable_mockModule('./prompt-manager.js', () => ({
  writePrompt: mockWritePrompt,
}));

const { TelegramPoller } = await import('./telegram-poller.js');

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'plan-flow-telegram-poller-test-'));
}

/** Helper to create a fresh Response with JSON body. */
function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Helper to create a default "empty updates" response. */
function emptyUpdatesResponse(): Response {
  return jsonResponse({ ok: true, result: [] });
}

describe('TelegramPoller', () => {
  let tempDir: string;
  let originalFetch: typeof globalThis.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    tempDir = createTempDir();
    originalFetch = globalThis.fetch;
    // Each call returns a fresh empty-updates response by default
    mockFetch = jest.fn<typeof fetch>().mockImplementation(() =>
      Promise.resolve(emptyUpdatesResponse()),
    );
    globalThis.fetch = mockFetch;
    mockWritePrompt.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.useRealTimers();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor and initial state', () => {
    it('should create an instance with correct initial state', () => {
      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      expect(poller).toBeInstanceOf(TelegramPoller);
    });

    it('should not start polling until start() is called', () => {
      new TelegramPoller('bot123:ABC', '456', tempDir);
      jest.advanceTimersByTime(120_000);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('start() and stop()', () => {
    it('should begin polling on start()', async () => {
      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(0);

      expect(mockFetch).toHaveBeenCalled();
      poller.stop();
    });

    it('should not double-start if already running', async () => {
      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();
      poller.start(); // No-op

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(0);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      poller.stop();
    });

    it('should stop polling on stop()', async () => {
      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();
      poller.stop();

      jest.advanceTimersByTime(120_000);
      await jest.advanceTimersByTimeAsync(0);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should persist state on stop()', () => {
      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();
      poller.stop();

      const statePath = join(tempDir, '.telegram-poll-state.json');
      expect(existsSync(statePath)).toBe(true);
    });
  });

  describe('getUpdates() parsing', () => {
    it('should call Telegram getUpdates API with bot token in URL', async () => {
      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(0);

      const callUrl = (mockFetch.mock.calls[0] as [string])[0];
      expect(callUrl).toContain('https://api.telegram.org/botbot123:ABC/getUpdates');
      poller.stop();
    });

    it('should parse valid Telegram API response and write prompt', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve(
          jsonResponse({
            ok: true,
            result: [
              { update_id: 100, message: { text: 'hello', chat: { id: 456 } } },
            ],
          }),
        ),
      );

      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(50);

      expect(mockWritePrompt).toHaveBeenCalledWith(
        'telegram-reply',
        'hello',
        '',
        tempDir,
      );
      poller.stop();
    });

    it('should handle response with ok=false', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve(jsonResponse({ ok: false })),
      );

      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(0);

      expect(mockWritePrompt).not.toHaveBeenCalled();
      poller.stop();
    });

    it('should handle response with missing result array', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve(jsonResponse({ ok: true })),
      );

      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(0);

      expect(mockWritePrompt).not.toHaveBeenCalled();
      poller.stop();
    });
  });

  describe('offset tracking', () => {
    it('should use offset parameter after processing updates', async () => {
      // First poll returns an update
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve(
          jsonResponse({
            ok: true,
            result: [
              { update_id: 100, message: { text: 'first', chat: { id: 456 } } },
            ],
          }),
        ),
      );

      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();

      // First poll
      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(50);

      // Second poll (default empty response)
      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(0);

      // Find the getUpdates call after the first one (skip sendReply calls)
      const getUpdatesCalls = mockFetch.mock.calls.filter(
        (call) => typeof call[0] === 'string' && (call[0] as string).includes('getUpdates'),
      );
      expect(getUpdatesCalls.length).toBeGreaterThanOrEqual(2);
      const secondCallUrl = getUpdatesCalls[1][0] as string;
      expect(secondCallUrl).toContain('offset=101');
      poller.stop();
    });
  });

  describe('processUpdate()', () => {
    it('should call writePrompt with message text', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve(
          jsonResponse({
            ok: true,
            result: [
              { update_id: 200, message: { text: 'test message', chat: { id: 456 } } },
            ],
          }),
        ),
      );

      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(50);

      expect(mockWritePrompt).toHaveBeenCalledWith(
        'telegram-reply',
        'test message',
        '',
        tempDir,
      );
      poller.stop();
    });

    it('should send acknowledgment via sendReply after processing', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve(
          jsonResponse({
            ok: true,
            result: [
              { update_id: 201, message: { text: 'hello', chat: { id: 456 } } },
            ],
          }),
        ),
      );

      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(50);

      // Find sendMessage calls (acknowledgment)
      const sendCalls = mockFetch.mock.calls.filter(
        (call) => typeof call[0] === 'string' && (call[0] as string).includes('sendMessage'),
      );
      expect(sendCalls.length).toBeGreaterThanOrEqual(1);
      poller.stop();
    });

    it('should filter messages not from configured chat_id', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve(
          jsonResponse({
            ok: true,
            result: [
              { update_id: 300, message: { text: 'from wrong chat', chat: { id: 999 } } },
            ],
          }),
        ),
      );

      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(0);

      expect(mockWritePrompt).not.toHaveBeenCalled();
      poller.stop();
    });

    it('should skip updates without message text', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve(
          jsonResponse({
            ok: true,
            result: [
              { update_id: 400, message: { chat: { id: 456 } } },
            ],
          }),
        ),
      );

      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(0);

      expect(mockWritePrompt).not.toHaveBeenCalled();
      poller.stop();
    });
  });

  describe('state machine', () => {
    it('should start in idle mode with 60s polling interval', async () => {
      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();

      // Should not poll before 60s
      jest.advanceTimersByTime(59_000);
      await jest.advanceTimersByTimeAsync(0);
      expect(mockFetch).not.toHaveBeenCalled();

      // Should poll at 60s
      jest.advanceTimersByTime(1_000);
      await jest.advanceTimersByTimeAsync(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      poller.stop();
    });

    it('should switch to conversation mode with 3s polling on enterConversationMode()', async () => {
      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();
      poller.enterConversationMode();

      jest.advanceTimersByTime(3_000);
      await jest.advanceTimersByTimeAsync(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(3_000);
      await jest.advanceTimersByTimeAsync(0);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      poller.stop();
    });

    it('should not double-enter conversation mode', async () => {
      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();
      poller.enterConversationMode();
      poller.enterConversationMode(); // No-op

      jest.advanceTimersByTime(3_000);
      await jest.advanceTimersByTimeAsync(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      poller.stop();
    });

    it('should fall back to idle after 120s of no new messages in conversation mode', async () => {
      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();
      poller.enterConversationMode();

      // Advance past conversation timeout (120s) in chunks
      for (let i = 0; i < 42; i++) {
        jest.advanceTimersByTime(3_000);
        await jest.advanceTimersByTimeAsync(0);
      }

      // Now it should have fallen back to idle mode (60s interval)
      mockFetch.mockClear();

      // At 3s intervals there should be no new calls (idle uses 60s)
      jest.advanceTimersByTime(30_000);
      await jest.advanceTimersByTimeAsync(0);
      const callsIn30s = mockFetch.mock.calls.length;

      // At 60s there should be a poll
      jest.advanceTimersByTime(30_000);
      await jest.advanceTimersByTimeAsync(0);
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callsIn30s);

      poller.stop();
    });
  });

  describe('loadState()', () => {
    it('should load persisted state from JSON file', async () => {
      const statePath = join(tempDir, '.telegram-poll-state.json');
      writeFileSync(
        statePath,
        JSON.stringify({ lastUpdateId: 42, lastActivityTimestamp: 1000 }),
        'utf-8',
      );

      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(0);

      const callUrl = (mockFetch.mock.calls[0] as [string])[0];
      expect(callUrl).toContain('offset=43');
      poller.stop();
    });

    it('should handle missing state file gracefully', () => {
      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      expect(() => poller.start()).not.toThrow();
      poller.stop();
    });

    it('should handle corrupt state file gracefully', async () => {
      const statePath = join(tempDir, '.telegram-poll-state.json');
      writeFileSync(statePath, 'not-valid-json!!!', 'utf-8');

      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      expect(() => poller.start()).not.toThrow();

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(0);

      const callUrl = (mockFetch.mock.calls[0] as [string])[0];
      expect(callUrl).not.toContain('offset=');
      poller.stop();
    });
  });

  describe('saveState()', () => {
    it('should write offset to JSON file after processing updates', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve(
          jsonResponse({
            ok: true,
            result: [
              { update_id: 55, message: { text: 'save test', chat: { id: 456 } } },
            ],
          }),
        ),
      );

      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(50);

      poller.stop();

      const statePath = join(tempDir, '.telegram-poll-state.json');
      expect(existsSync(statePath)).toBe(true);
      const state = JSON.parse(readFileSync(statePath, 'utf-8'));
      expect(state.lastUpdateId).toBe(55);
    });
  });

  describe('error handling', () => {
    it('should not crash on network failures', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.reject(new Error('Network error')),
      );

      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(0);

      expect(mockWritePrompt).not.toHaveBeenCalled();

      // Next poll should still work
      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(0);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      poller.stop();
    });

    it('should handle invalid JSON from Telegram API gracefully', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve(
          new Response('not json at all', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          }),
        ),
      );

      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.start();

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersByTimeAsync(0);

      expect(mockWritePrompt).not.toHaveBeenCalled();
      poller.stop();
    });
  });

  describe('sendReply()', () => {
    it('should send a POST request to Telegram sendMessage API', async () => {
      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      poller.sendReply('Test reply');

      await jest.advanceTimersByTimeAsync(50);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botbot123:ABC/sendMessage',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: '456', text: 'Test reply' }),
        }),
      );
    });

    it('should not throw when sendReply fetch fails', async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error('Send failed')),
      );

      const poller = new TelegramPoller('bot123:ABC', '456', tempDir);
      expect(() => poller.sendReply('Test reply')).not.toThrow();

      await jest.advanceTimersByTimeAsync(50);
    });
  });
});
