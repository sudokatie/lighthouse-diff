import type { 
  LighthouseScores, 
  ScoreDelta, 
  ValidationResult, 
  ComparisonResult,
  Config,
  OutputFormat,
} from '../types.js';
import { runAudit, closeBrowser } from '../lighthouse/runner.js';
import { calculateDelta } from '../diff/calculator.js';
import { validateThresholds } from '../diff/threshold.js';
import { formatComparison as formatTerminal } from '../output/terminal.js';
import { formatComparison as formatJson } from '../output/json.js';
import { formatComparison as formatMarkdown } from '../output/markdown.js';
import { formatGitHubOutput } from '../output/github.js';

export interface CompareOptions {
  /** Runner options */
  runs?: number;
  device?: 'mobile' | 'desktop';
  /** Thresholds */
  maxRegression?: number;
  minScore?: number;
  absoluteMin?: number;
  /** Output */
  format?: OutputFormat;
  /** CI mode - exit non-zero on failure */
  ci?: boolean;
  /** Verbose output */
  verbose?: boolean;
}

export interface CompareResult {
  baseline: LighthouseScores;
  current: LighthouseScores;
  delta: ScoreDelta;
  validation: ValidationResult;
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
    if (options.verbose) {
      console.error(`Auditing baseline: ${baselineUrl}`);
    }
    const baseline = await runAudit(baselineUrl, {
      runs: options.runs,
      device: options.device,
    });

    if (options.verbose) {
      console.error(`Auditing current: ${currentUrl}`);
    }
    const current = await runAudit(currentUrl, {
      runs: options.runs,
      device: options.device,
    });

    // Calculate deltas
    const delta = calculateDelta(baseline, current);

    // Validate against thresholds (use validateThresholds which checks all)
    const validation = validateThresholds(
      baseline,
      current,
      delta,
      {
        maxRegression: options.maxRegression,
        absoluteMin: options.absoluteMin,
        minScore: options.minScore !== undefined 
          ? {
              performance: options.minScore,
              accessibility: options.minScore,
              bestPractices: options.minScore,
              seo: options.minScore,
            }
          : undefined,
      }
    );

    // Format output
    const comparisonResult: ComparisonResult = {
      baseline: {
        url: baselineUrl,
        scores: baseline,
        timestamp: new Date(),
      },
      current: {
        url: currentUrl,
        scores: current,
        timestamp: new Date(),
      },
      delta,
      validation,
    };

    const output = formatOutput(comparisonResult, options.format ?? 'terminal');

    // Determine exit code
    const exitCode = options.ci && !validation.passed ? 1 : 0;

    return {
      baseline,
      current,
      delta,
      validation,
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
function formatOutput(result: ComparisonResult, format: OutputFormat): string {
  switch (format) {
    case 'json':
      return formatJson(result);
    case 'markdown':
      return formatMarkdown(result);
    case 'github':
      return formatGitHubOutput(result.validation);
    case 'terminal':
    default:
      return formatTerminal(result);
  }
}
