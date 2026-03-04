/**
 * Tests for prompts utilities
 */

import { jest } from '@jest/globals';

// Mock readline/promises
const mockQuestion = jest.fn<(q: string) => Promise<string>>();
const mockClose = jest.fn();

jest.unstable_mockModule('node:readline/promises', () => ({
  createInterface: jest.fn(() => ({
    question: mockQuestion,
    close: mockClose,
  })),
}));

const { askLegacyFilesAction } = await import('./prompts.js');

describe('askLegacyFilesAction', () => {
  beforeEach(() => {
    mockQuestion.mockReset();
    mockClose.mockReset();
  });

  it('should return keep by default', async () => {
    mockQuestion.mockResolvedValueOnce('');

    const result = await askLegacyFilesAction('core', ['file1.md']);

    expect(result).toBe('keep');
    expect(mockClose).toHaveBeenCalled();
  });

  it('should return move for choice 2', async () => {
    mockQuestion.mockResolvedValueOnce('2');

    const result = await askLegacyFilesAction('core', ['file1.md']);

    expect(result).toBe('move');
  });

  it('should return remove for choice 3', async () => {
    mockQuestion.mockResolvedValueOnce('3');

    const result = await askLegacyFilesAction('core', ['file1.md']);

    expect(result).toBe('remove');
  });
});
