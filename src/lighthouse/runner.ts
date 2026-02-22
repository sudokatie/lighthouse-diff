import lighthouse from 'lighthouse';
import puppeteer, { Browser } from 'puppeteer';
import type { CategoryScores, RunnerOptions } from '../types.js';
import { parseResult } from './parser.js';

let browser: Browser | null = null;

/**
 * Get or create browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  }
  return browser;
}

/**
 * Run a Lighthouse audit
 */
export async function runAudit(
  url: string,
  options: RunnerOptions = {}
): Promise<CategoryScores> {
  const browserInstance = await getBrowser();
  const port = new URL(browserInstance.wsEndpoint()).port;

  const timeout = options.timeout ?? 60000;

  const config = {
    extends: 'lighthouse:default',
    settings: {
      formFactor: options.formFactor ?? 'desktop',
      maxWaitForLoad: timeout,
      throttling: options.throttling === true ? undefined : {
        rttMs: 0,
        throughputKbps: 0,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0,
      },
      screenEmulation: {
        mobile: options.formFactor === 'mobile',
        width: options.formFactor === 'mobile' ? 375 : 1350,
        height: options.formFactor === 'mobile' ? 667 : 940,
        deviceScaleFactor: options.formFactor === 'mobile' ? 2 : 1,
        disabled: false,
      },
    },
  };

  try {
    const result = await lighthouse(url, {
      port: parseInt(port, 10),
      output: 'json',
      logLevel: 'error',
    }, config);

    if (!result || !result.lhr) {
      throw new Error(`Lighthouse returned no result for ${url}`);
    }

    const parsed = parseResult(result.lhr);
    return parsed.scores;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to audit ${url}: ${message}`);
  }
}

/**
 * Close the browser
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
