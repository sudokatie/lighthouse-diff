import { describe, it, expect } from 'vitest';
import {
  formatComparison,
  formatScores,
  formatValidation,
  formatMessage,
} from './terminal.js';
import type { ComparisonResult, LighthouseScores, ValidationResult } from '../types.js';

const baselineScores: LighthouseScores = {
  performance: 80,
  accessibility: 90,
  bestPractices: 85,
  seo: 95,
};

const currentScores: LighthouseScores = {
  performance: 85,
  accessibility: 92,
  bestPractices: 87,
  seo: 95,
};

const comparisonResult: ComparisonResult = {
  baseline: {
    url: 'https://example.com/old',
    scores: baselineScores,
    timestamp: new Date(),
  },
  current: {
    url: 'https://example.com/new',
    scores: currentScores,
    timestamp: new Date(),
  },
  delta: {
    performance: 5,
    accessibility: 2,
    bestPractices: 2,
    seo: 0,
  },
  validation: {
    passed: true,
    failures: [],
  },
};

describe('formatComparison', () => {
  it('includes header', () => {
    const output = formatComparison(comparisonResult);
    expect(output).toContain('Lighthouse Score Comparison');
  });

  it('includes URLs', () => {
    const output = formatComparison(comparisonResult);
    expect(output).toContain('example.com/old');
    expect(output).toContain('example.com/new');
  });

  it('includes all categories', () => {
    const output = formatComparison(comparisonResult);
    expect(output).toContain('Performance');
    expect(output).toContain('Accessibility');
    expect(output).toContain('Best Practices');
    expect(output).toContain('SEO');
  });

  it('shows pass message when validation passed', () => {
    const output = formatComparison(comparisonResult);
    expect(output).toContain('thresholds passed');
  });

  it('shows failures when validation failed', () => {
    const failedResult: ComparisonResult = {
      ...comparisonResult,
      validation: {
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
      },
    };

    const output = formatComparison(failedResult);
    expect(output).toContain('Threshold failures');
    expect(output).toContain('performance regressed');
  });
});

describe('formatScores', () => {
  it('includes URL', () => {
    const output = formatScores(baselineScores, 'https://example.com');
    expect(output).toContain('example.com');
  });

  it('includes all scores', () => {
    const output = formatScores(baselineScores, 'https://example.com');
    expect(output).toContain('80');
    expect(output).toContain('90');
    expect(output).toContain('85');
    expect(output).toContain('95');
  });

  it('includes PWA when present', () => {
    const scoresWithPwa = { ...baselineScores, pwa: 70 };
    const output = formatScores(scoresWithPwa, 'https://example.com');
    expect(output).toContain('PWA');
    expect(output).toContain('70');
  });
});

describe('formatValidation', () => {
  it('formats passed result', () => {
    const result: ValidationResult = { passed: true, failures: [] };
    const output = formatValidation(result);
    expect(output).toContain('thresholds passed');
  });

  it('formats failed result with messages', () => {
    const result: ValidationResult = {
      passed: false,
      failures: [
        {
          category: 'performance',
          type: 'regression',
          message: 'bad stuff happened',
          actual: -10,
          threshold: -5,
        },
      ],
    };

    const output = formatValidation(result);
    expect(output).toContain('failures');
    expect(output).toContain('bad stuff happened');
  });
});

describe('formatMessage', () => {
  it('formats info message', () => {
    const output = formatMessage('hello', 'info');
    expect(output).toContain('hello');
  });

  it('formats success message', () => {
    const output = formatMessage('done', 'success');
    expect(output).toContain('done');
    expect(output).toContain('✓');
  });

  it('formats error message', () => {
    const output = formatMessage('failed', 'error');
    expect(output).toContain('failed');
    expect(output).toContain('✗');
  });

  it('formats warning message', () => {
    const output = formatMessage('caution', 'warning');
    expect(output).toContain('caution');
    expect(output).toContain('⚠');
  });
});
