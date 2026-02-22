import { describe, it, expect } from 'vitest';
import {
  validateThresholds,
  validateMaxRegression,
  validateAll,
  formatFailure,
} from './threshold.js';
import type { CategoryScores, ScoreDelta, ThresholdConfig, MaxRegressionConfig } from '../types.js';

describe('validateThresholds', () => {
  it('passes when all scores meet thresholds', () => {
    const current: CategoryScores = {
      performance: 85,
      accessibility: 95,
      'best-practices': 80,
      seo: 90,
      pwa: null,
    };
    const thresholds: ThresholdConfig = {
      performance: 80,
      accessibility: 90,
    };

    const result = validateThresholds(current, thresholds);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('fails when score below threshold', () => {
    const current: CategoryScores = {
      performance: 70,
      accessibility: 95,
      'best-practices': 80,
      seo: 90,
      pwa: null,
    };
    const thresholds: ThresholdConfig = {
      performance: 80,
    };

    const result = validateThresholds(current, thresholds);
    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].category).toBe('performance');
    expect(result.failures[0].reason).toBe('below-threshold');
  });

  it('passes when no thresholds set', () => {
    const current: CategoryScores = {
      performance: 50,
      accessibility: 50,
      'best-practices': 50,
      seo: 50,
      pwa: null,
    };

    const result = validateThresholds(current, {});
    expect(result.passed).toBe(true);
  });

  it('passes when score is null', () => {
    const current: CategoryScores = {
      performance: null,
      accessibility: 95,
      'best-practices': 80,
      seo: 90,
      pwa: null,
    };
    const thresholds: ThresholdConfig = {
      performance: 80,
    };

    const result = validateThresholds(current, thresholds);
    expect(result.passed).toBe(true);
  });
});

describe('validateMaxRegression', () => {
  it('passes when within regression limit', () => {
    const deltas: ScoreDelta[] = [
      { category: 'performance', baseline: 90, current: 87, delta: -3, direction: 'regressed' },
    ];
    const maxRegression: MaxRegressionConfig = { performance: 5 };

    const result = validateMaxRegression(deltas, maxRegression);
    expect(result.passed).toBe(true);
  });

  it('fails when regression exceeds limit', () => {
    const deltas: ScoreDelta[] = [
      { category: 'performance', baseline: 90, current: 80, delta: -10, direction: 'regressed' },
    ];
    const maxRegression: MaxRegressionConfig = { performance: 5 };

    const result = validateMaxRegression(deltas, maxRegression);
    expect(result.passed).toBe(false);
    expect(result.failures[0].reason).toBe('regression');
  });

  it('passes on improvement', () => {
    const deltas: ScoreDelta[] = [
      { category: 'performance', baseline: 80, current: 90, delta: 10, direction: 'improved' },
    ];
    const maxRegression: MaxRegressionConfig = { performance: 5 };

    const result = validateMaxRegression(deltas, maxRegression);
    expect(result.passed).toBe(true);
  });

  it('passes when no maxRegression set', () => {
    const deltas: ScoreDelta[] = [
      { category: 'performance', baseline: 90, current: 50, delta: -40, direction: 'regressed' },
    ];

    const result = validateMaxRegression(deltas, {});
    expect(result.passed).toBe(true);
  });
});

describe('validateAll', () => {
  it('combines threshold and regression checks', () => {
    const current: CategoryScores = {
      performance: 70,
      accessibility: 95,
      'best-practices': 80,
      seo: 90,
      pwa: null,
    };
    const deltas: ScoreDelta[] = [
      { category: 'accessibility', baseline: 100, current: 95, delta: -5, direction: 'regressed' },
    ];
    const thresholds: ThresholdConfig = { performance: 80 };
    const maxRegression: MaxRegressionConfig = { accessibility: 3 };

    const result = validateAll(current, deltas, thresholds, maxRegression);
    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(2);
  });
});

describe('formatFailure', () => {
  it('formats below-threshold failure', () => {
    const result = formatFailure({
      category: 'performance',
      reason: 'below-threshold',
      expected: 80,
      actual: 70,
    });
    expect(result).toContain('performance');
    expect(result).toContain('70');
    expect(result).toContain('80');
  });

  it('formats regression failure', () => {
    const result = formatFailure({
      category: 'accessibility',
      reason: 'regression',
      expected: 5,
      actual: 10,
    });
    expect(result).toContain('accessibility');
    expect(result).toContain('10');
  });
});
