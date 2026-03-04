#!/usr/bin/env node
'use strict';

/**
 * Plan-Flow SessionStart Hook
 *
 * Runs when Claude Code starts a new session. Reads execution state from
 * flow/state/ and outputs resume context to stdout.
 *
 * NOTE: SessionStart stdout IS visible to Claude — used for context injection.
 */

const fs = require('fs');
const path = require('path');

const STATE_DIR = path.join(process.cwd(), 'flow', 'state');
const STATE_JSON = path.join(STATE_DIR, 'current.json');
const AUTOPILOT = path.join(process.cwd(), 'flow', '.autopilot');
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

try {
  const lines = [];

  // Check for active execution state
  if (fs.existsSync(STATE_JSON)) {
    const state = JSON.parse(fs.readFileSync(STATE_JSON, 'utf-8'));
    const stateAge = Date.now() - new Date(state.timestamp).getTime();

    if (stateAge > SEVEN_DAYS_MS) {
      lines.push('[Plan-Flow] Stale execution state detected (> 7 days old).');
      lines.push(
        `  Last activity: ${state.timestamp}` +
          (state.plan ? ` | Plan: ${state.plan}` : '')
      );
      lines.push(
        '  Consider clearing with: rm flow/state/current.json'
      );
    } else {
      lines.push('[Plan-Flow] Resumable execution state found:');

      if (state.plan) {
        lines.push(`  Plan: ${state.plan}`);
      }
      if (state.phase != null && state.totalPhases) {
        lines.push(`  Progress: Phase ${state.phase} of ${state.totalPhases}`);
      }
      if (state.phasesCompleted && state.phasesCompleted.length > 0) {
        lines.push(
          `  Completed: Phases ${state.phasesCompleted.join(', ')}`
        );
      }
      if (state.branch) {
        lines.push(`  Branch: ${state.branch}`);
      }
      lines.push(`  Last activity: ${state.timestamp}`);
      if (state.lastCompaction) {
        lines.push(
          `  Last compaction: ${state.lastCompaction} (${state.compactionCount || 1}x)`
        );
      }
      lines.push('');
      lines.push(
        '  To resume: /execute-plan @flow/plans/' + (state.plan || '<plan-file>')
      );
      lines.push('  To start fresh: rm flow/state/current.json');
    }
  }

  // Check autopilot status
  if (fs.existsSync(AUTOPILOT)) {
    lines.push('[Plan-Flow] Autopilot mode: ON');
  }

  // Output to stdout (visible to Claude)
  if (lines.length > 0) {
    console.log(lines.join('\n'));
  }
} catch {
  // Never block session start — exit silently on any error
}
