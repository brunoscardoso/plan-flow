#!/usr/bin/env node
'use strict';

/**
 * Plan-Flow Stop Hook
 *
 * Runs when Claude Code session ends. Reads JSONL transcript from stdin,
 * extracts session summary, and writes to flow/state/.
 *
 * NOTE: Stop hook receives JSONL transcript on stdin.
 */

const fs = require('fs');
const path = require('path');

const STATE_DIR = path.join(process.cwd(), 'flow', 'state');
const LAST_JSON = path.join(STATE_DIR, 'last-session.json');
const LAST_MD = path.join(STATE_DIR, 'last-session.md');
const CURRENT_JSON = path.join(STATE_DIR, 'current.json');

function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(chunks.join('')));
    process.stdin.on('error', () => resolve(''));

    // Timeout after 5 seconds to avoid hanging
    setTimeout(() => resolve(chunks.join('')), 5000);
  });
}

function extractSummary(transcript) {
  const userMessages = [];
  const toolsUsed = new Set();
  const filesModified = new Set();
  let totalMessages = 0;

  const lines = transcript.split('\n').filter((l) => l.trim());

  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // Skip unparseable lines
    }

    totalMessages++;

    // Extract user messages
    if (entry.role === 'human' || entry.role === 'user') {
      const content =
        typeof entry.message === 'string'
          ? entry.message
          : typeof entry.message?.content === 'string'
            ? entry.message.content
            : Array.isArray(entry.message?.content)
              ? entry.message.content
                  .filter((b) => b.type === 'text')
                  .map((b) => b.text)
                  .join(' ')
              : null;

      if (content) {
        userMessages.push(content.slice(0, 200));
      }
    }

    // Extract tool usage
    if (entry.role === 'assistant') {
      const content = entry.message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'tool_use') {
            toolsUsed.add(block.name);

            // Extract file paths from tool inputs
            const input = block.input || {};
            const filePath =
              input.file_path || input.path || input.command || '';
            if (
              typeof filePath === 'string' &&
              filePath.includes('/') &&
              !filePath.startsWith('git') &&
              !filePath.startsWith('npm')
            ) {
              // Extract file-like paths
              const match = filePath.match(
                /(?:^|\s)([\w./-]+\.\w{1,10})(?:\s|$)/
              );
              if (match) {
                filesModified.add(match[1]);
              }
            }
          }
        }
      }
    }
  }

  return {
    date: new Date().toISOString(),
    totalMessages,
    userMessages: userMessages.slice(-10),
    toolsUsed: [...toolsUsed].slice(0, 20),
    filesModified: [...filesModified].slice(0, 30),
  };
}

async function main() {
  try {
    // Ensure state directory exists
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }

    const transcript = await readStdin();

    // If no transcript data, just update timestamp
    const summary = transcript.trim()
      ? extractSummary(transcript)
      : {
          date: new Date().toISOString(),
          totalMessages: 0,
          userMessages: [],
          toolsUsed: [],
          filesModified: [],
        };

    // Write session summary JSON
    const tmpJson = LAST_JSON + '.tmp';
    fs.writeFileSync(tmpJson, JSON.stringify(summary, null, 2) + '\n');
    fs.renameSync(tmpJson, LAST_JSON);

    // Write human-readable summary
    const md = [
      '## Last Session Summary',
      '',
      `- **Date**: ${summary.date}`,
      `- **Messages**: ${summary.totalMessages}`,
      `- **Tools Used**: ${summary.toolsUsed.length > 0 ? summary.toolsUsed.join(', ') : 'none'}`,
      `- **Files Modified**: ${summary.filesModified.length > 0 ? summary.filesModified.length : 0}`,
      '',
    ];

    if (summary.filesModified.length > 0) {
      md.push('### Files');
      for (const f of summary.filesModified) {
        md.push(`- ${f}`);
      }
      md.push('');
    }

    if (summary.userMessages.length > 0) {
      md.push('### Recent User Messages');
      for (const msg of summary.userMessages.slice(-5)) {
        md.push(`- ${msg.slice(0, 100)}${msg.length > 100 ? '...' : ''}`);
      }
      md.push('');
    }

    fs.writeFileSync(LAST_MD, md.join('\n') + '\n');

    // Update current.json with latest timestamp if it exists
    if (fs.existsSync(CURRENT_JSON)) {
      try {
        const current = JSON.parse(fs.readFileSync(CURRENT_JSON, 'utf-8'));
        current.timestamp = summary.date;
        current.lastSessionMessages = summary.totalMessages;
        const tmpCurrent = CURRENT_JSON + '.tmp';
        fs.writeFileSync(tmpCurrent, JSON.stringify(current, null, 2) + '\n');
        fs.renameSync(tmpCurrent, CURRENT_JSON);
      } catch {
        // Skip if current.json is corrupted
      }
    }
  } catch {
    // Never block session end — exit cleanly
    process.exit(0);
  }
}

main();
