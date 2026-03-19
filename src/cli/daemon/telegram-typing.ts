/**
 * Telegram Typing Indicator
 *
 * Sends `sendChatAction` ("typing") to the Telegram Bot API at regular
 * intervals so the user sees a typing indicator while the daemon or
 * poller is working.
 *
 * Fire-and-forget: errors are logged but never thrown.
 */

export interface TypingHandle {
  stop: () => void;
}

const TYPING_INTERVAL_MS = 4_000;
const TYPING_TTL_MS = 300_000; // 5 min safety net
const FETCH_TIMEOUT_MS = 5_000;

const NOOP_HANDLE: TypingHandle = { stop: () => {} };

/**
 * Start sending "typing" chat actions every 4 seconds.
 *
 * Returns a handle whose `stop()` clears the interval.
 * If botToken or chatId is empty/undefined, returns a no-op handle.
 * A TTL safety net auto-clears after 5 minutes regardless.
 */
export function startTyping(
  botToken: string | undefined,
  chatId: string | undefined,
): TypingHandle {
  if (!botToken || !chatId) return NOOP_HANDLE;

  const url = `https://api.telegram.org/bot${botToken}/sendChatAction`;

  const sendAction = (): void => {
    void (async () => {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
      } catch {
        // Fire-and-forget — swallow errors silently
      }
    })();
  };

  // Send immediately, then repeat every 4s
  sendAction();
  const interval = setInterval(sendAction, TYPING_INTERVAL_MS);

  // TTL safety net — auto-stop after 5 minutes
  const ttl = setTimeout(() => clearInterval(interval), TYPING_TTL_MS);

  return {
    stop: () => {
      clearInterval(interval);
      clearTimeout(ttl);
    },
  };
}
