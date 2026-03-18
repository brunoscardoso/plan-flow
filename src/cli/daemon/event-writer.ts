/**
 * Event writer — appends NotificationEvent records to a JSONL file.
 * Uses atomic write (write-to-temp then rename) to prevent corruption.
 */

import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import type { NotificationEvent, NotificationLevel, NotificationType } from '../types.js';

const EVENTS_FILENAME = '.heartbeat-events.jsonl';

/**
 * Build the full path to the events file for a given flow directory.
 */
function eventsPath(flowDir: string): string {
  return join(flowDir, EVENTS_FILENAME);
}

/**
 * Create a NotificationEvent with an auto-generated id and current timestamp.
 */
export function createEvent(
  task: string,
  type: NotificationType,
  level: NotificationLevel,
  message: string,
  phase?: string,
): NotificationEvent {
  return {
    id: randomUUID(),
    timestamp: new Date(),
    task,
    type,
    level,
    phase,
    message,
  };
}

/**
 * Append a single event to the JSONL file using atomic write.
 *
 * Reads the existing file (if any), appends the new JSON line,
 * writes to a temp file, then renames over the original.
 */
export async function appendEvent(
  flowDir: string,
  event: NotificationEvent,
): Promise<void> {
  const filePath = eventsPath(flowDir);
  const dir = dirname(filePath);

  await mkdir(dir, { recursive: true });

  let existing = '';
  try {
    existing = await readFile(filePath, 'utf-8');
  } catch {
    // File does not exist yet — start fresh
  }

  const line = JSON.stringify({
    ...event,
    timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
  });

  const updated = existing ? `${existing.trimEnd()}\n${line}\n` : `${line}\n`;

  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, updated, 'utf-8');
  await rename(tempPath, filePath);
}

/**
 * Read all events from the JSONL file. Returns an empty array if the file
 * does not exist.
 */
export async function readEvents(flowDir: string): Promise<NotificationEvent[]> {
  const filePath = eventsPath(flowDir);

  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return [];
  }

  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const parsed = JSON.parse(line);
      return { ...parsed, timestamp: new Date(parsed.timestamp) };
    });
}
