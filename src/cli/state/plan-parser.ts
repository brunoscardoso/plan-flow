/**
 * Plan markdown parser
 *
 * Parses plan files (flow/plans/plan_*.md) into structured PlanPhase objects.
 * Extracts phase headers, complexity scores, dependencies, tasks, and verify tags.
 */

import { readFileSync } from 'node:fs';
import type { PlanPhase, PlanTask } from './types.js';

const PHASE_HEADER_RE = /^### Phase (\d+):\s*(.+)$/;
const COMPLEXITY_RE = /\*\*Complexity\*\*:\s*(\d+)\/10/;
const DEPENDENCIES_RE = /\*\*Dependencies\*\*:\s*(.+)/;
const TASK_RE = /^- \[[ x]\]\s+(.+)$/;
const VERIFY_RE = /<verify>(.+)<\/verify>/;
const PHASE_REF_RE = /Phase\s+(\d+)/gi;

const DEFAULT_COMPLEXITY = 5;

/**
 * Parses a plan markdown file and returns an array of PlanPhase objects.
 */
export function parsePlan(planPath: string): PlanPhase[] {
  const content = readFileSync(planPath, 'utf-8');
  return parsePlanContent(content);
}

/**
 * Parses plan markdown content (for testability without file I/O).
 */
export function parsePlanContent(content: string): PlanPhase[] {
  const phases: PlanPhase[] = [];
  const lines = content.split('\n');

  let currentPhase: {
    number: number;
    name: string;
    complexity: number | null;
    dependencies: number[] | null;
    tasks: PlanTask[];
  } | null = null;

  let lastTaskIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Phase header
    const headerMatch = trimmed.match(PHASE_HEADER_RE);
    if (headerMatch) {
      // Save previous phase
      if (currentPhase) {
        phases.push(finalizePhase(currentPhase));
      }

      currentPhase = {
        number: parseInt(headerMatch[1], 10),
        name: headerMatch[2].trim(),
        complexity: null,
        dependencies: null,
        tasks: [],
      };
      lastTaskIndex = -1;
      continue;
    }

    if (!currentPhase) continue;

    // Complexity
    const complexityMatch = trimmed.match(COMPLEXITY_RE);
    if (complexityMatch) {
      currentPhase.complexity = parseInt(complexityMatch[1], 10);
      continue;
    }

    // Dependencies
    const depsMatch = trimmed.match(DEPENDENCIES_RE);
    if (depsMatch) {
      const depsValue = depsMatch[1].trim();

      if (/^none$/i.test(depsValue)) {
        currentPhase.dependencies = [];
      } else {
        const depNumbers: number[] = [];
        let match: RegExpExecArray | null;
        // Reset regex state for each use
        const phaseRefRe = /Phase\s+(\d+)/gi;
        while ((match = phaseRefRe.exec(depsValue)) !== null) {
          depNumbers.push(parseInt(match[1], 10));
        }
        currentPhase.dependencies = depNumbers.length > 0 ? depNumbers : [];
      }
      continue;
    }

    // Task line
    const taskMatch = trimmed.match(TASK_RE);
    if (taskMatch) {
      const taskName = taskMatch[1].trim();
      currentPhase.tasks.push({ index: currentPhase.tasks.length + 1, name: taskName, verify_command: null });
      lastTaskIndex = currentPhase.tasks.length - 1;
      continue;
    }

    // Verify tag (must follow a task line)
    if (lastTaskIndex >= 0) {
      const verifyMatch = trimmed.match(VERIFY_RE);
      if (verifyMatch) {
        currentPhase.tasks[lastTaskIndex].verify_command = verifyMatch[1].trim();
        lastTaskIndex = -1;
        continue;
      }

      // If non-empty, non-verify line after a task, reset lastTaskIndex
      if (trimmed !== '') {
        lastTaskIndex = -1;
      }
    }
  }

  // Save the last phase
  if (currentPhase) {
    phases.push(finalizePhase(currentPhase));
  }

  return phases;
}

function finalizePhase(phase: {
  number: number;
  name: string;
  complexity: number | null;
  dependencies: number[] | null;
  tasks: PlanTask[];
}): PlanPhase {
  const complexity = phase.complexity ?? DEFAULT_COMPLEXITY;

  // Dependencies: if explicitly set, use them; otherwise sequential fallback
  let dependencies: number[];
  if (phase.dependencies !== null) {
    dependencies = phase.dependencies;
  } else {
    // Sequential fallback: depend on previous phase, Phase 1 has no deps
    dependencies = phase.number > 1 ? [phase.number - 1] : [];
  }

  return {
    number: phase.number,
    name: phase.name,
    complexity,
    dependencies,
    tasks: phase.tasks,
  };
}
