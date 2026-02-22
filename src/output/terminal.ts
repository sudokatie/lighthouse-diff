import chalk from 'chalk';
import type { ScoreDeltas, ScoreDelta, ThresholdResult } from '../types.js';
import { formatDelta, getSummary } from '../diff/calculator.js';

// Box drawing characters
const TOP_LEFT = '┌';
const TOP_RIGHT = '┐';
const BOTTOM_LEFT = '└';
const BOTTOM_RIGHT = '┘';
const HORIZONTAL = '─';
const VERTICAL = '│';
const T_DOWN = '┬';
const T_UP = '┴';
const T_RIGHT = '├';
const T_LEFT = '┤';
const CROSS = '┼';

// Column widths
const COL_CATEGORY = 17;
const COL_BASELINE = 10;
const COL_CURRENT = 10;
const COL_DELTA = 10;
const COL_STATUS = 9;

/**
 * Color a score based on value
 */
export function colorScore(score: number | null): string {
  if (score === null) return chalk.gray('N/A');
  if (score >= 90) return chalk.green(score.toString());
  if (score >= 50) return chalk.yellow(score.toString());
  return chalk.red(score.toString());
}

/**
 * Color a delta based on direction
 */
export function colorDelta(delta: number | null): string {
  const formatted = formatDelta(delta);
  if (delta === null) return chalk.gray(formatted);
  if (delta > 0) return chalk.green(formatted);
  if (delta < 0) return chalk.red(formatted);
  return formatted;
}

/**
 * Get status icon for a category
 */
export function statusIcon(
  delta: ScoreDelta,
  thresholdResult: ThresholdResult
): string {
  const failure = thresholdResult.failures.find(f => f.category === delta.category);
  
  if (failure) {
    return chalk.red('FAIL');
  }
  
  if (delta.direction === 'regressed') {
    return chalk.yellow('WARN');
  }
  
  return chalk.green('PASS');
}

/**
 * Pad string to width
 */
function pad(str: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, '');
  const padding = Math.max(0, width - stripped.length);
  
  if (align === 'right') {
    return ' '.repeat(padding) + str;
  }
  if (align === 'center') {
    const left = Math.floor(padding / 2);
    const right = padding - left;
    return ' '.repeat(left) + str + ' '.repeat(right);
  }
  return str + ' '.repeat(padding);
}

/**
 * Format the comparison table
 */
export function formatTable(deltas: ScoreDeltas, thresholdResult: ThresholdResult): string {
  const lines: string[] = [];
  
  // Header
  const headerLine = 
    TOP_LEFT + 
    HORIZONTAL.repeat(COL_CATEGORY) + T_DOWN +
    HORIZONTAL.repeat(COL_BASELINE) + T_DOWN +
    HORIZONTAL.repeat(COL_CURRENT) + T_DOWN +
    HORIZONTAL.repeat(COL_DELTA) + T_DOWN +
    HORIZONTAL.repeat(COL_STATUS) + 
    TOP_RIGHT;
  lines.push(headerLine);
  
  const headerRow = 
    VERTICAL + 
    pad(' Category', COL_CATEGORY) + VERTICAL +
    pad(' Baseline', COL_BASELINE) + VERTICAL +
    pad(' Current', COL_CURRENT) + VERTICAL +
    pad(' Delta', COL_DELTA) + VERTICAL +
    pad(' Status', COL_STATUS) + 
    VERTICAL;
  lines.push(headerRow);
  
  const separatorLine = 
    T_RIGHT + 
    HORIZONTAL.repeat(COL_CATEGORY) + CROSS +
    HORIZONTAL.repeat(COL_BASELINE) + CROSS +
    HORIZONTAL.repeat(COL_CURRENT) + CROSS +
    HORIZONTAL.repeat(COL_DELTA) + CROSS +
    HORIZONTAL.repeat(COL_STATUS) + 
    T_LEFT;
  lines.push(separatorLine);
  
  // Data rows
  for (const delta of deltas.deltas) {
    const row = 
      VERTICAL + 
      pad(` ${delta.category}`, COL_CATEGORY) + VERTICAL +
      pad(` ${colorScore(delta.baseline)}`, COL_BASELINE) + VERTICAL +
      pad(` ${colorScore(delta.current)}`, COL_CURRENT) + VERTICAL +
      pad(` ${colorDelta(delta.delta)}`, COL_DELTA) + VERTICAL +
      pad(` ${statusIcon(delta, thresholdResult)}`, COL_STATUS) + 
      VERTICAL;
    lines.push(row);
  }
  
  // Footer
  const footerLine = 
    BOTTOM_LEFT + 
    HORIZONTAL.repeat(COL_CATEGORY) + T_UP +
    HORIZONTAL.repeat(COL_BASELINE) + T_UP +
    HORIZONTAL.repeat(COL_CURRENT) + T_UP +
    HORIZONTAL.repeat(COL_DELTA) + T_UP +
    HORIZONTAL.repeat(COL_STATUS) + 
    BOTTOM_RIGHT;
  lines.push(footerLine);
  
  return lines.join('\n');
}

/**
 * Format the summary line
 */
export function formatSummary(deltas: ScoreDeltas, thresholdResult: ThresholdResult): string {
  const summary = getSummary(deltas.deltas);
  const parts: string[] = [];
  
  if (summary.improved > 0) {
    parts.push(chalk.green(`${summary.improved} improved`));
  }
  if (summary.regressed > 0) {
    parts.push(chalk.red(`${summary.regressed} regressed`));
  }
  if (summary.unchanged > 0) {
    parts.push(chalk.gray(`${summary.unchanged} unchanged`));
  }
  
  let result = parts.join(', ');
  
  if (summary.avgDelta !== null) {
    result += ` | Avg: ${colorDelta(summary.avgDelta)}`;
  }
  
  if (!thresholdResult.passed) {
    result += chalk.red(` | ${thresholdResult.failures.length} threshold failure(s)`);
  }
  
  return result;
}

/**
 * Format full terminal output
 */
export function formatTerminal(deltas: ScoreDeltas, thresholdResult: ThresholdResult): string {
  const lines: string[] = [];
  
  lines.push('');
  lines.push(chalk.bold('Lighthouse Comparison'));
  lines.push(`Baseline: ${deltas.baselineUrl}`);
  lines.push(`Current:  ${deltas.currentUrl}`);
  lines.push('');
  lines.push(formatTable(deltas, thresholdResult));
  lines.push('');
  lines.push(formatSummary(deltas, thresholdResult));
  lines.push('');
  
  return lines.join('\n');
}
