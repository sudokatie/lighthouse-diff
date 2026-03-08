import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Budget } from '../types.js';

const BUDGET_FILES = [
  'budget.json',
  '.lighthouse-budget.json',
  'lighthouse-budget.json',
];

/**
 * Find budget file in current directory
 */
export function findBudgetFile(cwd: string = process.cwd()): string | null {
  for (const file of BUDGET_FILES) {
    const path = join(cwd, file);
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

/**
 * Load and parse budget file
 */
export async function loadBudgetFile(path: string): Promise<Budget[]> {
  const resolved = resolve(path);
  
  if (!existsSync(resolved)) {
    throw new Error(`Budget file not found: ${path}`);
  }

  const content = await readFile(resolved, 'utf-8');
  
  try {
    const data = JSON.parse(content);
    
    // Budget file can be array or single object
    const budgets: Budget[] = Array.isArray(data) ? data : [data];
    
    // Validate structure
    for (const budget of budgets) {
      validateBudget(budget);
    }
    
    return budgets;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in budget file: ${path}`);
    }
    throw error;
  }
}

/**
 * Load budget from file or auto-discover
 */
export async function loadBudget(
  path?: string,
  cwd?: string
): Promise<Budget[] | null> {
  if (path) {
    return loadBudgetFile(path);
  }
  
  const discovered = findBudgetFile(cwd);
  if (discovered) {
    return loadBudgetFile(discovered);
  }
  
  return null;
}

/**
 * Validate budget structure
 */
function validateBudget(budget: unknown): asserts budget is Budget {
  if (typeof budget !== 'object' || budget === null) {
    throw new Error('Budget must be an object');
  }
  
  const b = budget as Record<string, unknown>;
  
  if (b.path !== undefined && typeof b.path !== 'string') {
    throw new Error('Budget path must be a string');
  }
  
  if (b.timings !== undefined) {
    if (!Array.isArray(b.timings)) {
      throw new Error('Budget timings must be an array');
    }
    for (const timing of b.timings) {
      validateTiming(timing);
    }
  }
  
  if (b.resourceSizes !== undefined) {
    if (!Array.isArray(b.resourceSizes)) {
      throw new Error('Budget resourceSizes must be an array');
    }
    for (const size of b.resourceSizes) {
      validateResourceSize(size);
    }
  }
  
  if (b.resourceCounts !== undefined) {
    if (!Array.isArray(b.resourceCounts)) {
      throw new Error('Budget resourceCounts must be an array');
    }
    for (const count of b.resourceCounts) {
      validateResourceCount(count);
    }
  }
}

function validateTiming(timing: unknown): void {
  if (typeof timing !== 'object' || timing === null) {
    throw new Error('Timing budget must be an object');
  }
  const t = timing as Record<string, unknown>;
  if (typeof t.metric !== 'string') {
    throw new Error('Timing metric must be a string');
  }
  if (typeof t.budget !== 'number') {
    throw new Error('Timing budget must be a number');
  }
}

function validateResourceSize(size: unknown): void {
  if (typeof size !== 'object' || size === null) {
    throw new Error('Resource size budget must be an object');
  }
  const s = size as Record<string, unknown>;
  if (typeof s.resourceType !== 'string') {
    throw new Error('Resource type must be a string');
  }
  if (typeof s.budget !== 'number') {
    throw new Error('Resource size budget must be a number');
  }
}

function validateResourceCount(count: unknown): void {
  if (typeof count !== 'object' || count === null) {
    throw new Error('Resource count budget must be an object');
  }
  const c = count as Record<string, unknown>;
  if (typeof c.resourceType !== 'string') {
    throw new Error('Resource type must be a string');
  }
  if (typeof c.budget !== 'number') {
    throw new Error('Resource count budget must be a number');
  }
}
