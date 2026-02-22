import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gitCompare } from './git.js';

// Mock all dependencies
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

vi.mock('../git/checkout.js', () => ({
  captureState: vi.fn().mockReturnValue({ branch: 'main', commit: 'abc123', stashed: false }),
  restoreState: vi.fn(),
  checkout: vi.fn(),
}));

vi.mock('../git/server.js', () => ({
  startServer: vi.fn().mockResolvedValue({
    url: 'http://localhost:3000',
    port: 3000,
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('gitCompare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns comparison result', async () => {
    const result = await gitCompare({ base: 'main' });
    
    expect(result.baseline).toBeDefined();
    expect(result.current).toBeDefined();
    expect(result.deltas).toBeDefined();
  });

  it('checkouts base ref', async () => {
    const { checkout } = await import('../git/checkout.js');
    
    await gitCompare({ base: 'main' });
    
    expect(checkout).toHaveBeenCalledWith('main');
  });

  it('starts and stops server', async () => {
    const { startServer } = await import('../git/server.js');
    
    await gitCompare({ base: 'main' });
    
    expect(startServer).toHaveBeenCalledTimes(2);
  });

  it('restores state on success', async () => {
    const { restoreState } = await import('../git/checkout.js');
    
    await gitCompare({ base: 'main' });
    
    expect(restoreState).toHaveBeenCalled();
  });

  it('validates thresholds with maxRegression', async () => {
    const result = await gitCompare({
      base: 'main',
      thresholds: { performance: 90 },
      maxRegression: { performance: 0 },
    });
    
    expect(result.thresholdResult).toBeDefined();
  });

  it('returns exit 1 in ci mode when failed', async () => {
    const result = await gitCompare({
      base: 'main',
      thresholds: { performance: 90 },
      ci: true,
    });
    
    expect(result.exitCode).toBe(1);
  });

  it('formats output correctly', async () => {
    const result = await gitCompare({
      base: 'main',
      format: 'json',
    });
    
    expect(() => JSON.parse(result.output)).not.toThrow();
  });

  it('closes browser in finally', async () => {
    const { closeBrowser } = await import('../lighthouse/runner.js');
    
    await gitCompare({ base: 'main' });
    
    expect(closeBrowser).toHaveBeenCalled();
  });
});
