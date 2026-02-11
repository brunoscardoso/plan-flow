/**
 * Tests for file utilities
 */

import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getPackageRoot,
  copyDir,
  copyFile,
  ensureDir,
  fileExists,
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
