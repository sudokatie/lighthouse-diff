import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { 
  loadConfig, 
  loadConfigFile,
  findConfigFile,
  mergeConfig,
  mergeCliOptions,
  DEFAULT_CONFIG,
} from './loader.js';

describe('config loader', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `lighthouse-diff-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('loadConfig', () => {
    it('returns defaults when no config file', () => {
      const config = loadConfig(undefined, testDir);
      
      expect(config.output).toBe('terminal');
      expect(config.runner?.runs).toBe(1);
      expect(config.thresholds?.absoluteMin).toBe(50);
    });

    it('loads valid config file', () => {
      const configPath = join(testDir, 'lighthouse-diff.json');
      writeFileSync(configPath, JSON.stringify({
        output: 'json',
        runner: { runs: 3 },
      }));
      
      const config = loadConfig(configPath);
      
      expect(config.output).toBe('json');
      expect(config.runner?.runs).toBe(3);
    });

    it('throws on invalid JSON', () => {
      const configPath = join(testDir, 'lighthouse-diff.json');
      writeFileSync(configPath, 'not valid json');
      
      expect(() => loadConfig(configPath)).toThrow(configPath);
    });

    it('throws when explicit path not found', () => {
      const configPath = join(testDir, 'nonexistent.json');
      
      expect(() => loadConfig(configPath)).toThrow('Config file not found');
    });

    it('fills partial config with defaults', () => {
      const configPath = join(testDir, 'lighthouse-diff.json');
      writeFileSync(configPath, JSON.stringify({
        output: 'markdown',
      }));
      
      const config = loadConfig(configPath);
      
      expect(config.output).toBe('markdown');
      // Defaults still present
      expect(config.runner?.runs).toBe(1);
      expect(config.thresholds?.absoluteMin).toBe(50);
    });
  });

  describe('findConfigFile', () => {
    it('finds config in current directory', () => {
      const configPath = join(testDir, 'lighthouse-diff.json');
      writeFileSync(configPath, '{}');
      
      const found = findConfigFile(testDir);
      
      expect(found).toBe(configPath);
    });

    it('returns null when no config found', () => {
      const found = findConfigFile(testDir);
      
      expect(found).toBeNull();
    });
  });

  describe('mergeCliOptions', () => {
    it('overrides format from CLI', () => {
      const config = mergeCliOptions(DEFAULT_CONFIG, { format: 'json' });
      
      expect(config.output).toBe('json');
    });

    it('overrides runs from CLI', () => {
      const config = mergeCliOptions(DEFAULT_CONFIG, { runs: 5 });
      
      expect(config.runner?.runs).toBe(5);
    });

    it('overrides device from CLI', () => {
      const config = mergeCliOptions(DEFAULT_CONFIG, { device: 'desktop' });
      
      expect(config.runner?.device).toBe('desktop');
    });

    it('overrides threshold from CLI', () => {
      const config = mergeCliOptions(DEFAULT_CONFIG, { threshold: 70 });
      
      expect(config.thresholds?.absoluteMin).toBe(70);
    });
  });
});
