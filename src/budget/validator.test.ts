import { describe, it, expect } from 'vitest';
import {
  extractTimings,
  extractResourceSizes,
  extractResourceCounts,
  validateBudget,
  validateBudgets,
  formatViolation,
} from './validator.js';
import type { Budget, BudgetViolation } from '../types.js';

describe('budget validator', () => {
  describe('extractTimings', () => {
    it('extracts timing metrics from LHR', () => {
      const lhr = {
        audits: {
          'first-contentful-paint': { numericValue: 1500 },
          'largest-contentful-paint': { numericValue: 2500 },
          'speed-index': { numericValue: 3000 },
        },
      };

      const timings = extractTimings(lhr);
      expect(timings.get('first-contentful-paint')).toBe(1500);
      expect(timings.get('largest-contentful-paint')).toBe(2500);
      expect(timings.get('speed-index')).toBe(3000);
    });

    it('handles missing audits', () => {
      const lhr = { audits: {} };
      const timings = extractTimings(lhr);
      expect(timings.size).toBe(0);
    });

    it('handles null/undefined input', () => {
      expect(extractTimings(null).size).toBe(0);
      expect(extractTimings(undefined).size).toBe(0);
    });
  });

  describe('extractResourceSizes', () => {
    it('extracts resource sizes from LHR', () => {
      const lhr = {
        audits: {
          'resource-summary': {
            details: {
              items: [
                { resourceType: 'script', transferSize: 102400 },
                { resourceType: 'image', transferSize: 204800 },
              ],
            },
          },
        },
      };

      const sizes = extractResourceSizes(lhr);
      expect(sizes.get('script')).toBe(100); // 102400 / 1024 = 100 KB
      expect(sizes.get('image')).toBe(200);
    });

    it('handles missing resource-summary', () => {
      const lhr = { audits: {} };
      const sizes = extractResourceSizes(lhr);
      expect(sizes.size).toBe(0);
    });
  });

  describe('extractResourceCounts', () => {
    it('extracts resource counts from LHR', () => {
      const lhr = {
        audits: {
          'resource-summary': {
            details: {
              items: [
                { resourceType: 'script', requestCount: 15 },
                { resourceType: 'total', requestCount: 50 },
              ],
            },
          },
        },
      };

      const counts = extractResourceCounts(lhr);
      expect(counts.get('script')).toBe(15);
      expect(counts.get('total')).toBe(50);
    });
  });

  describe('validateBudget', () => {
    const timings = new Map([
      ['first-contentful-paint', 2000],
      ['largest-contentful-paint', 3500],
    ]);
    const sizes = new Map([
      ['script', 400],
      ['image', 200],
    ]);
    const counts = new Map([
      ['total', 75],
    ]);

    it('passes when all within budget', () => {
      const budget: Budget = {
        timings: [{ metric: 'first-contentful-paint', budget: 2500 }],
        resourceSizes: [{ resourceType: 'script', budget: 500 }],
        resourceCounts: [{ resourceType: 'total', budget: 100 }],
      };

      const result = validateBudget(budget, timings, sizes, counts);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('fails when timing exceeds budget', () => {
      const budget: Budget = {
        timings: [{ metric: 'first-contentful-paint', budget: 1500 }],
      };

      const result = validateBudget(budget, timings, sizes, counts);
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].budgetType).toBe('timing');
      expect(result.violations[0].budget).toBe(1500);
      expect(result.violations[0].actual).toBe(2000);
      expect(result.violations[0].overBy).toBe(500);
    });

    it('fails when resource size exceeds budget', () => {
      const budget: Budget = {
        resourceSizes: [{ resourceType: 'script', budget: 300 }],
      };

      const result = validateBudget(budget, timings, sizes, counts);
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].budgetType).toBe('resourceSize');
    });

    it('fails when resource count exceeds budget', () => {
      const budget: Budget = {
        resourceCounts: [{ resourceType: 'total', budget: 50 }],
      };

      const result = validateBudget(budget, timings, sizes, counts);
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].budgetType).toBe('resourceCount');
    });

    it('collects multiple violations', () => {
      const budget: Budget = {
        timings: [
          { metric: 'first-contentful-paint', budget: 1000 },
          { metric: 'largest-contentful-paint', budget: 2000 },
        ],
      };

      const result = validateBudget(budget, timings, sizes, counts);
      expect(result.violations).toHaveLength(2);
    });

    it('ignores metrics not in LHR', () => {
      const budget: Budget = {
        timings: [{ metric: 'interactive', budget: 1000 }],
      };

      const result = validateBudget(budget, timings, sizes, counts);
      expect(result.passed).toBe(true);
    });
  });

  describe('validateBudgets', () => {
    it('validates multiple budgets against LHR', () => {
      const budgets: Budget[] = [
        { timings: [{ metric: 'first-contentful-paint', budget: 1000 }] },
        { resourceSizes: [{ resourceType: 'script', budget: 100 }] },
      ];

      const lhr = {
        audits: {
          'first-contentful-paint': { numericValue: 2000 },
          'resource-summary': {
            details: {
              items: [{ resourceType: 'script', transferSize: 204800 }],
            },
          },
        },
      };

      const result = validateBudgets(budgets, lhr);
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
    });
  });

  describe('formatViolation', () => {
    it('formats timing violation', () => {
      const violation: BudgetViolation = {
        budgetType: 'timing',
        label: 'First Contentful Paint',
        budget: 1500,
        actual: 2000,
        overBy: 500,
        overByPercent: 33,
      };

      const formatted = formatViolation(violation);
      expect(formatted).toContain('First Contentful Paint');
      expect(formatted).toContain('2000ms');
      expect(formatted).toContain('1500ms');
      expect(formatted).toContain('+33%');
    });

    it('formats resource size violation', () => {
      const violation: BudgetViolation = {
        budgetType: 'resourceSize',
        label: 'Script size',
        budget: 300,
        actual: 400,
        overBy: 100,
        overByPercent: 33,
      };

      const formatted = formatViolation(violation);
      expect(formatted).toContain('Script size');
      expect(formatted).toContain('400KB');
      expect(formatted).toContain('300KB');
    });

    it('formats resource count violation without unit', () => {
      const violation: BudgetViolation = {
        budgetType: 'resourceCount',
        label: 'Total requests',
        budget: 50,
        actual: 75,
        overBy: 25,
        overByPercent: 50,
      };

      const formatted = formatViolation(violation);
      expect(formatted).not.toContain('ms');
      expect(formatted).not.toContain('KB');
    });
  });
});
