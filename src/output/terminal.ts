import chalk from 'chalk';
import type { ComparisonResult, LighthouseScores, ScoreDelta, ValidationResult } from '../types.js';
import { formatDelta } from '../diff/calculator.js';

const CATEGORY_NAMES: Record<keyof LighthouseScores, string> = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  bestPractices: 'Best Practices',
  seo: 'SEO',
  pwa: 'PWA',
};

/**
 * Color a score based on value
 */
function colorScore(score: number): string {
  if (score >= 90) return chalk.green(score.toString());
  if (score >= 50) return chalk.yellow(score.toString());
  return chalk.red(score.toString());
}

/**
 * Color a delta based on direction
 */
function colorDelta(delta: number): string {
  const formatted = formatDelta(delta);
  if (delta > 0) return chalk.green(formatted);
  if (delta < 0) return chalk.red(formatted);
  return chalk.gray(formatted);
}

/**
 * Format scores as a table row
 */
function formatScoreRow(
  category: keyof LighthouseScores,
  baseline: number | undefined,
  current: number | undefined,
  delta: number | undefined
): string {
  const name = CATEGORY_NAMES[category].padEnd(15);
  const baseStr = baseline !== undefined ? colorScore(baseline).padStart(8) : '    -   ';
  const currStr = current !== undefined ? colorScore(current).padStart(8) : '    -   ';
  const deltaStr = delta !== undefined ? colorDelta(delta).padStart(8) : '    -   ';

  return `  ${name} ${baseStr}  →  ${currStr}  (${deltaStr})`;
}

/**
 * Format comparison result for terminal output
 */
export function formatComparison(result: ComparisonResult): string {
  const lines: string[] = [];

  // Header
  lines.push(chalk.bold('\n📊 Lighthouse Score Comparison\n'));

  // URLs
  lines.push(chalk.dim(`Baseline: ${result.baseline.url}`));
  lines.push(chalk.dim(`Current:  ${result.current.url}`));
  lines.push('');

  // Table header
  lines.push(chalk.bold('  Category        Baseline  →  Current   (Delta)'));
  lines.push(chalk.dim('  ' + '─'.repeat(50)));

  // Scores
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
    lines.push(
      formatScoreRow(
        category,
        result.baseline.scores[category],
        result.current.scores[category],
        result.delta[category]
      )
    );
  }

  lines.push('');

  // Validation result
  if (result.validation.passed) {
    lines.push(chalk.green('✓ All thresholds passed'));
  } else {
    lines.push(chalk.red('✗ Threshold failures:'));
    for (const failure of result.validation.failures) {
      lines.push(chalk.red(`  • ${failure.message}`));
    }
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Format just the scores (no comparison)
 */
export function formatScores(scores: LighthouseScores, url: string): string {
  const lines: string[] = [];

  lines.push(chalk.bold(`\n📊 Lighthouse Scores: ${url}\n`));

  lines.push(`  ${chalk.dim('Performance:')}    ${colorScore(scores.performance)}`);
  lines.push(`  ${chalk.dim('Accessibility:')}  ${colorScore(scores.accessibility)}`);
  lines.push(`  ${chalk.dim('Best Practices:')} ${colorScore(scores.bestPractices)}`);
  lines.push(`  ${chalk.dim('SEO:')}            ${colorScore(scores.seo)}`);

  if (scores.pwa !== undefined) {
    lines.push(`  ${chalk.dim('PWA:')}            ${colorScore(scores.pwa)}`);
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Format validation result
 */
export function formatValidation(result: ValidationResult): string {
  if (result.passed) {
    return chalk.green('✓ All thresholds passed\n');
  }

  const lines = [chalk.red('✗ Threshold failures:')];
  for (const failure of result.failures) {
    lines.push(chalk.red(`  • ${failure.message}`));
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Format a simple message
 */
export function formatMessage(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): string {
  switch (type) {
    case 'success':
      return chalk.green(`✓ ${message}`);
    case 'error':
      return chalk.red(`✗ ${message}`);
    case 'warning':
      return chalk.yellow(`⚠ ${message}`);
    default:
      return chalk.blue(`ℹ ${message}`);
  }
}
