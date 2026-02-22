import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock puppeteer and lighthouse
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      wsEndpoint: () => 'ws://localhost:12345',
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock('lighthouse', () => ({
  default: vi.fn().mockResolvedValue({
    lhr: {
      finalUrl: 'https://example.com/',
      fetchTime: '2024-01-01T00:00:00.000Z',
      categories: {
        performance: { score: 0.85 },
        accessibility: { score: 0.92 },
        'best-practices': { score: 0.88 },
        seo: { score: 0.95 },
      },
    },
  }),
}));

// Import after mocks are set up
const { runAudit, closeBrowser } = await import('./runner.js');

describe('runAudit', () => {
  afterEach(async () => {
    await closeBrowser();
    vi.clearAllMocks();
  });

  it('returns CategoryScores structure', async () => {
    const result = await runAudit('https://example.com');
    
    expect(result).toHaveProperty('performance');
    expect(result).toHaveProperty('accessibility');
    expect(result).toHaveProperty('best-practices');
    expect(result).toHaveProperty('seo');
    expect(result).toHaveProperty('pwa');
  });

  it('converts scores to 0-100', async () => {
    const result = await runAudit('https://example.com');
    
    expect(result.performance).toBe(85);
    expect(result.accessibility).toBe(92);
  });

  it('returns null for missing PWA', async () => {
    const result = await runAudit('https://example.com');
    
    expect(result.pwa).toBe(null);
  });
});

describe('closeBrowser', () => {
  it('is safe to call multiple times', async () => {
    await closeBrowser();
    await closeBrowser();
    // No error thrown
  });
});
