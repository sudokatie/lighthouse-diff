import chalk from 'chalk';
import type { BudgetResult, BudgetViolation } from '../types.js';

/**
 * Format budget result as terminal output
 */
export function formatBudgetTerminal(result: BudgetResult): string {
  const lines: string[] = [];
  
  if (result.passed) {
    lines.push(chalk.green('✓ All budgets passed'));
    return lines.join('\n');
  }
  
  lines.push(chalk.red(`✗ ${result.violations.length} budget violation(s)`));
  lines.push('');
  
  // Group violations by type
  const timings = result.violations.filter(v => v.budgetType === 'timing');
  const sizes = result.violations.filter(v => v.budgetType === 'resourceSize');
  const counts = result.violations.filter(v => v.budgetType === 'resourceCount');
  
  if (timings.length > 0) {
    lines.push(chalk.yellow('Timing Violations:'));
    for (const v of timings) {
      lines.push(formatViolationLine(v, 'ms'));
    }
    lines.push('');
  }
  
  if (sizes.length > 0) {
    lines.push(chalk.yellow('Resource Size Violations:'));
    for (const v of sizes) {
      lines.push(formatViolationLine(v, 'KB'));
    }
    lines.push('');
  }
  
  if (counts.length > 0) {
    lines.push(chalk.yellow('Resource Count Violations:'));
    for (const v of counts) {
      lines.push(formatViolationLine(v, ''));
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

function formatViolationLine(v: BudgetViolation, unit: string): string {
  const actual = chalk.red(`${v.actual}${unit}`);
  const budget = chalk.dim(`${v.budget}${unit}`);
  const over = chalk.red(`+${v.overByPercent}%`);
  return `  ${v.label}: ${actual} (budget: ${budget}, ${over})`;
}

/**
 * Format budget result as JSON
 */
export function formatBudgetJson(result: BudgetResult): object {
  return {
    passed: result.passed,
    violationCount: result.violations.length,
    violations: result.violations.map(v => ({
      type: v.budgetType,
      label: v.label,
      budget: v.budget,
      actual: v.actual,
      overBy: v.overBy,
      overByPercent: v.overByPercent,
    })),
  };
}

/**
 * Format budget result as markdown
 */
export function formatBudgetMarkdown(result: BudgetResult): string {
  const lines: string[] = [];
  
  lines.push('### Performance Budget');
  lines.push('');
  
  if (result.passed) {
    lines.push('All budgets passed.');
    return lines.join('\n');
  }
  
  lines.push(`**${result.violations.length} budget violation(s)**`);
  lines.push('');
  lines.push('| Metric | Budget | Actual | Over |');
  lines.push('|--------|--------|--------|------|');
  
  for (const v of result.violations) {
    const unit = v.budgetType === 'timing' ? 'ms' : 
                 v.budgetType === 'resourceSize' ? 'KB' : '';
    lines.push(`| ${v.label} | ${v.budget}${unit} | ${v.actual}${unit} | +${v.overByPercent}% |`);
  }
  
  return lines.join('\n');
}

/**
 * Format budget result as GitHub annotations
 */
export function formatBudgetGithub(result: BudgetResult): string {
  if (result.passed) {
    return '';
  }
  
  const lines: string[] = [];
  
  for (const v of result.violations) {
    const unit = v.budgetType === 'timing' ? 'ms' : 
                 v.budgetType === 'resourceSize' ? 'KB' : '';
    lines.push(`::error title=Budget Exceeded: ${v.label}::${v.actual}${unit} exceeds budget of ${v.budget}${unit} (+${v.overByPercent}%)`);
  }
  
  return lines.join('\n');
}
