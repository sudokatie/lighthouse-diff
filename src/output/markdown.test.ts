import { describe, it, expect } from 'vitest';
import { deltaEmoji, formatMarkdown } from './markdown.js';
import type { ScoreDeltas, ScoreDelta, ThresholdResult } from '../types.js';

const mockDeltas: ScoreDeltas = {
  baselineUrl: 'https://baseline.com',
  currentUrl: 'https://current.com',
  timestamp: '2024-01-01T00:00:00.000Z',
  deltas: [
    { category: 'performance', baseline: 80, current: 85, delta: 5, direction: 'improved' },
    { category: 'accessibility', baseline: 90, current: 88, delta: -2, direction: 'regressed' },
    { category: 'best-practices', baseline: 85, current: 85, delta: 0, direction: 'unchanged' },
  ],
};

const passedResult: ThresholdResult = { passed: true, failures: [] };
const failedResult: ThresholdResult = {
  passed: false,
  failures: [{ category: 'performance', reason: 'below-threshold', expected: 90, actual: 85 }],
};

describe('deltaEmoji', () => {
  it('returns checkmark for improved', () => {
    const delta: ScoreDelta = { category: 'performance', baseline: 80, current: 90, delta: 10, direction: 'improved' };
    expect(deltaEmoji(delta)).toBe('✅');
  });

  it('returns warning for regressed', () => {
    const delta: ScoreDelta = { category: 'performance', baseline: 90, current: 80, delta: -10, direction: 'regressed' };
    expect(deltaEmoji(delta)).toBe('⚠️');
  });

  it('returns empty for unchanged', () => {
    const delta: ScoreDelta = { category: 'performance', baseline: 85, current: 85, delta: 0, direction: 'unchanged' };
    expect(deltaEmoji(delta)).toBe('');
  });
});

describe('formatMarkdown', () => {
  it('includes H2 header', () => {
    const md = formatMarkdown(mockDeltas, passedResult);
    expect(md).toContain('## Lighthouse Comparison');
  });

  it('includes URLs', () => {
    const md = formatMarkdown(mockDeltas, passedResult);
    expect(md).toContain('baseline.com');
    expect(md).toContain('current.com');
  });

  it('includes markdown table', () => {
    const md = formatMarkdown(mockDeltas, passedResult);
    expect(md).toContain('| Category |');
    expect(md).toContain('|---|');
  });

  it('includes emojis', () => {
    const md = formatMarkdown(mockDeltas, passedResult);
    expect(md).toContain('✅');
    expect(md).toContain('⚠️');
  });

  it('shows pass message when passed', () => {
    const md = formatMarkdown(mockDeltas, passedResult);
    expect(md).toContain('All thresholds passed');
  });

  it('shows failures when failed', () => {
    const md = formatMarkdown(mockDeltas, failedResult);
    expect(md).toContain('Threshold failures');
  });

  it('includes collapsible details for failures', () => {
    const md = formatMarkdown(mockDeltas, failedResult);
    expect(md).toContain('<details>');
    expect(md).toContain('</details>');
  });

  it('includes average delta', () => {
    const md = formatMarkdown(mockDeltas, passedResult);
    expect(md).toContain('Average delta');
  });
});
