import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import type { Config, ThresholdConfig, MaxRegressionConfig } from '../types.js';

/**
 * Config file names to search for (in order)
 */
export const CONFIG_FILES = [
  'lighthouse-diff.json',
  '.lighthouse-diffrc',
  '.lighthouse-diffrc.json',
];

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: Config = {
  thresholds: {},
  maxRegression: {},
  lighthouseConfig: {
    formFactor: 'desktop',
    throttling: false,
  },
};

/**
 * Find config file in directory hierarchy
 */
export function findConfigFile(cwd: string = process.cwd()): string | null {
  let dir = cwd;
  
  while (dir) {
    for (const filename of CONFIG_FILES) {
      const filepath = join(dir, filename);
      if (existsSync(filepath)) {
        return filepath;
      }
    }
    
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  
  return null;
}

/**
 * Load and parse config file
 */
export function loadConfigFile(path: string): Partial<Config> {
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load config from ${path}: ${message}`);
  }
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];
    
    if (sourceValue !== undefined) {
      if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as object, 
          sourceValue as object
        );
      } else {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }
  
  return result;
}

/**
 * Merge raw config with defaults
 */
export function mergeConfig(defaults: Config, raw: Partial<Config>): Config {
  return deepMerge(defaults, raw);
}

/**
 * Load config from file or use defaults
 */
export function loadConfig(path?: string, cwd?: string): Config {
  // If explicit path provided, it must exist
  if (path) {
    if (!existsSync(path)) {
      throw new Error(`Config file not found: ${path}`);
    }
    const raw = loadConfigFile(path);
    return mergeConfig(DEFAULT_CONFIG, raw);
  }
  
  // Try to find config file
  const found = findConfigFile(cwd);
  if (found) {
    const raw = loadConfigFile(found);
    return mergeConfig(DEFAULT_CONFIG, raw);
  }
  
  // Use defaults
  return { ...DEFAULT_CONFIG };
}

/**
 * Apply CLI threshold options to config
 */
export function mergeCliThresholds(
  config: Config,
  options: {
    thresholdPerformance?: number;
    thresholdAccessibility?: number;
    thresholdBestPractices?: number;
    thresholdSeo?: number;
  }
): ThresholdConfig {
  return {
    ...config.thresholds,
    ...(options.thresholdPerformance !== undefined && { performance: options.thresholdPerformance }),
    ...(options.thresholdAccessibility !== undefined && { accessibility: options.thresholdAccessibility }),
    ...(options.thresholdBestPractices !== undefined && { 'best-practices': options.thresholdBestPractices }),
    ...(options.thresholdSeo !== undefined && { seo: options.thresholdSeo }),
  };
}

/**
 * Apply CLI max regression options to config
 */
export function mergeCliMaxRegression(
  config: Config,
  options: {
    maxRegressionPerformance?: number;
    maxRegressionAccessibility?: number;
    maxRegressionBestPractices?: number;
    maxRegressionSeo?: number;
  }
): MaxRegressionConfig {
  return {
    ...config.maxRegression,
    ...(options.maxRegressionPerformance !== undefined && { performance: options.maxRegressionPerformance }),
    ...(options.maxRegressionAccessibility !== undefined && { accessibility: options.maxRegressionAccessibility }),
    ...(options.maxRegressionBestPractices !== undefined && { 'best-practices': options.maxRegressionBestPractices }),
    ...(options.maxRegressionSeo !== undefined && { seo: options.maxRegressionSeo }),
  };
}
