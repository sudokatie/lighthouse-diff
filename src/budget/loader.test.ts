import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { findBudgetFile, loadBudgetFile, loadBudget } from './loader.js';

const TEST_DIR = join(process.cwd(), '__test_budget_loader__');

describe('budget loader', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('findBudgetFile', () => {
    it('returns null if no budget file exists', () => {
      const result = findBudgetFile(TEST_DIR);
      expect(result).toBeNull();
    });

    it('finds budget.json', () => {
      writeFileSync(join(TEST_DIR, 'budget.json'), '[]');
      const result = findBudgetFile(TEST_DIR);
      expect(result).toBe(join(TEST_DIR, 'budget.json'));
    });

    it('finds .lighthouse-budget.json', () => {
      writeFileSync(join(TEST_DIR, '.lighthouse-budget.json'), '[]');
      const result = findBudgetFile(TEST_DIR);
      expect(result).toBe(join(TEST_DIR, '.lighthouse-budget.json'));
    });

    it('prefers budget.json over others', () => {
      writeFileSync(join(TEST_DIR, 'budget.json'), '[]');
      writeFileSync(join(TEST_DIR, '.lighthouse-budget.json'), '[]');
      const result = findBudgetFile(TEST_DIR);
      expect(result).toBe(join(TEST_DIR, 'budget.json'));
    });
  });

  describe('loadBudgetFile', () => {
    it('loads valid budget array', async () => {
      const budget = [{ timings: [{ metric: 'first-contentful-paint', budget: 1500 }] }];
      writeFileSync(join(TEST_DIR, 'budget.json'), JSON.stringify(budget));
      
      const result = await loadBudgetFile(join(TEST_DIR, 'budget.json'));
      expect(result).toEqual(budget);
    });

    it('wraps single object in array', async () => {
      const budget = { timings: [{ metric: 'largest-contentful-paint', budget: 2500 }] };
      writeFileSync(join(TEST_DIR, 'budget.json'), JSON.stringify(budget));
      
      const result = await loadBudgetFile(join(TEST_DIR, 'budget.json'));
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(budget);
    });

    it('throws on missing file', async () => {
      await expect(loadBudgetFile(join(TEST_DIR, 'missing.json')))
        .rejects.toThrow('Budget file not found');
    });

    it('throws on invalid JSON', async () => {
      writeFileSync(join(TEST_DIR, 'budget.json'), 'not json');
      
      await expect(loadBudgetFile(join(TEST_DIR, 'budget.json')))
        .rejects.toThrow('Invalid JSON');
    });

    it('validates timing structure', async () => {
      const budget = [{ timings: [{ metric: 123 }] }];
      writeFileSync(join(TEST_DIR, 'budget.json'), JSON.stringify(budget));
      
      await expect(loadBudgetFile(join(TEST_DIR, 'budget.json')))
        .rejects.toThrow('Timing metric must be a string');
    });

    it('validates resourceSizes structure', async () => {
      const budget = [{ resourceSizes: [{ resourceType: 'script' }] }];
      writeFileSync(join(TEST_DIR, 'budget.json'), JSON.stringify(budget));
      
      await expect(loadBudgetFile(join(TEST_DIR, 'budget.json')))
        .rejects.toThrow('Resource size budget must be a number');
    });
  });

  describe('loadBudget', () => {
    it('loads from explicit path', async () => {
      const budget = [{ path: '/*' }];
      writeFileSync(join(TEST_DIR, 'custom.json'), JSON.stringify(budget));
      
      const result = await loadBudget(join(TEST_DIR, 'custom.json'));
      expect(result).toEqual(budget);
    });

    it('auto-discovers budget file', async () => {
      const budget = [{ timings: [] }];
      writeFileSync(join(TEST_DIR, 'budget.json'), JSON.stringify(budget));
      
      const result = await loadBudget(undefined, TEST_DIR);
      expect(result).toEqual(budget);
    });

    it('returns null if no budget found', async () => {
      const result = await loadBudget(undefined, TEST_DIR);
      expect(result).toBeNull();
    });
  });
});
