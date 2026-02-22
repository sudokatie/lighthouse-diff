import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { compare } from './compare.js';

// Mock the runner
vi.mock('../lighthouse/runner.js', () => ({
  runAudit: vi.fn().mockResolvedValue({
    performance: 85,
    accessibility: 92,
    'best-practices': 88,
    seo: 95,
    pwa: null,
  }),
  closeBrowser: vi.fn().mockResolvedValue(undefined),
}));

describe('compare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns baseline and current scores', async () => {
    const result = await compare('https://baseline.com', 'https://current.com');
    
    expect(result.baseline).toBeDefined();
    expect(result.current).toBeDefined();
    expect(result.baseline.performance).toBe(85);
  });

  it('calculates deltas', async () => {
    const result = await compare('https://baseline.com', 'https://current.com');
    
    expect(result.deltas).toBeDefined();
    expect(result.deltas.deltas).toHaveLength(5);
  });

  it('validates thresholds', async () => {
    const result = await compare('https://baseline.com', 'https://current.com', {
      thresholds: { performance: 90 },
    });
    
    expect(result.thresholdResult.passed).toBe(false);
  });

  it('returns exit 0 when passed', async () => {
    const result = await compare('https://baseline.com', 'https://current.com', {
      ci: true,
    });
    
    expect(result.exitCode).toBe(0);
  });

  it('returns exit 1 when ci and failed', async () => {
    const result = await compare('https://baseline.com', 'https://current.com', {
      thresholds: { performance: 90 },
      ci: true,
    });
    
    expect(result.exitCode).toBe(1);
  });

  it('returns exit 0 when not ci even if failed', async () => {
    const result = await compare('https://baseline.com', 'https://current.com', {
      thresholds: { performance: 90 },
      ci: false,
    });
    
    expect(result.exitCode).toBe(0);
  });

  it('formats output as terminal by default', async () => {
    const result = await compare('https://baseline.com', 'https://current.com');
    
    expect(result.output).toContain('Lighthouse');
  });

  it('formats output as json when requested', async () => {
    const result = await compare('https://baseline.com', 'https://current.com', {
      format: 'json',
    });
    
    expect(() => JSON.parse(result.output)).not.toThrow();
  });
});
