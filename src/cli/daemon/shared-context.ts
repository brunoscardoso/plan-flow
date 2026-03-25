/**
 * Shared context system — manages inter-agent communication during
 * parallel wave execution via an append-only JSONL file.
 *
 * Uses atomic write (write-to-temp then rename) to prevent corruption,
 * following the same pattern as event-writer.ts.
 */

import { readFile, writeFile, rename, unlink, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { ContextEntry, ContractConflict, ContractData } from '../state/types.js';

const CONTEXT_FILENAME = '.wave-context.jsonl';

/**
 * Build the full path to the context file for a given flow directory.
 */
function contextPath(flowDir: string): string {
  return join(flowDir, CONTEXT_FILENAME);
}

/**
 * Create an empty context file for a new wave.
 * Ensures the parent directory exists.
 */
export async function createContextFile(flowDir: string): Promise<void> {
  const filePath = contextPath(flowDir);
  const dir = dirname(filePath);

  await mkdir(dir, { recursive: true });
  await writeFile(filePath, '', 'utf-8');
}

/**
 * Append a single context entry using atomic write.
 *
 * Reads the existing file (if any), appends the new JSON line,
 * writes to a temp file, then renames over the original.
 */
export async function appendContextEntry(
  flowDir: string,
  entry: ContextEntry,
): Promise<void> {
  const filePath = contextPath(flowDir);
  const dir = dirname(filePath);

  await mkdir(dir, { recursive: true });

  let existing = '';
  try {
    existing = await readFile(filePath, 'utf-8');
  } catch {
    // File does not exist yet — start fresh
  }

  const line = JSON.stringify(entry);
  const updated = existing ? `${existing.trimEnd()}\n${line}\n` : `${line}\n`;

  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, updated, 'utf-8');
  await rename(tempPath, filePath);
}

/**
 * Read all context entries from the JSONL file.
 * Returns an empty array if the file does not exist.
 */
export async function readContextEntries(flowDir: string): Promise<ContextEntry[]> {
  const filePath = contextPath(flowDir);

  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return [];
  }

  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as ContextEntry);
}

/**
 * Delete the context file (between waves or after execution).
 * Silently succeeds if the file does not exist.
 */
export async function clearContextFile(flowDir: string): Promise<void> {
  const filePath = contextPath(flowDir);

  try {
    await unlink(filePath);
  } catch {
    // File does not exist — nothing to clear
  }
}

/**
 * Detect contract conflicts: same name but different signature or fields.
 *
 * Groups contract entries by name, then checks each group for
 * differing signatures or field lists.
 */
export function detectContractConflicts(entries: ContextEntry[]): ContractConflict[] {
  const contractEntries = entries.filter((e) => e.type === 'contract');

  const grouped = new Map<string, { agent: string; data: ContractData }[]>();

  for (const entry of contractEntries) {
    const data = entry.data as ContractData;
    const group = grouped.get(data.name) ?? [];
    group.push({ agent: entry.agent, data });
    grouped.set(data.name, group);
  }

  const conflicts: ContractConflict[] = [];

  for (const [name, group] of grouped) {
    if (group.length < 2) continue;

    let hasConflict = false;
    const first = group[0];

    for (let i = 1; i < group.length; i++) {
      const current = group[i];

      if (first.data.signature !== current.data.signature) {
        hasConflict = true;
        break;
      }

      const firstFields = [...(first.data.fields ?? [])].sort();
      const currentFields = [...(current.data.fields ?? [])].sort();

      if (firstFields.length !== currentFields.length ||
          firstFields.some((f, idx) => f !== currentFields[idx])) {
        hasConflict = true;
        break;
      }
    }

    if (hasConflict) {
      conflicts.push({
        name,
        entries: group.map((g) => ({
          agent: g.agent,
          signature: g.data.signature,
          fields: g.data.fields,
        })),
      });
    }
  }

  return conflicts;
}
