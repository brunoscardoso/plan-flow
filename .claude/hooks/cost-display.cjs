#!/usr/bin/env node
'use strict';

/**
 * Cost Display — Stop Hook (synchronous)
 *
 * Fires after every Claude response. Reads the transcript to extract
 * token usage from the last assistant message and prints a compact
 * cost summary line to stderr.
 *
 * Configured as synchronous (no async flag) so it displays immediately.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Pricing per 1M tokens (USD)
const PRICING = {
  'claude-haiku-4-5': { input: 0.80, output: 4.00 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-5-20250514': { input: 3.00, output: 15.00 },
  'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
  'claude-opus-4-6': { input: 15.00, output: 75.00 },
};

const CACHE_READ_DISCOUNT = 0.1;
const COSTS_FILE = path.join(os.homedir(), '.claude', 'metrics', 'costs.jsonl');

function findModelPricing(model) {
  if (!model) return PRICING['claude-sonnet-4-6'];
  if (PRICING[model]) return PRICING[model];

  const modelLower = model.toLowerCase();
  for (const [key, value] of Object.entries(PRICING)) {
    if (modelLower.includes(key) || key.includes(modelLower)) return value;
  }

  if (modelLower.includes('haiku')) return PRICING['claude-haiku-4-5'];
  if (modelLower.includes('opus')) return PRICING['claude-opus-4-6'];
  return PRICING['claude-sonnet-4-6'];
}

function calculateCost(usage, pricing) {
  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
  const cacheReadTokens = usage.cache_read_input_tokens || 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const cacheCreationCost = (cacheCreationTokens / 1_000_000) * pricing.input;
  const cacheReadCost = (cacheReadTokens / 1_000_000) * pricing.input * CACHE_READ_DISCOUNT;

  return inputCost + outputCost + cacheCreationCost + cacheReadCost;
}

function formatTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function getModelShort(model) {
  if (!model) return '?';
  if (model.includes('haiku')) return 'haiku';
  if (model.includes('opus')) return 'opus';
  if (model.includes('sonnet')) return 'sonnet';
  return model.split('-').slice(-1)[0];
}

function getSessionTotal(sessionId) {
  if (!sessionId || !fs.existsSync(COSTS_FILE)) return null;

  try {
    const content = fs.readFileSync(COSTS_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    let totalCost = 0;
    let count = 0;
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.session_id === sessionId && entry.type !== 'session_summary') {
          totalCost += entry.estimated_cost_usd || 0;
          count++;
        }
      } catch { /* skip */ }
    }

    return count > 0 ? { totalCost, count } : null;
  } catch {
    return null;
  }
}

function findLastAssistantEntry(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;

  const content = fs.readFileSync(transcriptPath, 'utf-8');
  const lines = content.trim().split('\n');

  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.type === 'assistant' && entry.message && entry.message.usage) {
        return entry;
      }
    } catch { /* skip */ }
  }

  return null;
}

async function main() {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString());

    const transcriptPath = input.transcript_path;
    const sessionId = input.session_id;

    const entry = findLastAssistantEntry(transcriptPath);
    if (!entry) {
      process.exit(0);
      return;
    }

    const usage = entry.message.usage;
    const model = entry.message.model || 'unknown';
    const pricing = findModelPricing(model);
    const cost = calculateCost(usage, pricing);

    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const cacheReadTokens = usage.cache_read_input_tokens || 0;

    // Build compact display line
    const modelName = getModelShort(model);
    const costStr = cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(2)}`;

    let line = `\x1b[2m⟐ ${modelName} · in:${formatTokens(inputTokens)} out:${formatTokens(outputTokens)}`;
    if (cacheReadTokens > 0) {
      line += ` cache:${formatTokens(cacheReadTokens)}`;
    }
    line += ` · ${costStr}`;

    // Add session total if available
    const session = getSessionTotal(sessionId);
    if (session && session.count > 1) {
      const sessionCostStr = session.totalCost < 0.01
        ? `$${session.totalCost.toFixed(4)}`
        : `$${session.totalCost.toFixed(2)}`;
      line += ` (session: ${sessionCostStr})`;
    }

    line += '\x1b[0m';

    process.stderr.write(line + '\n');
  } catch {
    // Never fail
  }

  process.exit(0);
}

main();
