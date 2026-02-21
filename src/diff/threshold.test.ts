import { describe, it, expect } from 'vitest';
import {
  validateThresholds,
  validateRegression,
  validateMinScores,
  defaultThresholds,
  mergeThresholds,
  formatValidationResult,
} from './threshold.js';
import type { LighthouseScores, ScoreDelta } from '../types.js';

describe('validateThresholds', () => {
  const baseline: LighthouseScores = {
    performance: 80,
    accessibility: 90,
    bestPractices: 85,
    seo: 95,
  };

  it('passes when all thresholds met', () => {
    const current: LighthouseScores = {
      performance: 82,
      accessibility: 92,
      bestPractices: 87,
      seo: 95,
    };
    const delta: ScoreDelta = {
      performance: 2,
      accessibility: 2,
      bestPractices: 2,
      seo: 0,
    };

    const result = validateThresholds(baseline, current, delta, {
      maxRegression: 5,
    });

    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('fails on regression exceeding threshold', () => {
    const current: LighthouseScores = {
      performance: 70,
      accessibility: 90,
      bestPractices: 85,
      seo: 95,
    };
    const delta: ScoreDelta = {
      performance: -10,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
    };

    const result = validateThresholds(baseline, current, delta, {
      maxRegression: 5,
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].category).toBe('performance');
    expect(result.failures[0].type).toBe('regression');
  });

  it('fails on score below minimum', () => {
    const current: LighthouseScores = {
      performance: 40,
      accessibility: 90,
      bestPractices: 85,
      seo: 95,
    };
    const delta: ScoreDelta = {
      performance: -40,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
    };

    const result = validateThresholds(baseline, current, delta, {
      minScore: { performance: 50 },
    });

    expect(result.passed).toBe(false);
    expect(result.failures[0].category).toBe('performance');
    expect(result.failures[0].type).toBe('minScore');
  });

  it('fails on score below absolute minimum', () => {
    const current: LighthouseScores = {
      performance: 20,
      accessibility: 90,
      bestPractices: 85,
      seo: 95,
    };
    const delta: ScoreDelta = {
      performance: -60,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
    };

    const result = validateThresholds(baseline, current, delta, {
      absoluteMin: 30,
    });

    expect(result.passed).toBe(false);
    expect(result.failures[0].type).toBe('absoluteMin');
  });

  it('collects multiple failures', () => {
    const current: LighthouseScores = {
      performance: 30,
      accessibility: 50,
      bestPractices: 40,
      seo: 60,
    };
    const delta: ScoreDelta = {
      performance: -50,
      accessibility: -40,
      bestPractices: -45,
      seo: -35,
    };

    const result = validateThresholds(baseline, current, delta, {
      maxRegression: 10,
      absoluteMin: 50,
    });

    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(1);
  });
});

describe('validateRegression', () => {
  it('passes when within threshold', () => {
    const delta: ScoreDelta = {
      performance: -3,
      accessibility: 5,
      bestPractices: 0,
      seo: -2,
    };

    const result = validateRegression(delta, 5);

    expect(result.passed).toBe(true);
  });

  it('fails when exceeding threshold', () => {
    const delta: ScoreDelta = {
      performance: -10,
      accessibility: 5,
      bestPractices: 0,
      seo: 0,
    };

    const result = validateRegression(delta, 5);

    expect(result.passed).toBe(false);
  });
});

describe('validateMinScores', () => {
  it('passes when all scores above minimum', () => {
    const scores: LighthouseScores = {
      performance: 80,
      accessibility: 90,
      bestPractices: 85,
      seo: 95,
    };

    const result = validateMinScores(scores, 70);

    expect(result.passed).toBe(true);
  });

  it('fails when any score below minimum', () => {
    const scores: LighthouseScores = {
      performance: 60,
      accessibility: 90,
      bestPractices: 85,
      seo: 95,
    };

    const result = validateMinScores(scores, 70);

    expect(result.passed).toBe(false);
  });
});

describe('defaultThresholds', () => {
  it('returns sensible defaults', () => {
    const defaults = defaultThresholds();

    expect(defaults.maxRegression).toBe(5);
    expect(defaults.minScore?.performance).toBe(50);
    expect(defaults.minScore?.accessibility).toBe(90);
  });
});

describe('mergeThresholds', () => {
  it('overrides defaults with user values', () => {
    const merged = mergeThresholds({
      maxRegression: 10,
      minScore: { performance: 60 },
    });

    expect(merged.maxRegression).toBe(10);
    expect(merged.minScore?.performance).toBe(60);
    // Should keep other defaults
    expect(merged.minScore?.accessibility).toBe(90);
  });
});

describe('formatValidationResult', () => {
  it('formats passing result', () => {
    const result = formatValidationResult({ passed: true, failures: [] });

    expect(result).toBe('All thresholds passed');
  });

  it('formats failing result', () => {
    const result = formatValidationResult({
      passed: false,
      failures: [
        {
          category: 'performance',
          type: 'regression',
          message: 'performance regressed by 10',
          actual: -10,
          threshold: -5,
        },
      ],
    });

    expect(result).toContain('Threshold failures');
    expect(result).toContain('performance regressed');
  });
});
