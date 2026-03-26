/**
 * Tests for brain-query module — project-scoped brain open/search/close.
 */

import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSearch = jest.fn<() => Promise<any[]>>().mockResolvedValue([]);
const mockClose = jest.fn();
const mockBrainOpen = jest.fn<() => Promise<any>>().mockResolvedValue({
  search: mockSearch,
  close: mockClose,
});

jest.unstable_mockModule('planflow-brain', () => ({
  Brain: {
    open: mockBrainOpen,
  },
}));

// Must be imported after mock registration
const { openProjectBrain, queryProjectBrain, closeProjectBrain } = await import('./brain-query.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSearchResult(overrides: Record<string, any> = {}) {
  return {
    text: 'some content',
    sourceFile: '.claude/resources/core/wave-execution.md',
    heading: '## Architecture',
    chunkType: 'core',
    score: 0.92,
    tags: [],
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockBrainOpen.mockResolvedValue({ search: mockSearch, close: mockClose });
  mockSearch.mockResolvedValue([]);
});

describe('openProjectBrain', () => {
  it('returns brain instance when Brain.open succeeds', async () => {
    const fakeBrain = { search: mockSearch, close: mockClose };
    mockBrainOpen.mockResolvedValue(fakeBrain);

    const result = await openProjectBrain('/project');

    expect(mockBrainOpen).toHaveBeenCalledWith('/project');
    expect(result).toBe(fakeBrain);
  });

  it('returns null when Brain.open throws', async () => {
    mockBrainOpen.mockRejectedValue(new Error('DB corrupt'));

    const result = await openProjectBrain('/project');

    expect(result).toBeNull();
  });

  it('returns null when planflow-brain import fails', async () => {
    // Simulate import failure by making Brain.open reject
    // (the actual import is already mocked; we test the catch path)
    mockBrainOpen.mockRejectedValue(new Error('Cannot find module'));

    const result = await openProjectBrain('/project');

    expect(result).toBeNull();
  });
});

describe('queryProjectBrain', () => {
  it('returns empty array when brain is null', async () => {
    const results = await queryProjectBrain(null, 'test query');
    expect(results).toEqual([]);
  });

  it('returns QueryResult[] with correct shape', async () => {
    const rawResults = [
      makeSearchResult({
        text: 'wave content',
        sourceFile: '.claude/resources/core/wave-execution.md',
        heading: '## Architecture',
        chunkType: 'core',
        score: 0.92,
      }),
      makeSearchResult({
        text: 'plan content',
        sourceFile: 'flow/plans/plan_feature_v1.md',
        heading: '## Phase 1',
        chunkType: 'plan',
        score: 0.85,
      }),
    ];
    mockSearch.mockResolvedValue(rawResults);

    const brain = { search: mockSearch, close: mockClose };
    const results = await queryProjectBrain(brain, 'architecture');

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      file: '.claude/resources/core/wave-execution.md',
      heading: '## Architecture',
      content: 'wave content',
      score: 0.92,
      chunkType: 'core',
    });
    expect(results[1]).toEqual({
      file: 'flow/plans/plan_feature_v1.md',
      heading: '## Phase 1',
      content: 'plan content',
      score: 0.85,
      chunkType: 'plan',
    });
  });

  it('applies scope filtering — resources scope only returns .claude/resources/ files', async () => {
    const rawResults = [
      makeSearchResult({ sourceFile: '.claude/resources/core/wave-execution.md', score: 0.92 }),
      makeSearchResult({ sourceFile: 'flow/plans/plan_feature_v1.md', score: 0.85 }),
      makeSearchResult({ sourceFile: '.claude/resources/skills/setup.md', score: 0.80 }),
    ];
    mockSearch.mockResolvedValue(rawResults);

    const brain = { search: mockSearch, close: mockClose };
    const results = await queryProjectBrain(brain, 'test', { scope: 'resources' });

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.file.startsWith('.claude/resources/'))).toBe(true);
  });

  it('applies type filtering — passes chunkTypes to brain.search', async () => {
    const brain = { search: mockSearch, close: mockClose };
    await queryProjectBrain(brain, 'test', { type: 'plan' });

    expect(mockSearch).toHaveBeenCalledWith('test', expect.objectContaining({
      chunkTypes: ['plan'],
    }));
  });

  it('applies limit — passes limit to brain.search', async () => {
    const brain = { search: mockSearch, close: mockClose };
    await queryProjectBrain(brain, 'test', { limit: 5 });

    expect(mockSearch).toHaveBeenCalledWith('test', expect.objectContaining({
      limit: 5, // no scope, so limit is passed as-is
    }));
  });

  it('uses default limit of 10 when not specified', async () => {
    const brain = { search: mockSearch, close: mockClose };
    await queryProjectBrain(brain, 'test');

    expect(mockSearch).toHaveBeenCalledWith('test', expect.objectContaining({
      limit: 10,
      chunkTypes: undefined,
    }));
  });

  it('returns empty array when brain.search throws', async () => {
    mockSearch.mockRejectedValue(new Error('search failed'));

    const brain = { search: mockSearch, close: mockClose };
    const results = await queryProjectBrain(brain, 'test');

    expect(results).toEqual([]);
  });

  it('does not filter when scope is "all"', async () => {
    const rawResults = [
      makeSearchResult({ sourceFile: '.claude/resources/core/wave.md' }),
      makeSearchResult({ sourceFile: 'flow/plans/plan_v1.md' }),
      makeSearchResult({ sourceFile: 'flow/brain/features/auth.md' }),
    ];
    mockSearch.mockResolvedValue(rawResults);

    const brain = { search: mockSearch, close: mockClose };
    const results = await queryProjectBrain(brain, 'test', { scope: 'all' });

    expect(results).toHaveLength(3);
  });

  it('does not filter when scope is undefined', async () => {
    const rawResults = [
      makeSearchResult({ sourceFile: '.claude/resources/core/wave.md' }),
      makeSearchResult({ sourceFile: 'flow/plans/plan_v1.md' }),
    ];
    mockSearch.mockResolvedValue(rawResults);

    const brain = { search: mockSearch, close: mockClose };
    const results = await queryProjectBrain(brain, 'test');

    expect(results).toHaveLength(2);
  });
});

describe('closeProjectBrain', () => {
  it('calls brain.close() when brain is provided', () => {
    const brain = { search: mockSearch, close: mockClose };
    closeProjectBrain(brain);

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('does nothing when brain is null', () => {
    expect(() => closeProjectBrain(null)).not.toThrow();
  });

  it('catches errors from brain.close() without throwing', () => {
    const throwingClose = jest.fn().mockImplementation(() => {
      throw new Error('close failed');
    });
    const brain = { search: mockSearch, close: throwingClose };

    expect(() => closeProjectBrain(brain)).not.toThrow();
    expect(throwingClose).toHaveBeenCalledTimes(1);
  });
});
