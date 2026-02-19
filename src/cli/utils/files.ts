/**
 * File operation utilities for the init command
 */

import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CopyOptions, CopyResult } from '../types.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolves the package root directory by finding the nearest package.json
 * with name "plan-flow" starting from a known internal path.
 *
 * Works with:
 * - Local development (src/cli/utils/)
 * - Built output (dist/cli/utils/)
 * - npx / global install (node_modules/plan-flow/dist/cli/utils/)
 * - Jest/CJS (__dirname available)
 */
export function getPackageRoot(): string {
  // Start from this file's directory and walk up to find package root
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.name === 'planflow-ai') {
          return dir;
        }
      } catch {
        // Not valid JSON, continue walking up
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }

  // If we can't find it, fall back to 3 levels up from __dirname
  return resolve(__dirname, '..', '..', '..');
}

/**
 * Recursively copies a directory, preserving structure.
 * Returns a CopyResult with created, skipped, and updated files.
 */
export function copyDir(
  src: string,
  dest: string,
  options: CopyOptions
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], updated: [] };

  if (!existsSync(src)) {
    return result;
  }

  ensureDir(dest);

  const entries = readdirSync(src);

  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      const subResult = copyDir(srcPath, destPath, options);
      result.created.push(...subResult.created);
      result.skipped.push(...subResult.skipped);
      result.updated.push(...subResult.updated);
    } else {
      const fileResult = copyFile(srcPath, destPath, options);
      result.created.push(...fileResult.created);
      result.skipped.push(...fileResult.skipped);
      result.updated.push(...fileResult.updated);
    }
  }

  return result;
}

/**
 * Copies a single file with skip/overwrite logic.
 */
export function copyFile(
  src: string,
  dest: string,
  options: CopyOptions
): CopyResult {
  const result: CopyResult = { created: [], skipped: [], updated: [] };

  ensureDir(dirname(dest));

  if (existsSync(dest)) {
    if (options.force) {
      copyFileSync(src, dest);
      result.updated.push(dest);
    } else {
      result.skipped.push(dest);
    }
  } else {
    copyFileSync(src, dest);
    result.created.push(dest);
  }

  return result;
}

/**
 * Creates a directory recursively if it doesn't exist.
 */
export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Removes a directory recursively if it exists.
 * Returns the list of removed paths.
 */
export function removeDir(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  const removed: string[] = [dir];
  rmSync(dir, { recursive: true, force: true });
  return removed;
}

/**
 * Lists all files in a directory recursively, returning paths relative to the dir.
 */
export function listFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      for (const sub of listFilesRecursive(fullPath)) {
        files.push(join(entry, sub));
      }
    } else {
      files.push(entry);
    }
  }
  return files;
}

/**
 * Moves a file from src to dest, creating parent directories as needed.
 */
export function moveFile(src: string, dest: string): void {
  ensureDir(dirname(dest));
  renameSync(src, dest);
}

/**
 * Removes a single file if it exists.
 */
export function removeFile(filePath: string): void {
  if (existsSync(filePath)) {
    rmSync(filePath, { force: true });
  }
}

/**
 * Checks if a file or directory exists.
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * Formats a file path relative to a base for display.
 */
export function relativePath(filePath: string, base: string): string {
  return relative(base, filePath);
}
