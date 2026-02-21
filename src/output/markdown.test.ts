import { describe, it, expect } from 'vitest';
import { formatComparison, formatScores, formatPRComment } from './markdown.js';
import type { ComparisonResult, LighthouseScores } from '../types.js';

const comparisonResult: ComparisonResult = {
  baseline: {
    url: 'https://example.com/old',
    scores: { performance: 80, accessibility: 90, bestPractices: 85, seo: 95 },
    timestamp: new Date(),
  },
  current: {
    url: 'https://example.com/new',
    scores: { performance: 85, accessibility: 92, bestPractices: 87, seo: 95 },
    timestamp: new Date(),
  },
  delta: { performance: 5, accessibility: 2, bestPractices: 2, seo: 0 },
  validation: { passed: true, failures: [] },
};

describe('formatComparison', () => {
  it('includes markdown header', () => {
    const md = formatComparison(comparisonResult);
    expect(md).toContain('# Lighthouse Score Comparison');
  });

  it('includes URLs', () => {
    const md = formatComparison(comparisonResult);
    expect(md).toContain('example.com/old');
    expect(md).toContain('example.com/new');
  });

  it('includes table with scores', () => {
    const md = formatComparison(comparisonResult);
    expect(md).toContain('| Category | Baseline | Current | Delta |');
    expect(md).toContain('Performance');
    expect(md).toContain('80');
    expect(md).toContain('85');
  });

  it('includes emojis for scores', () => {
    const md = formatComparison(comparisonResult);
    expect(md).toContain('🟢'); // Good score
  });

  it('shows pass status when passed', () => {
    const md = formatComparison(comparisonResult);
    expect(md).toContain('✅');
    expect(md).toContain('passed');
  });

  it('shows failures when failed', () => {
    const failedResult: ComparisonResult = {
      ...comparisonResult,
      validation: {
        passed: false,
        failures: [
          {
            category: 'performance',
            type: 'regression',
            message: 'performance dropped',
            actual: -10,
            threshold: -5,
          },
        ],
      },
    };

    const md = formatComparison(failedResult);
    expect(md).toContain('❌');
    expect(md).toContain('Failures');
    expect(md).toContain('performance dropped');
  });
});

describe('formatScores', () => {
  it('includes URL', () => {
    const scores: LighthouseScores = {
      performance: 80,
      accessibility: 90,
      bestPractices: 85,
      seo: 95,
    };
    const md = formatScores(scores, 'https://example.com');
    expect(md).toContain('example.com');
  });

  it('includes table with all scores', () => {
    const scores: LighthouseScores = {
      performance: 80,
      accessibility: 90,
      bestPractices: 85,
      seo: 95,
    };
    const md = formatScores(scores, 'https://example.com');
    expect(md).toContain('| Category | Score |');
    expect(md).toContain('Performance');
    expect(md).toContain('80');
  });
});

describe('formatPRComment', () => {
  it('includes collapsible details', () => {
    const md = formatPRComment(comparisonResult);
    expect(md).toContain('<details>');
    expect(md).toContain('</details>');
  });

  it('shows check status in header', () => {
    const md = formatPRComment(comparisonResult);
    expect(md).toContain('✅ Lighthouse Check Passed');
  });

  it('shows failure in header when failed', () => {
    const failedResult: ComparisonResult = {
      ...comparisonResult,
      validation: { passed: false, failures: [] },
    };

    const md = formatPRComment(failedResult);
    expect(md).toContain('❌ Lighthouse Check Failed');
  });
});
