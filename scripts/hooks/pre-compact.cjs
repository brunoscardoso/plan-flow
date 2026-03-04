#!/usr/bin/env node
'use strict';

/**
 * Plan-Flow PreCompact Hook
 *
 * Runs before Claude Code compacts context. Writes execution state to
 * flow/state/ so the session can resume after compaction.
 *
 * NOTE: PreCompact stdout is NOT visible to Claude — all output goes to files.
 */

const fs = require('fs');
const path = require('path');

const STATE_DIR = path.join(process.cwd(), 'flow', 'state');
const STATE_JSON = path.join(STATE_DIR, 'current.json');
const STATE_MD = path.join(STATE_DIR, 'current.md');
const COMPACTION_LOG = path.join(STATE_DIR, 'compaction-log.txt');

try {
  // Ensure state directory exists
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }

  // Read existing state or start fresh
  let state = {};
  if (fs.existsSync(STATE_JSON)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_JSON, 'utf-8'));
    } catch {
      // Corrupted JSON — start fresh
    }
  }

  // Preserve session start timestamp across compactions
  const sessionStartPath = path.join(STATE_DIR, 'session-start.json');
  if (!state.sessionStart && fs.existsSync(sessionStartPath)) {
    try {
      const startData = JSON.parse(fs.readFileSync(sessionStartPath, 'utf-8'));
      if (startData.start) state.sessionStart = startData.start;
    } catch {
      // Non-critical
    }
  }

  // Update state with compaction marker
  const now = new Date().toISOString();
  state.lastCompaction = now;
  state.compactionCount = (state.compactionCount || 0) + 1;
  state.timestamp = now;

  // Atomic write: temp file + rename
  const tmpJson = STATE_JSON + '.tmp';
  fs.writeFileSync(tmpJson, JSON.stringify(state, null, 2) + '\n');
  fs.renameSync(tmpJson, STATE_JSON);

  // Write human-readable summary for LLM consumption
  const lines = [
    '## Active Workflow State',
    '',
    state.plan ? `- **Plan**: ${state.plan}` : '- **Plan**: none',
    state.phase != null
      ? `- **Progress**: Phase ${state.phase} of ${state.totalPhases || '?'}`
      : '- **Progress**: no active phase',
    state.phasesCompleted && state.phasesCompleted.length > 0
      ? `- **Completed**: Phases ${state.phasesCompleted.join(', ')} (verified)`
      : '- **Completed**: none',
    state.branch ? `- **Branch**: ${state.branch}` : null,
    `- **Last Activity**: ${now}`,
    `- **Compactions**: ${state.compactionCount}`,
    '',
  ];
  fs.writeFileSync(STATE_MD, lines.filter((l) => l !== null).join('\n') + '\n');

  // Append to compaction log
  fs.appendFileSync(
    COMPACTION_LOG,
    `${now} | compaction #${state.compactionCount}\n`
  );
} catch {
  // Never block compaction — exit cleanly on any error
  process.exit(0);
}
