import { describe, it, expect } from 'vitest';
import {
  formatComparison,
  formatScores,
  formatValidation,
  parseComparison,
} from './json.js';
import type { ComparisonResult, LighthouseScores } from '../types.js';

const comparisonResult: ComparisonResult = {
  baseline: {
    url: 'https://example.com/old',
    scores: { performance: 80, accessibility: 90, bestPractices: 85, seo: 95 },
    timestamp: new Date('2024-01-15T10:00:00Z'),
  },
  current: {
    url: 'https://example.com/new',
    scores: { performance: 85, accessibility: 92, bestPractices: 87, seo: 95 },
    timestamp: new Date('2024-01-15T11:00:00Z'),
  },
  delta: { performance: 5, accessibility: 2, bestPractices: 2, seo: 0 },
  validation: { passed: true, failures: [] },
};

describe('formatComparison', () => {
  it('returns valid JSON', () => {
    const json = formatComparison(comparisonResult);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes all fields', () => {
    const json = formatComparison(comparisonResult);
    const parsed = JSON.parse(json);

    expect(parsed.baseline.url).toBe('https://example.com/old');
    expect(parsed.current.url).toBe('https://example.com/new');
    expect(parsed.delta.performance).toBe(5);
    expect(parsed.validation.passed).toBe(true);
  });

  it('formats timestamps as ISO strings', () => {
    const json = formatComparison(comparisonResult);
    const parsed = JSON.parse(json);

    expect(parsed.baseline.timestamp).toContain('2024-01-15');
    expect(parsed.current.timestamp).toContain('2024-01-15');
  });
});

describe('formatScores', () => {
  it('returns valid JSON', () => {
    const scores: LighthouseScores = {
      performance: 80,
      accessibility: 90,
      bestPractices: 85,
      seo: 95,
    };
    const json = formatScores(scores, 'https://example.com');

    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes URL and scores', () => {
    const scores: LighthouseScores = {
      performance: 80,
      accessibility: 90,
      bestPractices: 85,
      seo: 95,
    };
    const json = formatScores(scores, 'https://example.com');
    const parsed = JSON.parse(json);

    expect(parsed.url).toBe('https://example.com');
    expect(parsed.scores.performance).toBe(80);
  });
});

describe('formatValidation', () => {
  it('returns valid JSON', () => {
    const json = formatValidation({ passed: true, failures: [] });
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe('parseComparison', () => {
  it('round-trips through format and parse', () => {
    const json = formatComparison(comparisonResult);
    const parsed = parseComparison(json);

    expect(parsed.baseline.url).toBe(comparisonResult.baseline.url);
    expect(parsed.current.scores.performance).toBe(85);
    expect(parsed.delta.performance).toBe(5);
  });

  it('converts timestamps back to Date objects', () => {
    const json = formatComparison(comparisonResult);
    const parsed = parseComparison(json);

    expect(parsed.baseline.timestamp).toBeInstanceOf(Date);
    expect(parsed.current.timestamp).toBeInstanceOf(Date);
  });
});
