import type { 
  LighthouseScores, 
  ScoreDelta, 
  ValidationResult, 
  ComparisonResult,
  OutputFormat,
} from '../types.js';
import { runAudit, closeBrowser } from '../lighthouse/runner.js';
import { calculateDelta } from '../diff/calculator.js';
import { validateThresholds } from '../diff/threshold.js';
import { captureState, restoreState, checkout } from '../git/checkout.js';
import { startServer } from '../git/server.js';
import { formatComparison as formatTerminal } from '../output/terminal.js';
import { formatComparison as formatJson } from '../output/json.js';
import { formatComparison as formatMarkdown } from '../output/markdown.js';
import { formatGitHubOutput } from '../output/github.js';

export interface GitCompareOptions {
  /** Base ref to compare from */
  base: string;
  /** Head ref to compare to (default: current) */
  head?: string;
  /** Path to serve */
  servePath?: string;
  /** Port for local server */
  port?: number;
  /** Runner options */
  runs?: number;
  device?: 'mobile' | 'desktop';
  /** Thresholds */
  maxRegression?: number;
  minScore?: number;
  absoluteMin?: number;
  /** Output */
  format?: OutputFormat;
  /** CI mode */
  ci?: boolean;
  /** Verbose */
  verbose?: boolean;
}

export interface GitCompareResult {
  baseline: LighthouseScores;
  current: LighthouseScores;
  delta: ScoreDelta;
  validation: ValidationResult;
  output: string;
  exitCode: number;
}

/**
 * Compare Lighthouse scores between git refs
 */
export async function gitCompare(options: GitCompareOptions): Promise<GitCompareResult> {
  const state = captureState();
  
  try {
    // Audit baseline
    if (options.verbose) {
      console.error(`Checking out ${options.base}...`);
    }
    checkout(options.base);
    
    const baseServer = await startServer({ 
      port: options.port, 
      path: options.servePath,
    });
    
    let baseline: LighthouseScores;
    try {
      if (options.verbose) {
        console.error(`Auditing baseline: ${baseServer.url}`);
      }
      baseline = await runAudit(baseServer.url, {
        runs: options.runs,
        device: options.device,
      });
    } finally {
      await baseServer.stop();
    }

    // Audit current (head or restored state)
    if (options.head) {
      if (options.verbose) {
        console.error(`Checking out ${options.head}...`);
      }
      checkout(options.head);
    } else {
      // Restore to original state for current
      restoreState(state);
    }

    const currentServer = await startServer({ 
      port: options.port, 
      path: options.servePath,
    });
    
    let current: LighthouseScores;
    try {
      if (options.verbose) {
        console.error(`Auditing current: ${currentServer.url}`);
      }
      current = await runAudit(currentServer.url, {
        runs: options.runs,
        device: options.device,
      });
    } finally {
      await currentServer.stop();
    }

    // Calculate deltas
    const delta = calculateDelta(baseline, current);

    // Validate using validateThresholds (which checks all threshold types)
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
        url: `${options.base} (local)`,
        scores: baseline,
        timestamp: new Date(),
      },
      current: {
        url: `${options.head ?? 'HEAD'} (local)`,
        scores: current,
        timestamp: new Date(),
      },
      delta,
      validation,
    };

    const output = formatOutput(comparisonResult, options.format ?? 'terminal');
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
    // Always restore state
    restoreState(state);
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
