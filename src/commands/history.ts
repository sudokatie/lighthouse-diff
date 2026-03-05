/**
 * History command - view and manage historical Lighthouse runs
 */

import chalk from 'chalk';
import { queryRuns, getRunsForUrl, clearHistory, getRecordCount } from '../history/db.js';
import { analyzeTrends, generateTrendChart, generateTrendSummary } from '../history/trend.js';
import type { HistoryCommandOptions } from '../history/types.js';
import type { HistoryRecord } from '../history/types.js';

interface HistoryResult {
  output: string;
  exitCode: number;
}

/**
 * Execute history command
 */
export async function history(
  url: string | undefined,
  options: HistoryCommandOptions
): Promise<HistoryResult> {
  // Handle clear command
  if (options.clear) {
    const deleted = clearHistory(options.olderThan);
    return {
      output: `Cleared ${deleted} historical record(s).`,
      exitCode: 0,
    };
  }

  // Query history
  const records = queryRuns({
    url,
    limit: options.limit ?? 20,
    since: options.since,
    branch: options.branch,
  });

  if (records.length === 0) {
    return {
      output: 'No historical records found.',
      exitCode: 0,
    };
  }

  // Format output
  if (options.format === 'json') {
    return {
      output: JSON.stringify(records, null, 2),
      exitCode: 0,
    };
  }

  // Terminal output
  let output = formatTerminalOutput(records);

  // Add trend analysis if requested
  if (options.trend && url) {
    const allRecords = getRunsForUrl(url, 50);
    const analysis = analyzeTrends(allRecords);
    if (analysis) {
      output += '\n' + generateTrendChart(analysis);
      output += '\n' + generateTrendSummary(analysis);
    }
  }

  // Add record count
  const totalCount = getRecordCount();
  output += `\n\n${chalk.gray(`Total records in database: ${totalCount}`)}`;

  return {
    output,
    exitCode: 0,
  };
}

/**
 * Format records as terminal table
 */
function formatTerminalOutput(records: HistoryRecord[]): string {
  const lines: string[] = [];

  // Header
  lines.push(chalk.bold('\nLighthouse History'));
  lines.push('─'.repeat(100));

  // Column headers
  const header = [
    'Date'.padEnd(20),
    'URL'.padEnd(35),
    'Branch'.padEnd(12),
    'Perf'.padStart(4),
    'A11y'.padStart(4),
    'BP'.padStart(4),
    'SEO'.padStart(4),
    'Δ'.padStart(4),
  ].join(' ');
  lines.push(chalk.bold(header));
  lines.push('─'.repeat(100));

  // Records
  let prevScores: Record<string, number | null> | null = null;

  for (const record of records) {
    const date = formatDateTime(record.timestamp);
    const url = truncate(record.url, 33);
    const branch = truncate(record.branch || '-', 10);

    const perf = formatScore(record.scores.performance);
    const a11y = formatScore(record.scores.accessibility);
    const bp = formatScore(record.scores['best-practices']);
    const seo = formatScore(record.scores.seo);

    // Calculate delta from previous record (if same URL)
    let delta = '-';
    if (prevScores && record.scores.performance !== null) {
      const prevPerf = prevScores.performance;
      if (prevPerf !== null) {
        const d = record.scores.performance - prevPerf;
        if (d > 0) delta = chalk.green(`+${d}`);
        else if (d < 0) delta = chalk.red(`${d}`);
        else delta = '0';
      }
    }

    const line = [
      date.padEnd(20),
      url.padEnd(35),
      branch.padEnd(12),
      perf.padStart(4),
      a11y.padStart(4),
      bp.padStart(4),
      seo.padStart(4),
      delta.padStart(4),
    ].join(' ');

    lines.push(line);
    prevScores = {
      performance: record.scores.performance,
      accessibility: record.scores.accessibility,
      'best-practices': record.scores['best-practices'],
      seo: record.scores.seo,
      pwa: record.scores.pwa,
    };
  }

  return lines.join('\n');
}

/**
 * Format score with color coding
 */
function formatScore(score: number | null): string {
  if (score === null) return chalk.gray('-');
  if (score >= 90) return chalk.green(score.toString());
  if (score >= 50) return chalk.yellow(score.toString());
  return chalk.red(score.toString());
}

/**
 * Format ISO timestamp to readable format
 */
function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate string with ellipsis
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 2) + '..';
}
