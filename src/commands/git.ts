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
import { captureState, restoreState, checkout } from '../git/checkout.js';
import { startServer } from '../git/server.js';
import { formatTerminal } from '../output/terminal.js';
import { formatJson } from '../output/json.js';
import { formatMarkdown } from '../output/markdown.js';
import { formatGitHub } from '../output/github.js';

export interface GitCompareOptions {
  base: string;
  head?: string;
  serve?: string;
  port?: number;
  path?: string;
  thresholds?: ThresholdConfig;
  maxRegression?: MaxRegressionConfig;
  format?: OutputFormat;
  ci?: boolean;
}

export interface GitCompareResult {
  baseline: CategoryScores;
  current: CategoryScores;
  deltas: ScoreDeltas;
  thresholdResult: ThresholdResult;
  output: string;
  exitCode: number;
}

/**
 * Compare Lighthouse scores between git refs
 */
export async function gitCompare(options: GitCompareOptions): Promise<GitCompareResult> {
  const state = captureState();
  const serverCmd = options.serve ?? 'npm run dev';
  const serverPort = options.port ?? 3000;
  const urlPath = options.path ?? '/';
  
  try {
    // Checkout base and audit
    console.error(`Checking out ${options.base}...`);
    checkout(options.base);
    
    const baseServer = await startServer({ 
      command: serverCmd,
      port: serverPort,
    });
    
    let baseline: CategoryScores;
    try {
      const baseUrl = `http://localhost:${serverPort}${urlPath}`;
      console.error(`Auditing baseline: ${baseUrl}`);
      baseline = await runAudit(baseUrl);
    } finally {
      await baseServer.stop();
    }

    // Checkout head (or restore) and audit
    if (options.head) {
      console.error(`Checking out ${options.head}...`);
      checkout(options.head);
    } else {
      restoreState(state);
    }

    const currentServer = await startServer({ 
      command: serverCmd,
      port: serverPort,
    });
    
    let current: CategoryScores;
    try {
      const currentUrl = `http://localhost:${serverPort}${urlPath}`;
      console.error(`Auditing current: ${currentUrl}`);
      current = await runAudit(currentUrl);
    } finally {
      await currentServer.stop();
    }

    // Calculate deltas
    const baseLabel = options.base;
    const currentLabel = options.head ?? 'HEAD';
    const deltas = calculateDeltas(baseline, current, baseLabel, currentLabel);

    // Validate using validateAll (CRITICAL: must include maxRegression)
    const thresholdResult = validateAll(
      current,
      deltas.deltas,
      options.thresholds ?? {},
      options.maxRegression ?? {}
    );

    // Format output
    const output = formatOutput(deltas, thresholdResult, options.format ?? 'terminal');
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
    // Always restore state
    restoreState(state);
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
