/**
 * Tech stack detection utility.
 *
 * Detects project languages, package managers, and test frameworks
 * from config/dependency files in the project root.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** A detected language with its config file source. */
export interface DetectedLanguage {
  name: string;
  primary: boolean;
  configFile: string;
}

/** Complete stack profile for a project. */
export interface StackProfile {
  languages: DetectedLanguage[];
  packageManager: string;
  testFramework: string;
}

/** Map of config file → language name. */
const LANGUAGE_INDICATORS: [string, string][] = [
  ['package.json', 'JavaScript'],
  ['pyproject.toml', 'Python'],
  ['requirements.txt', 'Python'],
  ['setup.py', 'Python'],
  ['go.mod', 'Go'],
  ['Cargo.toml', 'Rust'],
  ['Gemfile', 'Ruby'],
  ['pom.xml', 'Java'],
  ['build.gradle', 'Java'],
  ['build.gradle.kts', 'Java'],
];

/** Map of lock file → package manager. */
const LOCK_FILE_MAP: [string, string][] = [
  ['bun.lockb', 'bun'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm'],
  ['poetry.lock', 'poetry'],
  ['uv.lock', 'uv'],
  ['Pipfile.lock', 'pipenv'],
  ['Cargo.lock', 'cargo'],
  ['go.sum', 'go'],
  ['Gemfile.lock', 'bundler'],
];

/** Default package managers per language. */
const DEFAULT_PKG_MANAGER: Record<string, string> = {
  JavaScript: 'npm',
  TypeScript: 'npm',
  Python: 'pip',
  Go: 'go',
  Rust: 'cargo',
  Ruby: 'bundler',
  Java: 'maven',
};

/**
 * Read package.json and extract useful metadata.
 * Returns null if file doesn't exist or can't be parsed.
 */
function readPackageJson(
  targetDir: string
): Record<string, unknown> | null {
  const pkgPath = join(targetDir, 'package.json');
  if (!existsSync(pkgPath)) return null;

  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Check if a package.json project uses TypeScript.
 */
function hasTypeScript(pkg: Record<string, unknown>): boolean {
  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };
  return 'typescript' in deps;
}

/**
 * Detect test framework from package.json dependencies.
 */
function detectJsTestFramework(pkg: Record<string, unknown>): string {
  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };

  if ('vitest' in deps) return 'vitest';
  if ('jest' in deps) return 'jest';
  if ('mocha' in deps) return 'mocha';
  if ('ava' in deps) return 'ava';
  return '';
}

/**
 * Detect test framework from pyproject.toml via simple regex.
 */
function detectPyTestFramework(targetDir: string): string {
  const pyprojectPath = join(targetDir, 'pyproject.toml');
  if (!existsSync(pyprojectPath)) return 'pytest';

  try {
    const content = readFileSync(pyprojectPath, 'utf-8');
    if (content.includes('pytest') || content.includes('[tool.pytest')) {
      return 'pytest';
    }
    if (content.includes('unittest')) return 'unittest';
  } catch {
    // fallback
  }

  return 'pytest';
}

/**
 * Detect the project's tech stack from config files.
 *
 * Scans the target directory root for language indicators,
 * lock files, and dependency metadata.
 */
export function detectStack(targetDir: string): StackProfile {
  const detected = new Map<string, string>();

  // 1. Scan for language indicators
  for (const [file, lang] of LANGUAGE_INDICATORS) {
    if (existsSync(join(targetDir, file))) {
      // Deduplicate by language (Python can have multiple indicators)
      if (!detected.has(lang)) {
        detected.set(lang, file);
      }
    }
  }

  // 2. Promote JavaScript → TypeScript if typescript dependency found
  const pkg = readPackageJson(targetDir);
  if (detected.has('JavaScript') && pkg && hasTypeScript(pkg)) {
    const configFile = detected.get('JavaScript')!;
    detected.delete('JavaScript');
    detected.set('TypeScript', configFile);
  }

  // 3. Build languages array with primary flag
  const languages: DetectedLanguage[] = [];
  let first = true;
  for (const [name, configFile] of detected) {
    languages.push({ name, primary: first, configFile });
    first = false;
  }

  // 4. Detect package manager from lock files
  let packageManager = '';
  for (const [file, pm] of LOCK_FILE_MAP) {
    if (existsSync(join(targetDir, file))) {
      packageManager = pm;
      break;
    }
  }

  // Fallback to default for primary language
  if (!packageManager && languages.length > 0) {
    packageManager =
      DEFAULT_PKG_MANAGER[languages[0].name] ?? '';
  }

  // 5. Detect test framework
  let testFramework = '';
  const primaryLang = languages[0]?.name ?? '';

  if (
    (primaryLang === 'TypeScript' || primaryLang === 'JavaScript') &&
    pkg
  ) {
    testFramework = detectJsTestFramework(pkg);
  } else if (primaryLang === 'Python') {
    testFramework = detectPyTestFramework(targetDir);
  } else if (primaryLang === 'Go') {
    testFramework = 'go test';
  } else if (primaryLang === 'Rust') {
    testFramework = 'cargo test';
  }

  return { languages, packageManager, testFramework };
}

/**
 * Format a stack profile as a human-readable summary string.
 */
export function formatStackSummary(profile: StackProfile): string {
  if (profile.languages.length === 0) {
    return 'No languages detected';
  }

  const langs = profile.languages.map((l) => l.name).join(', ');
  const parts = [langs];

  if (profile.packageManager) {
    parts.push(profile.packageManager);
  }
  if (profile.testFramework) {
    parts.push(profile.testFramework);
  }

  return `Detected: ${parts.join(' | ')}`;
}

/**
 * Get the list of language pattern file prefixes that should be included
 * based on detected languages. Returns null if all should be included.
 */
export function getRelevantLanguagePatterns(
  profile: StackProfile
): string[] | null {
  if (profile.languages.length === 0) return null; // copy all

  const patterns: string[] = [];
  const langMap: Record<string, string> = {
    TypeScript: 'typescript',
    JavaScript: 'typescript', // JS projects use TS patterns too
    Python: 'python',
    Go: 'go',
    Rust: 'rust',
  };

  for (const lang of profile.languages) {
    const prefix = langMap[lang.name];
    if (prefix && !patterns.includes(prefix)) {
      patterns.push(prefix);
    }
  }

  return patterns.length > 0 ? patterns : null;
}

/**
 * Generate basic tech-foundation.md content from a StackProfile.
 */
export function generateTechFoundation(
  profile: StackProfile,
  projectName: string
): string {
  const primaryLang =
    profile.languages.find((l) => l.primary)?.name ?? 'Unknown';
  const date = new Date().toISOString().split('T')[0];

  return `# Tech Foundation

**Project**: [[${projectName}]]
**Generated**: ${date}

## Stack Overview

| Attribute | Value |
|-----------|-------|
| Language | ${primaryLang} |
| Framework | None |
| Package Manager | ${profile.packageManager || 'Unknown'} |
| Test Framework | ${profile.testFramework || 'Unknown'} |

## Detected Languages

${profile.languages.map((l) => `- **${l.name}**${l.primary ? ' (primary)' : ''} — detected from \`${l.configFile}\``).join('\n')}

## Notes

- This is a basic detection from \`plan-flow init\`. Run \`/setup\` for deep analysis with framework detection, library patterns, and code sampling.
`;
}
