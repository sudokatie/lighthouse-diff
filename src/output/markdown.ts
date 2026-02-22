import type { ScoreDeltas, ScoreDelta, ThresholdResult } from '../types.js';
import { formatDelta, getSummary } from '../diff/calculator.js';

/**
 * Get emoji for delta direction
 */
export function deltaEmoji(delta: ScoreDelta): string {
  if (delta.direction === 'improved') return '✅';
  if (delta.direction === 'regressed') return '⚠️';
  return '';
}

/**
 * Format comparison as Markdown
 */
export function formatMarkdown(deltas: ScoreDeltas, thresholdResult: ThresholdResult): string {
  const lines: string[] = [];
  
  // Header
  lines.push('## Lighthouse Comparison');
  lines.push('');
  lines.push(`**Baseline:** ${deltas.baselineUrl}`);
  lines.push(`**Current:** ${deltas.currentUrl}`);
  lines.push('');
  
  // Table
  lines.push('| Category | Baseline | Current | Delta | |');
  lines.push('|----------|----------|---------|-------|---|');
  
  for (const delta of deltas.deltas) {
    const baseline = delta.baseline !== null ? delta.baseline.toString() : 'N/A';
    const current = delta.current !== null ? delta.current.toString() : 'N/A';
    const deltaStr = formatDelta(delta.delta);
    const emoji = deltaEmoji(delta);
    
    lines.push(`| ${delta.category} | ${baseline} | ${current} | ${deltaStr} | ${emoji} |`);
  }
  
  lines.push('');
  
  // Summary
  const summary = getSummary(deltas.deltas);
  if (thresholdResult.passed) {
    lines.push('✅ **All thresholds passed**');
  } else {
    lines.push('❌ **Threshold failures detected**');
    lines.push('');
    lines.push('<details>');
    lines.push('<summary>View failures</summary>');
    lines.push('');
    
    for (const failure of thresholdResult.failures) {
      if (failure.reason === 'below-threshold') {
        lines.push(`- **${failure.category}**: Score ${failure.actual} is below minimum ${failure.expected}`);
      } else {
        lines.push(`- **${failure.category}**: Regressed by ${failure.actual} points (max allowed: ${failure.expected})`);
      }
    }
    
    lines.push('');
    lines.push('</details>');
  }
  
  lines.push('');
  
  // Average delta
  if (summary.avgDelta !== null) {
    lines.push(`*Average delta: ${formatDelta(summary.avgDelta)}*`);
  }
  
  return lines.join('\n');
}
