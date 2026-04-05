/**
 * Tests for file utilities
 */

import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  lstatSync,
  readlinkSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getPackageRoot,
  copyDir,
  copyFile,
  ensureDir,
  fileExists,
  getVaultDir,
  createSymlink,
  readSymlinkTarget,
  getProjectName,
  isSymlink,
  moveContents,
} from './files';

function createTempDir(): string {
  const dir = join(tmpdir(), `plan-flow-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe('getPackageRoot', () => {
  it('should resolve to a directory containing package.json', () => {
    const root = getPackageRoot();
    expect(existsSync(join(root, 'package.json'))).toBe(true);
  });
});

describe('ensureDir', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should create nested directories', () => {
    const nested = join(tempDir, 'a', 'b', 'c');
    expect(existsSync(nested)).toBe(false);

    ensureDir(nested);

    expect(existsSync(nested)).toBe(true);
  });

  it('should not throw if directory already exists', () => {
    expect(() => ensureDir(tempDir)).not.toThrow();
  });
});

describe('fileExists', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should return true for existing file', () => {
    const file = join(tempDir, 'test.txt');
    writeFileSync(file, 'hello');
    expect(fileExists(file)).toBe(true);
  });

  it('should return false for non-existing file', () => {
    expect(fileExists(join(tempDir, 'nonexistent.txt'))).toBe(false);
  });
});

describe('copyFile', () => {
  let tempDir: string;
  let srcDir: string;
  let destDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    srcDir = join(tempDir, 'src');
    destDir = join(tempDir, 'dest');
    mkdirSync(srcDir, { recursive: true });
    mkdirSync(destDir, { recursive: true });
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should copy a file to destination', () => {
    const src = join(srcDir, 'file.txt');
    const dest = join(destDir, 'file.txt');
    writeFileSync(src, 'content');

    const result = copyFile(src, dest, { force: false });

    expect(result.created).toEqual([dest]);
    expect(result.skipped).toEqual([]);
    expect(readFileSync(dest, 'utf-8')).toBe('content');
  });

  it('should skip existing files when force is false', () => {
    const src = join(srcDir, 'file.txt');
    const dest = join(destDir, 'file.txt');
    writeFileSync(src, 'new content');
    writeFileSync(dest, 'old content');

    const result = copyFile(src, dest, { force: false });

    expect(result.skipped).toEqual([dest]);
    expect(result.created).toEqual([]);
    expect(readFileSync(dest, 'utf-8')).toBe('old content');
  });

  it('should overwrite existing files when force is true', () => {
    const src = join(srcDir, 'file.txt');
    const dest = join(destDir, 'file.txt');
    writeFileSync(src, 'new content');
    writeFileSync(dest, 'old content');

    const result = copyFile(src, dest, { force: true });

    expect(result.updated).toEqual([dest]);
    expect(readFileSync(dest, 'utf-8')).toBe('new content');
  });

  it('should create parent directories if needed', () => {
    const src = join(srcDir, 'file.txt');
    const dest = join(destDir, 'sub', 'dir', 'file.txt');
    writeFileSync(src, 'content');

    const result = copyFile(src, dest, { force: false });

    expect(result.created).toEqual([dest]);
    expect(readFileSync(dest, 'utf-8')).toBe('content');
  });
});

describe('copyDir', () => {
  let tempDir: string;
  let srcDir: string;
  let destDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    srcDir = join(tempDir, 'src');
    destDir = join(tempDir, 'dest');
    mkdirSync(srcDir, { recursive: true });
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should copy files preserving directory structure', () => {
    // Create source structure
    mkdirSync(join(srcDir, 'sub'), { recursive: true });
    writeFileSync(join(srcDir, 'root.txt'), 'root');
    writeFileSync(join(srcDir, 'sub', 'nested.txt'), 'nested');

    const result = copyDir(srcDir, destDir, { force: false });

    expect(result.created).toHaveLength(2);
    expect(readFileSync(join(destDir, 'root.txt'), 'utf-8')).toBe('root');
    expect(readFileSync(join(destDir, 'sub', 'nested.txt'), 'utf-8')).toBe('nested');
  });

  it('should skip existing files when force is false', () => {
    writeFileSync(join(srcDir, 'file.txt'), 'new');
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'file.txt'), 'old');

    const result = copyDir(srcDir, destDir, { force: false });

    expect(result.skipped).toHaveLength(1);
    expect(result.created).toHaveLength(0);
    expect(readFileSync(join(destDir, 'file.txt'), 'utf-8')).toBe('old');
  });

  it('should overwrite when force is true', () => {
    writeFileSync(join(srcDir, 'file.txt'), 'new');
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'file.txt'), 'old');

    const result = copyDir(srcDir, destDir, { force: true });

    expect(result.updated).toHaveLength(1);
    expect(readFileSync(join(destDir, 'file.txt'), 'utf-8')).toBe('new');
  });

  it('should return empty result for non-existing source', () => {
    const result = copyDir(join(tempDir, 'nonexistent'), destDir, { force: false });

    expect(result.created).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(result.updated).toHaveLength(0);
  });
});

describe('getVaultDir', () => {
  const originalEnv = process.env.PLAN_FLOW_VAULT_DIR;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PLAN_FLOW_VAULT_DIR;
    } else {
      process.env.PLAN_FLOW_VAULT_DIR = originalEnv;
    }
  });

  it('should return a path ending with plan-flow/brain when env var is not set', () => {
    delete process.env.PLAN_FLOW_VAULT_DIR;
    const dir = getVaultDir();
    expect(dir).toMatch(/plan-flow[/\\]brain$/);
  });

  it('should return env var value when PLAN_FLOW_VAULT_DIR is set', () => {
    process.env.PLAN_FLOW_VAULT_DIR = '/tmp/custom-vault';
    const dir = getVaultDir();
    expect(dir).toBe('/tmp/custom-vault');
  });
});

describe('getProjectName', () => {
  it('should return the basename of a path', () => {
    expect(getProjectName('/home/user/projects/my-app')).toBe('my-app');
  });

  it('should handle trailing slashes', () => {
    expect(getProjectName('/home/user/projects/my-app/')).toBe('my-app');
  });
});

describe('createSymlink and readSymlinkTarget', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should create a symlink and read its target', () => {
    const targetDir = join(tempDir, 'target');
    const linkPath = join(tempDir, 'link');
    mkdirSync(targetDir, { recursive: true });

    createSymlink(targetDir, linkPath);

    expect(existsSync(linkPath)).toBe(true);
    const stat = lstatSync(linkPath);
    expect(stat.isSymbolicLink()).toBe(true);

    const target = readSymlinkTarget(linkPath);
    expect(target).toBe(targetDir);
  });

  it('should replace an existing symlink', () => {
    const target1 = join(tempDir, 'target1');
    const target2 = join(tempDir, 'target2');
    const linkPath = join(tempDir, 'link');
    mkdirSync(target1, { recursive: true });
    mkdirSync(target2, { recursive: true });

    createSymlink(target1, linkPath);
    expect(readSymlinkTarget(linkPath)).toBe(target1);

    createSymlink(target2, linkPath);
    expect(readSymlinkTarget(linkPath)).toBe(target2);
  });

  it('should return null for non-symlink paths', () => {
    const filePath = join(tempDir, 'file.txt');
    writeFileSync(filePath, 'hello');

    expect(readSymlinkTarget(filePath)).toBeNull();
  });

  it('should return null for non-existent paths', () => {
    expect(readSymlinkTarget(join(tempDir, 'nonexistent'))).toBeNull();
  });

  it('should create parent directories for symlink', () => {
    const targetDir = join(tempDir, 'target');
    const linkPath = join(tempDir, 'nested', 'deep', 'link');
    mkdirSync(targetDir, { recursive: true });

    createSymlink(targetDir, linkPath);

    expect(existsSync(linkPath)).toBe(true);
  });
});

describe('isSymlink', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should return true for symlinks', () => {
    const targetDir = join(tempDir, 'target');
    const linkPath = join(tempDir, 'link');
    mkdirSync(targetDir, { recursive: true });
    createSymlink(targetDir, linkPath);

    expect(isSymlink(linkPath)).toBe(true);
  });

  it('should return false for regular directories', () => {
    const dir = join(tempDir, 'regular');
    mkdirSync(dir, { recursive: true });

    expect(isSymlink(dir)).toBe(false);
  });

  it('should return false for non-existent paths', () => {
    expect(isSymlink(join(tempDir, 'nonexistent'))).toBe(false);
  });
});

describe('moveContents', () => {
  let tempDir: string;
  let srcDir: string;
  let destDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    srcDir = join(tempDir, 'src');
    destDir = join(tempDir, 'dest');
    mkdirSync(srcDir, { recursive: true });
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  it('should move files and directories', () => {
    writeFileSync(join(srcDir, 'file1.txt'), 'content1');
    writeFileSync(join(srcDir, 'file2.txt'), 'content2');
    mkdirSync(join(srcDir, 'subdir'));
    writeFileSync(join(srcDir, 'subdir', 'nested.txt'), 'nested');

    moveContents(srcDir, destDir);

    expect(existsSync(join(destDir, 'file1.txt'))).toBe(true);
    expect(existsSync(join(destDir, 'file2.txt'))).toBe(true);
    expect(existsSync(join(destDir, 'subdir', 'nested.txt'))).toBe(true);

    // Source should be empty (directory itself remains, but contents moved)
    const remaining = readdirSync(srcDir);
    expect(remaining).toHaveLength(0);
  });

  it('should handle dotfiles', () => {
    writeFileSync(join(srcDir, '.hidden'), 'secret');
    writeFileSync(join(srcDir, '.config'), 'settings');

    moveContents(srcDir, destDir);

    expect(existsSync(join(destDir, '.hidden'))).toBe(true);
    expect(existsSync(join(destDir, '.config'))).toBe(true);
    expect(readFileSync(join(destDir, '.hidden'), 'utf-8')).toBe('secret');
  });

  it('should return correct count', () => {
    writeFileSync(join(srcDir, 'a.txt'), 'a');
    writeFileSync(join(srcDir, 'b.txt'), 'b');
    mkdirSync(join(srcDir, 'subdir'));
    writeFileSync(join(srcDir, 'subdir', 'c.txt'), 'c');

    const result = moveContents(srcDir, destDir);

    // moveContents moves top-level entries: a.txt, b.txt, subdir = 3
    expect(result.moved).toBe(3);
    expect(result.errors).toHaveLength(0);
  });

  it('should preserve file contents', () => {
    const knownContent = 'Hello, world! Special chars: é à ü 日本語 🎉';
    writeFileSync(join(srcDir, 'data.txt'), knownContent, 'utf-8');

    moveContents(srcDir, destDir);

    const readBack = readFileSync(join(destDir, 'data.txt'), 'utf-8');
    expect(readBack).toBe(knownContent);
  });
});
