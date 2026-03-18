/**
 * STATE.md Parser
 *
 * Parses `flow/STATE.md` into a structured ExecutionState object.
 * Uses regex-based line parsing consistent with flowconfig-parser and plan-parser patterns.
 * Returns null if STATE.md doesn't exist.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Blocker, CompletedPhase, Decision, ExecutionState } from './types.js';

const SECTION_RE = /^## (.+)$/;
const BOLD_KV_RE = /^- \*\*(.+?)\*\*:\s*(.*)$/;
const BULLET_RE = /^- (.+)$/;
const UPDATED_RE = /^\*\*Updated\*\*:\s*(.+)$/;
const COMPLETED_PHASE_RE = /^Phase (\d+):\s*(.+?)\s*—\s*(.+)$/;
const CURRENT_PHASE_RE = /^(\d+)\s*—\s*(.+)$/;

/**
 * Parse `flow/STATE.md` into a structured ExecutionState object.
 * Returns null if STATE.md doesn't exist.
 */
export function parseStateMd(flowDir: string): ExecutionState | null {
  const statePath = join(flowDir, 'STATE.md');

  if (!existsSync(statePath)) {
    return null;
  }

  let content: string;
  try {
    content = readFileSync(statePath, 'utf-8');
  } catch {
    return null;
  }

  return parseStateMdContent(content);
}

/**
 * Parse STATE.md content string (for testability without file I/O).
 */
export function parseStateMdContent(content: string): ExecutionState {
  const state: ExecutionState = {
    active_skill: null,
    active_plan: null,
    current_phase: null,
    current_task: null,
    completed_phases: [],
    decisions: [],
    blockers: [],
    files_modified: [],
    next_action: null,
    updated_at: null,
  };

  const lines = content.split('\n');
  let currentSection = '';
  let inCompletedPhases = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Updated timestamp (outside sections)
    const updatedMatch = trimmed.match(UPDATED_RE);
    if (updatedMatch) {
      state.updated_at = updatedMatch[1].trim();
      continue;
    }

    // Section header
    const sectionMatch = trimmed.match(SECTION_RE);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      inCompletedPhases = false;
      continue;
    }

    if (currentSection === 'Execution State') {
      parseExecutionStateLine(trimmed, state, inCompletedPhases);

      // Track if we just entered completed phases sub-list
      const kvMatch = trimmed.match(BOLD_KV_RE);
      if (kvMatch && kvMatch[1] === 'Completed Phases') {
        inCompletedPhases = true;
      } else if (kvMatch && kvMatch[1] !== 'Completed Phases') {
        inCompletedPhases = false;
      }
      // Indented bullets under Completed Phases
      if (inCompletedPhases && line.match(/^\s{2,}- /)) {
        const indentedContent = trimmed.replace(/^- /, '');
        const phaseMatch = indentedContent.match(COMPLETED_PHASE_RE);
        if (phaseMatch) {
          state.completed_phases.push({
            number: parseInt(phaseMatch[1], 10),
            name: phaseMatch[2].trim(),
            outcome: phaseMatch[3].trim(),
          });
        }
      }
    } else if (currentSection === 'Decisions') {
      parseDecisionLine(trimmed, state);
    } else if (currentSection === 'Blockers') {
      parseBlockerLine(trimmed, state);
    } else if (currentSection === 'Files Modified') {
      parseFileModifiedLine(trimmed, state);
    } else if (currentSection === 'Next Action') {
      parseNextActionLine(trimmed, state);
    }
  }

  return state;
}

/**
 * Parse a line within the Execution State section.
 */
function parseExecutionStateLine(trimmed: string, state: ExecutionState, inCompletedPhases: boolean): void {
  if (inCompletedPhases) return;

  const kvMatch = trimmed.match(BOLD_KV_RE);
  if (!kvMatch) return;

  const key = kvMatch[1].trim();
  const value = kvMatch[2].trim();

  switch (key) {
    case 'Active Skill':
      state.active_skill = value;
      break;
    case 'Active Plan':
      state.active_plan = value;
      break;
    case 'Current Phase': {
      const phaseMatch = value.match(CURRENT_PHASE_RE);
      if (phaseMatch) {
        state.current_phase = {
          number: parseInt(phaseMatch[1], 10),
          name: phaseMatch[2].trim(),
        };
      }
      break;
    }
    case 'Current Task':
      state.current_task = value;
      break;
  }
}

/**
 * Parse a decision bullet line.
 * Format: "- Chose X over Y (reason: Z)" or "- Decision text (reason: explanation)"
 */
function parseDecisionLine(trimmed: string, state: ExecutionState): void {
  const bulletMatch = trimmed.match(BULLET_RE);
  if (!bulletMatch) return;

  const text = bulletMatch[1].trim();
  const reasonMatch = text.match(/^(.+?)\s*\(reason:\s*(.+?)\)$/);

  if (reasonMatch) {
    const decisionText = reasonMatch[1].trim();
    // Try to extract "Chose X over Y" pattern
    const choseMatch = decisionText.match(/^(?:Chose|Used)\s+(.+?)(?:\s+(?:over|for|instead of)\s+(.+))?$/i);
    if (choseMatch) {
      state.decisions.push({
        decision: decisionText,
        choice: choseMatch[1].trim(),
        reason: reasonMatch[2].trim(),
      });
    } else {
      state.decisions.push({
        decision: decisionText,
        choice: decisionText,
        reason: reasonMatch[2].trim(),
      });
    }
  } else {
    state.decisions.push({
      decision: text,
      choice: text,
      reason: '',
    });
  }
}

/**
 * Parse a blocker bullet line.
 * Format: "- Issue description (status: X, tried: Y)"
 */
function parseBlockerLine(trimmed: string, state: ExecutionState): void {
  const bulletMatch = trimmed.match(BULLET_RE);
  if (!bulletMatch) return;

  const text = bulletMatch[1].trim();
  const detailsMatch = text.match(/^(.+?)\s*\(status:\s*(.+?),\s*tried:\s*(.+?)\)$/);

  if (detailsMatch) {
    state.blockers.push({
      issue: detailsMatch[1].trim(),
      status: detailsMatch[2].trim(),
      tried: detailsMatch[3].trim(),
    });
  } else {
    state.blockers.push({
      issue: text,
      status: 'unknown',
      tried: '',
    });
  }
}

/**
 * Parse a file path bullet line.
 */
function parseFileModifiedLine(trimmed: string, state: ExecutionState): void {
  const bulletMatch = trimmed.match(BULLET_RE);
  if (!bulletMatch) return;

  const filePath = bulletMatch[1].trim();
  if (filePath) {
    state.files_modified.push(filePath);
  }
}

/**
 * Parse the next action line (first non-empty line in the section).
 */
function parseNextActionLine(trimmed: string, state: ExecutionState): void {
  if (trimmed && !state.next_action) {
    state.next_action = trimmed;
  }
}
