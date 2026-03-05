/**
 * SQLite database for historical tracking
 */

import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { CategoryScores } from '../types.js';
import type { HistoryRecord, HistoryQueryOptions } from './types.js';

const DB_DIR = join(homedir(), '.lighthouse-diff');
const DB_PATH = join(DB_DIR, 'history.db');

let db: Database.Database | null = null;

/**
 * Get or create the database connection
 */
export function getDb(): Database.Database {
  if (db) return db;

  // Ensure directory exists
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  initSchema(db);
  return db;
}

/**
 * Close the database connection
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Initialize database schema
 */
function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY,
      url TEXT NOT NULL,
      commit_sha TEXT,
      branch TEXT,
      timestamp TEXT NOT NULL,
      performance INTEGER,
      accessibility INTEGER,
      best_practices INTEGER,
      seo INTEGER,
      pwa INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_runs_url ON runs(url);
    CREATE INDEX IF NOT EXISTS idx_runs_timestamp ON runs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_runs_commit ON runs(commit_sha);
  `);
}

/**
 * Record a Lighthouse run
 */
export function recordRun(
  url: string,
  scores: CategoryScores,
  commitSha?: string,
  branch?: string
): number {
  const database = getDb();

  // Check for duplicate (same URL + commit)
  if (commitSha) {
    const existing = database
      .prepare('SELECT id FROM runs WHERE url = ? AND commit_sha = ?')
      .get(url, commitSha) as { id: number } | undefined;
    if (existing) return existing.id;
  }

  const stmt = database.prepare(`
    INSERT INTO runs (url, commit_sha, branch, timestamp, performance, accessibility, best_practices, seo, pwa)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    url,
    commitSha ?? null,
    branch ?? null,
    new Date().toISOString(),
    scores.performance,
    scores.accessibility,
    scores['best-practices'],
    scores.seo,
    scores.pwa
  );

  return result.lastInsertRowid as number;
}

/**
 * Query historical runs
 */
export function queryRuns(options: HistoryQueryOptions = {}): HistoryRecord[] {
  const database = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.url) {
    conditions.push('url LIKE ?');
    params.push(`%${options.url}%`);
  }

  if (options.branch) {
    conditions.push('branch = ?');
    params.push(options.branch);
  }

  if (options.since) {
    const sinceDate = parseSinceDate(options.since);
    conditions.push('timestamp >= ?');
    params.push(sinceDate.toISOString());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit ?? 20;

  const query = `
    SELECT id, url, commit_sha, branch, timestamp, 
           performance, accessibility, best_practices, seo, pwa
    FROM runs
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ?
  `;

  params.push(limit);

  const rows = database.prepare(query).all(...params) as Array<{
    id: number;
    url: string;
    commit_sha: string | null;
    branch: string | null;
    timestamp: string;
    performance: number | null;
    accessibility: number | null;
    best_practices: number | null;
    seo: number | null;
    pwa: number | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    url: row.url,
    commitSha: row.commit_sha,
    branch: row.branch,
    timestamp: row.timestamp,
    scores: {
      performance: row.performance,
      accessibility: row.accessibility,
      'best-practices': row.best_practices,
      seo: row.seo,
      pwa: row.pwa,
    },
  }));
}

/**
 * Get runs for a specific URL (for trend analysis)
 */
export function getRunsForUrl(url: string, limit = 50): HistoryRecord[] {
  const database = getDb();

  const rows = database
    .prepare(
      `
    SELECT id, url, commit_sha, branch, timestamp,
           performance, accessibility, best_practices, seo, pwa
    FROM runs
    WHERE url = ?
    ORDER BY timestamp ASC
    LIMIT ?
  `
    )
    .all(url, limit) as Array<{
    id: number;
    url: string;
    commit_sha: string | null;
    branch: string | null;
    timestamp: string;
    performance: number | null;
    accessibility: number | null;
    best_practices: number | null;
    seo: number | null;
    pwa: number | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    url: row.url,
    commitSha: row.commit_sha,
    branch: row.branch,
    timestamp: row.timestamp,
    scores: {
      performance: row.performance,
      accessibility: row.accessibility,
      'best-practices': row.best_practices,
      seo: row.seo,
      pwa: row.pwa,
    },
  }));
}

/**
 * Clear history records
 */
export function clearHistory(olderThanDays?: number): number {
  const database = getDb();

  if (olderThanDays !== undefined) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const result = database
      .prepare('DELETE FROM runs WHERE timestamp < ?')
      .run(cutoff.toISOString());
    return result.changes;
  }

  const result = database.prepare('DELETE FROM runs').run();
  return result.changes;
}

/**
 * Clean up old records (retention policy)
 */
export function cleanupOldRecords(retentionDays = 90): number {
  return clearHistory(retentionDays);
}

/**
 * Get total count of records
 */
export function getRecordCount(): number {
  const database = getDb();
  const result = database.prepare('SELECT COUNT(*) as count FROM runs').get() as { count: number };
  return result.count;
}

/**
 * Parse relative or absolute date string
 */
function parseSinceDate(since: string): Date {
  // Try relative format (e.g., "7d", "2w", "1m")
  const relativeMatch = since.match(/^(\d+)([dwm])$/);
  if (relativeMatch) {
    const [, num, unit] = relativeMatch;
    const date = new Date();
    const amount = parseInt(num, 10);

    switch (unit) {
      case 'd':
        date.setDate(date.getDate() - amount);
        break;
      case 'w':
        date.setDate(date.getDate() - amount * 7);
        break;
      case 'm':
        date.setMonth(date.getMonth() - amount);
        break;
    }

    return date;
  }

  // Try ISO date
  const parsed = new Date(since);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  throw new Error(`Invalid date format: ${since}. Use ISO 8601 or relative (e.g., "7d", "2w", "1m")`);
}
