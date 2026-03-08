import type { 
  CategoryScores,
  ScoreDeltas,
  ThresholdResult,
  ThresholdConfig,
  MaxRegressionConfig,
  OutputFormat,
  Budget,
  BudgetResult,
} from '../types.js';
import { runAudit, runAuditFull, closeBrowser } from '../lighthouse/runner.js';
import { calculateDeltas } from '../diff/calculator.js';
import { validateAll } from '../diff/threshold.js';
import { formatTerminal } from '../output/terminal.js';
import { formatJson } from '../output/json.js';
import { formatMarkdown } from '../output/markdown.js';
import { formatGitHub } from '../output/github.js';
import { recordRun, cleanupOldRecords } from '../history/db.js';
import { validateBudgets } from '../budget/validator.js';
import { 
  formatBudgetTerminal, 
  formatBudgetJson, 
  formatBudgetMarkdown,
  formatBudgetGithub,
} from '../output/budget.js';

export interface CompareOptions {
  thresholds?: ThresholdConfig;
  maxRegression?: MaxRegressionConfig;
  format?: OutputFormat;
  ci?: boolean;
  budgets?: Budget[];
}

export interface CompareResult {
  baseline: CategoryScores;
  current: CategoryScores;
  deltas: ScoreDeltas;
  thresholdResult: ThresholdResult;
  budgetResult?: BudgetResult;
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
    // Use full audit if budgets are configured to get LHR
    const useBudgets = options.budgets && options.budgets.length > 0;
    
    // Log to stderr
    console.error(`Auditing baseline: ${baselineUrl}`);
    const baselineResult = useBudgets 
      ? await runAuditFull(baselineUrl)
      : { scores: await runAudit(baselineUrl), lhr: null };

    console.error(`Auditing current: ${currentUrl}`);
    const currentResult = useBudgets
      ? await runAuditFull(currentUrl)
      : { scores: await runAudit(currentUrl), lhr: null };

    const baseline = baselineResult.scores;
    const current = currentResult.scores;

    // Record runs to history
    recordRun(baselineUrl, baseline);
    recordRun(currentUrl, current);

    // Lazy cleanup of old records
    cleanupOldRecords();

    // Calculate deltas
    const deltas = calculateDeltas(baseline, current, baselineUrl, currentUrl);

    // Validate using validateAll (BOTH thresholds AND maxRegression)
    const thresholdResult = validateAll(
      current,
      deltas.deltas,
      options.thresholds ?? {},
      options.maxRegression ?? {}
    );

    // Validate budgets if configured
    let budgetResult: BudgetResult | undefined;
    if (useBudgets && currentResult.lhr) {
      budgetResult = validateBudgets(options.budgets!, currentResult.lhr);
    }

    // Format output
    const output = formatOutput(
      deltas, 
      thresholdResult, 
      budgetResult,
      options.format ?? 'terminal'
    );

    // Determine exit code - fail if thresholds OR budgets fail
    const passed = thresholdResult.passed && (budgetResult?.passed ?? true);
    const exitCode = options.ci && !passed ? 1 : 0;

    return {
      baseline,
      current,
      deltas,
      thresholdResult,
      budgetResult,
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
  budgetResult: BudgetResult | undefined,
  format: OutputFormat
): string {
  let output: string;
  
  switch (format) {
    case 'json':
      output = formatJsonWithBudget(deltas, thresholdResult, budgetResult);
      break;
    case 'markdown':
      output = formatMarkdown(deltas, thresholdResult);
      if (budgetResult) {
        output += '\n\n' + formatBudgetMarkdown(budgetResult);
      }
      break;
    case 'github':
      output = formatGitHub(thresholdResult);
      if (budgetResult) {
        output += '\n' + formatBudgetGithub(budgetResult);
      }
      break;
    case 'terminal':
    default:
      output = formatTerminal(deltas, thresholdResult);
      if (budgetResult) {
        output += '\n\n' + formatBudgetTerminal(budgetResult);
      }
      break;
  }
  
  return output;
}

/**
 * Format JSON output with budget results
 */
function formatJsonWithBudget(
  deltas: ScoreDeltas,
  thresholdResult: ThresholdResult,
  budgetResult: BudgetResult | undefined
): string {
  const json = JSON.parse(formatJson(deltas, thresholdResult));
  
  if (budgetResult) {
    json.budgets = formatBudgetJson(budgetResult);
  }
  
  return JSON.stringify(json, null, 2);
}
