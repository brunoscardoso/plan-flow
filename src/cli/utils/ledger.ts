/**
 * Ledger utility for reading, writing, and updating instincts in flow/ledger.md.
 *
 * Handles file I/O only — the AI decides what patterns to extract.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

/** A confidence-weighted instinct entry in the project ledger. */
export interface Instinct {
  id: string;
  confidence: number;
  trigger: string;
  action: string;
  evidence: string;
  lastUpdated: string;
}

const LEDGER_FILENAME = 'ledger.md';
const FLOW_DIR = 'flow';
const MIN_CONFIDENCE = 0.3;
const MAX_CONFIDENCE = 0.9;
const CONFIDENCE_BUMP = 0.1;

const LEDGER_HEADER = `# Project Ledger

> Persistent learning journal - updated automatically across sessions.
> Last updated: ${new Date().toISOString().slice(0, 10)}

## Project Quirks

<!-- Unexpected behaviors, environment gotchas, undocumented constraints -->

## What Works

<!-- Proven approaches and solutions for this project -->

## What Didn't Work

<!-- Failed approaches with brief "why" so we don't repeat them -->

## User Preferences

<!-- How the user likes things done beyond what rules files capture -->

## Domain Context

<!-- Business logic, terminology, and concepts that affect decisions -->
`;

/**
 * Get the path to the ledger file within a target directory.
 */
function ledgerPath(targetDir: string): string {
  return join(targetDir, FLOW_DIR, LEDGER_FILENAME);
}

/**
 * Ensure the ledger file exists. Creates it with the standard header if missing.
 */
export function ensureLedger(targetDir: string): void {
  const filePath = ledgerPath(targetDir);
  if (existsSync(filePath)) return;

  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, LEDGER_HEADER, 'utf-8');
}

/**
 * Parse instincts from the ledger file. Returns empty array if file is missing.
 */
export function readLedger(targetDir: string): Instinct[] {
  const filePath = ledgerPath(targetDir);
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, 'utf-8');
  return parseInstincts(content);
}

/**
 * Write or update an instinct in the ledger.
 *
 * - If the instinct ID already exists: bumps confidence by 0.1 (max 0.9),
 *   updates evidence and date.
 * - If new: appends to the "What Works" section with confidence 0.3.
 * - Creates the ledger file if missing.
 *
 * Returns 'created' or 'updated'.
 */
export function writeInstinct(
  targetDir: string,
  instinct: Instinct
): 'created' | 'updated' {
  ensureLedger(targetDir);
  const filePath = ledgerPath(targetDir);
  const content = readFileSync(filePath, 'utf-8');
  const existing = parseInstincts(content);

  const match = existing.find((i) => i.id === instinct.id);

  if (match) {
    const newConfidence = Math.min(
      Math.round((match.confidence + CONFIDENCE_BUMP) * 10) / 10,
      MAX_CONFIDENCE
    );
    const updated: Instinct = {
      ...match,
      confidence: newConfidence,
      evidence: instinct.evidence,
      lastUpdated: instinct.lastUpdated,
    };
    const oldBlock = formatInstinct(match);
    const newBlock = formatInstinct(updated);
    const updatedContent = content.replace(oldBlock, newBlock);
    writeFileSync(filePath, updatedContent, 'utf-8');
    return 'updated';
  }

  // New instinct — append to "What Works" section
  const normalized: Instinct = {
    ...instinct,
    confidence: MIN_CONFIDENCE,
  };
  const block = formatInstinct(normalized);

  // Find "## What Works" section and append after the comment line
  const whatWorksPattern = /## What Works\n\n<!-- .+? -->/;
  const whatWorksMatch = content.match(whatWorksPattern);

  let updatedContent: string;
  if (whatWorksMatch) {
    updatedContent = content.replace(
      whatWorksMatch[0],
      whatWorksMatch[0] + '\n\n' + block
    );
  } else {
    // Fallback: append to end of file
    updatedContent = content.trimEnd() + '\n\n' + block + '\n';
  }

  writeFileSync(filePath, updatedContent, 'utf-8');
  return 'created';
}

/**
 * Format a single instinct as a markdown block matching the ledger spec.
 */
export function formatInstinct(instinct: Instinct): string {
  return [
    `### ${instinct.id} [confidence: ${instinct.confidence.toFixed(1)}]`,
    `**Trigger:** ${instinct.trigger}`,
    `**Action:** ${instinct.action}`,
    `**Evidence:** ${instinct.evidence}`,
    `**Last updated:** ${instinct.lastUpdated}`,
  ].join('\n');
}

/**
 * Parse all instinct blocks from ledger content.
 */
function parseInstincts(content: string): Instinct[] {
  const instincts: Instinct[] = [];
  const pattern =
    /### ([\w-]+) \[confidence: ([\d.]+)\]\n\*\*Trigger:\*\* (.+)\n\*\*Action:\*\* (.+)\n\*\*Evidence:\*\* (.+)\n\*\*Last updated:\*\* (.+)/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    instincts.push({
      id: match[1],
      confidence: parseFloat(match[2]),
      trigger: match[3],
      action: match[4],
      evidence: match[5],
      lastUpdated: match[6],
    });
  }

  return instincts;
}
