/**
 * Types for historical tracking
 */

import type { CategoryScores } from '../types.js';

// A historical run record
export interface HistoryRecord {
  id: number;
  url: string;
  commitSha: string | null;
  branch: string | null;
  timestamp: string; // ISO 8601
  scores: CategoryScores;
}

// Options for querying history
export interface HistoryQueryOptions {
  url?: string; // Partial match filter
  limit?: number;
  since?: string; // ISO date or relative (e.g., "7d")
  branch?: string;
}

// Options for the history command
export interface HistoryCommandOptions {
  limit?: number;
  since?: string;
  branch?: string;
  format?: 'terminal' | 'json';
  trend?: boolean;
  clear?: boolean;
  olderThan?: number; // days
}

// Trend data for a single category
export interface CategoryTrend {
  category: string;
  values: Array<{ timestamp: string; score: number | null }>;
  average: number | null;
  direction: 'up' | 'down' | 'stable';
  volatility: number; // standard deviation
}

// Full trend analysis
export interface TrendAnalysis {
  url: string;
  period: { start: string; end: string };
  runCount: number;
  trends: CategoryTrend[];
}
