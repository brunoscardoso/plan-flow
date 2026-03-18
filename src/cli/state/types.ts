/**
 * Types for the deterministic state script (`planflow-ai state`).
 *
 * These interfaces define the JSON output shape produced by parsing
 * plan-flow config files, session state, heartbeat events, and plans.
 */

export interface FlowConfig {
  autopilot: boolean;
  commit: boolean;
  push: boolean;
  pr: boolean;
  branch: string;
  wave_execution: boolean;
  phase_isolation: boolean;
  model_routing: boolean;
  max_verify_retries: number;
  webhook_url: string;
  telegram_bot_token: string;
  telegram_chat_id: string;
}

export interface SessionState {
  files_present: {
    ledger: boolean;
    brain_index: boolean;
    tasklist: boolean;
    memory: boolean;
    scratchpad: boolean;
    heartbeat_events: boolean;
    heartbeat_state: boolean;
    heartbeat_prompt: boolean;
    state_md: boolean;
  };
}

export interface HeartbeatSummary {
  unread_count: number;
  has_prompt: boolean;
  last_read_timestamp: string | null;
}

export interface TaskCompletion {
  task_number: number;
  task_name: string;
  files_created: string[];
  files_modified: string[];
}

export interface PlanTask {
  index: number;
  name: string;
  verify_command: string | null;
}

export interface PlanPhase {
  number: number;
  name: string;
  complexity: number;
  dependencies: number[];
  tasks: PlanTask[];
}

export interface WaveGroup {
  wave_number: number;
  phase_numbers: number[];
}

export type ModelTierLevel = 'fast' | 'standard' | 'powerful';

export interface ModelTier {
  phase: number;
  complexity: number;
  tier: ModelTierLevel;
  model: string;
}

export interface CompletedPhase {
  number: number;
  name: string;
  outcome: string;
}

export interface Decision {
  decision: string;
  choice: string;
  reason: string;
}

export interface Blocker {
  issue: string;
  status: string;
  tried: string;
}

export interface ExecutionState {
  active_skill: string | null;
  active_plan: string | null;
  current_phase: { number: number; name: string } | null;
  current_task: string | null;
  completed_phases: CompletedPhase[];
  decisions: Decision[];
  blockers: Blocker[];
  files_modified: string[];
  next_action: string | null;
  updated_at: string | null;
}

export interface StateOutput {
  config: FlowConfig;
  session: SessionState;
  heartbeat: HeartbeatSummary;
  execution?: ExecutionState;
  plan?: {
    phases: PlanPhase[];
    waves: WaveGroup[];
    model_tiers: ModelTier[];
  };
}
