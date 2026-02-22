import lighthouse from 'lighthouse';
import puppeteer, { Browser } from 'puppeteer';
import type { LighthouseScores, RunnerOptions } from '../types.js';
import { parseResult, averageResults, type LighthouseResult } from './parser.js';

let browser: Browser | null = null;

/**
 * Get or create shared browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (browser && browser.connected) {
    return browser;
  }

  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  return browser;
}

/**
 * Close the shared browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Get Lighthouse config based on options
 */
function getLighthouseConfig(options: RunnerOptions): object {
  const formFactor = options.device === 'desktop' ? 'desktop' : 'mobile';
  
  return {
    extends: 'lighthouse:default',
    settings: {
      formFactor,
      screenEmulation: formFactor === 'desktop' 
        ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1 }
        : { mobile: true, width: 375, height: 667, deviceScaleFactor: 2 },
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
      },
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    },
  };
}

/**
 * Run a single Lighthouse audit
 */
async function runSingleAudit(url: string, options: RunnerOptions): Promise<LighthouseScores> {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    // Get the WebSocket endpoint for Lighthouse
    const wsEndpoint = browserInstance.wsEndpoint();
    const port = parseInt(new URL(wsEndpoint).port, 10);

    const config = getLighthouseConfig(options);

    const result = await lighthouse(url, {
      port,
      output: 'json',
      logLevel: 'error',
    }, config);

    if (!result || !result.lhr) {
      throw new Error(`Lighthouse audit failed for ${url}: No result returned`);
    }

    return parseResult(result.lhr as unknown as LighthouseResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Lighthouse audit failed for ${url}: ${message}`);
  } finally {
    await page.close();
  }
}

/**
 * Run Lighthouse audit with optional averaging
 */
export async function runAudit(url: string, options: RunnerOptions = {}): Promise<LighthouseScores> {
  const runs = options.runs ?? 1;

  if (runs < 1) {
    throw new Error('runs must be at least 1');
  }

  if (runs === 1) {
    return runSingleAudit(url, options);
  }

  // Run multiple times and average
  const results: LighthouseScores[] = [];
  for (let i = 0; i < runs; i++) {
    const result = await runSingleAudit(url, options);
    results.push(result);
  }

  return averageResults(results);
}

/**
 * Run audits for baseline and current URLs
 */
export async function compareUrls(
  baselineUrl: string,
  currentUrl: string,
  options: RunnerOptions = {}
): Promise<{ baseline: LighthouseScores; current: LighthouseScores }> {
  try {
    const baseline = await runAudit(baselineUrl, options);
    const current = await runAudit(currentUrl, options);
    return { baseline, current };
  } finally {
    // Don't close browser here - let caller manage lifecycle
  }
}
