# lighthouse-diff

Compare Lighthouse performance scores between URLs or git commits. CI-ready with GitHub Action support.

## Features

- Compare any two URLs
- Compare between git refs (branches, tags, commits)
- Multiple output formats (terminal, JSON, Markdown, GitHub)
- Configurable thresholds and regression limits
- GitHub Action for CI integration
- Multi-run averaging for stability

## Installation

```bash
npm install -g lighthouse-diff
```

## Usage

### Compare Two URLs

```bash
lighthouse-diff compare https://production.example.com https://staging.example.com
```

### Compare Git Refs

```bash
# Compare current branch against main
lighthouse-diff git main

# Compare specific branches
lighthouse-diff git main --head feature-branch
```

### Options

```
Options:
  -f, --format <format>       Output format: terminal, json, markdown, github (default: terminal)
  -r, --runs <number>         Number of runs to average (default: 1)
  -d, --device <device>       Device emulation: mobile, desktop (default: mobile)
  -t, --threshold <number>    Minimum score threshold
  --max-regression <number>   Maximum allowed regression
  --ci                        CI mode: exit 1 on failure
  -v, --verbose               Verbose output
  -c, --config <path>         Path to config file
```

## Configuration

Create a `lighthouse-diff.config.json` file:

```json
{
  "output": "terminal",
  "runner": {
    "runs": 3,
    "device": "mobile"
  },
  "thresholds": {
    "maxRegression": 5,
    "absoluteMin": 50,
    "minScore": {
      "performance": 80,
      "accessibility": 90,
      "bestPractices": 85,
      "seo": 90
    }
  }
}
```

## GitHub Action

Add to your workflow:

```yaml
name: Lighthouse

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build
        run: npm run build
        
      - name: Lighthouse Diff
        uses: sudokatie/lighthouse-diff@v1
        with:
          base-ref: main
          serve-path: ./dist
          max-regression: 5
          fail-on-regression: true
```

### Action Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `baseline-url` | Baseline URL to compare | - |
| `current-url` | Current URL to test | - |
| `base-ref` | Base git ref | - |
| `head-ref` | Head git ref | current |
| `serve-path` | Path to serve | `.` |
| `runs` | Number of runs | `1` |
| `device` | Device emulation | `mobile` |
| `max-regression` | Max regression | - |
| `min-score` | Minimum score | - |
| `format` | Output format | `github` |
| `fail-on-regression` | Fail on regression | `true` |

## Output Formats

### Terminal

Colored output with score comparisons and deltas.

### JSON

Machine-readable output for further processing:

```json
{
  "baseline": { "url": "...", "scores": { ... } },
  "current": { "url": "...", "scores": { ... } },
  "delta": { "performance": -3, ... },
  "validation": { "passed": false, "failures": [...] }
}
```

### Markdown

GitHub-flavored markdown with tables and emojis.

### GitHub

GitHub Actions annotations and step summary output.

## Programmatic Usage

```typescript
import { compare, gitCompare } from 'lighthouse-diff';

// Compare URLs
const result = await compare(
  'https://production.example.com',
  'https://staging.example.com',
  { runs: 3, maxRegression: 5 }
);

console.log(result.validation.passed);
console.log(result.delta.performance);
```

## License

MIT
