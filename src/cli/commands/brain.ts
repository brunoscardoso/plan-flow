/**
 * Brain CLI command
 *
 * Provides semantic search and indexing over the shared planflow-brain knowledge base.
 * The brain directory defaults to ~/plan-flow/brain but can be overridden with --brain-dir.
 *
 * Subcommands:
 *   search <query>   Hybrid semantic + keyword search
 *   ingest <file>    Index a markdown file into the brain
 *   rebuild          Rebuild entire index from markdown files on disk
 *   stats            Show brain statistics
 *   sync             Incremental sync (re-index only changed files)
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { homedir } from 'node:os';
import * as log from '../utils/logger.js';

const DEFAULT_BRAIN_DIR = join(homedir(), 'plan-flow', 'brain');

export interface BrainOptions {
  brainDir?: string;
  limit?: number;
  type?: string;
}

export async function runBrain(action: string, args: string[], options: BrainOptions): Promise<void> {
  const brainDir = options.brainDir
    ? resolve(options.brainDir)
    : resolve(DEFAULT_BRAIN_DIR);

  const { Brain } = await import('planflow-brain');

  switch (action) {
    case 'search': {
      if (args.length === 0) {
        log.error('Usage: brain search <query>');
        process.exit(1);
      }
      const query = args.join(' ');
      log.info(`Searching brain at ${brainDir}...`);
      const brain = await Brain.open(brainDir);
      try {
        const results = await brain.search(query, {
          limit: options.limit ?? 10,
          chunkTypes: options.type ? [options.type] : undefined,
        });
        if (results.length === 0) {
          log.info('No results found.');
        } else {
          log.header(`${results.length} result(s) for: "${query}"`);
          log.blank();
          for (const r of results) {
            const location = r.heading ? `${r.sourceFile} › ${r.heading}` : r.sourceFile;
            console.log(`  [${(r.score * 100).toFixed(1)}%] ${location}`);
            const preview = r.text.slice(0, 200).replace(/\n/g, ' ');
            const ellipsis = r.text.length > 200 ? '...' : '';
            console.log(`         ${preview}${ellipsis}`);
            log.blank();
          }
        }
      } finally {
        brain.close();
      }
      break;
    }

    case 'ingest': {
      if (args.length === 0) {
        log.error('Usage: brain ingest <file>');
        process.exit(1);
      }
      const filePath = resolve(args[0]);
      if (!existsSync(filePath)) {
        log.error(`File not found: ${filePath}`);
        process.exit(1);
      }
      const content = readFileSync(filePath, 'utf-8');
      const relPath = basename(filePath);
      log.info(`Ingesting ${filePath} into brain at ${brainDir}...`);
      const brain = await Brain.open(brainDir);
      try {
        await brain.ingest(relPath, content);
        log.success(`Ingested: ${relPath}`);
      } finally {
        brain.close();
      }
      break;
    }

    case 'rebuild': {
      log.info(`Rebuilding brain index at ${brainDir}...`);
      const brain = await Brain.open(brainDir);
      try {
        const stats = await brain.rebuild();
        log.success(
          `Rebuild complete: ${stats.filesIndexed} files, ${stats.chunksCreated} chunks (${stats.durationMs}ms)`
        );
      } finally {
        brain.close();
      }
      break;
    }

    case 'stats': {
      const brain = await Brain.open(brainDir);
      try {
        const stats = brain.stats();
        log.header('Brain Stats');
        console.log(`  Location:  ${brainDir}`);
        console.log(`  Files:     ${stats.totalFiles}`);
        console.log(`  Chunks:    ${stats.totalChunks}`);
        console.log(`  DB size:   ${(stats.dbSizeBytes / 1024).toFixed(1)} KB`);
        console.log(`  Last sync: ${stats.lastIndexed ?? 'never'}`);
      } finally {
        brain.close();
      }
      break;
    }

    case 'sync': {
      log.info(`Syncing brain at ${brainDir}...`);
      const brain = await Brain.open(brainDir);
      try {
        const stats = await brain.sync();
        log.success(
          `Sync complete: +${stats.filesAdded} added, ~${stats.filesUpdated} updated, -${stats.filesRemoved} removed (${stats.durationMs}ms)`
        );
      } finally {
        brain.close();
      }
      break;
    }

    default:
      log.error(`Unknown brain action: "${action}". Valid actions: search, ingest, rebuild, stats, sync`);
      process.exit(1);
  }
}
