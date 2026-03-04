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
const crypto = require('crypto');

const STATE_DIR = path.join(process.cwd(), 'flow', 'state');
const LAST_JSON = path.join(STATE_DIR, 'last-session.json');
const LAST_MD = path.join(STATE_DIR, 'last-session.md');
const CURRENT_JSON = path.join(STATE_DIR, 'current.json');
const SESSION_START_JSON = path.join(STATE_DIR, 'session-start.json');
const SESSIONS_DIR = path.join(process.cwd(), 'flow', 'brain', 'sessions');

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

    // Create per-session brain file (only if meaningful activity)
    if (summary.totalMessages > 0 && fs.existsSync(SESSIONS_DIR)) {
      const now = new Date(summary.date);
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toISOString().slice(11, 16).replace(':', '-');
      const shortHash = crypto.randomBytes(3).toString('hex');
      const sessionId = `${dateStr}_${timeStr}_${shortHash}`;

      // Read start timestamp if available
      let startIso = summary.date;
      try {
        if (fs.existsSync(SESSION_START_JSON)) {
          const startData = JSON.parse(fs.readFileSync(SESSION_START_JSON, 'utf-8'));
          if (startData.start) startIso = startData.start;
        }
      } catch {
        // Use end time as fallback
      }

      const endIso = summary.date;
      const startMs = new Date(startIso).getTime();
      const endMs = new Date(endIso).getTime();
      const durationMin = Math.max(0, Math.round((endMs - startMs) / 60000));
      const timeDisplay = now.toISOString().slice(11, 16);

      // Build frontmatter
      const frontmatter = [
        '---',
        `id: ${sessionId}`,
        `date: ${dateStr}`,
        `start: ${startIso}`,
        `end: ${endIso}`,
        `duration_min: ${durationMin}`,
        `messages: ${summary.totalMessages}`,
        `skills: []`,
        `features: []`,
        `files_changed: ${summary.filesModified.length}`,
        '---',
      ];

      // Build body
      const body = [
        '',
        `# Session: ${dateStr} ${timeDisplay}`,
        '',
        '**Project**: [[cli]]',
        '',
        '## Activity',
        '',
        `- **Messages**: ${summary.totalMessages}`,
        `- **Duration**: ${durationMin} min`,
        `- **Tools Used**: ${summary.toolsUsed.length > 0 ? summary.toolsUsed.join(', ') : 'none'}`,
        `- **Files Changed**: ${summary.filesModified.length}`,
        '',
      ];

      if (summary.filesModified.length > 0) {
        body.push('## Files');
        body.push('');
        for (const f of summary.filesModified.slice(0, 20)) {
          body.push(`- ${f}`);
        }
        body.push('');
      }

      if (summary.userMessages.length > 0) {
        body.push('## User Messages');
        body.push('');
        for (const msg of summary.userMessages.slice(-5)) {
          body.push(`- ${msg.slice(0, 150)}${msg.length > 150 ? '...' : ''}`);
        }
        body.push('');
      }

      const sessionContent = frontmatter.join('\n') + body.join('\n') + '\n';
      const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.md`);
      const tmpSession = sessionFile + '.tmp';
      fs.writeFileSync(tmpSession, sessionContent);
      fs.renameSync(tmpSession, sessionFile);

      // Store session ID in last-session.json for brain-capture to find
      summary.sessionId = sessionId;
      const tmpJson2 = LAST_JSON + '.tmp';
      fs.writeFileSync(tmpJson2, JSON.stringify(summary, null, 2) + '\n');
      fs.renameSync(tmpJson2, LAST_JSON);

      // Clean up session-start.json
      try {
        if (fs.existsSync(SESSION_START_JSON)) {
          fs.unlinkSync(SESSION_START_JSON);
        }
      } catch {
        // Non-critical
      }
    }

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
