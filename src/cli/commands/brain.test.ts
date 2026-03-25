/**
 * Tests for the brain CLI command
 */

import { jest } from '@jest/globals';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ESM mocking — must be set up before importing the module under test
const mockBrainInstance = {
  search: jest.fn<() => Promise<never[]>>().mockResolvedValue([]),
  ingest: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  rebuild: jest.fn<() => Promise<{ filesIndexed: number; chunksCreated: number; durationMs: number }>>()
    .mockResolvedValue({ filesIndexed: 0, chunksCreated: 0, durationMs: 0 }),
  stats: jest.fn<() => { totalFiles: number; totalChunks: number; dbSizeBytes: number; lastIndexed?: string }>()
    .mockReturnValue({ totalFiles: 0, totalChunks: 0, dbSizeBytes: 0 }),
  sync: jest.fn<() => Promise<{ filesAdded: number; filesUpdated: number; filesRemoved: number; chunksCreated: number; durationMs: number }>>()
    .mockResolvedValue({ filesAdded: 0, filesUpdated: 0, filesRemoved: 0, chunksCreated: 0, durationMs: 0 }),
  close: jest.fn<() => void>(),
};

jest.unstable_mockModule('planflow-brain', () => ({
  Brain: {
    open: jest.fn<() => Promise<typeof mockBrainInstance>>().mockResolvedValue(mockBrainInstance),
  },
}));

// Dynamic import AFTER mock setup
const { runBrain } = await import('./brain.js');

function createTempDir(): string {
  const dir = join(tmpdir(), `plan-flow-brain-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe('brain CLI', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    jest.clearAllMocks();
    // Reset default return values after clearAllMocks
    mockBrainInstance.search.mockResolvedValue([]);
    mockBrainInstance.ingest.mockResolvedValue(undefined);
    mockBrainInstance.rebuild.mockResolvedValue({ filesIndexed: 0, chunksCreated: 0, durationMs: 0 });
    mockBrainInstance.stats.mockReturnValue({ totalFiles: 0, totalChunks: 0, dbSizeBytes: 0 });
    mockBrainInstance.sync.mockResolvedValue({ filesAdded: 0, filesUpdated: 0, filesRemoved: 0, chunksCreated: 0, durationMs: 0 });
  });

  afterEach(() => {
    cleanup(tempDir);
  });

  describe('search', () => {
    it('exits with error when no query provided', async () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      await expect(runBrain('search', [], { brainDir: tempDir })).rejects.toThrow('process.exit called');
      exitSpy.mockRestore();
    });

    it('calls brain.search with joined query args', async () => {
      await runBrain('search', ['dark', 'mode'], { brainDir: tempDir });
      expect(mockBrainInstance.search).toHaveBeenCalledWith('dark mode', { limit: 10, chunkTypes: undefined });
      expect(mockBrainInstance.close).toHaveBeenCalled();
    });

    it('passes limit and type options to search', async () => {
      await runBrain('search', ['query'], { brainDir: tempDir, limit: 5, type: 'plan' });
      expect(mockBrainInstance.search).toHaveBeenCalledWith('query', { limit: 5, chunkTypes: ['plan'] });
    });

    it('closes brain even when search returns empty results', async () => {
      await runBrain('search', ['nothing'], { brainDir: tempDir });
      expect(mockBrainInstance.close).toHaveBeenCalled();
    });

    it('displays results when search returns matches', async () => {
      mockBrainInstance.search.mockResolvedValue([
        { id: 1, text: 'dark mode toggle implementation', sourceFile: 'features/dark-mode.md', heading: 'Overview', chunkType: 'note', score: 0.9, tags: [] },
      ] as never[]);
      const consoleSpy = jest.spyOn(console, 'log');
      await runBrain('search', ['dark', 'mode'], { brainDir: tempDir });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('ingest', () => {
    it('exits with error when no file provided', async () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      await expect(runBrain('ingest', [], { brainDir: tempDir })).rejects.toThrow('process.exit called');
      exitSpy.mockRestore();
    });

    it('exits with error when file does not exist', async () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      await expect(runBrain('ingest', ['/nonexistent/file.md'], { brainDir: tempDir })).rejects.toThrow('process.exit called');
      exitSpy.mockRestore();
    });

    it('ingests an existing markdown file', async () => {
      const mdFile = join(tempDir, 'test.md');
      writeFileSync(mdFile, '# Test\n\nContent here.');

      await runBrain('ingest', [mdFile], { brainDir: tempDir });

      expect(mockBrainInstance.ingest).toHaveBeenCalledWith('test.md', '# Test\n\nContent here.');
      expect(mockBrainInstance.close).toHaveBeenCalled();
    });
  });

  describe('rebuild', () => {
    it('calls brain.rebuild and closes', async () => {
      mockBrainInstance.rebuild.mockResolvedValue({ filesIndexed: 5, chunksCreated: 42, durationMs: 120 } as never);
      await runBrain('rebuild', [], { brainDir: tempDir });
      expect(mockBrainInstance.rebuild).toHaveBeenCalled();
      expect(mockBrainInstance.close).toHaveBeenCalled();
    });
  });

  describe('stats', () => {
    it('calls brain.stats and closes', async () => {
      mockBrainInstance.stats.mockReturnValue({ totalFiles: 10, totalChunks: 80, dbSizeBytes: 204800, lastIndexed: '2026-03-25' } as never);
      await runBrain('stats', [], { brainDir: tempDir });
      expect(mockBrainInstance.stats).toHaveBeenCalled();
      expect(mockBrainInstance.close).toHaveBeenCalled();
    });
  });

  describe('sync', () => {
    it('calls brain.sync and closes', async () => {
      mockBrainInstance.sync.mockResolvedValue({ filesAdded: 2, filesUpdated: 1, filesRemoved: 0, chunksCreated: 15, durationMs: 80 } as never);
      await runBrain('sync', [], { brainDir: tempDir });
      expect(mockBrainInstance.sync).toHaveBeenCalled();
      expect(mockBrainInstance.close).toHaveBeenCalled();
    });
  });

  describe('unknown action', () => {
    it('exits with error for unknown action', async () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      await expect(runBrain('foobar', [], { brainDir: tempDir })).rejects.toThrow('process.exit called');
      exitSpy.mockRestore();
    });
  });
});
