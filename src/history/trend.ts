/**
 * ASCII trend visualization for historical data
 */

import chalk from 'chalk';
import type { HistoryRecord } from './types.js';
import type { CategoryTrend, TrendAnalysis } from './types.js';
import type { ScoreCategory, SCORE_CATEGORIES } from '../types.js';

const CHART_HEIGHT = 10;
const CHART_WIDTH = 60;

// Symbols for each category
const CATEGORY_SYMBOLS: Record<string, string> = {
  performance: '●',
  accessibility: '■',
  'best-practices': '▲',
  seo: '◆',
  pwa: '★',
};

const CATEGORY_COLORS: Record<string, (s: string) => string> = {
  performance: chalk.red,
  accessibility: chalk.blue,
  'best-practices': chalk.yellow,
  seo: chalk.green,
  pwa: chalk.magenta,
};

/**
 * Analyze trends from historical records
 */
export function analyzeTrends(records: HistoryRecord[]): TrendAnalysis | null {
  if (records.length === 0) return null;

  const url = records[0].url;
  const categories: ScoreCategory[] = [
    'performance',
    'accessibility',
    'best-practices',
    'seo',
    'pwa',
  ];

  const trends: CategoryTrend[] = categories.map((category) => {
    const values = records.map((r) => ({
      timestamp: r.timestamp,
      score: r.scores[category],
    }));

    const validScores = values.filter((v) => v.score !== null).map((v) => v.score as number);

    let average: number | null = null;
    let direction: 'up' | 'down' | 'stable' = 'stable';
    let volatility = 0;

    if (validScores.length > 0) {
      average = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);

      // Calculate volatility (standard deviation)
      const mean = average;
      const squaredDiffs = validScores.map((s) => Math.pow(s - mean, 2));
      volatility = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / validScores.length);

      // Determine trend direction using linear regression
      if (validScores.length >= 2) {
        const slope = calculateSlope(validScores);
        if (slope > 0.5) direction = 'up';
        else if (slope < -0.5) direction = 'down';
      }
    }

    return {
      category,
      values,
      average,
      direction,
      volatility: Math.round(volatility * 10) / 10,
    };
  });

  return {
    url,
    period: {
      start: records[0].timestamp,
      end: records[records.length - 1].timestamp,
    },
    runCount: records.length,
    trends,
  };
}

/**
 * Calculate slope using simple linear regression
 */
function calculateSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Generate ASCII chart for trends
 */
export function generateTrendChart(analysis: TrendAnalysis): string {
  const lines: string[] = [];

  // Header
  lines.push(chalk.bold(`\nTrend Analysis: ${analysis.url}`));
  lines.push(
    `Period: ${formatDate(analysis.period.start)} to ${formatDate(analysis.period.end)} (${analysis.runCount} runs)\n`
  );

  // Chart grid
  const chart = createChartGrid(analysis);
  lines.push(chart);

  // Legend
  lines.push('');
  lines.push(chalk.bold('Legend:'));
  const legendParts = analysis.trends
    .filter((t) => t.average !== null)
    .map((t) => {
      const color = CATEGORY_COLORS[t.category] || ((s: string) => s);
      const symbol = CATEGORY_SYMBOLS[t.category] || '•';
      const arrow = t.direction === 'up' ? '↑' : t.direction === 'down' ? '↓' : '→';
      return color(
        `${symbol} ${t.category}: avg ${t.average} ${arrow} (σ=${t.volatility.toFixed(1)})`
      );
    });
  lines.push(legendParts.join('  '));

  return lines.join('\n');
}

/**
 * Create the ASCII chart grid
 */
function createChartGrid(analysis: TrendAnalysis): string {
  const grid: string[][] = [];

  // Initialize grid with spaces
  for (let y = 0; y <= CHART_HEIGHT; y++) {
    grid[y] = new Array(CHART_WIDTH + 8).fill(' ');
  }

  // Y-axis labels
  for (let y = 0; y <= CHART_HEIGHT; y++) {
    const score = 100 - (y * 100) / CHART_HEIGHT;
    const label = score.toFixed(0).padStart(3);
    grid[y][0] = label[0];
    grid[y][1] = label[1];
    grid[y][2] = label[2];
    grid[y][3] = ' ';
    grid[y][4] = '│';
  }

  // X-axis
  const bottomRow = CHART_HEIGHT;
  for (let x = 5; x < CHART_WIDTH + 5; x++) {
    grid[bottomRow + 1] = grid[bottomRow + 1] || new Array(CHART_WIDTH + 8).fill(' ');
  }

  // Plot each category
  for (const trend of analysis.trends) {
    const validValues = trend.values.filter((v) => v.score !== null);
    if (validValues.length === 0) continue;

    const color = CATEGORY_COLORS[trend.category] || ((s: string) => s);
    const symbol = CATEGORY_SYMBOLS[trend.category] || '•';

    // Map values to chart coordinates
    const points = validValues.map((v, i) => {
      const x = Math.round((i / Math.max(validValues.length - 1, 1)) * (CHART_WIDTH - 1)) + 5;
      const y = Math.round(((100 - (v.score as number)) / 100) * CHART_HEIGHT);
      return { x, y };
    });

    // Plot points
    for (const point of points) {
      if (point.y >= 0 && point.y <= CHART_HEIGHT && point.x >= 5) {
        grid[point.y][point.x] = color(symbol);
      }
    }
  }

  // Convert grid to string
  return grid.map((row) => row.join('')).join('\n');
}

/**
 * Format ISO date to readable format
 */
function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Generate summary statistics
 */
export function generateTrendSummary(analysis: TrendAnalysis): string {
  const lines: string[] = [];

  lines.push(chalk.bold('\nTrend Summary'));
  lines.push('─'.repeat(50));

  for (const trend of analysis.trends) {
    if (trend.average === null) continue;

    const color = CATEGORY_COLORS[trend.category] || ((s: string) => s);
    const directionIcon = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';
    const directionColor =
      trend.direction === 'up' ? chalk.green : trend.direction === 'down' ? chalk.red : chalk.gray;

    const line = [
      color(trend.category.padEnd(15)),
      `Avg: ${trend.average.toString().padStart(3)}`,
      directionColor(`${directionIcon}`),
      `Volatility: ${trend.volatility.toFixed(1)}`,
    ].join('  ');

    lines.push(line);
  }

  return lines.join('\n');
}
