import type { LighthouseScores, ScoreDelta } from '../types.js';

/**
 * Calculate delta between two score sets
 * Positive = improvement, Negative = regression
 */
export function calculateDelta(
  baseline: LighthouseScores,
  current: LighthouseScores
): ScoreDelta {
  const delta: ScoreDelta = {
    performance: current.performance - baseline.performance,
    accessibility: current.accessibility - baseline.accessibility,
    bestPractices: current.bestPractices - baseline.bestPractices,
    seo: current.seo - baseline.seo,
  };

  if (baseline.pwa !== undefined && current.pwa !== undefined) {
    delta.pwa = current.pwa - baseline.pwa;
  }

  return delta;
}

/**
 * Get the worst (most negative) delta value
 */
export function worstRegression(delta: ScoreDelta): number {
  const values = [
    delta.performance,
    delta.accessibility,
    delta.bestPractices,
    delta.seo,
  ];
  if (delta.pwa !== undefined) {
    values.push(delta.pwa);
  }
  return Math.min(...values);
}

/**
 * Check if any category regressed
 */
export function hasRegression(delta: ScoreDelta): boolean {
  return worstRegression(delta) < 0;
}

/**
 * Get categories that regressed
 */
export function getRegressedCategories(delta: ScoreDelta): (keyof LighthouseScores)[] {
  const regressed: (keyof LighthouseScores)[] = [];

  if (delta.performance < 0) regressed.push('performance');
  if (delta.accessibility < 0) regressed.push('accessibility');
  if (delta.bestPractices < 0) regressed.push('bestPractices');
  if (delta.seo < 0) regressed.push('seo');
  if (delta.pwa !== undefined && delta.pwa < 0) regressed.push('pwa');

  return regressed;
}

/**
 * Get categories that improved
 */
export function getImprovedCategories(delta: ScoreDelta): (keyof LighthouseScores)[] {
  const improved: (keyof LighthouseScores)[] = [];

  if (delta.performance > 0) improved.push('performance');
  if (delta.accessibility > 0) improved.push('accessibility');
  if (delta.bestPractices > 0) improved.push('bestPractices');
  if (delta.seo > 0) improved.push('seo');
  if (delta.pwa !== undefined && delta.pwa > 0) improved.push('pwa');

  return improved;
}

/**
 * Calculate average score
 */
export function averageScore(scores: LighthouseScores): number {
  const values = [
    scores.performance,
    scores.accessibility,
    scores.bestPractices,
    scores.seo,
  ];
  if (scores.pwa !== undefined) {
    values.push(scores.pwa);
  }
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Format delta with + or - sign
 */
export function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

/**
 * Round scores to nearest integer
 */
export function roundScores(scores: LighthouseScores): LighthouseScores {
  return {
    performance: Math.round(scores.performance),
    accessibility: Math.round(scores.accessibility),
    bestPractices: Math.round(scores.bestPractices),
    seo: Math.round(scores.seo),
    pwa: scores.pwa !== undefined ? Math.round(scores.pwa) : undefined,
  };
}
