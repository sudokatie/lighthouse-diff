#!/usr/bin/env node

import { Command } from 'commander';
import { compare } from './commands/compare.js';
import { gitCompare } from './commands/git.js';
import { loadConfig, mergeCliThresholds, mergeCliMaxRegression } from './config/loader.js';
import type { OutputFormat } from './types.js';

const program = new Command();

program
  .name('lighthouse-diff')
  .description('Compare Lighthouse scores between URLs or git commits')
  .version('0.1.0');

// Compare command
program
  .command('compare <baseline-url> <current-url>')
  .description('Compare Lighthouse scores between two URLs')
  .option('-c, --config <path>', 'Path to config file')
  .option('-f, --format <format>', 'Output format: terminal, json, markdown, github', 'terminal')
  .option('--ci', 'CI mode: exit 1 on threshold failure')
  .option('--threshold-performance <n>', 'Minimum performance score', parseInt)
  .option('--threshold-accessibility <n>', 'Minimum accessibility score', parseInt)
  .option('--threshold-best-practices <n>', 'Minimum best practices score', parseInt)
  .option('--threshold-seo <n>', 'Minimum SEO score', parseInt)
  .action(async (baselineUrl, currentUrl, options) => {
    try {
      const config = loadConfig(options.config);
      
      const thresholds = mergeCliThresholds(config, {
        thresholdPerformance: options.thresholdPerformance,
        thresholdAccessibility: options.thresholdAccessibility,
        thresholdBestPractices: options.thresholdBestPractices,
        thresholdSeo: options.thresholdSeo,
      });

      const result = await compare(baselineUrl, currentUrl, {
        thresholds,
        maxRegression: config.maxRegression,
        format: options.format as OutputFormat,
        ci: options.ci,
      });

      console.log(result.output);
      process.exit(result.exitCode);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Git command
program
  .command('git <base-ref>')
  .description('Compare Lighthouse scores between git refs')
  .option('--head <ref>', 'Head ref (default: current branch)')
  .option('-s, --serve <cmd>', 'Command to start dev server', 'npm run dev')
  .option('-p, --port <port>', 'Port the server listens on', parseInt, 3000)
  .option('--path <path>', 'URL path to audit', '/')
  .option('-c, --config <path>', 'Path to config file')
  .option('-f, --format <format>', 'Output format: terminal, json, markdown, github', 'terminal')
  .option('--ci', 'CI mode: exit 1 on threshold failure')
  .option('--threshold-performance <n>', 'Minimum performance score', parseInt)
  .option('--threshold-accessibility <n>', 'Minimum accessibility score', parseInt)
  .option('--threshold-best-practices <n>', 'Minimum best practices score', parseInt)
  .option('--threshold-seo <n>', 'Minimum SEO score', parseInt)
  .action(async (baseRef, options) => {
    try {
      const config = loadConfig(options.config);
      
      const thresholds = mergeCliThresholds(config, {
        thresholdPerformance: options.thresholdPerformance,
        thresholdAccessibility: options.thresholdAccessibility,
        thresholdBestPractices: options.thresholdBestPractices,
        thresholdSeo: options.thresholdSeo,
      });

      const result = await gitCompare({
        base: baseRef,
        head: options.head,
        serve: options.serve,
        port: options.port,
        path: options.path,
        thresholds,
        maxRegression: config.maxRegression,
        format: options.format as OutputFormat,
        ci: options.ci,
      });

      console.log(result.output);
      process.exit(result.exitCode);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
