/**
 * Shared handler
 *
 * Creates flow/ directory structure and manages .gitignore entries.
 * Runs for all platform installations.
 */

import { join, resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync, readdirSync, lstatSync, unlinkSync, rmSync } from 'node:fs';
import type { CopyOptions, CopyResult, Platform } from '../types.js';
import {
  ensureDir,
  getVaultDir,
  getProjectName,
  createSymlink,
  readSymlinkTarget,
} from '../utils/files.js';
import * as log from '../utils/logger.js';

const FLOW_SUBDIRS = [
  'archive',
  'brain',
  'brain/features',
  'brain/errors',
  'brain/decisions',
  'brain/sessions',
  'contracts',
  'discovery',
  'plans',
  'references',
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

const VAULT_SUBDIRS = ['patterns', 'projects'];

/**
 * Symlinks created per project in the vault.
 * Each maps a subdirectory name to its relative path inside the project's flow/ dir.
 */
const VAULT_PROJECT_LINKS: { name: string; subpath: string }[] = [
  { name: 'features', subpath: 'brain/features' },
  { name: 'errors', subpath: 'brain/errors' },
  { name: 'decisions', subpath: 'brain/decisions' },
  { name: 'sessions', subpath: 'brain/sessions' },
  { name: 'discovery', subpath: 'discovery' },
  { name: 'plans', subpath: 'plans' },
  { name: 'archive', subpath: 'archive' },
  { name: 'contracts', subpath: 'contracts' },
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
 * Updates the global vault index at ~/plan-flow/vault/index.md
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
      { query: 'path:patterns', color: { a: 1, rgb: 16771584 } },    // yellow
      { query: 'path:features', color: { a: 1, rgb: 10040217 } },    // purple
      { query: 'path:errors', color: { a: 1, rgb: 16007990 } },      // red
      { query: 'path:decisions', color: { a: 1, rgb: 2201331 } },    // blue
      { query: 'path:sessions', color: { a: 1, rgb: 10395294 } },    // gray
      { query: 'path:discovery', color: { a: 1, rgb: 16747520 } },   // orange
      { query: 'path:plans', color: { a: 1, rgb: 5025616 } },        // green
      { query: 'path:contracts', color: { a: 1, rgb: 52428 } },      // teal
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
 * Registers the project in the central vault at ~/plan-flow/vault/
 * by creating a real directory per project with individual symlinks
 * for each flow subdirectory (features, errors, decisions, sessions,
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

    // Create project index file (the project node in Obsidian's graph)
    const projectIndexPath = join(projectDir, `${projectName}.md`);
    if (!existsSync(projectIndexPath) || options.force) {
      const projectIndexContent = [
        `# [[${projectName}]]`,
        '',
        `**Path**: \`${resolve(target)}\``,
        '',
      ].join('\n');
      writeFileSync(projectIndexPath, projectIndexContent, 'utf-8');
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

  // Directories to scan
  const scanDirs = [
    { dir: join(target, 'flow', 'archive'), status: 'archived' },
    { dir: join(target, 'flow', 'discovery'), status: 'active' },
    { dir: join(target, 'flow', 'plans'), status: 'active' },
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

  // 2. Update .gitignore with plan-flow entries
  const giResult = updateGitignore(target, platforms, options);
  result.created.push(...giResult.created);
  result.skipped.push(...giResult.skipped);
  result.updated.push(...giResult.updated);

  // 3. Register project in central vault (~/plan-flow/vault/)
  const vaultResult = registerVault(target, options);
  result.created.push(...vaultResult.created);
  result.skipped.push(...vaultResult.skipped);
  result.updated.push(...vaultResult.updated);

  // 4. Scan legacy artifacts to populate brain
  const legacyResult = scanLegacyArtifacts(target, options);
  result.created.push(...legacyResult.created);
  result.skipped.push(...legacyResult.skipped);
  result.updated.push(...legacyResult.updated);

  return result;
}
