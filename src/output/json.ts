import type { ScoreDeltas, ThresholdResult } from '../types.js';

/**
 * JSON output structure
 */
interface JsonOutput {
  version: string;
  timestamp: string;
  baselineUrl: string;
  currentUrl: string;
  scores: Array<{
    category: string;
    baseline: number | null;
    current: number | null;
    delta: number | null;
    direction: string;
  }>;
  thresholds: {
    passed: boolean;
    failures: Array<{
      category: string;
      reason: string;
      expected: number;
      actual: number;
    }>;
  };
}

/**
 * Format comparison as JSON
 */
export function formatJson(deltas: ScoreDeltas, thresholdResult: ThresholdResult): string {
  const output: JsonOutput = {
    version: '1.0.0',
    timestamp: deltas.timestamp,
    baselineUrl: deltas.baselineUrl,
    currentUrl: deltas.currentUrl,
    scores: deltas.deltas.map(d => ({
      category: d.category,
      baseline: d.baseline,
      current: d.current,
      delta: d.delta,
      direction: d.direction,
    })),
    thresholds: {
      passed: thresholdResult.passed,
      failures: thresholdResult.failures.map(f => ({
        category: f.category,
        reason: f.reason,
        expected: f.expected,
        actual: f.actual,
      })),
    },
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Parse JSON output back to structure
 */
export function parseJson(json: string): JsonOutput {
  return JSON.parse(json);
}
