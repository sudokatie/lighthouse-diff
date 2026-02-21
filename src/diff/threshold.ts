import type {
  LighthouseScores,
  ScoreDelta,
  Thresholds,
  ValidationResult,
  ValidationFailure,
} from '../types.js';

const CATEGORIES: (keyof LighthouseScores)[] = [
  'performance',
  'accessibility',
  'bestPractices',
  'seo',
  'pwa',
];

/**
 * Validate scores against thresholds
 */
export function validateThresholds(
  baseline: LighthouseScores,
  current: LighthouseScores,
  delta: ScoreDelta,
  thresholds: Thresholds
): ValidationResult {
  const failures: ValidationFailure[] = [];

  // Check max regression
  if (thresholds.maxRegression !== undefined) {
    for (const category of CATEGORIES) {
      const d = delta[category];
      if (d !== undefined && d < -thresholds.maxRegression) {
        failures.push({
          category,
          type: 'regression',
          message: `${category} regressed by ${Math.abs(d)} (max allowed: ${thresholds.maxRegression})`,
          actual: d,
          threshold: -thresholds.maxRegression,
        });
      }
    }
  }

  // Check minimum scores
  if (thresholds.minScore) {
    for (const category of CATEGORIES) {
      const minScore = thresholds.minScore[category];
      const score = current[category];
      if (minScore !== undefined && score !== undefined && score < minScore) {
        failures.push({
          category,
          type: 'minScore',
          message: `${category} score ${score} is below minimum ${minScore}`,
          actual: score,
          threshold: minScore,
        });
      }
    }
  }

  // Check absolute minimum
  if (thresholds.absoluteMin !== undefined) {
    for (const category of CATEGORIES) {
      const score = current[category];
      if (score !== undefined && score < thresholds.absoluteMin) {
        failures.push({
          category,
          type: 'absoluteMin',
          message: `${category} score ${score} is below absolute minimum ${thresholds.absoluteMin}`,
          actual: score,
          threshold: thresholds.absoluteMin,
        });
      }
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Check only regression threshold
 */
export function validateRegression(
  delta: ScoreDelta,
  maxRegression: number
): ValidationResult {
  return validateThresholds(
    { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
    { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
    delta,
    { maxRegression }
  );
}

/**
 * Check only minimum score threshold
 */
export function validateMinScores(
  scores: LighthouseScores,
  minScore: number
): ValidationResult {
  const thresholds: Thresholds = {
    minScore: {
      performance: minScore,
      accessibility: minScore,
      bestPractices: minScore,
      seo: minScore,
    },
  };

  return validateThresholds(
    scores,
    scores,
    { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
    thresholds
  );
}

/**
 * Create default thresholds
 */
export function defaultThresholds(): Thresholds {
  return {
    maxRegression: 5,
    minScore: {
      performance: 50,
      accessibility: 90,
      bestPractices: 80,
      seo: 80,
    },
  };
}

/**
 * Merge user thresholds with defaults
 */
export function mergeThresholds(
  user: Partial<Thresholds>,
  defaults: Thresholds = defaultThresholds()
): Thresholds {
  return {
    maxRegression: user.maxRegression ?? defaults.maxRegression,
    minScore: {
      ...defaults.minScore,
      ...user.minScore,
    },
    absoluteMin: user.absoluteMin ?? defaults.absoluteMin,
  };
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): string {
  if (result.passed) {
    return 'All thresholds passed';
  }

  const lines = ['Threshold failures:'];
  for (const failure of result.failures) {
    lines.push(`  - ${failure.message}`);
  }
  return lines.join('\n');
}
