import type { ComparisonResult, LighthouseScores, ValidationResult } from '../types.js';

interface JsonOutput {
  baseline: {
    url: string;
    scores: LighthouseScores;
    timestamp: string;
  };
  current: {
    url: string;
    scores: LighthouseScores;
    timestamp: string;
  };
  delta: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    pwa?: number;
  };
  validation: {
    passed: boolean;
    failures: Array<{
      category: string;
      type: string;
      message: string;
      actual: number;
      threshold: number;
    }>;
  };
}

/**
 * Format comparison result as JSON
 */
export function formatComparison(result: ComparisonResult): string {
  const output: JsonOutput = {
    baseline: {
      url: result.baseline.url,
      scores: result.baseline.scores,
      timestamp: result.baseline.timestamp.toISOString(),
    },
    current: {
      url: result.current.url,
      scores: result.current.scores,
      timestamp: result.current.timestamp.toISOString(),
    },
    delta: result.delta,
    validation: result.validation,
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Format just scores as JSON
 */
export function formatScores(scores: LighthouseScores, url: string): string {
  return JSON.stringify({ url, scores }, null, 2);
}

/**
 * Format validation result as JSON
 */
export function formatValidation(result: ValidationResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Parse JSON output back to comparison result
 */
export function parseComparison(json: string): ComparisonResult {
  const data = JSON.parse(json) as JsonOutput;

  return {
    baseline: {
      url: data.baseline.url,
      scores: data.baseline.scores,
      timestamp: new Date(data.baseline.timestamp),
    },
    current: {
      url: data.current.url,
      scores: data.current.scores,
      timestamp: new Date(data.current.timestamp),
    },
    delta: data.delta,
    validation: {
      passed: data.validation.passed,
      failures: data.validation.failures.map(f => ({
        category: f.category as keyof LighthouseScores,
        type: f.type as 'regression' | 'minScore' | 'absoluteMin',
        message: f.message,
        actual: f.actual,
        threshold: f.threshold,
      })),
    },
  };
}
