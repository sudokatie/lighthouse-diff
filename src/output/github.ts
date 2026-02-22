import type { ThresholdResult, ThresholdFailure } from '../types.js';

/**
 * Format a failure as a GitHub annotation
 */
function formatAnnotation(failure: ThresholdFailure): string {
  if (failure.reason === 'below-threshold') {
    return `::error title=${failure.category}::Score ${failure.actual} is below minimum threshold of ${failure.expected}`;
  } else {
    return `::warning title=${failure.category}::Regressed by ${failure.actual} points (max allowed: ${failure.expected})`;
  }
}

/**
 * Format threshold result as GitHub Actions annotations
 */
export function formatAnnotations(thresholdResult: ThresholdResult): string {
  if (thresholdResult.passed || thresholdResult.failures.length === 0) {
    return '';
  }

  return thresholdResult.failures.map(formatAnnotation).join('\n');
}

/**
 * Set a GitHub Actions output
 */
export function setOutput(name: string, value: string): string {
  // Escape special characters
  const escaped = value
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
  
  return `::set-output name=${name}::${escaped}`;
}

/**
 * Start a log group
 */
export function startGroup(name: string): string {
  return `::group::${name}`;
}

/**
 * End a log group
 */
export function endGroup(): string {
  return '::endgroup::';
}

/**
 * Format complete GitHub output
 */
export function formatGitHub(thresholdResult: ThresholdResult): string {
  const lines: string[] = [];
  
  const annotations = formatAnnotations(thresholdResult);
  if (annotations) {
    lines.push(annotations);
  }
  
  return lines.join('\n');
}
