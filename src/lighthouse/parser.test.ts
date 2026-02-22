import { describe, it, expect } from 'vitest';
import { parseResult, normalizeScore, averageResults } from './parser.js';
import type { LighthouseResult } from '../types.js';

const sampleLHR = {
  finalUrl: 'https://example.com/',
  fetchTime: '2024-01-01T00:00:00.000Z',
  categories: {
    performance: { score: 0.85 },
    accessibility: { score: 0.92 },
    'best-practices': { score: 0.88 },
    seo: { score: 0.95 },
  },
};

describe('parseResult', () => {
  it('parses standard LHR', () => {
    const result = parseResult(sampleLHR);
    expect(result.scores.performance).toBe(85);
    expect(result.scores.accessibility).toBe(92);
    expect(result.scores['best-practices']).toBe(88);
    expect(result.scores.seo).toBe(95);
  });

  it('handles PWA category', () => {
    const lhrWithPwa = {
      ...sampleLHR,
      categories: {
        ...sampleLHR.categories,
        pwa: { score: 0.7 },
      },
    };
    const result = parseResult(lhrWithPwa);
    expect(result.scores.pwa).toBe(70);
  });

  it('returns null for missing PWA', () => {
    const result = parseResult(sampleLHR);
    expect(result.scores.pwa).toBe(null);
  });

  it('extracts URL', () => {
    const result = parseResult(sampleLHR);
    expect(result.url).toBe('https://example.com/');
  });

  it('throws on invalid input', () => {
    expect(() => parseResult(null)).toThrow();
    expect(() => parseResult({})).toThrow();
  });

  it('handles missing categories', () => {
    const lhr = {
      finalUrl: 'https://example.com/',
      categories: {
        performance: { score: 0.8 },
      },
    };
    const result = parseResult(lhr);
    expect(result.scores.performance).toBe(80);
    expect(result.scores.accessibility).toBe(null);
  });
});

describe('normalizeScore', () => {
  it('converts 0-1 to 0-100', () => {
    expect(normalizeScore(0.85)).toBe(85);
  });

  it('passes through 0-100 values', () => {
    expect(normalizeScore(85)).toBe(85);
  });

  it('rounds to integer', () => {
    expect(normalizeScore(0.856)).toBe(86);
  });
});

describe('averageResults', () => {
  it('returns scores unchanged for single result', () => {
    const results: LighthouseResult[] = [{
      url: 'https://example.com',
      fetchTime: '2024-01-01',
      scores: {
        performance: 85,
        accessibility: 90,
        'best-practices': 80,
        seo: 95,
        pwa: null,
      },
    }];

    const avg = averageResults(results);
    expect(avg.performance).toBe(85);
  });

  it('averages multiple results', () => {
    const results: LighthouseResult[] = [
      {
        url: 'https://example.com',
        fetchTime: '2024-01-01',
        scores: {
          performance: 80,
          accessibility: 90,
          'best-practices': 80,
          seo: 90,
          pwa: null,
        },
      },
      {
        url: 'https://example.com',
        fetchTime: '2024-01-01',
        scores: {
          performance: 90,
          accessibility: 92,
          'best-practices': 84,
          seo: 92,
          pwa: null,
        },
      },
    ];

    const avg = averageResults(results);
    expect(avg.performance).toBe(85);
    expect(avg.accessibility).toBe(91);
  });

  it('returns nulls for empty array', () => {
    const avg = averageResults([]);
    expect(avg.performance).toBe(null);
  });
});
