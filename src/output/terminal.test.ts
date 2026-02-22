import { describe, it, expect } from 'vitest';
import {
  colorScore,
  colorDelta,
  statusIcon,
  formatTable,
  formatSummary,
  formatTerminal,
} from './terminal.js';
import type { ScoreDeltas, ThresholdResult } from '../types.js';

const mockDeltas: ScoreDeltas = {
  baselineUrl: 'https://baseline.com',
  currentUrl: 'https://current.com',
  timestamp: '2024-01-01T00:00:00.000Z',
  deltas: [
    { category: 'performance', baseline: 80, current: 85, delta: 5, direction: 'improved' },
    { category: 'accessibility', baseline: 90, current: 88, delta: -2, direction: 'regressed' },
    { category: 'best-practices', baseline: 85, current: 85, delta: 0, direction: 'unchanged' },
    { category: 'seo', baseline: 95, current: 95, delta: 0, direction: 'unchanged' },
    { category: 'pwa', baseline: null, current: null, delta: null, direction: 'unchanged' },
  ],
};

const passedResult: ThresholdResult = { passed: true, failures: [] };
const failedResult: ThresholdResult = {
  passed: false,
  failures: [{ category: 'performance', reason: 'below-threshold', expected: 90, actual: 85 }],
};

describe('colorScore', () => {
  it('returns green for high scores', () => {
    const result = colorScore(95);
    expect(result).toContain('95');
  });

  it('returns red for low scores', () => {
    const result = colorScore(40);
    expect(result).toContain('40');
  });

  it('returns N/A for null', () => {
    const result = colorScore(null);
    expect(result).toContain('N/A');
  });
});

describe('colorDelta', () => {
  it('formats positive delta', () => {
    const result = colorDelta(5);
    expect(result).toContain('+5');
  });

  it('formats negative delta', () => {
    const result = colorDelta(-5);
    expect(result).toContain('-5');
  });
});

describe('statusIcon', () => {
  it('returns PASS for passing delta', () => {
    const delta = mockDeltas.deltas[0];
    const result = statusIcon(delta, passedResult);
    expect(result).toContain('PASS');
  });

  it('returns FAIL for failed threshold', () => {
    const delta = mockDeltas.deltas[0];
    const result = statusIcon(delta, failedResult);
    expect(result).toContain('FAIL');
  });

  it('returns WARN for regression', () => {
    const delta = mockDeltas.deltas[1];
    const result = statusIcon(delta, passedResult);
    expect(result).toContain('WARN');
  });
});

describe('formatTable', () => {
  it('includes all categories', () => {
    const result = formatTable(mockDeltas, passedResult);
    expect(result).toContain('performance');
    expect(result).toContain('accessibility');
    expect(result).toContain('best-practices');
    expect(result).toContain('seo');
    expect(result).toContain('pwa');
  });

  it('has table structure', () => {
    const result = formatTable(mockDeltas, passedResult);
    expect(result).toContain('Category');
    expect(result).toContain('Baseline');
    expect(result).toContain('Current');
    expect(result).toContain('Delta');
  });
});

describe('formatSummary', () => {
  it('shows improved count', () => {
    const result = formatSummary(mockDeltas, passedResult);
    expect(result).toContain('improved');
  });

  it('shows regressed count', () => {
    const result = formatSummary(mockDeltas, passedResult);
    expect(result).toContain('regressed');
  });

  it('shows failure count when failed', () => {
    const result = formatSummary(mockDeltas, failedResult);
    expect(result).toContain('failure');
  });
});

describe('formatTerminal', () => {
  it('includes header', () => {
    const result = formatTerminal(mockDeltas, passedResult);
    expect(result).toContain('Lighthouse Comparison');
  });

  it('includes URLs', () => {
    const result = formatTerminal(mockDeltas, passedResult);
    expect(result).toContain('baseline.com');
    expect(result).toContain('current.com');
  });

  it('includes table', () => {
    const result = formatTerminal(mockDeltas, passedResult);
    expect(result).toContain('performance');
  });

  it('includes summary', () => {
    const result = formatTerminal(mockDeltas, passedResult);
    expect(result).toContain('improved');
  });
});
