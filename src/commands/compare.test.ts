import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compare } from './compare.js';
import type { LighthouseScores } from '../types.js';

// Mock runner
vi.mock('../lighthouse/runner.js', () => ({
  runAudit: vi.fn(),
  closeBrowser: vi.fn(),
}));

// Mock output formatters
vi.mock('../output/terminal.js', () => ({
  formatComparison: vi.fn(() => 'terminal output'),
}));
vi.mock('../output/json.js', () => ({
  formatComparison: vi.fn(() => '{}'),
}));
vi.mock('../output/markdown.js', () => ({
  formatComparison: vi.fn(() => '# Report'),
}));
vi.mock('../output/github.js', () => ({
  formatGitHubOutput: vi.fn(() => ''),
}));

describe('compare command', () => {
  const baselineScores: LighthouseScores = {
    performance: 85,
    accessibility: 90,
    bestPractices: 88,
    seo: 92,
  };

  const currentScores: LighthouseScores = {
    performance: 82,
    accessibility: 95,
    bestPractices: 88,
    seo: 90,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const runner = await import('../lighthouse/runner.js');
    (runner.runAudit as any)
      .mockResolvedValueOnce(baselineScores)
      .mockResolvedValueOnce(currentScores);
  });

  it('runs both audits', async () => {
    const runner = await import('../lighthouse/runner.js');
    
    await compare('https://baseline.com', 'https://current.com');
    
    expect(runner.runAudit).toHaveBeenCalledTimes(2);
    expect(runner.runAudit).toHaveBeenCalledWith('https://baseline.com', expect.any(Object));
    expect(runner.runAudit).toHaveBeenCalledWith('https://current.com', expect.any(Object));
  });

  it('calculates deltas', async () => {
    const result = await compare('https://baseline.com', 'https://current.com');
    
    expect(result.delta).toBeDefined();
    expect(result.delta.performance).toBe(-3); // 82 - 85
    expect(result.delta.accessibility).toBe(5); // 95 - 90
  });

  it('validates thresholds', async () => {
    const result = await compare('https://baseline.com', 'https://current.com', {
      maxRegression: 2,
    });
    
    expect(result.validation).toBeDefined();
    expect(result.validation.passed).toBe(false); // -3 > -2
  });

  it('returns exit 0 when passed', async () => {
    const result = await compare('https://baseline.com', 'https://current.com', {
      maxRegression: 10, // Allow large regression
      ci: true,
    });
    
    expect(result.exitCode).toBe(0);
  });

  it('returns exit 1 when ci mode and failed', async () => {
    const result = await compare('https://baseline.com', 'https://current.com', {
      maxRegression: 1, // Strict - will fail
      ci: true,
    });
    
    expect(result.exitCode).toBe(1);
  });

  it('returns exit 0 when not ci mode even if failed', async () => {
    const result = await compare('https://baseline.com', 'https://current.com', {
      maxRegression: 1, // Strict - would fail
      ci: false,
    });
    
    expect(result.exitCode).toBe(0);
  });

  it('uses requested output format', async () => {
    const json = await import('../output/json.js');
    
    await compare('https://baseline.com', 'https://current.com', {
      format: 'json',
    });
    
    expect(json.formatComparison).toHaveBeenCalled();
  });

  it('closes browser in finally', async () => {
    const runner = await import('../lighthouse/runner.js');
    
    await compare('https://baseline.com', 'https://current.com');
    
    expect(runner.closeBrowser).toHaveBeenCalled();
  });
});
