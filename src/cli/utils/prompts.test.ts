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

const { askBusinessContext } = await import('./prompts.js');

describe('askBusinessContext', () => {
  beforeEach(() => {
    mockQuestion.mockReset();
    mockClose.mockReset();
  });

  it('should return user answers from 3 prompts', async () => {
    mockQuestion
      .mockResolvedValueOnce('A CLI tool for workflows')
      .mockResolvedValueOnce('Developers')
      .mockResolvedValueOnce('Automates repetitive tasks');

    const result = await askBusinessContext();

    expect(result).toEqual({
      whatItDoes: 'A CLI tool for workflows',
      targetAudience: 'Developers',
      problemItSolves: 'Automates repetitive tasks',
    });
    expect(mockQuestion).toHaveBeenCalledTimes(3);
    expect(mockClose).toHaveBeenCalled();
  });

  it('should use readmeHint as default for first question when user presses enter', async () => {
    mockQuestion
      .mockResolvedValueOnce('')  // empty = use default
      .mockResolvedValueOnce('Teams')
      .mockResolvedValueOnce('Saves time');

    const result = await askBusinessContext('A great project');

    expect(result.whatItDoes).toBe('A great project');
    expect(result.targetAudience).toBe('Teams');
    expect(result.problemItSolves).toBe('Saves time');
  });

  it('should allow user to override readmeHint', async () => {
    mockQuestion
      .mockResolvedValueOnce('Custom description')
      .mockResolvedValueOnce('End users')
      .mockResolvedValueOnce('Makes life easier');

    const result = await askBusinessContext('A great project');

    expect(result.whatItDoes).toBe('Custom description');
  });

  it('should return empty strings when user provides no input and no hint', async () => {
    mockQuestion
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('');

    const result = await askBusinessContext();

    expect(result.whatItDoes).toBe('');
    expect(result.targetAudience).toBe('');
    expect(result.problemItSolves).toBe('');
  });

  it('should close readline interface even on error', async () => {
    mockQuestion.mockRejectedValueOnce(new Error('readline error'));

    await expect(askBusinessContext()).rejects.toThrow('readline error');
    expect(mockClose).toHaveBeenCalled();
  });
});
