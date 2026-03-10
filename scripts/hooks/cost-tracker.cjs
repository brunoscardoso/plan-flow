#!/usr/bin/env node
'use strict';

/**
 * Cost Tracker — Stop Hook
 *
 * Fires after every Claude response. Reads the transcript JSONL to extract
 * token usage from the last assistant message and appends a cost entry
 * to ~/.claude/metrics/costs.jsonl.
 *
 * Configured as async: true so it never blocks the response display.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOOK_VERSION = '1.0.0';

// Pricing per 1M tokens (USD) — update when Anthropic changes pricing
const PRICING = {
  'claude-haiku-4-5': { input: 0.80, output: 4.00 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-5-20250514': { input: 3.00, output: 15.00 },
  'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
  'claude-opus-4-6': { input: 15.00, output: 75.00 },
};

// Cache read tokens are 10% of input cost
const CACHE_READ_DISCOUNT = 0.1;

const METRICS_DIR = path.join(os.homedir(), '.claude', 'metrics');
const COSTS_FILE = path.join(METRICS_DIR, 'costs.jsonl');
const MAX_LINES = 10000;
const KEEP_ROTATED = 3;

function getProjectName(cwd) {
  if (!cwd) return 'unknown';
  return path.basename(cwd);
}

function findModelPricing(model) {
  if (!model) return PRICING['claude-sonnet-4-6'];

  // Exact match
  if (PRICING[model]) return PRICING[model];

  // Partial match (e.g., "claude-opus-4-6" matches any variant)
  const modelLower = model.toLowerCase();
  for (const [key, value] of Object.entries(PRICING)) {
    if (modelLower.includes(key) || key.includes(modelLower)) {
      return value;
    }
  }

  // Fallback by family
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

function findLastAssistantEntry(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;

  const content = fs.readFileSync(transcriptPath, 'utf-8');
  const lines = content.trim().split('\n');

  // Search from the end for the last assistant message
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.type === 'assistant' && entry.message && entry.message.usage) {
        return entry;
      }
    } catch {
      // Skip malformed lines
    }
  }

  return null;
}

function rotateIfNeeded() {
  if (!fs.existsSync(COSTS_FILE)) return;

  try {
    const content = fs.readFileSync(COSTS_FILE, 'utf-8');
    const lineCount = content.split('\n').filter(Boolean).length;

    if (lineCount < MAX_LINES) return;

    // Rotate: rename current file with date suffix
    const date = new Date().toISOString().slice(0, 10);
    const rotatedPath = path.join(METRICS_DIR, `costs.${date}.jsonl`);
    fs.renameSync(COSTS_FILE, rotatedPath);

    // Clean old rotated files — keep last N
    const files = fs.readdirSync(METRICS_DIR)
      .filter(f => f.startsWith('costs.') && f.endsWith('.jsonl') && f !== 'costs.jsonl')
      .sort()
      .reverse();

    for (let i = KEEP_ROTATED; i < files.length; i++) {
      fs.unlinkSync(path.join(METRICS_DIR, files[i]));
    }
  } catch {
    // Non-fatal — rotation failure shouldn't block tracking
  }
}

async function main() {
  try {
    // Read stdin JSON
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString());

    const transcriptPath = input.transcript_path;
    const sessionId = input.session_id || 'unknown';
    const cwd = input.cwd || process.cwd();

    // Find last assistant message with usage data
    const entry = findLastAssistantEntry(transcriptPath);
    if (!entry) {
      process.exit(0);
      return;
    }

    const usage = entry.message.usage;
    const model = entry.message.model || 'unknown';
    const pricing = findModelPricing(model);
    const cost = calculateCost(usage, pricing);

    const logEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      project: getProjectName(cwd),
      model: model,
      input_tokens: usage.input_tokens || 0,
      output_tokens: usage.output_tokens || 0,
      cache_creation_tokens: usage.cache_creation_input_tokens || 0,
      cache_read_tokens: usage.cache_read_input_tokens || 0,
      estimated_cost_usd: Math.round(cost * 1_000_000) / 1_000_000,
      hook_version: HOOK_VERSION,
    };

    // Ensure metrics directory exists
    fs.mkdirSync(METRICS_DIR, { recursive: true });

    // Rotate if needed
    rotateIfNeeded();

    // Append to JSONL
    fs.appendFileSync(COSTS_FILE, JSON.stringify(logEntry) + '\n');
  } catch {
    // Never fail — always exit 0
  }

  process.exit(0);
}

main();
