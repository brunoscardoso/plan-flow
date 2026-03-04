/**
 * Shared handler
 *
 * Creates flow/ directory structure and manages .gitignore entries.
 * Runs for all platform installations.
 */

import { join, resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
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
 * Registers the project in the central vault at ~/plan-flow/brain/
 * by creating a symlink from the vault to the project's flow/brain/.
 */
function registerVault(
  target: string,
  options: CopyOptions
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], updated: [] };
  const vaultDir = getVaultDir();
  const projectName = getProjectName(target);
  const brainDir = join(resolve(target), 'flow', 'brain');
  const linkPath = join(vaultDir, 'projects', projectName);

  try {
    // Create vault structure if it doesn't exist
    ensureDir(vaultDir);
    for (const sub of VAULT_SUBDIRS) {
      ensureDir(join(vaultDir, sub));
    }

    // Check existing symlink
    const existingTarget = readSymlinkTarget(linkPath);

    if (existingTarget !== null) {
      const resolvedExisting = resolve(join(vaultDir, 'projects'), existingTarget);
      const resolvedBrain = resolve(brainDir);

      if (resolvedExisting === resolvedBrain) {
        result.skipped.push(linkPath);
        log.skip(`Vault symlink already exists for ${projectName}`);
      } else if (options.force) {
        createSymlink(brainDir, linkPath);
        result.updated.push(linkPath);
        log.warn(`Updated vault symlink for ${projectName}`);
      } else {
        result.skipped.push(linkPath);
        log.skip(`Vault symlink exists for ${projectName} (points elsewhere, use --force to update)`);
      }
    } else {
      // Handle name collision with a non-symlink entry
      if (existsSync(linkPath)) {
        const hashSuffix = resolve(target).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0).toString(16);
        const altName = `${projectName}-${hashSuffix}`;
        const altPath = join(vaultDir, 'projects', altName);
        createSymlink(brainDir, altPath);
        result.created.push(altPath);
        log.success(`Created vault symlink: ${altName} (name collision avoided)`);
        updateVaultIndex(vaultDir, altName, target);
      } else {
        createSymlink(brainDir, linkPath);
        result.created.push(linkPath);
        log.success(`Created vault symlink: ${projectName}`);
        updateVaultIndex(vaultDir, projectName, target);
      }
    }
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
  status: string
): string | null {
  const featureFile = join(brainDir, 'features', `${featureName}.md`);

  if (existsSync(featureFile)) return null; // Already exists

  const today = new Date().toISOString().slice(0, 10);
  const links = artifacts
    .map((a) => `- ${a.type}: [[${a.path.replace(/\.md$/, '').split('/').pop()}]]`)
    .join('\n');

  const content = [
    '---',
    'tags:',
    '  - feature',
    `status: ${status}`,
    `created: ${today}`,
    '---',
    '',
    `# [[${featureName}]]`,
    '',
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
      overallStatus
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

  // 3. Register project in central vault (~/plan-flow/brain/)
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
