/**
 * Core types for lighthouse-diff
 */

// The 5 Lighthouse score categories
export type ScoreCategory =
  | "performance"
  | "accessibility"
  | "best-practices"
  | "seo"
  | "pwa";

// Array for iteration
export const SCORE_CATEGORIES: ScoreCategory[] = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
  "pwa",
];

// Scores per category (null if category missing)
export interface CategoryScores {
  performance: number | null;
  accessibility: number | null;
  "best-practices": number | null;
  seo: number | null;
  pwa: number | null;
}

// Parsed Lighthouse audit result
export interface LighthouseResult {
  url: string;
  fetchTime: string;
  scores: CategoryScores;
}

// Direction of score change
export type Direction = "improved" | "regressed" | "unchanged";

// Single category comparison
export interface ScoreDelta {
  category: ScoreCategory;
  baseline: number | null;
  current: number | null;
  delta: number | null;
  direction: Direction;
}

// Full comparison result
export interface ScoreDeltas {
  baselineUrl: string;
  currentUrl: string;
  timestamp: string;
  deltas: ScoreDelta[];
}

// Minimum score thresholds (per-category)
export interface ThresholdConfig {
  performance?: number;
  accessibility?: number;
  "best-practices"?: number;
  seo?: number;
  pwa?: number;
}

// Maximum allowed regression (per-category)
export interface MaxRegressionConfig {
  performance?: number;
  accessibility?: number;
  "best-practices"?: number;
  seo?: number;
  pwa?: number;
}

// Single threshold violation
export interface ThresholdFailure {
  category: ScoreCategory;
  reason: "below-threshold" | "regression";
  expected: number;
  actual: number;
}

// Threshold validation result
export interface ThresholdResult {
  passed: boolean;
  failures: ThresholdFailure[];
}

// Full configuration
export interface Config {
  thresholds: ThresholdConfig;
  maxRegression: MaxRegressionConfig;
  lighthouseConfig?: {
    formFactor?: "mobile" | "desktop";
    throttling?: boolean;
  };
}

// Output format options
export type OutputFormat = "terminal" | "json" | "markdown" | "github";

// Runner options
export interface RunnerOptions {
  formFactor?: "mobile" | "desktop";
  throttling?: boolean;
  timeout?: number;
}

// Compare command options
export interface CompareOptions {
  config?: string;
  format?: OutputFormat;
  ci?: boolean;
  thresholdPerformance?: number;
  thresholdAccessibility?: number;
  thresholdBestPractices?: number;
  thresholdSeo?: number;
  maxRegressionPerformance?: number;
  maxRegressionAccessibility?: number;
  maxRegressionBestPractices?: number;
  maxRegressionSeo?: number;
}

// Git command options
export interface GitOptions {
  head?: string;
  serve?: string;
  port?: number;
  path?: string;
}

// Budget types (Lighthouse performance budgets)
export type BudgetTimingMetric =
  | "first-contentful-paint"
  | "largest-contentful-paint"
  | "interactive"
  | "speed-index"
  | "total-blocking-time"
  | "max-potential-fid"
  | "cumulative-layout-shift";

export type BudgetResourceType =
  | "document"
  | "script"
  | "stylesheet"
  | "image"
  | "media"
  | "font"
  | "other"
  | "third-party"
  | "total";

export interface BudgetTiming {
  metric: BudgetTimingMetric;
  budget: number; // milliseconds (or unitless for CLS)
}

export interface BudgetResourceSize {
  resourceType: BudgetResourceType;
  budget: number; // kilobytes
}

export interface BudgetResourceCount {
  resourceType: BudgetResourceType;
  budget: number; // count
}

export interface Budget {
  path?: string;
  timings?: BudgetTiming[];
  resourceSizes?: BudgetResourceSize[];
  resourceCounts?: BudgetResourceCount[];
}

// Budget violation result
export interface BudgetViolation {
  budgetType: "timing" | "resourceSize" | "resourceCount";
  label: string;
  budget: number;
  actual: number;
  overBy: number;
  overByPercent: number;
}

export interface BudgetResult {
  passed: boolean;
  violations: BudgetViolation[];
}
