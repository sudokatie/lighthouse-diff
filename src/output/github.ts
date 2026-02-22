import type { ValidationResult, ValidationFailure } from '../types.js';

/**
 * Format a single failure as GitHub annotation
 */
function formatFailure(failure: ValidationFailure): string {
  const level = failure.type === 'regression' ? 'warning' : 'error';
  return `::${level}::${failure.message}`;
}

/**
 * Format threshold failures as GitHub Actions annotations
 */
export function formatAnnotations(result: ValidationResult): string {
  if (result.passed || result.failures.length === 0) {
    return '';
  }

  return result.failures.map(formatFailure).join('\n');
}

/**
 * Set an output variable in GitHub Actions
 */
export function setOutput(name: string, value: string): string {
  // For multiline values, use heredoc syntax
  if (value.includes('\n')) {
    return `${name}<<EOF\n${value}\nEOF`;
  }
  return `${name}=${value}`;
}

/**
 * Start a collapsible group in GitHub Actions log
 */
export function startGroup(name: string): string {
  return `::group::${name}`;
}

/**
 * End a collapsible group in GitHub Actions log
 */
export function endGroup(): string {
  return '::endgroup::';
}

/**
 * Format full GitHub Actions output
 */
export function formatGitHubOutput(result: ValidationResult): string {
  const lines: string[] = [];
  
  // Add annotations
  const annotations = formatAnnotations(result);
  if (annotations) {
    lines.push(annotations);
  }
  
  // Set output variable for pass/fail
  lines.push(setOutput('lighthouse-passed', result.passed ? 'true' : 'false'));
  
  if (!result.passed) {
    lines.push(setOutput('lighthouse-failures', String(result.failures.length)));
  }
  
  return lines.join('\n');
}
