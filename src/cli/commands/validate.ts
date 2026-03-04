/**
 * Validate command
 *
 * Validates Plan-Flow artifacts (plans, discovery, brain) for structural
 * integrity. Designed for CI pipelines and pre-commit checks.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

interface ValidationResult {
  errors: string[];
  warnings: string[];
}

const PLAN_REQUIRED_SECTIONS = ['## Phases', '## Overview'];
const DISCOVERY_REQUIRED_SECTIONS = [
  '## Context',
  '## Requirements Gathered',
  '## Proposed Approach',
];
const BRAIN_INDEX_MAX_ERRORS = 5;
const BRAIN_INDEX_MAX_DECISIONS = 3;

function listMdFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(dir, f));
}

function listDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => statSync(join(dir, f)).isDirectory())
    .map((f) => join(dir, f));
}

/**
 * Validates plan files in flow/plans/
 */
export function validatePlans(flowDir: string): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };
  const plansDir = join(flowDir, 'plans');
  const files = listMdFiles(plansDir);

  if (files.length === 0) {
    result.warnings.push('No plan files found in flow/plans/');
    return result;
  }

  for (const file of files) {
    const name = basename(file);
    const content = readFileSync(file, 'utf-8');

    // Check required sections
    for (const section of PLAN_REQUIRED_SECTIONS) {
      if (!content.includes(section)) {
        result.errors.push(`${name}: missing required section "${section}"`);
      }
    }

    // Check for complexity scores in phases
    const phasePattern = /### Phase \d+/g;
    const phases = content.match(phasePattern) || [];
    const complexityPattern = /\*\*Complexity\*\*:\s*(\d+)\/10/g;
    const scores = content.match(complexityPattern) || [];

    if (phases.length > 0 && scores.length === 0) {
      result.errors.push(`${name}: phases found but no complexity scores`);
    } else if (phases.length > 0 && scores.length < phases.length) {
      result.warnings.push(
        `${name}: ${phases.length} phases but only ${scores.length} complexity scores`
      );
    }

    // Validate complexity scores are 0-10
    const scoreValues = [...content.matchAll(/\*\*Complexity\*\*:\s*(\d+)\/10/g)];
    for (const match of scoreValues) {
      const score = parseInt(match[1], 10);
      if (score < 0 || score > 10) {
        result.errors.push(
          `${name}: invalid complexity score ${score} (must be 0-10)`
        );
      }
    }
  }

  return result;
}

/**
 * Validates discovery files in flow/discovery/
 */
export function validateDiscovery(flowDir: string): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };
  const discoveryDir = join(flowDir, 'discovery');
  const files = listMdFiles(discoveryDir);

  if (files.length === 0) {
    result.warnings.push('No discovery files found in flow/discovery/');
    return result;
  }

  for (const file of files) {
    const name = basename(file);
    const content = readFileSync(file, 'utf-8');

    for (const section of DISCOVERY_REQUIRED_SECTIONS) {
      if (!content.includes(section)) {
        result.errors.push(`${name}: missing required section "${section}"`);
      }
    }
  }

  return result;
}

/**
 * Validates brain files in flow/brain/
 */
export function validateBrain(flowDir: string): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };
  const brainDir = join(flowDir, 'brain');

  if (!existsSync(brainDir)) {
    result.warnings.push('No brain directory found at flow/brain/');
    return result;
  }

  // Check index exists
  const indexPath = join(brainDir, 'index.md');
  if (!existsSync(indexPath)) {
    result.warnings.push('Brain index not found at flow/brain/index.md');
    return result;
  }

  const indexContent = readFileSync(indexPath, 'utf-8');

  // Check error cap
  const errorsDir = join(brainDir, 'errors');
  const errorFiles = listMdFiles(errorsDir);
  const activeErrors = indexContent.match(/\[active\].*error/gi) || [];
  if (activeErrors.length > BRAIN_INDEX_MAX_ERRORS) {
    result.warnings.push(
      `Brain index has ${activeErrors.length} active errors (cap: ${BRAIN_INDEX_MAX_ERRORS})`
    );
  }
  if (errorFiles.length > BRAIN_INDEX_MAX_ERRORS * 2) {
    result.warnings.push(
      `${errorFiles.length} error files in brain/errors/ — consider archiving old entries`
    );
  }

  // Check decision cap
  const decisionsDir = join(brainDir, 'decisions');
  const decisionFiles = listMdFiles(decisionsDir);
  const activeDecisions =
    indexContent.match(/\[active\].*decision/gi) || [];
  if (activeDecisions.length > BRAIN_INDEX_MAX_DECISIONS) {
    result.warnings.push(
      `Brain index has ${activeDecisions.length} active decisions (cap: ${BRAIN_INDEX_MAX_DECISIONS})`
    );
  }
  if (decisionFiles.length > BRAIN_INDEX_MAX_DECISIONS * 3) {
    result.warnings.push(
      `${decisionFiles.length} decision files in brain/decisions/ — consider archiving old entries`
    );
  }

  // Check wiki-link resolution
  const wikiLinks = indexContent.match(/\[\[([^\]]+)\]\]/g) || [];
  for (const link of wikiLinks) {
    const target = link.slice(2, -2); // Remove [[ and ]]
    // Check if target exists as a file in brain subdirectories
    const possiblePaths = [
      join(brainDir, 'features', `${target}.md`),
      join(brainDir, 'errors', `${target}.md`),
      join(brainDir, 'decisions', `${target}.md`),
      join(brainDir, 'sessions', `${target}.md`),
    ];
    const resolved = possiblePaths.some((p) => existsSync(p));
    if (!resolved) {
      result.warnings.push(
        `Brain index: wiki-link [[${target}]] does not resolve to any brain file`
      );
    }
  }

  // Check for orphaned brain entries (files not referenced in index)
  for (const subDir of listDirs(brainDir)) {
    const dirName = basename(subDir);
    if (dirName === 'sessions') continue; // Sessions don't need index references
    for (const file of listMdFiles(subDir)) {
      const fileName = basename(file, '.md');
      if (!indexContent.includes(`[[${fileName}]]`)) {
        result.warnings.push(
          `Orphaned brain entry: brain/${dirName}/${basename(file)} — not referenced in index`
        );
      }
    }
  }

  return result;
}

/**
 * Run all validations and print results
 */
export async function runValidate(options: {
  target: string;
  fix?: boolean;
}): Promise<void> {
  const flowDir = join(options.target, 'flow');

  if (!existsSync(flowDir)) {
    console.error('Error: No flow/ directory found. Run `planflow init` first.');
    process.exit(1);
  }

  console.log('Validating Plan-Flow artifacts...\n');

  const planResult = validatePlans(flowDir);
  const discoveryResult = validateDiscovery(flowDir);
  const brainResult = validateBrain(flowDir);

  const allErrors = [
    ...planResult.errors,
    ...discoveryResult.errors,
    ...brainResult.errors,
  ];
  const allWarnings = [
    ...planResult.warnings,
    ...discoveryResult.warnings,
    ...brainResult.warnings,
  ];

  // Print errors
  if (allErrors.length > 0) {
    console.log(`ERRORS (${allErrors.length}):`);
    for (const err of allErrors) {
      console.log(`  ✗ ${err}`);
    }
    console.log('');
  }

  // Print warnings
  if (allWarnings.length > 0) {
    console.log(`WARNINGS (${allWarnings.length}):`);
    for (const warn of allWarnings) {
      console.log(`  ⚠ ${warn}`);
    }
    console.log('');
  }

  // Summary
  if (allErrors.length === 0 && allWarnings.length === 0) {
    console.log('All validations passed.');
  } else if (allErrors.length === 0) {
    console.log(`Validation passed with ${allWarnings.length} warning(s).`);
  } else {
    console.log(
      `Validation FAILED: ${allErrors.length} error(s), ${allWarnings.length} warning(s).`
    );
    process.exit(1);
  }
}
