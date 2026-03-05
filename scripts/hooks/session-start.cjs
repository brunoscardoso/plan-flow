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
const SESSION_START_JSON = path.join(STATE_DIR, 'session-start.json');
const AUTOPILOT = path.join(process.cwd(), 'flow', '.autopilot');
const AUTOPILOT_PROGRESS = path.join(STATE_DIR, 'autopilot-progress.md');
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

try {
  // Persist session start timestamp for duration calculation in session-end hook
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
  const startData = JSON.stringify({ start: new Date().toISOString() });
  fs.writeFileSync(SESSION_START_JSON, startData + '\n');

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

    // Check for autopilot progress file
    if (fs.existsSync(AUTOPILOT_PROGRESS)) {
      const progressContent = fs.readFileSync(AUTOPILOT_PROGRESS, 'utf-8');

      // Extract feature name
      const featureMatch = progressContent.match(/\*\*Feature\*\*:\s*(.+)/);
      const workflowMatch = progressContent.match(/\*\*Workflow\*\*:\s*(.+)/);

      // Parse step table to find progress
      const stepLines = progressContent.split('\n').filter(
        (l) => /^\|\s*\d+\s*\|/.test(l)
      );
      const totalSteps = stepLines.length;
      const doneSteps = stepLines.filter((l) => /\|\s*done\s*\|/.test(l));
      const inProgressStep = stepLines.find((l) => /\|\s*in-progress\s*\|/.test(l));

      // Extract current step name
      let currentStepName = '';
      if (inProgressStep) {
        const parts = inProgressStep.split('|').map((p) => p.trim());
        currentStepName = parts[2] || '';
      }

      // Extract current context section
      const contextMatch = progressContent.match(
        /## Current Context\s*\n\n([\s\S]*?)(?:\n##|\n*$)/
      );
      const currentContext = contextMatch
        ? contextMatch[1].trim()
        : '';

      lines.push('[Plan-Flow] Autopilot workflow in progress:');
      if (featureMatch) {
        lines.push(`  Feature: ${featureMatch[1].trim()}`);
      }
      if (workflowMatch) {
        lines.push(`  Workflow: ${workflowMatch[1].trim()}`);
      }
      if (totalSteps > 0) {
        lines.push(
          `  Progress: Step ${doneSteps.length + 1} of ${totalSteps}` +
            (currentStepName ? ` (${currentStepName})` : '')
        );
      }
      if (doneSteps.length > 0) {
        const doneNames = doneSteps.map((l) => {
          const parts = l.split('|').map((p) => p.trim());
          return parts[2] || '';
        });
        lines.push(`  Completed: ${doneNames.join(', ')}`);
      }
      if (currentContext) {
        lines.push(`  Context: ${currentContext}`);
      }
    }
  }

  // Output to stdout (visible to Claude)
  if (lines.length > 0) {
    console.log(lines.join('\n'));
  }
} catch {
  // Never block session start — exit silently on any error
}
