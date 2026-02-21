/**
 * Lighthouse category scores (0-100)
 */
export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa?: number;
}

/**
 * Delta between two score sets
 */
export interface ScoreDelta {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa?: number;
}

/**
 * Threshold configuration for validation
 */
export interface Thresholds {
  /** Maximum allowed regression per category (negative = regression) */
  maxRegression?: number;
  /** Minimum required score per category */
  minScore?: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
    pwa?: number;
  };
  /** Fail if any category drops below this */
  absoluteMin?: number;
}

/**
 * Result of threshold validation
 */
export interface ValidationResult {
  passed: boolean;
  failures: ValidationFailure[];
}

export interface ValidationFailure {
  category: keyof LighthouseScores;
  type: 'regression' | 'minScore' | 'absoluteMin';
  message: string;
  actual: number;
  threshold: number;
}

/**
 * Comparison result between two URLs/commits
 */
export interface ComparisonResult {
  baseline: {
    url: string;
    scores: LighthouseScores;
    timestamp: Date;
  };
  current: {
    url: string;
    scores: LighthouseScores;
    timestamp: Date;
  };
  delta: ScoreDelta;
  validation: ValidationResult;
}

/**
 * Lighthouse runner options
 */
export interface RunnerOptions {
  /** Number of runs to average */
  runs?: number;
  /** Categories to audit */
  categories?: (keyof LighthouseScores)[];
  /** Device emulation */
  device?: 'mobile' | 'desktop';
  /** Port for Chrome DevTools Protocol */
  port?: number;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Configuration file schema
 */
export interface Config {
  /** URLs to compare (baseline vs current) */
  urls?: {
    baseline?: string;
    current?: string;
  };
  /** Threshold configuration */
  thresholds?: Thresholds;
  /** Runner options */
  runner?: RunnerOptions;
  /** Output format */
  output?: 'terminal' | 'json' | 'markdown' | 'github';
}

/**
 * Git comparison options
 */
export interface GitOptions {
  /** Base ref (commit/branch/tag) */
  base: string;
  /** Head ref (defaults to current) */
  head?: string;
  /** Path to serve */
  servePath?: string;
  /** Port for local server */
  port?: number;
}

/**
 * Output format type
 */
export type OutputFormat = 'terminal' | 'json' | 'markdown' | 'github';

/**
 * CLI options
 */
export interface CLIOptions {
  baseline: string;
  current: string;
  format?: OutputFormat;
  runs?: number;
  device?: 'mobile' | 'desktop';
  threshold?: number;
  config?: string;
  verbose?: boolean;
}
