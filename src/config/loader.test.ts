import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import {
  CONFIG_FILES,
  DEFAULT_CONFIG,
  findConfigFile,
  loadConfigFile,
  loadConfig,
  mergeConfig,
  mergeCliThresholds,
  mergeCliMaxRegression,
} from './loader.js';

const testDir = join(process.cwd(), '.test-config');

beforeEach(() => {
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('findConfigFile', () => {
  it('finds lighthouse-diff.json', () => {
    writeFileSync(join(testDir, 'lighthouse-diff.json'), '{}');
    const found = findConfigFile(testDir);
    expect(found).toContain('lighthouse-diff.json');
  });

  it('returns null when no config', () => {
    const found = findConfigFile(testDir);
    expect(found).toBe(null);
  });
});

describe('loadConfigFile', () => {
  it('parses JSON config', () => {
    const configPath = join(testDir, 'config.json');
    writeFileSync(configPath, JSON.stringify({ thresholds: { performance: 80 } }));
    const config = loadConfigFile(configPath);
    expect(config.thresholds?.performance).toBe(80);
  });

  it('throws on invalid JSON', () => {
    const configPath = join(testDir, 'bad.json');
    writeFileSync(configPath, 'not json');
    expect(() => loadConfigFile(configPath)).toThrow();
  });
});

describe('loadConfig', () => {
  it('returns defaults when no config', () => {
    const config = loadConfig(undefined, testDir);
    expect(config.thresholds).toEqual({});
    expect(config.maxRegression).toEqual({});
  });

  it('loads explicit config path', () => {
    const configPath = join(testDir, 'my-config.json');
    writeFileSync(configPath, JSON.stringify({ thresholds: { performance: 90 } }));
    const config = loadConfig(configPath);
    expect(config.thresholds.performance).toBe(90);
  });

  it('throws when explicit path not found', () => {
    expect(() => loadConfig('/nonexistent/path.json')).toThrow();
  });
});

describe('mergeConfig', () => {
  it('merges with defaults', () => {
    const merged = mergeConfig(DEFAULT_CONFIG, { thresholds: { performance: 80 } });
    expect(merged.thresholds.performance).toBe(80);
    expect(merged.lighthouseConfig?.formFactor).toBe('desktop');
  });
});

describe('mergeCliThresholds', () => {
  it('overrides from CLI options', () => {
    const result = mergeCliThresholds(DEFAULT_CONFIG, {
      thresholdPerformance: 90,
      thresholdAccessibility: 85,
    });
    expect(result.performance).toBe(90);
    expect(result.accessibility).toBe(85);
  });

  it('preserves unset values', () => {
    const config = { ...DEFAULT_CONFIG, thresholds: { performance: 80 } };
    const result = mergeCliThresholds(config, { thresholdAccessibility: 90 });
    expect(result.performance).toBe(80);
    expect(result.accessibility).toBe(90);
  });
});

describe('mergeCliMaxRegression', () => {
  it('overrides from CLI options', () => {
    const result = mergeCliMaxRegression(DEFAULT_CONFIG, {
      maxRegressionPerformance: 5,
    });
    expect(result.performance).toBe(5);
  });
});
