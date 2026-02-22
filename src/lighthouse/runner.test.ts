import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runAudit, closeBrowser, compareUrls } from './runner.js';

// Mock puppeteer and lighthouse for unit tests
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      connected: true,
      wsEndpoint: () => 'ws://localhost:9222/devtools/browser/xxx',
      newPage: vi.fn().mockResolvedValue({
        close: vi.fn(),
      }),
      close: vi.fn(),
    }),
  },
}));

vi.mock('lighthouse', () => ({
  default: vi.fn().mockResolvedValue({
    lhr: {
      categories: {
        performance: { score: 0.85 },
        accessibility: { score: 0.92 },
        'best-practices': { score: 0.88 },
        seo: { score: 0.95 },
      },
      fetchTime: new Date().toISOString(),
      requestedUrl: 'https://example.com',
    },
  }),
}));

describe('runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await closeBrowser();
  });

  describe('runAudit', () => {
    it('returns LighthouseScores structure', async () => {
      const result = await runAudit('https://example.com');
      
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('accessibility');
      expect(result).toHaveProperty('bestPractices');
      expect(result).toHaveProperty('seo');
      expect(typeof result.performance).toBe('number');
    });

    it('passes device option to config', async () => {
      const lighthouse = await import('lighthouse');
      
      await runAudit('https://example.com', { device: 'desktop' });
      
      expect(lighthouse.default).toHaveBeenCalled();
    });

    it('runs multiple times when runs > 1', async () => {
      const lighthouse = await import('lighthouse');
      
      await runAudit('https://example.com', { runs: 3 });
      
      expect(lighthouse.default).toHaveBeenCalledTimes(3);
    });

    it('throws if runs is less than 1', async () => {
      await expect(runAudit('https://example.com', { runs: 0 }))
        .rejects.toThrow('runs must be at least 1');
    });
  });

  describe('closeBrowser', () => {
    it('is safe to call multiple times', async () => {
      await closeBrowser();
      await closeBrowser();
      // Should not throw
    });
  });

  describe('compareUrls', () => {
    it('returns baseline and current scores', async () => {
      const result = await compareUrls(
        'https://baseline.example.com',
        'https://current.example.com'
      );
      
      expect(result).toHaveProperty('baseline');
      expect(result).toHaveProperty('current');
      expect(result.baseline).toHaveProperty('performance');
      expect(result.current).toHaveProperty('performance');
    });
  });
});
