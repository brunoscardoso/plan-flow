#!/usr/bin/env node
'use strict';

/**
 * Suggest Compact — Stop Hook (synchronous)
 *
 * Fires after every Claude response. Reads the transcript to check
 * context window usage (input_tokens on the last assistant message).
 * When usage exceeds thresholds, prints a warning to stderr suggesting
 * the user run /compact before auto-compaction kicks in.
 *
 * Thresholds:
 *   - 70% (140K tokens): yellow warning
 *   - 80% (160K tokens): red critical warning
 *   - Every ~50 tool calls: dim suggestion (if below 70%)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONTEXT_WINDOW = 200_000;
const WARN_THRESHOLD = 0.70;
const CRIT_THRESHOLD = 0.80;
const TOOL_CALL_INTERVAL = 50;
const MIN_TOKEN_GROWTH = 10_000;

const STATE_DIR = path.join(os.homedir(), '.claude', 'metrics');
const STATE_FILE = path.join(STATE_DIR, 'compact-state.json');

function loadState(sessionId) {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      if (data.session_id === sessionId) return data;
    }
  } catch { /* ignore */ }
  return {
    session_id: sessionId,
    last_suggested_at: 0,
    tool_calls_at_last_suggest: 0,
  };
}

function saveState(state) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf-8');
  } catch { /* ignore */ }
}

function formatTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(n);
}

function countToolCalls(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return 0;

  try {
    const content = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');
    let count = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'assistant' && entry.message && entry.message.content) {
          const blocks = Array.isArray(entry.message.content)
            ? entry.message.content
            : [entry.message.content];
          for (const block of blocks) {
            if (block.type === 'tool_use') count++;
          }
        }
      } catch { /* skip */ }
    }

    return count;
  } catch {
    return 0;
  }
}

function findLastAssistantUsage(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;

  try {
    const content = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry.type === 'assistant' && entry.message && entry.message.usage) {
          return entry.message.usage;
        }
      } catch { /* skip */ }
    }
  } catch { /* ignore */ }

  return null;
}

async function main() {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString());

    if (input.stop_hook_active) {
      process.exit(0);
      return;
    }

    const transcriptPath = input.transcript_path;
    const sessionId = input.session_id || 'unknown';

    const usage = findLastAssistantUsage(transcriptPath);
    if (!usage) {
      process.exit(0);
      return;
    }

    const state = loadState(sessionId);
    const inputTokens = usage.input_tokens || 0;
    const ratio = inputTokens / CONTEXT_WINDOW;
    const pct = Math.round(ratio * 100);

    let shouldWarn = false;
    let message = '';

    // Check context window usage
    if (ratio >= CRIT_THRESHOLD) {
      message = `\x1b[31m⚠ Context ${pct}% full (${formatTokens(inputTokens)}/${formatTokens(CONTEXT_WINDOW)}) — run /compact NOW before auto-compaction loses context\x1b[0m`;
      shouldWarn = true;
    } else if (ratio >= WARN_THRESHOLD) {
      message = `\x1b[33m⚠ Context ${pct}% full (${formatTokens(inputTokens)}/${formatTokens(CONTEXT_WINDOW)}) — consider running /compact soon\x1b[0m`;
      shouldWarn = true;
    }

    // Check tool call count (secondary signal, only when below warn threshold)
    const toolCalls = countToolCalls(transcriptPath);
    const toolCallsSinceLast = toolCalls - (state.tool_calls_at_last_suggest || 0);

    if (!shouldWarn && toolCallsSinceLast >= TOOL_CALL_INTERVAL) {
      message = `\x1b[2m⟐ ${toolCalls} tool calls this session (context ${pct}%) — /compact if conversation feels slow\x1b[0m`;
      shouldWarn = true;
    }

    // Suppress non-critical warnings if context hasn't grown enough
    if (shouldWarn && ratio < CRIT_THRESHOLD && state.last_suggested_at > 0) {
      const tokenGrowth = inputTokens - state.last_suggested_at;
      if (tokenGrowth < MIN_TOKEN_GROWTH) {
        shouldWarn = false;
      }
    }

    if (shouldWarn && message) {
      process.stderr.write(message + '\n');

      state.last_suggested_at = inputTokens;
      state.tool_calls_at_last_suggest = toolCalls;
      saveState(state);
    }
  } catch {
    // Never fail
  }

  process.exit(0);
}

main();
