import type { Budget, BudgetResult, BudgetViolation } from '../types.js';

// Lighthouse metric names to human-readable labels
const METRIC_LABELS: Record<string, string> = {
  'first-contentful-paint': 'First Contentful Paint',
  'largest-contentful-paint': 'Largest Contentful Paint',
  'interactive': 'Time to Interactive',
  'speed-index': 'Speed Index',
  'total-blocking-time': 'Total Blocking Time',
  'max-potential-fid': 'Max Potential FID',
  'cumulative-layout-shift': 'Cumulative Layout Shift',
};

const RESOURCE_LABELS: Record<string, string> = {
  'document': 'Document',
  'script': 'Script',
  'stylesheet': 'Stylesheet',
  'image': 'Image',
  'media': 'Media',
  'font': 'Font',
  'other': 'Other',
  'third-party': 'Third-party',
  'total': 'Total',
};

/**
 * Map Lighthouse audit IDs to budget metric names
 */
const AUDIT_TO_METRIC: Record<string, string> = {
  'first-contentful-paint': 'first-contentful-paint',
  'largest-contentful-paint': 'largest-contentful-paint',
  'interactive': 'interactive',
  'speed-index': 'speed-index',
  'total-blocking-time': 'total-blocking-time',
  'max-potential-fid': 'max-potential-fid',
  'cumulative-layout-shift': 'cumulative-layout-shift',
};

/**
 * Extract timing values from Lighthouse report
 */
export function extractTimings(lhr: unknown): Map<string, number> {
  const timings = new Map<string, number>();
  
  if (!lhr || typeof lhr !== 'object') {
    return timings;
  }
  
  const audits = (lhr as Record<string, unknown>).audits;
  if (!audits || typeof audits !== 'object') {
    return timings;
  }
  
  for (const [auditId, metric] of Object.entries(AUDIT_TO_METRIC)) {
    const audit = (audits as Record<string, unknown>)[auditId];
    if (audit && typeof audit === 'object') {
      const numericValue = (audit as Record<string, unknown>).numericValue;
      if (typeof numericValue === 'number') {
        // CLS is unitless, others are in milliseconds
        timings.set(metric, numericValue);
      }
    }
  }
  
  return timings;
}

/**
 * Extract resource sizes from Lighthouse report
 */
export function extractResourceSizes(lhr: unknown): Map<string, number> {
  const sizes = new Map<string, number>();
  
  if (!lhr || typeof lhr !== 'object') {
    return sizes;
  }
  
  const audits = (lhr as Record<string, unknown>).audits;
  if (!audits || typeof audits !== 'object') {
    return sizes;
  }
  
  // Get resource summary audit
  const resourceSummary = (audits as Record<string, unknown>)['resource-summary'];
  if (!resourceSummary || typeof resourceSummary !== 'object') {
    return sizes;
  }
  
  const details = (resourceSummary as Record<string, unknown>).details;
  if (!details || typeof details !== 'object') {
    return sizes;
  }
  
  const items = (details as Record<string, unknown>).items;
  if (!Array.isArray(items)) {
    return sizes;
  }
  
  for (const item of items) {
    if (item && typeof item === 'object') {
      const resourceType = (item as Record<string, unknown>).resourceType;
      const transferSize = (item as Record<string, unknown>).transferSize;
      
      if (typeof resourceType === 'string' && typeof transferSize === 'number') {
        // Convert bytes to KB
        sizes.set(resourceType, transferSize / 1024);
      }
    }
  }
  
  return sizes;
}

/**
 * Extract resource counts from Lighthouse report
 */
export function extractResourceCounts(lhr: unknown): Map<string, number> {
  const counts = new Map<string, number>();
  
  if (!lhr || typeof lhr !== 'object') {
    return counts;
  }
  
  const audits = (lhr as Record<string, unknown>).audits;
  if (!audits || typeof audits !== 'object') {
    return counts;
  }
  
  // Get resource summary audit
  const resourceSummary = (audits as Record<string, unknown>)['resource-summary'];
  if (!resourceSummary || typeof resourceSummary !== 'object') {
    return counts;
  }
  
  const details = (resourceSummary as Record<string, unknown>).details;
  if (!details || typeof details !== 'object') {
    return counts;
  }
  
  const items = (details as Record<string, unknown>).items;
  if (!Array.isArray(items)) {
    return counts;
  }
  
  for (const item of items) {
    if (item && typeof item === 'object') {
      const resourceType = (item as Record<string, unknown>).resourceType;
      const requestCount = (item as Record<string, unknown>).requestCount;
      
      if (typeof resourceType === 'string' && typeof requestCount === 'number') {
        counts.set(resourceType, requestCount);
      }
    }
  }
  
  return counts;
}

/**
 * Validate budget against Lighthouse results
 */
export function validateBudget(
  budget: Budget,
  timings: Map<string, number>,
  sizes: Map<string, number>,
  counts: Map<string, number>
): BudgetResult {
  const violations: BudgetViolation[] = [];
  
  // Check timing budgets
  if (budget.timings) {
    for (const timing of budget.timings) {
      const actual = timings.get(timing.metric);
      if (actual !== undefined && actual > timing.budget) {
        const overBy = actual - timing.budget;
        violations.push({
          budgetType: 'timing',
          label: METRIC_LABELS[timing.metric] || timing.metric,
          budget: timing.budget,
          actual: Math.round(actual),
          overBy: Math.round(overBy),
          overByPercent: Math.round((overBy / timing.budget) * 100),
        });
      }
    }
  }
  
  // Check resource size budgets
  if (budget.resourceSizes) {
    for (const size of budget.resourceSizes) {
      const actual = sizes.get(size.resourceType);
      if (actual !== undefined && actual > size.budget) {
        const overBy = actual - size.budget;
        violations.push({
          budgetType: 'resourceSize',
          label: `${RESOURCE_LABELS[size.resourceType] || size.resourceType} size`,
          budget: size.budget,
          actual: Math.round(actual),
          overBy: Math.round(overBy),
          overByPercent: Math.round((overBy / size.budget) * 100),
        });
      }
    }
  }
  
  // Check resource count budgets
  if (budget.resourceCounts) {
    for (const count of budget.resourceCounts) {
      const actual = counts.get(count.resourceType);
      if (actual !== undefined && actual > count.budget) {
        const overBy = actual - count.budget;
        violations.push({
          budgetType: 'resourceCount',
          label: `${RESOURCE_LABELS[count.resourceType] || count.resourceType} requests`,
          budget: count.budget,
          actual,
          overBy,
          overByPercent: Math.round((overBy / count.budget) * 100),
        });
      }
    }
  }
  
  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Validate all budgets against Lighthouse results
 */
export function validateBudgets(
  budgets: Budget[],
  lhr: unknown
): BudgetResult {
  const timings = extractTimings(lhr);
  const sizes = extractResourceSizes(lhr);
  const counts = extractResourceCounts(lhr);
  
  const allViolations: BudgetViolation[] = [];
  
  for (const budget of budgets) {
    const result = validateBudget(budget, timings, sizes, counts);
    allViolations.push(...result.violations);
  }
  
  return {
    passed: allViolations.length === 0,
    violations: allViolations,
  };
}

/**
 * Format budget violation for display
 */
export function formatViolation(violation: BudgetViolation): string {
  const unit = violation.budgetType === 'timing' ? 'ms' : 
               violation.budgetType === 'resourceSize' ? 'KB' : '';
  
  return `${violation.label}: ${violation.actual}${unit} exceeds budget of ${violation.budget}${unit} (+${violation.overByPercent}%)`;
}
