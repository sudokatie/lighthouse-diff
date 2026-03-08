import { describe, it, expect } from 'vitest';
import {
  formatBudgetTerminal,
  formatBudgetJson,
  formatBudgetMarkdown,
  formatBudgetGithub,
} from './budget.js';
import type { BudgetResult, BudgetViolation } from '../types.js';

describe('budget output', () => {
  const passedResult: BudgetResult = {
    passed: true,
    violations: [],
  };

  const failedResult: BudgetResult = {
    passed: false,
    violations: [
      {
        budgetType: 'timing',
        label: 'First Contentful Paint',
        budget: 1500,
        actual: 2000,
        overBy: 500,
        overByPercent: 33,
      },
      {
        budgetType: 'resourceSize',
        label: 'Script size',
        budget: 300,
        actual: 400,
        overBy: 100,
        overByPercent: 33,
      },
    ],
  };

  describe('formatBudgetTerminal', () => {
    it('shows success message when passed', () => {
      const output = formatBudgetTerminal(passedResult);
      expect(output).toContain('All budgets passed');
    });

    it('shows violation count when failed', () => {
      const output = formatBudgetTerminal(failedResult);
      expect(output).toContain('2 budget violation');
    });

    it('groups violations by type', () => {
      const output = formatBudgetTerminal(failedResult);
      expect(output).toContain('Timing Violations');
      expect(output).toContain('Resource Size Violations');
    });

    it('shows actual and budget values', () => {
      const output = formatBudgetTerminal(failedResult);
      expect(output).toContain('2000');
      expect(output).toContain('1500');
    });
  });

  describe('formatBudgetJson', () => {
    it('returns object with passed status', () => {
      const output = formatBudgetJson(passedResult);
      expect(output.passed).toBe(true);
    });

    it('includes violation count', () => {
      const output = formatBudgetJson(failedResult);
      expect(output.violationCount).toBe(2);
    });

    it('includes violation details', () => {
      const output = formatBudgetJson(failedResult);
      expect(output.violations).toHaveLength(2);
      expect(output.violations[0].type).toBe('timing');
      expect(output.violations[0].budget).toBe(1500);
    });
  });

  describe('formatBudgetMarkdown', () => {
    it('shows header', () => {
      const output = formatBudgetMarkdown(passedResult);
      expect(output).toContain('### Performance Budget');
    });

    it('shows passed message when passed', () => {
      const output = formatBudgetMarkdown(passedResult);
      expect(output).toContain('All budgets passed');
    });

    it('shows markdown table when failed', () => {
      const output = formatBudgetMarkdown(failedResult);
      expect(output).toContain('| Metric | Budget | Actual | Over |');
      expect(output).toContain('First Contentful Paint');
    });

    it('includes violation count', () => {
      const output = formatBudgetMarkdown(failedResult);
      expect(output).toContain('2 budget violation');
    });
  });

  describe('formatBudgetGithub', () => {
    it('returns empty string when passed', () => {
      const output = formatBudgetGithub(passedResult);
      expect(output).toBe('');
    });

    it('returns error annotations when failed', () => {
      const output = formatBudgetGithub(failedResult);
      expect(output).toContain('::error');
      expect(output).toContain('Budget Exceeded');
    });

    it('includes metric name in annotation', () => {
      const output = formatBudgetGithub(failedResult);
      expect(output).toContain('First Contentful Paint');
    });
  });
});
