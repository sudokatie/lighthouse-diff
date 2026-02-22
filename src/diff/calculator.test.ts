import { describe, it, expect } from 'vitest';
import {
  getDirection,
  calculateCategoryDelta,
  calculateDeltas,
  formatDelta,
  getSummary,
} from './calculator.js';
import type { CategoryScores } from '../types.js';

describe('getDirection', () => {
  it('returns improved for positive delta', () => {
    expect(getDirection(5)).toBe('improved');
  });

  it('returns regressed for negative delta', () => {
    expect(getDirection(-5)).toBe('regressed');
  });

  it('returns unchanged for zero delta', () => {
    expect(getDirection(0)).toBe('unchanged');
  });

  it('returns unchanged for null delta', () => {
    expect(getDirection(null)).toBe('unchanged');
  });
});

describe('calculateCategoryDelta', () => {
  it('calculates positive delta for improvement', () => {
    const delta = calculateCategoryDelta('performance', 80, 90);
    expect(delta.delta).toBe(10);
    expect(delta.direction).toBe('improved');
  });

  it('calculates negative delta for regression', () => {
    const delta = calculateCategoryDelta('performance', 90, 80);
    expect(delta.delta).toBe(-10);
    expect(delta.direction).toBe('regressed');
  });

  it('returns null delta when baseline is null', () => {
    const delta = calculateCategoryDelta('performance', null, 90);
    expect(delta.delta).toBe(null);
    expect(delta.direction).toBe('unchanged');
  });

  it('returns null delta when current is null', () => {
    const delta = calculateCategoryDelta('performance', 80, null);
    expect(delta.delta).toBe(null);
    expect(delta.direction).toBe('unchanged');
  });
});

describe('calculateDeltas', () => {
  it('calculates deltas for all categories', () => {
    const baseline: CategoryScores = {
      performance: 80,
      accessibility: 90,
      'best-practices': 85,
      seo: 95,
      pwa: null,
    };
    const current: CategoryScores = {
      performance: 85,
      accessibility: 88,
      'best-practices': 85,
      seo: 95,
      pwa: null,
    };

    const result = calculateDeltas(baseline, current, 'base.com', 'current.com');
    expect(result.deltas).toHaveLength(5);
    expect(result.baselineUrl).toBe('base.com');
    expect(result.currentUrl).toBe('current.com');
  });
});

describe('formatDelta', () => {
  it('formats positive delta with plus', () => {
    expect(formatDelta(5)).toBe('+5');
  });

  it('formats negative delta', () => {
    expect(formatDelta(-5)).toBe('-5');
  });

  it('formats zero as 0', () => {
    expect(formatDelta(0)).toBe('0');
  });

  it('formats null as N/A', () => {
    expect(formatDelta(null)).toBe('N/A');
  });
});

describe('getSummary', () => {
  it('counts improved, regressed, unchanged', () => {
    const deltas = [
      { category: 'performance' as const, baseline: 80, current: 90, delta: 10, direction: 'improved' as const },
      { category: 'accessibility' as const, baseline: 90, current: 85, delta: -5, direction: 'regressed' as const },
      { category: 'seo' as const, baseline: 90, current: 90, delta: 0, direction: 'unchanged' as const },
    ];

    const summary = getSummary(deltas);
    expect(summary.improved).toBe(1);
    expect(summary.regressed).toBe(1);
    expect(summary.unchanged).toBe(1);
  });

  it('calculates average delta', () => {
    const deltas = [
      { category: 'performance' as const, baseline: 80, current: 90, delta: 10, direction: 'improved' as const },
      { category: 'accessibility' as const, baseline: 90, current: 85, delta: -5, direction: 'regressed' as const },
    ];

    const summary = getSummary(deltas);
    expect(summary.avgDelta).toBe(3); // (10 + -5) / 2 rounded
  });

  it('returns null avgDelta when all deltas null', () => {
    const deltas = [
      { category: 'performance' as const, baseline: null, current: 90, delta: null, direction: 'unchanged' as const },
    ];

    const summary = getSummary(deltas);
    expect(summary.avgDelta).toBe(null);
  });
});
