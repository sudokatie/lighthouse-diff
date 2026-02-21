import type { LighthouseScores } from '../types.js';

/**
 * Raw Lighthouse result structure (subset we care about)
 */
export interface LighthouseResult {
  categories: {
    performance?: { score: number | null };
    accessibility?: { score: number | null };
    'best-practices'?: { score: number | null };
    seo?: { score: number | null };
    pwa?: { score: number | null };
  };
  fetchTime?: string;
  requestedUrl?: string;
  finalUrl?: string;
}

/**
 * Parse Lighthouse JSON result into scores
 */
export function parseResult(result: LighthouseResult): LighthouseScores {
  const categories = result.categories;

  return {
    performance: normalizeScore(categories.performance?.score),
    accessibility: normalizeScore(categories.accessibility?.score),
    bestPractices: normalizeScore(categories['best-practices']?.score),
    seo: normalizeScore(categories.seo?.score),
    pwa: categories.pwa?.score !== undefined
      ? normalizeScore(categories.pwa.score)
      : undefined,
  };
}

/**
 * Normalize score from 0-1 to 0-100
 */
export function normalizeScore(score: number | null | undefined): number {
  if (score === null || score === undefined) {
    return 0;
  }
  // Lighthouse returns 0-1, convert to 0-100
  return Math.round(score * 100);
}

/**
 * Parse JSON string into Lighthouse result
 */
export function parseJSON(json: string): LighthouseResult {
  try {
    return JSON.parse(json) as LighthouseResult;
  } catch (error) {
    throw new Error(`Invalid Lighthouse JSON: ${error}`);
  }
}

/**
 * Parse Lighthouse result from file content
 */
export function parseFile(content: string): LighthouseScores {
  const result = parseJSON(content);
  return parseResult(result);
}

/**
 * Check if result has all required categories
 */
export function hasRequiredCategories(result: LighthouseResult): boolean {
  const categories = result.categories;
  return (
    categories.performance !== undefined &&
    categories.accessibility !== undefined &&
    categories['best-practices'] !== undefined &&
    categories.seo !== undefined
  );
}

/**
 * Get URL from result
 */
export function getUrl(result: LighthouseResult): string {
  return result.finalUrl || result.requestedUrl || 'unknown';
}

/**
 * Get timestamp from result
 */
export function getTimestamp(result: LighthouseResult): Date {
  if (result.fetchTime) {
    return new Date(result.fetchTime);
  }
  return new Date();
}

/**
 * Average multiple Lighthouse results (for multiple runs)
 */
export function averageResults(results: LighthouseScores[]): LighthouseScores {
  if (results.length === 0) {
    throw new Error('No results to average');
  }

  if (results.length === 1) {
    return results[0];
  }

  const sum = results.reduce(
    (acc, r) => ({
      performance: acc.performance + r.performance,
      accessibility: acc.accessibility + r.accessibility,
      bestPractices: acc.bestPractices + r.bestPractices,
      seo: acc.seo + r.seo,
      pwa: r.pwa !== undefined && acc.pwa !== undefined
        ? acc.pwa + r.pwa
        : undefined,
    }),
    { performance: 0, accessibility: 0, bestPractices: 0, seo: 0, pwa: results[0].pwa !== undefined ? 0 : undefined }
  );

  const count = results.length;
  return {
    performance: Math.round(sum.performance / count),
    accessibility: Math.round(sum.accessibility / count),
    bestPractices: Math.round(sum.bestPractices / count),
    seo: Math.round(sum.seo / count),
    pwa: sum.pwa !== undefined ? Math.round(sum.pwa / count) : undefined,
  };
}
