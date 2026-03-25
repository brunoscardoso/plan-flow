/**
 * State Query CLI command
 *
 * Searches the project-scoped brain index and outputs matching results as JSON.
 */

import { openProjectBrain, queryProjectBrain, closeProjectBrain } from '../state/brain-query.js';
import type { QueryOptions } from '../state/brain-query.js';

export async function runStateQuery(options: {
  query: string;
  scope?: string;
  type?: string;
  limit?: number;
  target: string;
}): Promise<void> {
  let brain: any = null;

  try {
    brain = await openProjectBrain(options.target);

    if (!brain) {
      process.stdout.write(
        JSON.stringify({ results: [], warning: 'Project brain unavailable' }, null, 2) + '\n',
      );
      return;
    }

    const queryOpts: QueryOptions = {
      scope: (options.scope as QueryOptions['scope']) ?? 'all',
      type: options.type,
      limit: options.limit ?? 10,
    };

    const results = await queryProjectBrain(brain, options.query, queryOpts);

    process.stdout.write(JSON.stringify({ results }, null, 2) + '\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(JSON.stringify({ error: message }, null, 2) + '\n');
    process.exitCode = 1;
  } finally {
    closeProjectBrain(brain);
  }
}
