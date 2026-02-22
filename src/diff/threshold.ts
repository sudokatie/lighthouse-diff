import type {
  CategoryScores,
  ScoreCategory,
  ScoreDelta,
  ThresholdConfig,
  MaxRegressionConfig,
  ThresholdResult,
  ThresholdFailure,
  SCORE_CATEGORIES,
} from '../types.js';

const CATEGORIES: ScoreCategory[] = [
  'performance',
  'accessibility',
  'best-practices',
  'seo',
  'pwa',
];

/**
 * Validate current scores against minimum thresholds
 */
export function validateThresholds(
  current: CategoryScores,
  thresholds: ThresholdConfig
): ThresholdResult {
  const failures: ThresholdFailure[] = [];

  for (const category of CATEGORIES) {
    const threshold = thresholds[category];
    const score = current[category];
    
    if (threshold !== undefined && score !== null && score < threshold) {
      failures.push({
        category,
        reason: 'below-threshold',
        expected: threshold,
        actual: score,
      });
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Validate deltas against max regression limits
 */
export function validateMaxRegression(
  deltas: ScoreDelta[],
  maxRegression: MaxRegressionConfig
): ThresholdResult {
  const failures: ThresholdFailure[] = [];

  for (const delta of deltas) {
    const maxReg = maxRegression[delta.category];
    
    if (
      maxReg !== undefined &&
      delta.delta !== null &&
      delta.delta < 0 &&
      Math.abs(delta.delta) > maxReg
    ) {
      failures.push({
        category: delta.category,
        reason: 'regression',
        expected: maxReg,
        actual: Math.abs(delta.delta),
      });
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Validate all thresholds (minimum scores AND max regression)
 */
export function validateAll(
  current: CategoryScores,
  deltas: ScoreDelta[],
  thresholds: ThresholdConfig,
  maxRegression: MaxRegressionConfig
): ThresholdResult {
  const thresholdResult = validateThresholds(current, thresholds);
  const regressionResult = validateMaxRegression(deltas, maxRegression);

  const allFailures = [...thresholdResult.failures, ...regressionResult.failures];

  return {
    passed: allFailures.length === 0,
    failures: allFailures,
  };
}

/**
 * Format a single failure for display
 */
export function formatFailure(failure: ThresholdFailure): string {
  if (failure.reason === 'below-threshold') {
    return `${failure.category}: score ${failure.actual} is below minimum ${failure.expected}`;
  } else {
    return `${failure.category}: regressed by ${failure.actual} points (max allowed: ${failure.expected})`;
  }
}
