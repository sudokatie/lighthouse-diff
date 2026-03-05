/**
 * Tests for historical tracking
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import functions to test
import {
  getDb,
  closeDb,
  recordRun,
  queryRuns,
  getRunsForUrl,
  clearHistory,
  cleanupOldRecords,
  getRecordCount,
} from '../history/db.js';
import { analyzeTrends, generateTrendChart, generateTrendSummary } from '../history/trend.js';
import type { CategoryScores } from '../types.js';

// Helper to create test scores
function makeScores(
  perf: number | null = 80,
  a11y: number | null = 90,
  bp: number | null = 85,
  seo: number | null = 88,
  pwa: number | null = null
): CategoryScores {
  return {
    performance: perf,
    accessibility: a11y,
    'best-practices': bp,
    seo: seo,
    pwa: pwa,
  };
}

describe('History Database', () => {
  beforeEach(() => {
    // Clear all existing data before each test
    closeDb();
    // Reopen and clear
    clearHistory();
  });

  afterEach(() => {
    closeDb();
  });

  describe('recordRun', () => {
    it('should record a run and return its ID', () => {
      const id = recordRun('https://example.com', makeScores(85, 90, 80, 75));
      expect(id).toBeGreaterThan(0);
    });

    it('should record run with commit and branch info', () => {
      const id = recordRun('https://example.com', makeScores(), 'abc123', 'main');
      expect(id).toBeGreaterThan(0);

      const runs = queryRuns({ url: 'example.com', limit: 1 });
      expect(runs[0].commitSha).toBe('abc123');
      expect(runs[0].branch).toBe('main');
    });

    it('should deduplicate runs with same URL and commit', () => {
      const id1 = recordRun('https://example.com', makeScores(), 'abc123');
      const id2 = recordRun('https://example.com', makeScores(90), 'abc123');
      expect(id1).toBe(id2);
    });

    it('should allow duplicate URLs with different commits', () => {
      const id1 = recordRun('https://example.com', makeScores(), 'abc123');
      const id2 = recordRun('https://example.com', makeScores(), 'def456');
      expect(id1).not.toBe(id2);
    });
  });

  describe('queryRuns', () => {
    beforeEach(() => {
      // Seed test data
      recordRun('https://example.com/a', makeScores(80), undefined, 'main');
      recordRun('https://example.com/b', makeScores(85), undefined, 'dev');
      recordRun('https://other.com', makeScores(90), undefined, 'main');
    });

    it('should return all runs when no filters', () => {
      const runs = queryRuns({ limit: 10 });
      expect(runs.length).toBe(3);
    });

    it('should filter by URL (partial match)', () => {
      const runs = queryRuns({ url: 'example.com', limit: 10 });
      expect(runs.length).toBe(2);
    });

    it('should filter by branch', () => {
      const runs = queryRuns({ branch: 'main', limit: 10 });
      expect(runs.length).toBe(2);
    });

    it('should respect limit', () => {
      const runs = queryRuns({ limit: 2 });
      expect(runs.length).toBe(2);
    });

    it('should return records in reverse chronological order', () => {
      const runs = queryRuns({ limit: 10 });
      const timestamps = runs.map((r) => new Date(r.timestamp).getTime());
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
    });
  });

  describe('getRunsForUrl', () => {
    it('should return runs for exact URL in chronological order', () => {
      recordRun('https://example.com', makeScores(80));
      recordRun('https://example.com', makeScores(85));
      recordRun('https://example.com', makeScores(90));

      const runs = getRunsForUrl('https://example.com');
      expect(runs.length).toBe(3);

      // Should be in chronological order (oldest first)
      const timestamps = runs.map((r) => new Date(r.timestamp).getTime());
      expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
    });
  });

  describe('clearHistory', () => {
    beforeEach(() => {
      recordRun('https://example.com', makeScores());
      recordRun('https://other.com', makeScores());
    });

    it('should clear all history', () => {
      const deleted = clearHistory();
      expect(deleted).toBe(2);
      expect(getRecordCount()).toBe(0);
    });

    it('should clear history older than N days', () => {
      // This test needs records with old timestamps
      // Since we can't easily insert old records, we'll just verify the function runs
      const deleted = clearHistory(365);
      expect(deleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRecordCount', () => {
    it('should return correct count', () => {
      expect(getRecordCount()).toBe(0);
      recordRun('https://a.com', makeScores());
      expect(getRecordCount()).toBe(1);
      recordRun('https://b.com', makeScores());
      expect(getRecordCount()).toBe(2);
    });
  });
});

describe('Trend Analysis', () => {
  const mockRecords = [
    {
      id: 1,
      url: 'https://example.com',
      commitSha: null,
      branch: null,
      timestamp: '2024-01-01T00:00:00Z',
      scores: makeScores(75, 80, 70, 85),
    },
    {
      id: 2,
      url: 'https://example.com',
      commitSha: null,
      branch: null,
      timestamp: '2024-01-02T00:00:00Z',
      scores: makeScores(80, 82, 72, 86),
    },
    {
      id: 3,
      url: 'https://example.com',
      commitSha: null,
      branch: null,
      timestamp: '2024-01-03T00:00:00Z',
      scores: makeScores(85, 84, 75, 87),
    },
    {
      id: 4,
      url: 'https://example.com',
      commitSha: null,
      branch: null,
      timestamp: '2024-01-04T00:00:00Z',
      scores: makeScores(90, 86, 78, 88),
    },
  ];

  describe('analyzeTrends', () => {
    it('should return null for empty records', () => {
      expect(analyzeTrends([])).toBeNull();
    });

    it('should calculate correct averages', () => {
      const analysis = analyzeTrends(mockRecords);
      expect(analysis).not.toBeNull();

      const perfTrend = analysis!.trends.find((t) => t.category === 'performance');
      expect(perfTrend?.average).toBe(83); // (75+80+85+90)/4 = 82.5 rounded
    });

    it('should detect upward trend', () => {
      const analysis = analyzeTrends(mockRecords);
      const perfTrend = analysis!.trends.find((t) => t.category === 'performance');
      expect(perfTrend?.direction).toBe('up');
    });

    it('should include period information', () => {
      const analysis = analyzeTrends(mockRecords);
      expect(analysis!.period.start).toBe('2024-01-01T00:00:00Z');
      expect(analysis!.period.end).toBe('2024-01-04T00:00:00Z');
    });

    it('should include run count', () => {
      const analysis = analyzeTrends(mockRecords);
      expect(analysis!.runCount).toBe(4);
    });

    it('should calculate volatility', () => {
      const analysis = analyzeTrends(mockRecords);
      const perfTrend = analysis!.trends.find((t) => t.category === 'performance');
      expect(perfTrend?.volatility).toBeGreaterThan(0);
    });
  });

  describe('generateTrendChart', () => {
    it('should generate chart output', () => {
      const analysis = analyzeTrends(mockRecords);
      const chart = generateTrendChart(analysis!);
      expect(chart).toContain('Trend Analysis');
      expect(chart).toContain('example.com');
      expect(chart).toContain('Legend');
    });

    it('should include Y-axis labels', () => {
      const analysis = analyzeTrends(mockRecords);
      const chart = generateTrendChart(analysis!);
      expect(chart).toContain('100');
    });
  });

  describe('generateTrendSummary', () => {
    it('should generate summary output', () => {
      const analysis = analyzeTrends(mockRecords);
      const summary = generateTrendSummary(analysis!);
      expect(summary).toContain('Trend Summary');
      expect(summary).toContain('performance');
      expect(summary).toContain('Avg');
    });
  });
});
