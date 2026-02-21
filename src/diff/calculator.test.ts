import { describe, it, expect } from 'vitest';
import {
  calculateDelta,
  worstRegression,
  hasRegression,
  getRegressedCategories,
  getImprovedCategories,
  averageScore,
  formatDelta,
  roundScores,
} from './calculator.js';
import type { LighthouseScores } from '../types.js';

describe('calculateDelta', () => {
  it('calculates positive delta for improvements', () => {
    const baseline: LighthouseScores = {
      performance: 50,
      accessibility: 60,
      bestPractices: 70,
      seo: 80,
    };
    const current: LighthouseScores = {
      performance: 60,
      accessibility: 70,
      bestPractices: 80,
      seo: 90,
    };

    const delta = calculateDelta(baseline, current);

    expect(delta.performance).toBe(10);
    expect(delta.accessibility).toBe(10);
    expect(delta.bestPractices).toBe(10);
    expect(delta.seo).toBe(10);
  });

  it('calculates negative delta for regressions', () => {
    const baseline: LighthouseScores = {
      performance: 80,
      accessibility: 90,
      bestPractices: 85,
      seo: 95,
    };
    const current: LighthouseScores = {
      performance: 70,
      accessibility: 85,
      bestPractices: 80,
      seo: 90,
    };

    const delta = calculateDelta(baseline, current);

    expect(delta.performance).toBe(-10);
    expect(delta.accessibility).toBe(-5);
  });

  it('handles PWA scores when present', () => {
    const baseline: LighthouseScores = {
      performance: 80,
      accessibility: 90,
      bestPractices: 85,
      seo: 95,
      pwa: 50,
    };
    const current: LighthouseScores = {
      performance: 80,
      accessibility: 90,
      bestPractices: 85,
      seo: 95,
      pwa: 70,
    };

    const delta = calculateDelta(baseline, current);

    expect(delta.pwa).toBe(20);
  });
});

describe('worstRegression', () => {
  it('returns most negative value', () => {
    const delta = {
      performance: -5,
      accessibility: 10,
      bestPractices: -15,
      seo: 0,
    };

    expect(worstRegression(delta)).toBe(-15);
  });

  it('returns positive when no regression', () => {
    const delta = {
      performance: 5,
      accessibility: 10,
      bestPractices: 15,
      seo: 0,
    };

    expect(worstRegression(delta)).toBe(0);
  });
});

describe('hasRegression', () => {
  it('returns true when any category regressed', () => {
    const delta = {
      performance: 10,
      accessibility: -1,
      bestPractices: 5,
      seo: 0,
    };

    expect(hasRegression(delta)).toBe(true);
  });

  it('returns false when no regression', () => {
    const delta = {
      performance: 10,
      accessibility: 0,
      bestPractices: 5,
      seo: 0,
    };

    expect(hasRegression(delta)).toBe(false);
  });
});

describe('getRegressedCategories', () => {
  it('returns categories with negative delta', () => {
    const delta = {
      performance: -5,
      accessibility: 10,
      bestPractices: -10,
      seo: 0,
    };

    expect(getRegressedCategories(delta)).toEqual(['performance', 'bestPractices']);
  });
});

describe('getImprovedCategories', () => {
  it('returns categories with positive delta', () => {
    const delta = {
      performance: 5,
      accessibility: 10,
      bestPractices: 0,
      seo: -5,
    };

    expect(getImprovedCategories(delta)).toEqual(['performance', 'accessibility']);
  });
});

describe('averageScore', () => {
  it('calculates average of all categories', () => {
    const scores: LighthouseScores = {
      performance: 80,
      accessibility: 90,
      bestPractices: 70,
      seo: 60,
    };

    expect(averageScore(scores)).toBe(75);
  });

  it('includes PWA when present', () => {
    const scores: LighthouseScores = {
      performance: 100,
      accessibility: 100,
      bestPractices: 100,
      seo: 100,
      pwa: 50,
    };

    expect(averageScore(scores)).toBe(90);
  });
});

describe('formatDelta', () => {
  it('adds + for positive values', () => {
    expect(formatDelta(10)).toBe('+10');
  });

  it('keeps - for negative values', () => {
    expect(formatDelta(-5)).toBe('-5');
  });

  it('shows 0 without sign', () => {
    expect(formatDelta(0)).toBe('0');
  });
});

describe('roundScores', () => {
  it('rounds all scores to integers', () => {
    const scores: LighthouseScores = {
      performance: 80.4,
      accessibility: 90.6,
      bestPractices: 75.5,
      seo: 85.1,
    };

    const rounded = roundScores(scores);

    expect(rounded.performance).toBe(80);
    expect(rounded.accessibility).toBe(91);
    expect(rounded.bestPractices).toBe(76);
    expect(rounded.seo).toBe(85);
  });
});
