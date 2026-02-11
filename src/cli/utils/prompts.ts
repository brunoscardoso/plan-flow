/**
 * Interactive prompts using Node.js readline/promises
 */

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import type { Platform } from '../types.js';

/**
 * Asks the user which platforms to install for.
 * Returns selected platform names.
 */
export async function selectPlatforms(): Promise<Platform[]> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    console.log('\nWhich platform(s) would you like to install for?\n');
    console.log('  1. Claude Code  (.claude/commands/ + .claude/rules/)');
    console.log('  2. Cursor       (.cursor/commands/ + .cursor/rules/)');
    console.log('  3. OpenClaw     (skills/plan-flow/)');
    console.log('  4. Codex CLI    (.agents/skills/plan-flow/ + AGENTS.md)');
    console.log('  5. All of the above');
    console.log('');

    const answer = await rl.question('Enter your choice (1-5, comma-separated): ');

    const choices = answer
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const platforms: Platform[] = [];

    for (const choice of choices) {
      switch (choice) {
        case '1':
          if (!platforms.includes('claude')) platforms.push('claude');
          break;
        case '2':
          if (!platforms.includes('cursor')) platforms.push('cursor');
          break;
        case '3':
          if (!platforms.includes('openclaw')) platforms.push('openclaw');
          break;
        case '4':
          if (!platforms.includes('codex')) platforms.push('codex');
          break;
        case '5':
          return ['claude', 'cursor', 'openclaw', 'codex'];
        default:
          // Try matching platform names directly
          if (
            ['claude', 'cursor', 'openclaw', 'codex'].includes(
              choice.toLowerCase() as Platform
            )
          ) {
            const p = choice.toLowerCase() as Platform;
            if (!platforms.includes(p)) platforms.push(p);
          }
      }
    }

    if (platforms.length === 0) {
      console.log(
        '\nNo valid platforms selected. Use --claude, --cursor, --openclaw, or --all flags.'
      );
      process.exit(1);
    }

    return platforms;
  } finally {
    rl.close();
  }
}
