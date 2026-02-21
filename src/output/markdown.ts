import type { ComparisonResult, LighthouseScores, ScoreDelta } from '../types.js';
import { formatDelta } from '../diff/calculator.js';

const CATEGORY_NAMES: Record<keyof LighthouseScores, string> = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  bestPractices: 'Best Practices',
  seo: 'SEO',
  pwa: 'PWA',
};

/**
 * Get emoji for score
 */
function scoreEmoji(score: number): string {
  if (score >= 90) return '🟢';
  if (score >= 50) return '🟡';
  return '🔴';
}

/**
 * Get emoji for delta
 */
function deltaEmoji(delta: number): string {
  if (delta > 0) return '📈';
  if (delta < 0) return '📉';
  return '➖';
}

/**
 * Format comparison result as Markdown
 */
export function formatComparison(result: ComparisonResult): string {
  const lines: string[] = [];

  // Header
  lines.push('# Lighthouse Score Comparison');
  lines.push('');

  // Summary
  if (result.validation.passed) {
    lines.push('✅ **All thresholds passed**');
  } else {
    lines.push('❌ **Threshold failures detected**');
  }
  lines.push('');

  // URLs
  lines.push('## URLs');
  lines.push(`- **Baseline:** ${result.baseline.url}`);
  lines.push(`- **Current:** ${result.current.url}`);
  lines.push('');

  // Scores table
  lines.push('## Scores');
  lines.push('');
  lines.push('| Category | Baseline | Current | Delta |');
  lines.push('|----------|----------|---------|-------|');

  const categories: (keyof LighthouseScores)[] = [
    'performance',
    'accessibility',
    'bestPractices',
    'seo',
  ];

  if (result.baseline.scores.pwa !== undefined) {
    categories.push('pwa');
  }

  for (const category of categories) {
    const baseline = result.baseline.scores[category];
    const current = result.current.scores[category];
    const delta = result.delta[category];

    if (baseline !== undefined && current !== undefined && delta !== undefined) {
      const baseEmoji = scoreEmoji(baseline);
      const currEmoji = scoreEmoji(current);
      const dEmoji = deltaEmoji(delta);

      lines.push(
        `| ${CATEGORY_NAMES[category]} | ${baseEmoji} ${baseline} | ${currEmoji} ${current} | ${dEmoji} ${formatDelta(delta)} |`
      );
    }
  }

  lines.push('');

  // Failures
  if (!result.validation.passed) {
    lines.push('## Failures');
    lines.push('');
    for (const failure of result.validation.failures) {
      lines.push(`- ❌ ${failure.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format just scores as Markdown
 */
export function formatScores(scores: LighthouseScores, url: string): string {
  const lines: string[] = [];

  lines.push(`# Lighthouse Scores`);
  lines.push('');
  lines.push(`**URL:** ${url}`);
  lines.push('');
  lines.push('| Category | Score |');
  lines.push('|----------|-------|');

  lines.push(`| Performance | ${scoreEmoji(scores.performance)} ${scores.performance} |`);
  lines.push(`| Accessibility | ${scoreEmoji(scores.accessibility)} ${scores.accessibility} |`);
  lines.push(`| Best Practices | ${scoreEmoji(scores.bestPractices)} ${scores.bestPractices} |`);
  lines.push(`| SEO | ${scoreEmoji(scores.seo)} ${scores.seo} |`);

  if (scores.pwa !== undefined) {
    lines.push(`| PWA | ${scoreEmoji(scores.pwa)} ${scores.pwa} |`);
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Format for GitHub PR comment
 */
export function formatPRComment(result: ComparisonResult): string {
  const lines: string[] = [];

  // Header with status
  if (result.validation.passed) {
    lines.push('## ✅ Lighthouse Check Passed');
  } else {
    lines.push('## ❌ Lighthouse Check Failed');
  }
  lines.push('');

  // Compact table
  lines.push('<details>');
  lines.push('<summary>Score Details</summary>');
  lines.push('');
  lines.push(formatComparison(result));
  lines.push('</details>');

  return lines.join('\n');
}
