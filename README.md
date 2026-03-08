# lighthouse-diff

Catch performance regressions before they reach production. Compare Lighthouse scores between URLs or git commits, with CI-ready threshold validation.

## Why This Exists

Because "it feels slower" isn't a metric. Run Lighthouse on your baseline and preview URLs, get a clear diff, fail the build if things got worse.

## Features

- Compare any two URLs
- Compare between git refs (branches, tags, commits)
- Per-category thresholds (performance, accessibility, best-practices, seo)
- Per-category max regression limits
- Performance budgets (LCP, FCP, resource sizes, request counts)
- Historical tracking with SQLite storage
- Trend visualization (ASCII charts)
- Multiple output formats (terminal, JSON, Markdown, GitHub annotations)
- GitHub Action for CI integration

## Performance Budgets

Beyond category scores, you can set specific metric budgets using a `budget.json` file:

```json
[{
  "path": "/*",
  "timings": [
    { "metric": "first-contentful-paint", "budget": 1500 },
    { "metric": "largest-contentful-paint", "budget": 2500 },
    { "metric": "cumulative-layout-shift", "budget": 0.1 }
  ],
  "resourceSizes": [
    { "resourceType": "script", "budget": 300 },
    { "resourceType": "total", "budget": 1000 }
  ],
  "resourceCounts": [
    { "resourceType": "third-party", "budget": 10 },
    { "resourceType": "total", "budget": 50 }
  ]
}]
```

**Usage:**

```bash
# Auto-discover budget.json in current directory
lighthouse-diff compare prod.com staging.com

# Explicit budget file
lighthouse-diff compare prod.com staging.com --budget ./budget.json

# With CI mode (exit 1 on budget violation)
lighthouse-diff compare prod.com staging.com --ci
```

**Available metrics:**

Timings (in milliseconds, except CLS which is unitless):
- `first-contentful-paint`
- `largest-contentful-paint`
- `interactive` (Time to Interactive)
- `speed-index`
- `total-blocking-time`
- `max-potential-fid`
- `cumulative-layout-shift`

Resource types (sizes in KB, counts as integers):
- `document`, `script`, `stylesheet`, `image`, `media`, `font`, `other`
- `third-party` (external resources)
- `total` (all resources)

Budget files are searched in order: `budget.json`, `.lighthouse-budget.json`, `lighthouse-budget.json`

## Installation

```bash
npm install -g lighthouse-diff
```

## Quick Start

```bash
# Compare two URLs
lighthouse-diff compare https://production.example.com https://staging.example.com

# Compare git branches
lighthouse-diff git main --head feature-branch

# With thresholds
lighthouse-diff compare prod.com staging.com --threshold-performance 80 --ci
```

## CLI Reference

### history command

```
lighthouse-diff history [url] [options]
```

View historical Lighthouse runs and track score trends over time.

**Arguments:**
- `url` - Filter by URL (partial match, optional)

**Options:**
- `-n, --limit <n>` - Number of results (default: 20)
- `--since <date>` - Filter runs since date (ISO 8601 or relative: 7d, 2w, 1m)
- `--branch <name>` - Filter by git branch
- `-f, --format <format>` - Output format: terminal, json (default: terminal)
- `--trend` - Show ASCII trend visualization
- `--clear` - Clear all history
- `--older-than <days>` - With --clear: only delete records older than N days

**Examples:**

```bash
# View recent runs
lighthouse-diff history

# View runs for a specific URL
lighthouse-diff history example.com

# View runs from last week with trend chart
lighthouse-diff history example.com --since 7d --trend

# Export as JSON
lighthouse-diff history --format json > history.json

# Clear old history (90+ days)
lighthouse-diff history --clear --older-than 90
```

Historical data is stored in `~/.lighthouse-diff/history.db` and automatically recorded during compare/git commands. Default retention is 90 days.

### compare command

```
lighthouse-diff compare <baseline-url> <current-url> [options]
```

**Arguments:**
- `baseline-url` - URL to audit as baseline (required)
- `current-url` - URL to audit as current (required)

**Options:**
- `-c, --config <path>` - Path to config file
- `-f, --format <format>` - Output format: terminal, json, markdown, github (default: terminal)
- `-b, --budget <path>` - Path to budget file (auto-discovers budget.json)
- `--ci` - CI mode: exit 1 on threshold or budget failure
- `--threshold-performance <n>` - Minimum performance score
- `--threshold-accessibility <n>` - Minimum accessibility score
- `--threshold-best-practices <n>` - Minimum best practices score
- `--threshold-seo <n>` - Minimum SEO score

### git command

```
lighthouse-diff git <base-ref> [options]
```

**Arguments:**
- `base-ref` - Git ref to compare against (branch, tag, commit)

**Options:**
- `--head <ref>` - Head ref (default: current branch)
- `-s, --serve <cmd>` - Command to start dev server (default: "npm run dev")
- `-p, --port <port>` - Port the server listens on (default: 3000)
- `--path <path>` - URL path to audit (default: "/")
- Plus all options from compare command

## Configuration File

Create `lighthouse-diff.json`:

```json
{
  "thresholds": {
    "performance": 80,
    "accessibility": 90,
    "best-practices": 80,
    "seo": 80
  },
  "maxRegression": {
    "performance": 5,
    "accessibility": 0,
    "best-practices": 5,
    "seo": 5
  },
  "lighthouseConfig": {
    "formFactor": "desktop",
    "throttling": false
  }
}
```

Config file search order:
1. Path specified via `--config`
2. `lighthouse-diff.json`
3. `.lighthouse-diffrc`
4. `.lighthouse-diffrc.json`

## Output Formats

### Terminal (default)

Colored ASCII table with scores, deltas, and pass/fail status.

### JSON

```json
{
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "baselineUrl": "https://example.com",
  "currentUrl": "https://staging.example.com",
  "scores": [...],
  "thresholds": { "passed": true, "failures": [] }
}
```

### Markdown

GitHub-flavored markdown with tables and emojis, perfect for PR comments.

### GitHub

GitHub Actions workflow commands (::error::, ::warning::).

## GitHub Action

```yaml
- uses: sudokatie/lighthouse-diff@v1
  with:
    baseline-url: 'https://production.example.com'
    current-url: 'https://staging.example.com'
    threshold-performance: 80
    threshold-accessibility: 90
```

### Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `baseline-url` | Yes | Production/baseline URL |
| `current-url` | Yes | Preview/staging URL |
| `config-path` | No | Path to config file |
| `threshold-performance` | No | Min performance score |
| `threshold-accessibility` | No | Min accessibility score |
| `threshold-best-practices` | No | Min best practices score |
| `threshold-seo` | No | Min SEO score |

### Outputs

| Output | Description |
|--------|-------------|
| `markdown` | Results formatted as markdown |
| `passed` | "true" or "false" |

## License

MIT

## Author

Katie
