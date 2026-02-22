import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gitCompare } from './git.js';
import type { LighthouseScores } from '../types.js';

// Mock all dependencies
vi.mock('../lighthouse/runner.js', () => ({
  runAudit: vi.fn(),
  closeBrowser: vi.fn(),
}));

vi.mock('../git/checkout.js', () => ({
  captureState: vi.fn(() => ({ branch: 'main', commit: 'abc', stashed: false })),
  restoreState: vi.fn(),
  checkout: vi.fn(),
}));

vi.mock('../git/server.js', () => ({
  startServer: vi.fn(() => ({
    url: 'http://localhost:3000',
    port: 3000,
    stop: vi.fn(),
  })),
}));

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

describe('git command', () => {
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
    (runner.runAudit as any).mockReset();
    (runner.runAudit as any)
      .mockResolvedValueOnce(baselineScores)
      .mockResolvedValueOnce(currentScores);
  });

  it('checkouts correct refs', async () => {
    const checkout = (await import('../git/checkout.js')).checkout;
    
    await gitCompare({ base: 'main', head: 'feature' });
    
    expect(checkout).toHaveBeenCalledWith('main');
    expect(checkout).toHaveBeenCalledWith('feature');
  });

  it('starts and stops server for each audit', async () => {
    const server = await import('../git/server.js');
    
    await gitCompare({ base: 'main' });
    
    // Called twice (baseline and current)
    expect(server.startServer).toHaveBeenCalledTimes(2);
  });

  it('restores state on success', async () => {
    const checkout = await import('../git/checkout.js');
    
    await gitCompare({ base: 'main' });
    
    expect(checkout.restoreState).toHaveBeenCalled();
  });

  it('restores state on error', async () => {
    const runner = await import('../lighthouse/runner.js');
    (runner.runAudit as any).mockReset();
    (runner.runAudit as any).mockRejectedValue(new Error('audit failed'));
    const checkout = await import('../git/checkout.js');
    
    await expect(gitCompare({ base: 'main' })).rejects.toThrow('audit failed');
    
    expect(checkout.restoreState).toHaveBeenCalled();
  });

  it('validates using thresholds with maxRegression', async () => {
    const result = await gitCompare({ 
      base: 'main',
      maxRegression: 2, // -3 > -2 so should fail
    });
    
    expect(result.validation.passed).toBe(false);
    expect(result.validation.failures.some(f => f.type === 'regression')).toBe(true);
  });

  it('returns exit 1 in ci mode when failed', async () => {
    const result = await gitCompare({ 
      base: 'main',
      maxRegression: 1,
      ci: true,
    });
    
    expect(result.exitCode).toBe(1);
  });

  it('formats output correctly', async () => {
    const json = await import('../output/json.js');
    
    await gitCompare({ 
      base: 'main',
      format: 'json',
    });
    
    expect(json.formatComparison).toHaveBeenCalled();
  });

  it('closes browser in finally', async () => {
    const runner = await import('../lighthouse/runner.js');
    
    await gitCompare({ base: 'main' });
    
    expect(runner.closeBrowser).toHaveBeenCalled();
  });
});
