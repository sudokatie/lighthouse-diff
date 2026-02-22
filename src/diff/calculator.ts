import type {
  CategoryScores,
  ScoreCategory,
  ScoreDelta,
  ScoreDeltas,
  Direction,
} from '../types.js';

const CATEGORIES: ScoreCategory[] = [
  'performance',
  'accessibility',
  'best-practices',
  'seo',
  'pwa',
];

/**
 * Determine the direction of change
 */
export function getDirection(delta: number | null): Direction {
  if (delta === null || delta === 0) return 'unchanged';
  return delta > 0 ? 'improved' : 'regressed';
}

/**
 * Calculate delta for a single category
 */
export function calculateCategoryDelta(
  category: ScoreCategory,
  baseline: number | null,
  current: number | null
): ScoreDelta {
  const delta = baseline !== null && current !== null ? current - baseline : null;
  
  return {
    category,
    baseline,
    current,
    delta,
    direction: getDirection(delta),
  };
}

/**
 * Calculate deltas for all categories
 */
export function calculateDeltas(
  baseline: CategoryScores,
  current: CategoryScores,
  baselineUrl: string,
  currentUrl: string
): ScoreDeltas {
  const deltas: ScoreDelta[] = CATEGORIES.map(category =>
    calculateCategoryDelta(category, baseline[category], current[category])
  );

  return {
    baselineUrl,
    currentUrl,
    timestamp: new Date().toISOString(),
    deltas,
  };
}

/**
 * Format a delta value for display
 */
export function formatDelta(delta: number | null): string {
  if (delta === null) return 'N/A';
  if (delta === 0) return '0';
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/**
 * Get summary statistics
 */
export function getSummary(deltas: ScoreDelta[]): {
  improved: number;
  regressed: number;
  unchanged: number;
  avgDelta: number | null;
} {
  let improved = 0;
  let regressed = 0;
  let unchanged = 0;
  let totalDelta = 0;
  let validDeltas = 0;

  for (const delta of deltas) {
    if (delta.direction === 'improved') improved++;
    else if (delta.direction === 'regressed') regressed++;
    else unchanged++;

    if (delta.delta !== null) {
      totalDelta += delta.delta;
      validDeltas++;
    }
  }

  return {
    improved,
    regressed,
    unchanged,
    avgDelta: validDeltas > 0 ? Math.round(totalDelta / validDeltas) : null,
  };
}
