import { describe, it, expect } from 'vitest';
import {
  formatAnnotations,
  setOutput,
  startGroup,
  endGroup,
  formatGitHub,
} from './github.js';
import type { ThresholdResult } from '../types.js';

describe('formatAnnotations', () => {
  it('returns empty for no failures', () => {
    const result: ThresholdResult = { passed: true, failures: [] };
    expect(formatAnnotations(result)).toBe('');
  });

  it('formats below-threshold as error', () => {
    const result: ThresholdResult = {
      passed: false,
      failures: [{ category: 'performance', reason: 'below-threshold', expected: 80, actual: 70 }],
    };
    const output = formatAnnotations(result);
    expect(output).toContain('::error');
    expect(output).toContain('performance');
  });

  it('formats regression as warning', () => {
    const result: ThresholdResult = {
      passed: false,
      failures: [{ category: 'accessibility', reason: 'regression', expected: 5, actual: 10 }],
    };
    const output = formatAnnotations(result);
    expect(output).toContain('::warning');
    expect(output).toContain('accessibility');
  });

  it('handles multiple failures', () => {
    const result: ThresholdResult = {
      passed: false,
      failures: [
        { category: 'performance', reason: 'below-threshold', expected: 80, actual: 70 },
        { category: 'accessibility', reason: 'regression', expected: 5, actual: 10 },
      ],
    };
    const output = formatAnnotations(result);
    const lines = output.split('\n');
    expect(lines).toHaveLength(2);
  });
});

describe('setOutput', () => {
  it('formats output command', () => {
    const output = setOutput('foo', 'bar');
    expect(output).toContain('name=foo');
    expect(output).toContain('bar');
  });

  it('escapes newlines', () => {
    const output = setOutput('data', 'line1\nline2');
    expect(output).toContain('%0A');
  });
});

describe('startGroup', () => {
  it('formats group command', () => {
    expect(startGroup('My Group')).toBe('::group::My Group');
  });
});

describe('endGroup', () => {
  it('formats endgroup command', () => {
    expect(endGroup()).toBe('::endgroup::');
  });
});

describe('formatGitHub', () => {
  it('returns annotations', () => {
    const result: ThresholdResult = {
      passed: false,
      failures: [{ category: 'performance', reason: 'below-threshold', expected: 80, actual: 70 }],
    };
    const output = formatGitHub(result);
    expect(output).toContain('::error');
  });

  it('returns empty for passed', () => {
    const result: ThresholdResult = { passed: true, failures: [] };
    const output = formatGitHub(result);
    expect(output).toBe('');
  });
});
