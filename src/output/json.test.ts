import { describe, it, expect } from 'vitest';
import { formatJson, parseJson } from './json.js';
import type { ScoreDeltas, ThresholdResult } from '../types.js';

const mockDeltas: ScoreDeltas = {
  baselineUrl: 'https://baseline.com',
  currentUrl: 'https://current.com',
  timestamp: '2024-01-01T00:00:00.000Z',
  deltas: [
    { category: 'performance', baseline: 80, current: 85, delta: 5, direction: 'improved' },
    { category: 'accessibility', baseline: 90, current: 88, delta: -2, direction: 'regressed' },
  ],
};

const passedResult: ThresholdResult = { passed: true, failures: [] };
const failedResult: ThresholdResult = {
  passed: false,
  failures: [{ category: 'performance', reason: 'below-threshold', expected: 90, actual: 85 }],
};

describe('formatJson', () => {
  it('returns valid JSON', () => {
    const json = formatJson(mockDeltas, passedResult);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes version', () => {
    const json = formatJson(mockDeltas, passedResult);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0.0');
  });

  it('includes URLs', () => {
    const json = formatJson(mockDeltas, passedResult);
    const parsed = JSON.parse(json);
    expect(parsed.baselineUrl).toBe('https://baseline.com');
    expect(parsed.currentUrl).toBe('https://current.com');
  });

  it('includes scores array', () => {
    const json = formatJson(mockDeltas, passedResult);
    const parsed = JSON.parse(json);
    expect(parsed.scores).toHaveLength(2);
    expect(parsed.scores[0].category).toBe('performance');
  });

  it('includes thresholds object', () => {
    const json = formatJson(mockDeltas, passedResult);
    const parsed = JSON.parse(json);
    expect(parsed.thresholds.passed).toBe(true);
  });

  it('includes failures when failed', () => {
    const json = formatJson(mockDeltas, failedResult);
    const parsed = JSON.parse(json);
    expect(parsed.thresholds.passed).toBe(false);
    expect(parsed.thresholds.failures).toHaveLength(1);
  });

  it('is pretty-printed', () => {
    const json = formatJson(mockDeltas, passedResult);
    expect(json).toContain('\n');
  });
});

describe('parseJson', () => {
  it('parses JSON output', () => {
    const json = formatJson(mockDeltas, passedResult);
    const parsed = parseJson(json);
    expect(parsed.version).toBe('1.0.0');
  });
});
