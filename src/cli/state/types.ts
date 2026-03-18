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
  branch: string;
  wave_execution: boolean;
  phase_isolation: boolean;
  model_routing: boolean;
  max_verify_retries: number;
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
  };
}

export interface HeartbeatSummary {
  unread_count: number;
  has_prompt: boolean;
  last_read_timestamp: string | null;
}

export interface PlanTask {
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

export interface StateOutput {
  config: FlowConfig;
  session: SessionState;
  heartbeat: HeartbeatSummary;
  plan?: {
    phases: PlanPhase[];
    waves: WaveGroup[];
    model_tiers: ModelTier[];
  };
}
