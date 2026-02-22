import type { CategoryScores, LighthouseResult } from '../types.js';

/**
 * Parse a Lighthouse Result (LHR) JSON into our structure
 */
export function parseResult(lhr: unknown): LighthouseResult {
  if (!lhr || typeof lhr !== 'object') {
    throw new Error('Invalid Lighthouse result: expected object');
  }

  const result = lhr as Record<string, unknown>;

  if (!result.categories || typeof result.categories !== 'object') {
    throw new Error('Invalid Lighthouse result: missing categories');
  }

  const categories = result.categories as Record<string, unknown>;
  const scores = extractScores(categories);

  return {
    url: typeof result.finalUrl === 'string' ? result.finalUrl : 
         typeof result.requestedUrl === 'string' ? result.requestedUrl : '',
    fetchTime: typeof result.fetchTime === 'string' ? result.fetchTime : new Date().toISOString(),
    scores,
  };
}

/**
 * Extract scores from categories object
 */
function extractScores(categories: Record<string, unknown>): CategoryScores {
  return {
    performance: extractScore(categories.performance),
    accessibility: extractScore(categories.accessibility),
    'best-practices': extractScore(categories['best-practices']),
    seo: extractScore(categories.seo),
    pwa: extractScore(categories.pwa),
  };
}

/**
 * Extract a single score, converting from 0-1 to 0-100
 */
function extractScore(category: unknown): number | null {
  if (!category || typeof category !== 'object') {
    return null;
  }

  const cat = category as Record<string, unknown>;
  const score = cat.score;

  if (score === null || score === undefined) {
    return null;
  }

  if (typeof score !== 'number') {
    return null;
  }

  // Lighthouse scores are 0-1, convert to 0-100
  return Math.round(score * 100);
}

/**
 * Normalize a score to 0-100 integer
 */
export function normalizeScore(score: number): number {
  // If score is already 0-100 range
  if (score > 1) {
    return Math.round(score);
  }
  // Convert from 0-1 to 0-100
  return Math.round(score * 100);
}

/**
 * Average multiple results
 */
export function averageResults(results: LighthouseResult[]): CategoryScores {
  if (results.length === 0) {
    return {
      performance: null,
      accessibility: null,
      'best-practices': null,
      seo: null,
      pwa: null,
    };
  }

  const categories: (keyof CategoryScores)[] = [
    'performance',
    'accessibility',
    'best-practices',
    'seo',
    'pwa',
  ];

  const averaged: CategoryScores = {
    performance: null,
    accessibility: null,
    'best-practices': null,
    seo: null,
    pwa: null,
  };

  for (const category of categories) {
    const scores = results
      .map(r => r.scores[category])
      .filter((s): s is number => s !== null);

    if (scores.length > 0) {
      averaged[category] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
  }

  return averaged;
}
