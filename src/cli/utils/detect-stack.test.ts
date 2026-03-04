/**
 * Tests for tech stack detection utility.
 */

import {
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  detectStack,
  formatStackSummary,
  getRelevantLanguagePatterns,
  generateTechFoundation,
} from './detect-stack';
import type { StackProfile } from './detect-stack';

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `plan-flow-detect-stack-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe('detectStack', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should detect TypeScript from package.json with typescript dep', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        devDependencies: { typescript: '^5.0.0', jest: '^29.0.0' },
      })
    );

    const profile = detectStack(tempDir);
    expect(profile.languages).toHaveLength(1);
    expect(profile.languages[0].name).toBe('TypeScript');
    expect(profile.languages[0].primary).toBe(true);
    expect(profile.testFramework).toBe('jest');
  });

  it('should detect JavaScript from package.json without typescript', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: { express: '^4.0.0' } })
    );

    const profile = detectStack(tempDir);
    expect(profile.languages[0].name).toBe('JavaScript');
  });

  it('should detect Python from pyproject.toml', () => {
    writeFileSync(join(tempDir, 'pyproject.toml'), '[tool.pytest]\n');

    const profile = detectStack(tempDir);
    expect(profile.languages).toHaveLength(1);
    expect(profile.languages[0].name).toBe('Python');
    expect(profile.testFramework).toBe('pytest');
  });

  it('should detect Python from requirements.txt', () => {
    writeFileSync(join(tempDir, 'requirements.txt'), 'flask==2.0.0\n');

    const profile = detectStack(tempDir);
    expect(profile.languages[0].name).toBe('Python');
  });

  it('should detect Go from go.mod', () => {
    writeFileSync(join(tempDir, 'go.mod'), 'module example.com/app\n');

    const profile = detectStack(tempDir);
    expect(profile.languages[0].name).toBe('Go');
    expect(profile.packageManager).toBe('go');
    expect(profile.testFramework).toBe('go test');
  });

  it('should detect Rust from Cargo.toml', () => {
    writeFileSync(join(tempDir, 'Cargo.toml'), '[package]\nname = "app"\n');

    const profile = detectStack(tempDir);
    expect(profile.languages[0].name).toBe('Rust');
    expect(profile.packageManager).toBe('cargo');
    expect(profile.testFramework).toBe('cargo test');
  });

  it('should detect multiple languages', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ devDependencies: { typescript: '^5.0.0' } })
    );
    writeFileSync(join(tempDir, 'pyproject.toml'), '[project]\n');

    const profile = detectStack(tempDir);
    expect(profile.languages).toHaveLength(2);
    // First detected is primary
    expect(profile.languages[0].primary).toBe(true);
    expect(profile.languages[1].primary).toBe(false);
  });

  it('should detect package manager from lock files', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: {} })
    );
    writeFileSync(join(tempDir, 'yarn.lock'), '');

    const profile = detectStack(tempDir);
    expect(profile.packageManager).toBe('yarn');
  });

  it('should detect pnpm from pnpm-lock.yaml', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: {} })
    );
    writeFileSync(join(tempDir, 'pnpm-lock.yaml'), '');

    const profile = detectStack(tempDir);
    expect(profile.packageManager).toBe('pnpm');
  });

  it('should detect bun from bun.lockb', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: {} })
    );
    writeFileSync(join(tempDir, 'bun.lockb'), '');

    const profile = detectStack(tempDir);
    expect(profile.packageManager).toBe('bun');
  });

  it('should fallback to default package manager', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: {} })
    );

    const profile = detectStack(tempDir);
    expect(profile.packageManager).toBe('npm');
  });

  it('should return empty profile for empty directory', () => {
    const profile = detectStack(tempDir);
    expect(profile.languages).toHaveLength(0);
    expect(profile.packageManager).toBe('');
    expect(profile.testFramework).toBe('');
  });

  it('should detect vitest test framework', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ devDependencies: { vitest: '^1.0.0' } })
    );

    const profile = detectStack(tempDir);
    expect(profile.testFramework).toBe('vitest');
  });

  it('should deduplicate Python from multiple indicators', () => {
    writeFileSync(join(tempDir, 'pyproject.toml'), '[project]\n');
    writeFileSync(join(tempDir, 'requirements.txt'), 'flask\n');

    const profile = detectStack(tempDir);
    const pythonLangs = profile.languages.filter(
      (l) => l.name === 'Python'
    );
    expect(pythonLangs).toHaveLength(1);
  });

  it('should handle invalid package.json gracefully', () => {
    writeFileSync(join(tempDir, 'package.json'), 'not valid json');

    const profile = detectStack(tempDir);
    // Should detect JavaScript but no test framework
    expect(profile.languages[0].name).toBe('JavaScript');
  });

  it('should detect Java from pom.xml', () => {
    writeFileSync(join(tempDir, 'pom.xml'), '<project></project>');

    const profile = detectStack(tempDir);
    expect(profile.languages[0].name).toBe('Java');
  });
});

describe('formatStackSummary', () => {
  it('should format single language', () => {
    const profile: StackProfile = {
      languages: [{ name: 'TypeScript', primary: true, configFile: 'package.json' }],
      packageManager: 'npm',
      testFramework: 'jest',
    };
    expect(formatStackSummary(profile)).toBe('Detected: TypeScript | npm | jest');
  });

  it('should format multiple languages', () => {
    const profile: StackProfile = {
      languages: [
        { name: 'TypeScript', primary: true, configFile: 'package.json' },
        { name: 'Python', primary: false, configFile: 'pyproject.toml' },
      ],
      packageManager: 'npm',
      testFramework: 'jest',
    };
    expect(formatStackSummary(profile)).toBe(
      'Detected: TypeScript, Python | npm | jest'
    );
  });

  it('should handle no languages', () => {
    const profile: StackProfile = {
      languages: [],
      packageManager: '',
      testFramework: '',
    };
    expect(formatStackSummary(profile)).toBe('No languages detected');
  });

  it('should omit missing package manager and test framework', () => {
    const profile: StackProfile = {
      languages: [{ name: 'Go', primary: true, configFile: 'go.mod' }],
      packageManager: '',
      testFramework: '',
    };
    expect(formatStackSummary(profile)).toBe('Detected: Go');
  });
});

describe('getRelevantLanguagePatterns', () => {
  it('should return typescript for TS projects', () => {
    const profile: StackProfile = {
      languages: [{ name: 'TypeScript', primary: true, configFile: 'package.json' }],
      packageManager: 'npm',
      testFramework: 'jest',
    };
    expect(getRelevantLanguagePatterns(profile)).toEqual(['typescript']);
  });

  it('should return typescript for JS projects', () => {
    const profile: StackProfile = {
      languages: [{ name: 'JavaScript', primary: true, configFile: 'package.json' }],
      packageManager: 'npm',
      testFramework: '',
    };
    expect(getRelevantLanguagePatterns(profile)).toEqual(['typescript']);
  });

  it('should return multiple patterns for multi-language', () => {
    const profile: StackProfile = {
      languages: [
        { name: 'TypeScript', primary: true, configFile: 'package.json' },
        { name: 'Python', primary: false, configFile: 'pyproject.toml' },
      ],
      packageManager: 'npm',
      testFramework: 'jest',
    };
    const result = getRelevantLanguagePatterns(profile);
    expect(result).toContain('typescript');
    expect(result).toContain('python');
  });

  it('should return null for no languages (copy all)', () => {
    const profile: StackProfile = {
      languages: [],
      packageManager: '',
      testFramework: '',
    };
    expect(getRelevantLanguagePatterns(profile)).toBeNull();
  });

  it('should return null for unsupported languages only', () => {
    const profile: StackProfile = {
      languages: [{ name: 'Ruby', primary: true, configFile: 'Gemfile' }],
      packageManager: 'bundler',
      testFramework: '',
    };
    // Ruby has no pattern file mapping, so returns null (copy all)
    expect(getRelevantLanguagePatterns(profile)).toBeNull();
  });
});

describe('generateTechFoundation', () => {
  it('should generate markdown with stack info', () => {
    const profile: StackProfile = {
      languages: [
        { name: 'TypeScript', primary: true, configFile: 'package.json' },
      ],
      packageManager: 'npm',
      testFramework: 'jest',
    };

    const content = generateTechFoundation(profile, 'my-project');
    expect(content).toContain('# Tech Foundation');
    expect(content).toContain('[[my-project]]');
    expect(content).toContain('TypeScript');
    expect(content).toContain('npm');
    expect(content).toContain('jest');
    expect(content).toContain('(primary)');
  });

  it('should handle empty profile', () => {
    const profile: StackProfile = {
      languages: [],
      packageManager: '',
      testFramework: '',
    };

    const content = generateTechFoundation(profile, 'empty-project');
    expect(content).toContain('Unknown');
  });
});
