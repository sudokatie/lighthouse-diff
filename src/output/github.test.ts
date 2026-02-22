import { describe, it, expect } from 'vitest';
import { 
  formatAnnotations, 
  setOutput, 
  startGroup, 
  endGroup,
  formatGitHubOutput 
} from './github.js';
import type { ValidationResult, ValidationFailure } from '../types.js';

describe('github output', () => {
  describe('formatAnnotations', () => {
    it('returns empty string when no failures', () => {
      const result: ValidationResult = {
        passed: true,
        failures: [],
      };
      
      expect(formatAnnotations(result)).toBe('');
    });

    it('formats threshold failure as error', () => {
      const result: ValidationResult = {
        passed: false,
        failures: [
          {
            category: 'performance',
            type: 'minScore',
            message: 'Performance (75) below minimum (80)',
            actual: 75,
            threshold: 80,
          },
        ],
      };
      
      const output = formatAnnotations(result);
      expect(output).toContain('::error::');
      expect(output).toContain('Performance');
    });

    it('formats regression as warning', () => {
      const result: ValidationResult = {
        passed: false,
        failures: [
          {
            category: 'accessibility',
            type: 'regression',
            message: 'Accessibility regressed by 15 points',
            actual: -15,
            threshold: 10,
          },
        ],
      };
      
      const output = formatAnnotations(result);
      expect(output).toContain('::warning::');
      expect(output).toContain('Accessibility');
    });

    it('formats multiple failures on separate lines', () => {
      const result: ValidationResult = {
        passed: false,
        failures: [
          {
            category: 'performance',
            type: 'minScore',
            message: 'Performance below minimum',
            actual: 75,
            threshold: 80,
          },
          {
            category: 'seo',
            type: 'regression',
            message: 'SEO regressed',
            actual: -20,
            threshold: 10,
          },
        ],
      };
      
      const output = formatAnnotations(result);
      const lines = output.split('\n');
      expect(lines).toHaveLength(2);
    });

    it('includes category in message', () => {
      const result: ValidationResult = {
        passed: false,
        failures: [
          {
            category: 'bestPractices',
            type: 'absoluteMin',
            message: 'Best Practices (40) below absolute minimum (50)',
            actual: 40,
            threshold: 50,
          },
        ],
      };
      
      const output = formatAnnotations(result);
      expect(output).toContain('Best Practices');
    });
  });

  describe('setOutput', () => {
    it('formats simple value', () => {
      expect(setOutput('foo', 'bar')).toBe('foo=bar');
    });

    it('handles multiline values with heredoc', () => {
      const output = setOutput('data', 'line1\nline2');
      expect(output).toContain('data<<EOF');
      expect(output).toContain('line1\nline2');
      expect(output).toContain('EOF');
    });
  });

  describe('startGroup', () => {
    it('formats group start', () => {
      expect(startGroup('Test Group')).toBe('::group::Test Group');
    });
  });

  describe('endGroup', () => {
    it('formats group end', () => {
      expect(endGroup()).toBe('::endgroup::');
    });
  });

  describe('formatGitHubOutput', () => {
    it('sets passed output to true when passed', () => {
      const result: ValidationResult = {
        passed: true,
        failures: [],
      };
      
      const output = formatGitHubOutput(result);
      expect(output).toContain('lighthouse-passed=true');
    });

    it('sets passed output to false when failed', () => {
      const result: ValidationResult = {
        passed: false,
        failures: [
          {
            category: 'performance',
            type: 'minScore',
            message: 'Failed',
            actual: 50,
            threshold: 80,
          },
        ],
      };
      
      const output = formatGitHubOutput(result);
      expect(output).toContain('lighthouse-passed=false');
      expect(output).toContain('lighthouse-failures=1');
    });
  });
});
