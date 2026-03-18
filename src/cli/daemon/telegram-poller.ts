/**
 * Telegram Poller — adaptive polling state machine for Telegram getUpdates API.
 *
 * Two modes:
 *   - Idle: polls every 60s (low overhead)
 *   - Conversation: polls every 3s (responsive interaction)
 *
 * Switches to conversation mode when enterConversationMode() is called
 * (typically after a task blocks). Falls back to idle after 120s of no new messages.
 *
 * Fire-and-forget: never throws, never blocks the daemon.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { writePrompt } from './prompt-manager.js';
import type { TelegramPollState } from '../types.js';

const IDLE_INTERVAL_MS = 60_000;
const CONVERSATION_INTERVAL_MS = 3_000;
const CONVERSATION_TIMEOUT_MS = 120_000;
const API_TIMEOUT_MS = 10_000;
const POLL_STATE_FILE = '.telegram-poll-state.json';

type PollMode = 'idle' | 'conversation';

interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat?: {
      id: number;
    };
  };
}

interface TelegramApiResponse {
  ok: boolean;
  result?: TelegramUpdate[];
}

export class TelegramPoller {
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly flowDir: string;
  private readonly statePath: string;

  private pollTimer: NodeJS.Timeout | null = null;
  private mode: PollMode = 'idle';
  private lastUpdateId = 0;
  private lastActivityTimestamp = 0;
  private running = false;

  constructor(botToken: string, chatId: string, flowDir: string) {
    this.botToken = botToken;
    this.chatId = chatId;
    this.flowDir = flowDir;
    this.statePath = join(flowDir, POLL_STATE_FILE);
  }

  /**
   * Load persisted state and start idle polling.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.loadState();
    this.startTimer(IDLE_INTERVAL_MS);
    this.mode = 'idle';
  }

  /**
   * Stop polling and persist state.
   */
  stop(): void {
    this.running = false;
    this.clearTimer();
    this.saveState();
  }

  /**
   * Switch to conversation mode (3s polling).
   * Auto-falls back to idle after CONVERSATION_TIMEOUT_MS of no new messages.
   */
  enterConversationMode(): void {
    if (this.mode === 'conversation') return;
    this.mode = 'conversation';
    this.lastActivityTimestamp = Date.now();
    this.clearTimer();
    this.startTimer(CONVERSATION_INTERVAL_MS);
  }

  /**
   * Fetch updates from the Telegram Bot API.
   * Uses offset to avoid processing duplicate updates.
   */
  private async getUpdates(): Promise<TelegramUpdate[]> {
    try {
      const offset = this.lastUpdateId > 0 ? this.lastUpdateId + 1 : undefined;
      const params = new URLSearchParams({ timeout: '5' });
      if (offset !== undefined) {
        params.set('offset', String(offset));
      }

      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?${params.toString()}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });

      const data = (await response.json()) as TelegramApiResponse;

      if (!data.ok || !Array.isArray(data.result)) {
        return [];
      }

      return data.result;
    } catch (error) {
      console.error('Telegram getUpdates failed (non-fatal):', error);
      return [];
    }
  }

  /**
   * Process a single update — extract text, write prompt file, send acknowledgment.
   */
  private async processUpdate(update: TelegramUpdate): Promise<void> {
    const text = update.message?.text;
    if (!text) return;

    // Only process messages from the configured chat
    const messageChatId = update.message?.chat?.id;
    if (messageChatId !== undefined && String(messageChatId) !== this.chatId) {
      return;
    }

    try {
      // Write the reply as a prompt file for the daemon to pick up
      await writePrompt(
        'telegram-reply',
        text,
        '',
        this.flowDir,
      );

      // Send acknowledgment back to Telegram
      this.sendReply(`Received: "${text.slice(0, 100)}${text.length > 100 ? '...' : ''}"`);
    } catch (error) {
      console.error('Telegram processUpdate failed (non-fatal):', error);
    }
  }

  /**
   * Send a text message to the configured chat.
   * Fire-and-forget — errors are logged but never thrown.
   */
  sendReply(text: string): void {
    void (async () => {
      try {
        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text,
          }),
          signal: AbortSignal.timeout(API_TIMEOUT_MS),
        });
      } catch (error) {
        console.error('Telegram sendReply failed (non-fatal):', error);
      }
    })();
  }

  /**
   * Main poll cycle — fetch updates, process each, manage mode transitions.
   */
  private async poll(): Promise<void> {
    if (!this.running) return;

    const updates = await this.getUpdates();

    for (const update of updates) {
      this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
      this.lastActivityTimestamp = Date.now();
      await this.processUpdate(update);
    }

    // Save state after processing updates
    if (updates.length > 0) {
      this.saveState();
    }

    // Check if conversation mode should drop back to idle
    if (
      this.mode === 'conversation' &&
      Date.now() - this.lastActivityTimestamp > CONVERSATION_TIMEOUT_MS
    ) {
      this.mode = 'idle';
      this.clearTimer();
      this.startTimer(IDLE_INTERVAL_MS);
    }
  }

  /**
   * Load persisted poll state from disk.
   * Resets to defaults on parse error or missing file.
   */
  private loadState(): void {
    try {
      if (!existsSync(this.statePath)) return;
      const raw = readFileSync(this.statePath, 'utf-8');
      const state = JSON.parse(raw) as TelegramPollState;

      if (typeof state.lastUpdateId === 'number') {
        this.lastUpdateId = state.lastUpdateId;
      }
      if (typeof state.lastActivityTimestamp === 'number') {
        this.lastActivityTimestamp = state.lastActivityTimestamp;
      }
    } catch {
      // Reset to defaults on parse error
      this.lastUpdateId = 0;
      this.lastActivityTimestamp = 0;
    }
  }

  /**
   * Persist poll state to disk.
   */
  private saveState(): void {
    try {
      const state: TelegramPollState = {
        lastUpdateId: this.lastUpdateId,
        lastActivityTimestamp: this.lastActivityTimestamp,
      };
      writeFileSync(this.statePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save Telegram poll state (non-fatal):', error);
    }
  }

  private startTimer(intervalMs: number): void {
    this.pollTimer = setInterval(() => {
      void this.poll();
    }, intervalMs);
  }

  private clearTimer(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
