/**
 * Shared types for the CLI
 */

export interface InitOptions {
  claude?: boolean;
  cursor?: boolean;
  openclaw?: boolean;
  codex?: boolean;
  all?: boolean;
  force?: boolean;
  target: string;
}

export interface CopyOptions {
  force: boolean;
}

export interface CopyResult {
  created: string[];
  skipped: string[];
  updated: string[];
}

export interface InitResult {
  platform: string;
  result: CopyResult;
}

export type Platform = 'claude' | 'cursor' | 'openclaw' | 'codex';
