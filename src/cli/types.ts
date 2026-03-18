/**
 * Shared types for the CLI
 */

export interface InitOptions {
  claude?: boolean;
  cursor?: boolean;
  openclaw?: boolean;
  clawhub?: boolean;
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

export type Platform = 'claude' | 'cursor' | 'openclaw' | 'clawhub' | 'codex';

export interface ScheduleConfig {
  type: 'daily' | 'interval' | 'weekly' | 'once';
  hour?: number;
  minute?: number;
  intervalMs?: number;
  dayOfWeek?: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
}

export interface HeartbeatTask {
  name: string;
  schedule: string;
  scheduleConfig: ScheduleConfig;
  command: string;
  enabled: boolean;
  description: string;
  oneShot?: boolean;
  tasklistLink?: string;
  addDirs?: string[];
}

export interface HeartbeatOptions {
  target: string;
}

export type NotificationLevel = 'info' | 'warn' | 'error';

export type NotificationType =
  | 'task_started'
  | 'phase_complete'
  | 'task_complete'
  | 'task_failed'
  | 'task_blocked';

export interface NotificationEvent {
  id: string;
  timestamp: Date;
  task: string;
  type: NotificationType;
  level: NotificationLevel;
  phase?: string;
  message: string;
}

export interface HeartbeatState {
  lastReadTimestamp: string;
  lastSessionId?: string;
}
