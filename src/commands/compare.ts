import type { 
  CategoryScores,
  ScoreDeltas,
  ThresholdResult,
  ThresholdConfig,
  MaxRegressionConfig,
  OutputFormat,
} from '../types.js';
import { runAudit, closeBrowser } from '../lighthouse/runner.js';
import { calculateDeltas } from '../diff/calculator.js';
import { validateAll } from '../diff/threshold.js';
import { formatTerminal } from '../output/terminal.js';
import { formatJson } from '../output/json.js';
import { formatMarkdown } from '../output/markdown.js';
import { formatGitHub } from '../output/github.js';

export interface CompareOptions {
  thresholds?: ThresholdConfig;
  maxRegression?: MaxRegressionConfig;
  format?: OutputFormat;
  ci?: boolean;
}

export interface CompareResult {
  baseline: CategoryScores;
  current: CategoryScores;
  deltas: ScoreDeltas;
  thresholdResult: ThresholdResult;
  output: string;
  exitCode: number;
}

/**
 * Compare two URLs
 */
export async function compare(
  baselineUrl: string,
  currentUrl: string,
  options: CompareOptions = {}
): Promise<CompareResult> {
  try {
    // Log to stderr
    console.error(`Auditing baseline: ${baselineUrl}`);
    const baseline = await runAudit(baselineUrl);

    console.error(`Auditing current: ${currentUrl}`);
    const current = await runAudit(currentUrl);

    // Calculate deltas
    const deltas = calculateDeltas(baseline, current, baselineUrl, currentUrl);

    // Validate using validateAll (BOTH thresholds AND maxRegression)
    const thresholdResult = validateAll(
      current,
      deltas.deltas,
      options.thresholds ?? {},
      options.maxRegression ?? {}
    );

    // Format output
    const output = formatOutput(deltas, thresholdResult, options.format ?? 'terminal');

    // Determine exit code
    const exitCode = options.ci && !thresholdResult.passed ? 1 : 0;

    return {
      baseline,
      current,
      deltas,
      thresholdResult,
      output,
      exitCode,
    };
  } finally {
    await closeBrowser();
  }
}

/**
 * Format output based on format option
 */
function formatOutput(
  deltas: ScoreDeltas,
  thresholdResult: ThresholdResult,
  format: OutputFormat
): string {
  switch (format) {
    case 'json':
      return formatJson(deltas, thresholdResult);
    case 'markdown':
      return formatMarkdown(deltas, thresholdResult);
    case 'github':
      return formatGitHub(thresholdResult);
    case 'terminal':
    default:
      return formatTerminal(deltas, thresholdResult);
  }
}
