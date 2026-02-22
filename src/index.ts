#!/usr/bin/env node

import { Command } from 'commander';
import { compare } from './commands/compare.js';
import { gitCompare } from './commands/git.js';
import { loadConfig, mergeCliOptions } from './config/loader.js';
import type { OutputFormat } from './types.js';

const program = new Command();

program
  .name('lighthouse-diff')
  .description('Compare Lighthouse scores between URLs or git commits')
  .version('0.1.0');

// Compare command (also default)
program
  .command('compare <baseline> <current>')
  .description('Compare Lighthouse scores between two URLs')
  .option('-f, --format <format>', 'Output format: terminal, json, markdown, github', 'terminal')
  .option('-r, --runs <number>', 'Number of runs to average', '1')
  .option('-d, --device <device>', 'Device emulation: mobile, desktop', 'mobile')
  .option('-t, --threshold <number>', 'Minimum score threshold')
  .option('--max-regression <number>', 'Maximum allowed regression')
  .option('--ci', 'CI mode: exit 1 on failure')
  .option('-v, --verbose', 'Verbose output')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (baseline, current, options) => {
    try {
      const config = loadConfig(options.config);
      const merged = mergeCliOptions(config, {
        format: options.format as OutputFormat,
        runs: options.runs ? parseInt(options.runs, 10) : undefined,
        device: options.device,
        threshold: options.threshold ? parseInt(options.threshold, 10) : undefined,
      });

      const result = await compare(baseline, current, {
        runs: merged.runner?.runs,
        device: merged.runner?.device,
        maxRegression: options.maxRegression ? parseInt(options.maxRegression, 10) : undefined,
        minScore: merged.thresholds?.minScore?.performance,
        absoluteMin: merged.thresholds?.absoluteMin,
        format: merged.output,
        ci: options.ci,
        verbose: options.verbose,
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
  .command('git <base>')
  .description('Compare Lighthouse scores between git refs')
  .option('--head <ref>', 'Head ref (default: current state)')
  .option('-p, --path <path>', 'Path to serve', '.')
  .option('--port <number>', 'Port for local server')
  .option('-f, --format <format>', 'Output format: terminal, json, markdown, github', 'terminal')
  .option('-r, --runs <number>', 'Number of runs to average', '1')
  .option('-d, --device <device>', 'Device emulation: mobile, desktop', 'mobile')
  .option('-t, --threshold <number>', 'Minimum score threshold')
  .option('--max-regression <number>', 'Maximum allowed regression')
  .option('--ci', 'CI mode: exit 1 on failure')
  .option('-v, --verbose', 'Verbose output')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (base, options) => {
    try {
      const config = loadConfig(options.config);
      const merged = mergeCliOptions(config, {
        format: options.format as OutputFormat,
        runs: options.runs ? parseInt(options.runs, 10) : undefined,
        device: options.device,
        threshold: options.threshold ? parseInt(options.threshold, 10) : undefined,
      });

      const result = await gitCompare({
        base,
        head: options.head,
        servePath: options.path,
        port: options.port ? parseInt(options.port, 10) : undefined,
        runs: merged.runner?.runs,
        device: merged.runner?.device,
        maxRegression: options.maxRegression ? parseInt(options.maxRegression, 10) : undefined,
        minScore: merged.thresholds?.minScore?.performance,
        absoluteMin: merged.thresholds?.absoluteMin,
        format: merged.output,
        ci: options.ci,
        verbose: options.verbose,
      });

      console.log(result.output);
      process.exit(result.exitCode);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
