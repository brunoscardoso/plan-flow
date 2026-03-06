/**
 * Shared handler
 *
 * Creates flow/ directory structure and manages .gitignore entries.
 * Runs for all platform installations.
 */

import { join, resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync, readdirSync, lstatSync, unlinkSync, rmSync, statSync } from 'node:fs';
import type { CopyOptions, CopyResult, Platform } from '../types.js';
import {
  ensureDir,
  getVaultDir,
  getProjectName,
  createSymlink,
  readSymlinkTarget,
} from '../utils/files.js';
import { askBusinessContext } from '../utils/prompts.js';
import * as log from '../utils/logger.js';

const FLOW_SUBDIRS = [
  'archive',
  'brain',
  'brain/features',
  'brain/errors',
  'contracts',
  'discovery',
  'plans',
  'references',
  'resources',
  'reviewed-code',
  'reviewed-pr',
];

const MARKER_START = '# >>> plan-flow';
const MARKER_END = '# <<< plan-flow';

/**
 * Maps each platform to the paths it installs in the user's project.
 */
const PLATFORM_GITIGNORE_ENTRIES: Record<Platform, string[]> = {
  claude: ['.claude/', 'CLAUDE.md'],
  cursor: ['.cursor/'],
  openclaw: ['skills/plan-flow/'],
  clawhub: ['skills/plan-flow/', '.clawdhub/'],
  codex: ['.agents/', 'AGENTS.md'],
};

/**
 * Paths that should always be gitignored regardless of platform.
 */
const SHARED_GITIGNORE_ENTRIES = ['flow/', '.plan-flow.yml', '.plan.flow.env'];

/**
 * Builds the plan-flow .gitignore block with markers.
 */
function buildGitignoreBlock(platforms: Platform[]): string {
  const lines: string[] = [MARKER_START];

  // Shared entries
  for (const entry of SHARED_GITIGNORE_ENTRIES) {
    lines.push(entry);
  }

  // Platform-specific entries
  for (const platform of platforms) {
    const entries = PLATFORM_GITIGNORE_ENTRIES[platform];
    if (entries) {
      for (const entry of entries) {
        lines.push(entry);
      }
    }
  }

  lines.push(MARKER_END);
  return lines.join('\n');
}

/**
 * Updates or creates .gitignore with plan-flow entries.
 */
function updateGitignore(
  target: string,
  platforms: Platform[],
  options: CopyOptions
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const gitignorePath = join(target, '.gitignore');
  const block = buildGitignoreBlock(platforms);

  if (!existsSync(gitignorePath)) {
    // No .gitignore exists - create it with plan-flow entries
    writeFileSync(gitignorePath, block + '\n', 'utf-8');
    result.created.push(gitignorePath);
    log.success('Created .gitignore with plan-flow entries');
    return result;
  }

  const existing = readFileSync(gitignorePath, 'utf-8');

  if (existing.includes(MARKER_START)) {
    if (options.force) {
      // Replace existing plan-flow section
      const pattern = new RegExp(
        `${escapeRegExp(MARKER_START)}[\\s\\S]*?${escapeRegExp(MARKER_END)}`
      );
      const updated = existing.replace(pattern, block);
      writeFileSync(gitignorePath, updated, 'utf-8');
      result.updated.push(gitignorePath);
      log.warn('Updated plan-flow entries in .gitignore');
    } else {
      result.skipped.push(gitignorePath);
      log.skip('.gitignore already has plan-flow entries');
    }
  } else {
    // Append plan-flow section to existing .gitignore
    const appended = existing.trimEnd() + '\n\n' + block + '\n';
    writeFileSync(gitignorePath, appended, 'utf-8');
    result.updated.push(gitignorePath);
    log.success('Added plan-flow entries to .gitignore');
  }

  return result;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const VAULT_SUBDIRS = ['patterns', 'projects', 'daily'];

/**
 * Maps detected stack values (lowercase) to brain pattern file names (without .md).
 * Keys are matched against detected language, framework label, and dependency names.
 */
const STACK_TO_PATTERN: Record<string, string> = {
  // Languages
  'typescript': 'typescript',
  'javascript': 'typescript',
  'python': 'python',
  'rust': 'rust',
  'go': 'go',
  'ruby': 'ruby',
  'c#': 'csharp',
  'java': 'java',
  // Frameworks
  'next.js': 'nextjs',
  'react': 'react',
  'react native': 'react-native',
  'vue': 'vue',
  'vue.js': 'vue',
  'nuxt': 'nuxt',
  'angular': 'angular',
  'svelte': 'svelte',
  'express': 'express',
  'fastify': 'fastify',
  'hono': 'hono',
  'nestjs': 'nestjs',
  'fastapi': 'fastapi',
  'django': 'django',
  'flask': 'flask',
  'remix': 'remix',
  'gatsby': 'gatsby',
  'astro': 'astro',
  'solidjs': 'solidjs',
  'starlette': 'starlette',
  // Libraries
  'langchain': 'langchain',
  'langgraph': 'langgraph',
  'prisma': 'prisma',
  'drizzle-orm': 'drizzle',
  'tailwindcss': 'tailwind',
  'zustand': 'zustand',
  'redux': 'redux',
  'expo': 'react-native',
};

/**
 * Symlinks created per project in the vault.
 * Each maps a subdirectory name to its relative path inside the project's flow/ dir.
 */
const VAULT_PROJECT_LINKS: { name: string; subpath: string }[] = [
  { name: 'features', subpath: 'brain/features' },
  { name: 'errors', subpath: 'brain/errors' },
  { name: 'discovery', subpath: 'discovery' },
  { name: 'plans', subpath: 'plans' },
  { name: 'archive', subpath: 'archive' },
  { name: 'contracts', subpath: 'contracts' },
  { name: 'reviewed-code', subpath: 'reviewed-code' },
  { name: 'reviewed-pr', subpath: 'reviewed-pr' },
  { name: 'references', subpath: 'references' },
  { name: 'resources', subpath: 'resources' },
];

/**
 * Cleans broken symlinks and old-format single symlinks from the vault projects/ dir.
 * Old format: projects/{name} → /path/flow (single symlink to entire flow/).
 * New format: projects/{name}/ is a real directory with individual symlinks inside.
 */
function cleanBrokenSymlinks(vaultDir: string): void {
  const projectsDir = join(vaultDir, 'projects');
  if (!existsSync(projectsDir)) return;

  let entries: string[];
  try {
    entries = readdirSync(projectsDir);
  } catch {
    return;
  }

  const indexPath = join(vaultDir, 'index.md');
  let indexContent = existsSync(indexPath) ? readFileSync(indexPath, 'utf-8') : null;
  let indexModified = false;

  for (const entry of entries) {
    const entryPath = join(projectsDir, entry);
    let shouldRemove = false;

    try {
      const stat = lstatSync(entryPath);

      if (stat.isSymbolicLink()) {
        // Old-format single symlink or broken symlink — remove it
        shouldRemove = true;
      }
    } catch {
      // Can't stat — broken entry, remove it
      shouldRemove = true;
    }

    if (shouldRemove) {
      try {
        unlinkSync(entryPath);
      } catch {
        try {
          rmSync(entryPath, { force: true });
        } catch {
          // Can't remove — skip
          continue;
        }
      }

      // Remove corresponding index.md entry
      if (indexContent) {
        const pattern = new RegExp(`^- \\[\\[${escapeRegExp(entry)}\\]\\].*\\n?`, 'gm');
        const cleaned = indexContent.replace(pattern, '');
        if (cleaned !== indexContent) {
          indexContent = cleaned;
          indexModified = true;
        }
      }
    }
  }

  if (indexModified && indexContent) {
    // Clean up any double blank lines left behind
    indexContent = indexContent.replace(/\n{3,}/g, '\n\n');
    writeFileSync(indexPath, indexContent, 'utf-8');
  }
}

/**
 * Updates the global vault index at ~/plan-flow/brain/index.md
 * with the project entry.
 */
function updateVaultIndex(vaultDir: string, projectName: string, target: string): void {
  const indexPath = join(vaultDir, 'index.md');

  if (!existsSync(indexPath)) {
    const content = [
      '# Plan-Flow Vault',
      '',
      'Central knowledge vault aggregating all projects.',
      '',
      '## Projects',
      '',
      `- [[${projectName}]] — \`${resolve(target)}\``,
      '',
    ].join('\n');
    writeFileSync(indexPath, content, 'utf-8');
    return;
  }

  const existing = readFileSync(indexPath, 'utf-8');
  const projectLink = `[[${projectName}]]`;

  // Already listed
  if (existing.includes(projectLink)) return;

  // Append to Projects section
  const entry = `- [[${projectName}]] — \`${resolve(target)}\``;
  const updated = existing.trimEnd() + '\n' + entry + '\n';
  writeFileSync(indexPath, updated, 'utf-8');
}

/**
 * Creates the .obsidian/ config in the vault with pre-configured
 * graph color groups using path-based queries.
 * Pass force=true to regenerate the config even if it exists.
 */
function ensureObsidianConfig(vaultDir: string, force = false): void {
  const obsidianDir = join(vaultDir, '.obsidian');
  const graphPath = join(obsidianDir, 'graph.json');

  // Don't overwrite existing config unless forced
  if (existsSync(graphPath) && !force) return;

  ensureDir(obsidianDir);

  const graphConfig = {
    'collapse-filter': true,
    'showTags': false,
    'showAttachments': false,
    'showOrphans': true,
    'collapse-color': false,
    'colorGroups': [
      { query: 'path:patterns', color: { a: 1, rgb: 16771584 } },       // yellow
      { query: 'path:features', color: { a: 1, rgb: 10040217 } },       // purple
      { query: 'path:errors', color: { a: 1, rgb: 16007990 } },         // red
      { query: 'path:daily', color: { a: 1, rgb: 10395294 } },           // gray
      { query: 'path:discovery', color: { a: 1, rgb: 16747520 } },      // orange
      { query: 'path:plans', color: { a: 1, rgb: 5025616 } },           // green
      { query: 'path:contracts', color: { a: 1, rgb: 52428 } },         // teal
      { query: 'path:archive', color: { a: 1, rgb: 8421504 } },         // dark gray
      { query: 'path:reviewed-code', color: { a: 1, rgb: 16761035 } },  // pink
      { query: 'path:reviewed-pr', color: { a: 1, rgb: 14381056 } },    // coral
      { query: 'path:references', color: { a: 1, rgb: 9868950 } },      // sage
      { query: 'path:resources', color: { a: 1, rgb: 6724044 } },       // olive
    ],
    'collapse-display': true,
    'collapse-forces': false,
    'search': '',
    'showArrow': false,
    'textFadeMultiplier': 0,
    'nodeSizeMultiplier': 1,
    'lineSizeMultiplier': 1,
    'centerStrength': 0.518713,
    'repelStrength': 10,
    'linkStrength': 1,
    'linkDistance': 250,
    'scale': 1,
    'close': true,
  };

  writeFileSync(graphPath, JSON.stringify(graphConfig, null, 2), 'utf-8');
}

/**
 * Detects the project's stack and returns matching brain pattern names
 * that exist in ~/plan-flow/brain/patterns/.
 */
function detectMatchingPatterns(target: string, vaultDir: string): string[] {
  const patternsDir = join(vaultDir, 'patterns');
  if (!existsSync(patternsDir)) return [];

  // Get available pattern files (without .md extension)
  let availablePatterns: Set<string>;
  try {
    availablePatterns = new Set(
      readdirSync(patternsDir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, ''))
    );
  } catch {
    return [];
  }

  if (availablePatterns.size === 0) return [];

  // Collect stack identifiers from the project
  const stackKeys: string[] = [];

  const pkgParsed = parsePackageJson(target);
  if (pkgParsed) {
    stackKeys.push(pkgParsed.language.toLowerCase());
    if (pkgParsed.framework !== 'None') {
      // Extract framework label without version: "Next.js 14.2.0" → "next.js"
      const fwLabel = pkgParsed.framework.replace(/\s+[\d.]+$/, '').toLowerCase();
      stackKeys.push(fwLabel);
    }
    // Add dependency names for library-level matching
    for (const dep of [...pkgParsed.prodDeps, ...pkgParsed.devDeps]) {
      stackKeys.push(dep.name.toLowerCase());
    }
  }

  const pyParsed = parsePyprojectToml(target);
  if (pyParsed) {
    stackKeys.push(pyParsed.language.toLowerCase());
    if (pyParsed.framework !== 'None') {
      stackKeys.push(pyParsed.framework.toLowerCase());
    }
    for (const dep of pyParsed.prodDeps) {
      stackKeys.push(dep.name.toLowerCase());
    }
  }

  // Also check for other language indicators
  for (const depFile of DEP_FILES) {
    if (existsSync(join(target, depFile.file))) {
      stackKeys.push(depFile.language.toLowerCase());
    }
  }

  // Check for React Native (expo or react-native dep)
  if (stackKeys.includes('react-native') || stackKeys.includes('expo')) {
    stackKeys.push('react native');
  }

  // Match stack keys against pattern map, then filter by available patterns
  const matched = new Set<string>();
  for (const key of stackKeys) {
    const patternName = STACK_TO_PATTERN[key];
    if (patternName && availablePatterns.has(patternName)) {
      matched.add(patternName);
    }
  }

  // Also include global patterns that always apply (e.g., global-rules, engineering)
  const alwaysLink = ['global-rules', 'engineering'];
  for (const p of alwaysLink) {
    if (availablePatterns.has(p)) {
      matched.add(p);
    }
  }

  return [...matched];
}

/**
 * Registers the project in the central vault at ~/plan-flow/brain/
 * by creating a real directory per project with individual symlinks
 * for each flow subdirectory (features, errors,
 * discovery, plans, archive, contracts).
 */
function registerVault(
  target: string,
  options: CopyOptions
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const vaultDir = getVaultDir();
  const projectName = getProjectName(target);
  const flowDir = join(resolve(target), 'flow');
  const projectDir = join(vaultDir, 'projects', projectName);

  try {
    // Create vault structure if it doesn't exist
    ensureDir(vaultDir);
    for (const sub of VAULT_SUBDIRS) {
      ensureDir(join(vaultDir, sub));
    }

    // Clean broken/old-format symlinks
    cleanBrokenSymlinks(vaultDir);

    // Set up Obsidian config with graph color groups
    ensureObsidianConfig(vaultDir, options.force);

    // Create real project directory
    ensureDir(projectDir);

    // Create individual symlinks for each subdirectory
    let createdCount = 0;
    for (const link of VAULT_PROJECT_LINKS) {
      const linkPath = join(projectDir, link.name);
      const linkTarget = join(flowDir, link.subpath);

      // Ensure the source directory exists in the project
      ensureDir(linkTarget);

      const existingTarget = readSymlinkTarget(linkPath);

      if (existingTarget !== null) {
        const resolvedExisting = resolve(projectDir, existingTarget);
        const resolvedTarget = resolve(linkTarget);

        if (resolvedExisting === resolvedTarget) {
          result.skipped.push(linkPath);
        } else if (options.force) {
          createSymlink(linkTarget, linkPath);
          result.updated.push(linkPath);
        } else {
          result.skipped.push(linkPath);
        }
      } else {
        createSymlink(linkTarget, linkPath);
        result.created.push(linkPath);
        createdCount++;
      }
    }

    // Detect matching brain patterns for this project's stack
    const matchedPatterns = detectMatchingPatterns(target, vaultDir);

    // Create project index file (the project node in Obsidian's graph)
    const projectIndexPath = join(projectDir, `${projectName}.md`);
    if (!existsSync(projectIndexPath) || options.force) {
      const indexLines = [
        `# [[${projectName}]]`,
        '',
        `**Path**: \`${resolve(target)}\``,
      ];

      if (matchedPatterns.length > 0) {
        indexLines.push('');
        indexLines.push('## Patterns');
        indexLines.push('');
        for (const pattern of matchedPatterns) {
          indexLines.push(`- [[${pattern}]]`);
        }
      }

      indexLines.push('');
      writeFileSync(projectIndexPath, indexLines.join('\n'), 'utf-8');

      if (matchedPatterns.length > 0) {
        log.success(`Linked ${matchedPatterns.length} brain pattern(s): ${matchedPatterns.join(', ')}`);
      }
    } else {
      // File exists — check if we need to add/update pattern links
      const existing = readFileSync(projectIndexPath, 'utf-8');
      if (matchedPatterns.length > 0 && !existing.includes('## Patterns')) {
        const patternSection = [
          '',
          '## Patterns',
          '',
          ...matchedPatterns.map((p) => `- [[${p}]]`),
          '',
        ].join('\n');
        writeFileSync(projectIndexPath, existing.trimEnd() + '\n' + patternSection, 'utf-8');
        result.updated.push(projectIndexPath);
        log.success(`Linked ${matchedPatterns.length} brain pattern(s): ${matchedPatterns.join(', ')}`);
      }
    }

    if (createdCount > 0) {
      log.success(`Registered vault project: ${projectName} (${createdCount} links)`);
    } else if (result.updated.length > 0) {
      log.warn(`Updated vault links for ${projectName}`);
    } else {
      log.skip(`Vault links already exist for ${projectName}`);
    }

    // Update vault index
    updateVaultIndex(vaultDir, projectName, target);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn(`Could not register vault (non-fatal): ${msg}`);
  }

  return result;
}

/**
 * Extracts a feature name from a plan-flow artifact filename.
 * e.g., "plan_user_auth_v1.md" → "user-auth"
 *       "discovery_dark_mode_v2.md" → "dark-mode"
 */
function extractFeatureName(filename: string): string | null {
  // Match plan_<name>_v<n>.md or discovery_<name>_v<n>.md
  const match = filename.match(/^(?:plan|discovery)_(.+?)_v\d+\.md$/);
  if (!match) return null;
  return match[1].replace(/_/g, '-');
}

/**
 * Reads the first heading from a markdown file.
 */
function extractTitle(filePath: string): string {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : '';
  } catch {
    return '';
  }
}

/**
 * Creates a brain feature entry for a legacy artifact.
 */
function createBrainFeatureEntry(
  brainDir: string,
  featureName: string,
  artifacts: { path: string; type: string; title: string }[],
  status: string,
  projectName: string
): string | null {
  const featureFile = join(brainDir, 'features', `${featureName}.md`);

  if (existsSync(featureFile)) return null; // Already exists

  const today = new Date().toISOString().slice(0, 10);
  const links = artifacts
    .map((a) => `- ${a.type}: [[${a.path.replace(/\.md$/, '').split('/').pop()}]]`)
    .join('\n');

  const content = [
    '---',
    `status: ${status}`,
    `created: ${today}`,
    '---',
    '',
    `# [[${featureName}]]`,
    '',
    `**Project**: [[${projectName}]]`,
    `**Status**: ${status}`,
    `**Created**: ${today}`,
    `**Last Updated**: ${today}`,
    '',
    '## Links',
    '',
    links,
    '',
    '## Timeline',
    '',
    `### ${today} - legacy-scan`,
    '- **Prompt**: Discovered during plan-flow init',
    `- **Outcome**: Found ${artifacts.length} existing artifact(s)`,
    '- **Errors**: none',
    '- **Decisions**: none',
    `- **Files Changed**: ${artifacts.map((a) => a.path).join(', ')}`,
    '',
  ].join('\n');

  ensureDir(join(brainDir, 'features'));
  writeFileSync(featureFile, content, 'utf-8');
  return featureFile;
}

/**
 * Updates the brain index with discovered legacy features.
 */
function updateBrainIndex(
  brainDir: string,
  features: { name: string; status: string; title: string }[]
): void {
  const indexPath = join(brainDir, 'index.md');
  const today = new Date().toISOString().slice(0, 10);

  if (!existsSync(indexPath)) {
    // Create a new index
    const lines = [
      '# Brain Index',
      '',
      `**Last Updated**: ${today}`,
      '',
      '## Active Features',
      '',
      '## Recent Errors (max 5)',
      '',
      '## Recent Decisions (max 3)',
      '',
    ];

    for (const f of features) {
      if (f.status === 'active') {
        lines.splice(6, 0, `- ${f.name} [active] - ${f.title || 'In progress'}`);
      }
    }

    // Add completed as one-liners after active section
    const completedLines = features
      .filter((f) => f.status !== 'active')
      .map((f) => `- ~~${f.name}~~ [${f.status}] - ${f.title || 'Completed'}`);

    if (completedLines.length > 0) {
      const activeEnd = lines.indexOf('## Recent Errors (max 5)');
      lines.splice(activeEnd, 0, ...completedLines, '');
    }

    writeFileSync(indexPath, lines.join('\n'), 'utf-8');
    return;
  }

  // Append new features to existing index
  const existing = readFileSync(indexPath, 'utf-8');
  let updated = existing;

  for (const f of features) {
    const featureRef = f.name;
    if (updated.includes(featureRef)) continue; // Already listed

    const entry =
      f.status === 'active'
        ? `- ${featureRef} [active] - ${f.title || 'In progress'}`
        : `- ~~${featureRef}~~ [${f.status}] - ${f.title || 'Completed'}`;

    // Insert before "## Recent Errors" if it exists, otherwise append
    if (updated.includes('## Recent Errors')) {
      updated = updated.replace('## Recent Errors', entry + '\n\n## Recent Errors');
    } else {
      updated = updated.trimEnd() + '\n' + entry + '\n';
    }
  }

  // Update timestamp
  updated = updated.replace(/\*\*Last Updated\*\*:.*/, `**Last Updated**: ${today}`);
  writeFileSync(indexPath, updated, 'utf-8');
}

/**
 * Scans flow/archive/, flow/discovery/, and flow/plans/ for existing artifacts
 * and creates brain feature entries from them.
 */
function scanLegacyArtifacts(
  target: string,
  options: CopyOptions
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const brainDir = join(target, 'flow', 'brain');

  // Directories to scan for brain feature extraction
  const scanDirs = [
    { dir: join(target, 'flow', 'archive'), status: 'archived' },
    { dir: join(target, 'flow', 'discovery'), status: 'active' },
    { dir: join(target, 'flow', 'plans'), status: 'active' },
  ];

  // All directories to inject [[project-name]] into existing .md files
  const tagDirs = [
    ...scanDirs.map((s) => s.dir),
    join(target, 'flow', 'contracts'),
    join(target, 'flow', 'reviewed-code'),
    join(target, 'flow', 'reviewed-pr'),
  ];

  // Collect artifacts grouped by feature
  const featureArtifacts: Record<
    string,
    { path: string; type: string; title: string; status: string }[]
  > = {};

  for (const { dir, status } of scanDirs) {
    if (!existsSync(dir)) continue;

    try {
      const files = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== '.gitkeep');

      for (const file of files) {
        const featureName = extractFeatureName(file);
        if (!featureName) continue;

        const filePath = join(dir, file);
        const title = extractTitle(filePath);
        const type = file.startsWith('plan') ? 'Plan' : 'Discovery';
        const relativeFolderName = dir.split('/').pop() || '';

        if (!featureArtifacts[featureName]) {
          featureArtifacts[featureName] = [];
        }

        featureArtifacts[featureName].push({
          path: `flow/${relativeFolderName}/${file}`,
          type,
          title,
          status,
        });
      }
    } catch {
      // Skip directories we can't read
    }
  }

  // Inject [[project-name]] into legacy artifact files that don't have it
  const projectName = getProjectName(target);
  const projectTag = `**Project**: [[${projectName}]]`;

  for (const dir of tagDirs) {
    if (!existsSync(dir)) continue;
    try {
      const files = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== '.gitkeep');
      for (const file of files) {
        const filePath = join(dir, file);
        const content = readFileSync(filePath, 'utf-8');
        if (content.includes(`[[${projectName}]]`)) continue; // Already tagged

        // Insert after the first heading (# ...)
        const updated = content.replace(
          /^(# .+)$/m,
          `$1\n\n${projectTag}`
        );
        if (updated !== content) {
          writeFileSync(filePath, updated, 'utf-8');
          result.updated.push(filePath);
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  // Create brain entries for each feature
  const indexFeatures: { name: string; status: string; title: string }[] = [];

  for (const [featureName, artifacts] of Object.entries(featureArtifacts)) {
    const featureFile = join(brainDir, 'features', `${featureName}.md`);

    if (existsSync(featureFile) && !options.force) {
      result.skipped.push(featureFile);
      continue;
    }

    // Determine overall status: archived if any artifact is in archive
    const overallStatus = artifacts.some((a) => a.status === 'archived')
      ? 'archived'
      : 'active';

    const firstTitle = artifacts[0]?.title || featureName;

    const created = createBrainFeatureEntry(
      brainDir,
      featureName,
      artifacts,
      overallStatus,
      getProjectName(target)
    );

    if (created) {
      result.created.push(created);
      log.success(`Brain entry created: ${featureName}`);
    }

    indexFeatures.push({ name: featureName, status: overallStatus, title: firstTitle });
  }

  // Update brain index
  if (indexFeatures.length > 0) {
    updateBrainIndex(brainDir, indexFeatures);
    log.success(`Brain index updated with ${indexFeatures.length} legacy feature(s)`);
  }

  return result;
}

// --- Dependency file detection ---

interface DepFileInfo {
  file: string;
  language: string;
  packageManager: string;
}

const DEP_FILES: DepFileInfo[] = [
  { file: 'package.json', language: 'JavaScript', packageManager: 'npm' },
  { file: 'pyproject.toml', language: 'Python', packageManager: 'pip' },
  { file: 'Cargo.toml', language: 'Rust', packageManager: 'cargo' },
  { file: 'go.mod', language: 'Go', packageManager: 'go' },
  { file: 'Gemfile', language: 'Ruby', packageManager: 'bundler' },
];

/** Well-known dependency → framework label mapping */
const FRAMEWORK_MAP: Record<string, string> = {
  'next': 'Next.js',
  'react': 'React',
  'vue': 'Vue',
  'nuxt': 'Nuxt',
  '@angular/core': 'Angular',
  'svelte': 'Svelte',
  'express': 'Express',
  'fastify': 'Fastify',
  'koa': 'Koa',
  'hono': 'Hono',
  'nestjs': 'NestJS',
  '@nestjs/core': 'NestJS',
  'fastapi': 'FastAPI',
  'django': 'Django',
  'flask': 'Flask',
  'actix-web': 'Actix Web',
  'rocket': 'Rocket',
  'gin': 'Gin',
  'rails': 'Ruby on Rails',
  'remix': 'Remix',
  'gatsby': 'Gatsby',
  'astro': 'Astro',
  'solid-js': 'SolidJS',
  'qwik': 'Qwik',
};

const TEST_FRAMEWORK_MAP: Record<string, string> = {
  'jest': 'Jest',
  'vitest': 'Vitest',
  'mocha': 'Mocha',
  'ava': 'Ava',
  'jasmine': 'Jasmine',
  'pytest': 'Pytest',
  'unittest': 'unittest',
};

const PKG_MANAGER_INDICATORS: Record<string, string> = {
  'bun.lockb': 'bun',
  'bun.lock': 'bun',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm',
  'package-lock.json': 'npm',
  'Pipfile.lock': 'pipenv',
  'poetry.lock': 'poetry',
};

/** Directories to skip when scanning project structure */
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  'coverage', '__pycache__', '.pytest_cache', 'target', 'vendor',
  '.cache', '.turbo', '.vercel', '.output', 'flow',
]);

/**
 * Scans directory structure up to maxDepth levels deep.
 * Returns a tree representation with file counts per directory.
 */
function scanDirectoryTree(
  rootDir: string,
  maxDepth: number
): { tree: string; extensions: Record<string, number> } {
  const extensions: Record<string, number> = {};
  const lines: string[] = [];

  function scan(dir: string, prefix: string, depth: number): void {
    if (depth > maxDepth) return;

    let entries: string[];
    try {
      entries = readdirSync(dir).filter((e) => !e.startsWith('.') && !SKIP_DIRS.has(e));
    } catch {
      return;
    }

    // Sort: directories first, then files
    const dirs: string[] = [];
    const files: string[] = [];
    for (const entry of entries) {
      try {
        const stat = statSync(join(dir, entry));
        if (stat.isDirectory()) dirs.push(entry);
        else files.push(entry);
      } catch {
        // skip unreadable entries
      }
    }

    // Count files by extension in this directory (recursively)
    const fileCounts: Record<string, number> = {};
    function countFiles(d: string): number {
      let total = 0;
      try {
        for (const e of readdirSync(d)) {
          if (e.startsWith('.') || SKIP_DIRS.has(e)) continue;
          const p = join(d, e);
          try {
            const s = statSync(p);
            if (s.isDirectory()) {
              total += countFiles(p);
            } else {
              total++;
              const ext = e.includes('.') ? '.' + e.split('.').pop() : '(no ext)';
              extensions[ext] = (extensions[ext] || 0) + 1;
              fileCounts[ext] = (fileCounts[ext] || 0) + 1;
            }
          } catch {
            // skip
          }
        }
      } catch {
        // skip
      }
      return total;
    }

    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i];
      const isLast = i === dirs.length - 1 && files.length === 0;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';
      const dirPath = join(dir, d);
      const fileCount = countFiles(dirPath);
      lines.push(`${prefix}${connector}${d}/    (${fileCount} files)`);

      if (depth < maxDepth) {
        scan(dirPath, prefix + childPrefix, depth + 1);
      }
    }
  }

  scan(rootDir, '', 0);
  return { tree: lines.join('\n'), extensions };
}

/**
 * Detects architecture pattern from top-level directory names.
 */
function detectArchitecturePattern(target: string): string {
  const srcDir = join(target, 'src');
  const hasPackagesDir = existsSync(join(target, 'packages'));
  const hasAppsDir = existsSync(join(target, 'apps'));

  if (hasPackagesDir || hasAppsDir) return 'Monorepo';

  if (existsSync(srcDir)) {
    try {
      const srcEntries = readdirSync(srcDir);
      const featureDirs = ['features', 'modules', 'domains'];
      const layerDirs = ['controllers', 'services', 'models', 'repositories'];

      if (featureDirs.some((d) => srcEntries.includes(d))) return 'Feature-based';
      if (layerDirs.some((d) => srcEntries.includes(d))) return 'Layer-based';
      if (srcEntries.includes('components')) return 'Component-based';
    } catch {
      // skip
    }
  }

  return 'Standard';
}

/**
 * Parses a package.json and extracts dependency info.
 */
function parsePackageJson(target: string): {
  language: string;
  framework: string;
  testFramework: string;
  packageManager: string;
  prodDeps: { name: string; version: string; category: string }[];
  devDeps: { name: string; version: string; category: string }[];
  tsStrict: boolean;
  tsTarget: string;
  tsPaths: boolean;
} | null {
  const pkgPath = join(target, 'package.json');
  if (!existsSync(pkgPath)) return null;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const hasTsConfig = existsSync(join(target, 'tsconfig.json'));
    const hasTs = allDeps['typescript'] || hasTsConfig;
    const language = hasTs ? 'TypeScript' : 'JavaScript';

    // Detect framework
    let framework = 'None';
    for (const [dep, label] of Object.entries(FRAMEWORK_MAP)) {
      if (allDeps[dep]) {
        const version = allDeps[dep] as string;
        framework = `${label} ${version.replace(/^[\^~]/, '')}`;
        break;
      }
    }

    // Detect test framework
    let testFramework = 'None';
    for (const [dep, label] of Object.entries(TEST_FRAMEWORK_MAP)) {
      if (allDeps[dep]) {
        testFramework = label;
        break;
      }
    }

    // Detect package manager from lock files
    let packageManager = 'npm';
    for (const [lockFile, pm] of Object.entries(PKG_MANAGER_INDICATORS)) {
      if (existsSync(join(target, lockFile))) {
        packageManager = pm;
        break;
      }
    }

    // Categorize dependencies
    function categorizeDep(name: string): string {
      if (FRAMEWORK_MAP[name]) return 'Framework';
      if (TEST_FRAMEWORK_MAP[name]) return 'Testing';
      if (name.startsWith('@types/')) return 'Types';
      if (name === 'typescript') return 'Language';
      if (['eslint', 'prettier', 'biome'].some((t) => name.includes(t))) return 'Linting';
      if (['webpack', 'vite', 'rollup', 'esbuild', 'tsup', 'swc'].some((t) => name.includes(t))) return 'Build';
      return 'Library';
    }

    const prodDeps = Object.entries(pkg.dependencies || {}).map(([name, version]) => ({
      name,
      version: version as string,
      category: categorizeDep(name),
    }));

    const devDeps = Object.entries(pkg.devDependencies || {}).map(([name, version]) => ({
      name,
      version: version as string,
      category: categorizeDep(name),
    }));

    // Parse tsconfig
    let tsStrict = false;
    let tsTarget = '';
    let tsPaths = false;
    if (hasTsConfig) {
      try {
        const tsconfig = JSON.parse(readFileSync(join(target, 'tsconfig.json'), 'utf-8'));
        tsStrict = tsconfig.compilerOptions?.strict === true;
        tsTarget = tsconfig.compilerOptions?.target || '';
        tsPaths = !!(tsconfig.compilerOptions?.paths && Object.keys(tsconfig.compilerOptions.paths).length > 0);
      } catch {
        // Could not parse tsconfig
      }
    }

    return {
      language,
      framework,
      testFramework,
      packageManager,
      prodDeps,
      devDeps,
      tsStrict,
      tsTarget,
      tsPaths,
    };
  } catch {
    return null;
  }
}

/**
 * Parses pyproject.toml for Python projects (basic key=value parsing).
 */
function parsePyprojectToml(target: string): {
  language: string;
  framework: string;
  testFramework: string;
  packageManager: string;
  prodDeps: { name: string; version: string; category: string }[];
  devDeps: { name: string; version: string; category: string }[];
} | null {
  const pyPath = join(target, 'pyproject.toml');
  if (!existsSync(pyPath)) return null;

  try {
    const content = readFileSync(pyPath, 'utf-8');

    // Extract dependencies from [project.dependencies] or [tool.poetry.dependencies]
    const depPattern = /\[(?:project\.dependencies|tool\.poetry\.dependencies)\]\s*\n([\s\S]*?)(?:\n\[|\n$)/;
    const depMatch = content.match(depPattern);
    const deps: { name: string; version: string; category: string }[] = [];

    if (depMatch) {
      const lines = depMatch[1].split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
      for (const line of lines) {
        const parts = line.match(/^["\s]*([a-zA-Z0-9_-]+)["\s]*[>=<~!]*(.*)/);
        if (parts) {
          deps.push({ name: parts[1], version: parts[2]?.trim() || '*', category: 'Library' });
        }
      }
    }

    // Detect framework
    let framework = 'None';
    const allDepNames = deps.map((d) => d.name.toLowerCase());
    const pyFrameworks: Record<string, string> = {
      'fastapi': 'FastAPI',
      'django': 'Django',
      'flask': 'Flask',
      'starlette': 'Starlette',
      'tornado': 'Tornado',
      'sanic': 'Sanic',
    };
    for (const [dep, label] of Object.entries(pyFrameworks)) {
      if (allDepNames.includes(dep)) {
        framework = label;
        break;
      }
    }

    // Detect test framework
    let testFramework = 'None';
    if (content.includes('pytest') || existsSync(join(target, 'pytest.ini'))) {
      testFramework = 'Pytest';
    }

    // Detect package manager
    let packageManager = 'pip';
    if (existsSync(join(target, 'poetry.lock'))) packageManager = 'poetry';
    else if (existsSync(join(target, 'Pipfile.lock'))) packageManager = 'pipenv';
    else if (content.includes('[tool.poetry]')) packageManager = 'poetry';

    return { language: 'Python', framework, testFramework, packageManager, prodDeps: deps, devDeps: [] };
  } catch {
    return null;
  }
}

/**
 * Detects config files and returns a summary.
 */
function detectConfigFiles(target: string): string[] {
  const configs: string[] = [];

  // TypeScript
  if (existsSync(join(target, 'tsconfig.json'))) {
    try {
      const tsconfig = JSON.parse(readFileSync(join(target, 'tsconfig.json'), 'utf-8'));
      const strict = tsconfig.compilerOptions?.strict ? 'strict mode' : 'non-strict';
      const paths = tsconfig.compilerOptions?.paths
        ? ', paths aliases (' + Object.keys(tsconfig.compilerOptions.paths).join(', ') + ')'
        : '';
      configs.push(`TypeScript: ${strict}${paths}`);
    } catch {
      configs.push('TypeScript: Could not parse tsconfig.json');
    }
  }

  // ESLint
  const eslintFiles = ['.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yml', 'eslint.config.js', 'eslint.config.mjs'];
  for (const f of eslintFiles) {
    if (existsSync(join(target, f))) {
      configs.push(`ESLint: ${f}`);
      break;
    }
  }

  // Prettier
  const prettierFiles = ['.prettierrc', '.prettierrc.js', '.prettierrc.json', 'prettier.config.js', 'prettier.config.mjs'];
  for (const f of prettierFiles) {
    if (existsSync(join(target, f))) {
      configs.push(`Prettier: ${f}`);
      break;
    }
  }

  // Biome
  if (existsSync(join(target, 'biome.json')) || existsSync(join(target, 'biome.jsonc'))) {
    configs.push('Biome: biome.json');
  }

  return configs;
}

/**
 * Generates flow/references/tech-foundation.md from programmatic project analysis.
 */
export function generateTechFoundation(
  target: string,
  options: CopyOptions
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const filePath = join(target, 'flow', 'references', 'tech-foundation.md');

  if (existsSync(filePath) && !options.force) {
    result.skipped.push(filePath);
    log.skip('Tech foundation already exists');
    return result;
  }

  const projectName = getProjectName(target);
  const today = new Date().toISOString().slice(0, 10);

  // Detect primary language and parse dependencies
  let parsed: {
    language: string;
    framework: string;
    testFramework: string;
    packageManager: string;
    prodDeps: { name: string; version: string; category: string }[];
    devDeps: { name: string; version: string; category: string }[];
    tsStrict?: boolean;
    tsTarget?: string;
    tsPaths?: boolean;
  } | null = null;

  // Try each dependency file in priority order
  parsed = parsePackageJson(target);
  if (!parsed) parsed = parsePyprojectToml(target);
  if (!parsed) {
    // Check for other language files
    for (const depFile of DEP_FILES.slice(2)) {
      if (existsSync(join(target, depFile.file))) {
        parsed = {
          language: depFile.language,
          framework: 'None',
          testFramework: 'None',
          packageManager: depFile.packageManager,
          prodDeps: [],
          devDeps: [],
        };
        break;
      }
    }
  }

  // Also check for *.csproj
  if (!parsed) {
    try {
      const rootFiles = readdirSync(target);
      if (rootFiles.some((f) => f.endsWith('.csproj'))) {
        parsed = {
          language: 'C#',
          framework: '.NET',
          testFramework: 'None',
          packageManager: 'dotnet',
          prodDeps: [],
          devDeps: [],
        };
      }
    } catch {
      // skip
    }
  }

  if (!parsed) {
    parsed = {
      language: 'Unknown',
      framework: 'None',
      testFramework: 'None',
      packageManager: 'Unknown',
      prodDeps: [],
      devDeps: [],
    };
  }

  // TypeScript info for stack overview
  const tsLine = parsed.language === 'TypeScript' && parsed.tsStrict !== undefined
    ? `| TypeScript | ${parsed.tsStrict ? 'Strict mode' : 'Non-strict'} |`
    : '';

  // Scan directory structure
  const { tree } = scanDirectoryTree(target, 2);

  // Detect architecture
  const architecture = detectArchitecturePattern(target);

  // Detect configs
  const configs = detectConfigFiles(target);

  // Build the markdown
  const lines: string[] = [
    '# Tech Foundation',
    '',
    `**Project**: [[${projectName}]]`,
    `**Generated**: ${today}`,
    '',
    '## Stack Overview',
    '',
    '| Attribute | Value |',
    '|-----------|-------|',
    `| Language | ${parsed.language} |`,
    `| Framework | ${parsed.framework} |`,
    `| Package Manager | ${parsed.packageManager} |`,
    `| Test Framework | ${parsed.testFramework} |`,
  ];

  if (tsLine) lines.push(tsLine);
  lines.push(`| Architecture | ${architecture} |`);

  // Production dependencies
  if (parsed.prodDeps.length > 0) {
    lines.push('', `## Dependencies`, '', `### Production (${parsed.prodDeps.length} packages)`, '');
    lines.push('| Package | Version | Category |');
    lines.push('|---------|---------|----------|');
    for (const dep of parsed.prodDeps) {
      lines.push(`| ${dep.name} | ${dep.version} | ${dep.category} |`);
    }
  }

  // Dev dependencies
  if (parsed.devDeps.length > 0) {
    lines.push('', `### Development (${parsed.devDeps.length} packages)`, '');
    lines.push('| Package | Version | Category |');
    lines.push('|---------|---------|----------|');
    for (const dep of parsed.devDeps) {
      lines.push(`| ${dep.name} | ${dep.version} | ${dep.category} |`);
    }
  }

  // Project structure
  if (tree) {
    lines.push('', '## Project Structure', '', '```');
    lines.push(tree);
    lines.push('```');
  }

  // Configuration
  if (configs.length > 0) {
    lines.push('', '## Configuration', '');
    for (const config of configs) {
      lines.push(`- ${config}`);
    }
  }

  lines.push('');

  const isUpdate = existsSync(filePath);
  ensureDir(join(target, 'flow', 'references'));
  writeFileSync(filePath, lines.join('\n'), 'utf-8');

  if (isUpdate) {
    result.updated.push(filePath);
    log.warn('Updated tech foundation');
  } else {
    result.created.push(filePath);
    log.success('Generated tech foundation');
  }

  return result;
}

/**
 * Extracts a one-liner description from the first paragraph of a README.
 */
function extractReadmeHint(target: string): string | undefined {
  const readmePath = join(target, 'README.md');
  if (!existsSync(readmePath)) return undefined;

  try {
    const content = readFileSync(readmePath, 'utf-8');
    const lines = content.split('\n').slice(0, 50);

    // Skip badge/image lines and headings, find first paragraph text
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('!')) continue;  // images
      if (trimmed.startsWith('[!')) continue;  // badges
      if (trimmed.startsWith('[![')) continue; // badge links
      if (trimmed.startsWith('<')) continue;    // HTML tags
      if (trimmed.startsWith('---')) continue;  // horizontal rules
      // Found a real paragraph line
      return trimmed;
    }
  } catch {
    // skip
  }

  return undefined;
}

/**
 * Generates flow/references/business-context.md from interactive prompts.
 */
export async function generateBusinessContext(
  target: string,
  options: CopyOptions
): Promise<CopyResult> {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const filePath = join(target, 'flow', 'references', 'business-context.md');

  if (existsSync(filePath) && !options.force) {
    result.skipped.push(filePath);
    log.skip('Business context already exists');
    return result;
  }

  const projectName = getProjectName(target);
  const today = new Date().toISOString().slice(0, 10);
  const readmeHint = extractReadmeHint(target);

  const answers = await askBusinessContext(readmeHint);

  // Extract README summary (first ~5 lines of real content, skipping headings/badges)
  let readmeSummary = 'No README found.';
  const readmePath = join(target, 'README.md');
  if (existsSync(readmePath)) {
    try {
      const readmeContent = readFileSync(readmePath, 'utf-8');
      const readmeLines = readmeContent.split('\n').slice(0, 50);
      const contentLines: string[] = [];
      for (const line of readmeLines) {
        const trimmed = line.trim();
        if (!trimmed) {
          if (contentLines.length > 0) break; // stop at first blank line after content
          continue;
        }
        if (trimmed.startsWith('#')) continue;
        if (trimmed.startsWith('[![') || trimmed.startsWith('[!') || trimmed.startsWith('!')) continue;
        if (trimmed.startsWith('<')) continue;
        if (trimmed.startsWith('---')) continue;
        contentLines.push(trimmed);
        if (contentLines.length >= 5) break;
      }
      if (contentLines.length > 0) readmeSummary = contentLines.join('\n');
    } catch {
      // skip
    }
  }

  const content = [
    '# Business Context',
    '',
    `**Project**: [[${projectName}]]`,
    `**Generated**: ${today}`,
    '',
    '## What It Does',
    '',
    answers.whatItDoes || 'Not specified.',
    '',
    '## Target Audience',
    '',
    answers.targetAudience || 'Not specified.',
    '',
    '## Problem It Solves',
    '',
    answers.problemItSolves || 'Not specified.',
    '',
    '## README Summary',
    '',
    readmeSummary,
    '',
  ].join('\n');

  const isUpdate = existsSync(filePath);
  ensureDir(join(target, 'flow', 'references'));
  writeFileSync(filePath, content, 'utf-8');

  if (isUpdate) {
    result.updated.push(filePath);
    log.warn('Updated business context');
  } else {
    result.created.push(filePath);
    log.success('Generated business context');
  }

  return result;
}

/**
 * Generates flow/tasklist.md — a persistent project todo list
 * updated in real-time during skill execution.
 */
export function generateTasklist(
  target: string,
  options: CopyOptions
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const filePath = join(target, 'flow', 'tasklist.md');

  if (existsSync(filePath) && !options.force) {
    result.skipped.push(filePath);
    log.skip('Tasklist already exists');
    return result;
  }

  const projectName = getProjectName(target);
  const today = new Date().toISOString().slice(0, 10);

  const content = [
    '# Tasklist',
    '',
    `**Project**: [[${projectName}]]`,
    `**Created**: ${today}`,
    `**Last Updated**: ${today}`,
    '',
    '## In Progress',
    '',
    '',
    '## To Do',
    '',
    '',
    '## Done',
    '',
    '',
  ].join('\n');

  const isUpdate = existsSync(filePath);
  ensureDir(join(target, 'flow'));
  writeFileSync(filePath, content, 'utf-8');

  if (isUpdate) {
    result.updated.push(filePath);
    log.warn('Updated tasklist');
  } else {
    result.created.push(filePath);
    log.success('Generated tasklist');
  }

  return result;
}

/**
 * Generates flow/log.md — an append-only heartbeat log
 * of important events during project execution.
 */
export function generateLog(
  target: string,
  options: CopyOptions
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const filePath = join(target, 'flow', 'log.md');

  if (existsSync(filePath) && !options.force) {
    result.skipped.push(filePath);
    log.skip('Log already exists');
    return result;
  }

  const projectName = getProjectName(target);
  const today = new Date().toISOString().slice(0, 10);

  const content = [
    '# Project Log',
    '',
    `**Project**: [[${projectName}]]`,
    `**Created**: ${today}`,
    '',
    '---',
    '',
    `### ${today}`,
    '',
    `- plan-flow initialized`,
    '',
  ].join('\n');

  const isUpdate = existsSync(filePath);
  ensureDir(join(target, 'flow'));
  writeFileSync(filePath, content, 'utf-8');

  if (isUpdate) {
    result.updated.push(filePath);
    log.warn('Updated log');
  } else {
    result.created.push(filePath);
    log.success('Generated project log');
  }

  return result;
}

export async function initShared(
  target: string,
  options: CopyOptions,
  platforms: Platform[] = []
): Promise<CopyResult> {
  const result: CopyResult = { created: [], skipped: [], updated: [] };

  // 1. Create flow/ directory structure with .gitkeep files
  const flowDir = join(target, 'flow');

  for (const subdir of FLOW_SUBDIRS) {
    const dir = join(flowDir, subdir);
    const gitkeep = join(dir, '.gitkeep');

    if (!existsSync(dir)) {
      ensureDir(dir);
      writeFileSync(gitkeep, '', 'utf-8');
      result.created.push(dir);
      log.success(`Created flow/${subdir}/`);
    } else if (!existsSync(gitkeep)) {
      writeFileSync(gitkeep, '', 'utf-8');
      result.created.push(gitkeep);
    } else {
      result.skipped.push(dir);
      log.skip(`flow/${subdir}/ already exists`);
    }
  }

  // 2. Generate tech foundation (programmatic scan)
  const techResult = generateTechFoundation(target, options);
  result.created.push(...techResult.created);
  result.skipped.push(...techResult.skipped);
  result.updated.push(...techResult.updated);

  // 3. Generate business context (interactive prompts)
  const bizResult = await generateBusinessContext(target, options);
  result.created.push(...bizResult.created);
  result.skipped.push(...bizResult.skipped);
  result.updated.push(...bizResult.updated);

  // 4. Generate tasklist
  const tasklistResult = generateTasklist(target, options);
  result.created.push(...tasklistResult.created);
  result.skipped.push(...tasklistResult.skipped);
  result.updated.push(...tasklistResult.updated);

  // 5. Generate project log
  const logResult = generateLog(target, options);
  result.created.push(...logResult.created);
  result.skipped.push(...logResult.skipped);
  result.updated.push(...logResult.updated);

  // 6. Update .gitignore with plan-flow entries
  const giResult = updateGitignore(target, platforms, options);
  result.created.push(...giResult.created);
  result.skipped.push(...giResult.skipped);
  result.updated.push(...giResult.updated);

  // 7. Register project in central vault (~/plan-flow/brain/)
  const vaultResult = registerVault(target, options);
  result.created.push(...vaultResult.created);
  result.skipped.push(...vaultResult.skipped);
  result.updated.push(...vaultResult.updated);

  // 8. Scan legacy artifacts to populate brain
  const legacyResult = scanLegacyArtifacts(target, options);
  result.created.push(...legacyResult.created);
  result.skipped.push(...legacyResult.skipped);
  result.updated.push(...legacyResult.updated);

  return result;
}
