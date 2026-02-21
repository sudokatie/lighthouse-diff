import { describe, it, expect } from 'vitest';
import {
  parseResult,
  normalizeScore,
  parseJSON,
  hasRequiredCategories,
  getUrl,
  averageResults,
} from './parser.js';
import type { LighthouseResult } from './parser.js';

const sampleResult: LighthouseResult = {
  categories: {
    performance: { score: 0.85 },
    accessibility: { score: 0.92 },
    'best-practices': { score: 0.88 },
    seo: { score: 0.95 },
  },
  fetchTime: '2024-01-15T10:30:00.000Z',
  requestedUrl: 'https://example.com',
  finalUrl: 'https://example.com/',
};

describe('parseResult', () => {
  it('parses standard result', () => {
    const scores = parseResult(sampleResult);

    expect(scores.performance).toBe(85);
    expect(scores.accessibility).toBe(92);
    expect(scores.bestPractices).toBe(88);
    expect(scores.seo).toBe(95);
  });

  it('handles PWA category', () => {
    const resultWithPwa: LighthouseResult = {
      ...sampleResult,
      categories: {
        ...sampleResult.categories,
        pwa: { score: 0.7 },
      },
    };

    const scores = parseResult(resultWithPwa);

    expect(scores.pwa).toBe(70);
  });

  it('handles missing scores', () => {
    const resultWithNull: LighthouseResult = {
      categories: {
        performance: { score: null },
        accessibility: { score: 0.9 },
        'best-practices': { score: 0.8 },
        seo: { score: 0.95 },
      },
    };

    const scores = parseResult(resultWithNull);

    expect(scores.performance).toBe(0);
    expect(scores.accessibility).toBe(90);
  });
});

describe('normalizeScore', () => {
  it('converts 0-1 to 0-100', () => {
    expect(normalizeScore(0.85)).toBe(85);
    expect(normalizeScore(1)).toBe(100);
    expect(normalizeScore(0)).toBe(0);
  });

  it('rounds to integer', () => {
    expect(normalizeScore(0.854)).toBe(85);
    expect(normalizeScore(0.855)).toBe(86);
  });

  it('handles null/undefined', () => {
    expect(normalizeScore(null)).toBe(0);
    expect(normalizeScore(undefined)).toBe(0);
  });
});

describe('parseJSON', () => {
  it('parses valid JSON', () => {
    const json = JSON.stringify(sampleResult);
    const result = parseJSON(json);

    expect(result.categories.performance?.score).toBe(0.85);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseJSON('not json')).toThrow('Invalid Lighthouse JSON');
  });
});

describe('hasRequiredCategories', () => {
  it('returns true when all present', () => {
    expect(hasRequiredCategories(sampleResult)).toBe(true);
  });

  it('returns false when missing category', () => {
    const incomplete: LighthouseResult = {
      categories: {
        performance: { score: 0.85 },
        accessibility: { score: 0.92 },
      },
    };

    expect(hasRequiredCategories(incomplete)).toBe(false);
  });
});

describe('getUrl', () => {
  it('returns finalUrl if available', () => {
    expect(getUrl(sampleResult)).toBe('https://example.com/');
  });

  it('falls back to requestedUrl', () => {
    const result: LighthouseResult = {
      categories: {},
      requestedUrl: 'https://example.com',
    };

    expect(getUrl(result)).toBe('https://example.com');
  });

  it('returns unknown if no URL', () => {
    const result: LighthouseResult = { categories: {} };

    expect(getUrl(result)).toBe('unknown');
  });
});

describe('averageResults', () => {
  it('returns single result unchanged', () => {
    const scores = { performance: 80, accessibility: 90, bestPractices: 85, seo: 95 };
    const averaged = averageResults([scores]);

    expect(averaged).toEqual(scores);
  });

  it('averages multiple results', () => {
    const results = [
      { performance: 80, accessibility: 90, bestPractices: 80, seo: 90 },
      { performance: 90, accessibility: 80, bestPractices: 90, seo: 100 },
    ];

    const averaged = averageResults(results);

    expect(averaged.performance).toBe(85);
    expect(averaged.accessibility).toBe(85);
    expect(averaged.bestPractices).toBe(85);
    expect(averaged.seo).toBe(95);
  });

  it('throws on empty array', () => {
    expect(() => averageResults([])).toThrow('No results to average');
  });
});
