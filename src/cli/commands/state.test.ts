/**
 * Tests for state CLI command (integration)
 */

import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock all parser modules
const mockParseFlowConfig = jest.fn();
const mockGetSessionState = jest.fn();
const mockGetHeartbeatSummary = jest.fn();
const mockParsePlan = jest.fn();
const mockCalculateWaves = jest.fn();
const mockCalculateModelTiers = jest.fn();

jest.unstable_mockModule(
  resolve(__dirname, '../state/flowconfig-parser'),
  () => ({ parseFlowConfig: mockParseFlowConfig }),
);
jest.unstable_mockModule(
  resolve(__dirname, '../state/session-state'),
  () => ({ getSessionState: mockGetSessionState }),
);
jest.unstable_mockModule(
  resolve(__dirname, '../state/heartbeat-state'),
  () => ({ getHeartbeatSummary: mockGetHeartbeatSummary }),
);
jest.unstable_mockModule(
  resolve(__dirname, '../state/plan-parser'),
  () => ({ parsePlan: mockParsePlan }),
);
jest.unstable_mockModule(
  resolve(__dirname, '../state/wave-calculator'),
  () => ({ calculateWaves: mockCalculateWaves }),
);
jest.unstable_mockModule(
  resolve(__dirname, '../state/model-router'),
  () => ({ calculateModelTiers: mockCalculateModelTiers }),
);

const { runState } = await import('./state');

const DEFAULT_CONFIG = {
  autopilot: false,
  commit: false,
  push: false,
  branch: '',
  wave_execution: true,
  phase_isolation: true,
  model_routing: false,
  max_verify_retries: 2,
};

const DEFAULT_SESSION = {
  files_present: {
    ledger: false,
    brain_index: false,
    tasklist: false,
    memory: false,
    scratchpad: false,
    heartbeat_events: false,
    heartbeat_state: false,
    heartbeat_prompt: false,
  },
};

const DEFAULT_HEARTBEAT = {
  unread_count: 0,
  has_prompt: false,
  last_read_timestamp: null,
};

describe('runState', () => {
  let stdoutSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockParseFlowConfig.mockReturnValue(DEFAULT_CONFIG);
    mockGetSessionState.mockReturnValue(DEFAULT_SESSION);
    mockGetHeartbeatSummary.mockReturnValue(DEFAULT_HEARTBEAT);

    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    // Reset exitCode
    process.exitCode = undefined;
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('should output state JSON without plan section when --plan is not provided', async () => {
    await runState({ target: '/tmp/test-project' });

    expect(mockParseFlowConfig).toHaveBeenCalledWith('/tmp/test-project/flow');
    expect(mockGetSessionState).toHaveBeenCalledWith('/tmp/test-project/flow');
    expect(mockGetHeartbeatSummary).toHaveBeenCalledWith('/tmp/test-project/flow');
    expect(mockParsePlan).not.toHaveBeenCalled();

    const output = JSON.parse((stdoutSpy.mock.calls[0][0] as string).trim());
    expect(output.config).toEqual(DEFAULT_CONFIG);
    expect(output.session).toEqual(DEFAULT_SESSION);
    expect(output.heartbeat).toEqual(DEFAULT_HEARTBEAT);
    expect(output.plan).toBeUndefined();
  });

  it('should include plan section when --plan is provided', async () => {
    const mockPhases = [
      { number: 1, name: 'Setup', complexity: 3, dependencies: [], tasks: [] },
    ];
    const mockWaves = [{ wave_number: 1, phase_numbers: [1] }];
    const mockTiers: never[] = [];

    mockParsePlan.mockReturnValue(mockPhases);
    mockCalculateWaves.mockReturnValue(mockWaves);
    mockCalculateModelTiers.mockReturnValue(mockTiers);

    await runState({ target: '/tmp/test-project', plan: '/tmp/test-project/flow/plans/plan_test_v1.md' });

    expect(mockParsePlan).toHaveBeenCalledWith('/tmp/test-project/flow/plans/plan_test_v1.md');
    expect(mockCalculateWaves).toHaveBeenCalledWith(mockPhases);
    expect(mockCalculateModelTiers).toHaveBeenCalledWith(mockPhases, false);

    const output = JSON.parse((stdoutSpy.mock.calls[0][0] as string).trim());
    expect(output.plan).toEqual({
      phases: mockPhases,
      waves: mockWaves,
      model_tiers: mockTiers,
    });
  });

  it('should output error JSON and set exitCode on failure', async () => {
    mockParseFlowConfig.mockImplementation(() => {
      throw new Error('Config file corrupted');
    });

    await runState({ target: '/tmp/test-project' });

    const output = JSON.parse((stdoutSpy.mock.calls[0][0] as string).trim());
    expect(output.error).toBe('Config file corrupted');
    expect(process.exitCode).toBe(1);
  });
});
