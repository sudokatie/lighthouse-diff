import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'child_process';
import {
  getCurrentBranch,
  getCurrentCommit,
  isDirty,
  stashChanges,
  popStash,
  checkout,
  captureState,
  restoreState,
  withCheckout,
  refExists,
  getChangedFiles,
} from './checkout.js';

// Mock execSync
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('git checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentBranch', () => {
    it('returns branch name', () => {
      (execSync as any).mockReturnValue('main\n');
      
      expect(getCurrentBranch()).toBe('main');
    });
  });

  describe('getCurrentCommit', () => {
    it('returns commit hash', () => {
      (execSync as any).mockReturnValue('abc1234\n');
      
      expect(getCurrentCommit()).toBe('abc1234');
    });
  });

  describe('isDirty', () => {
    it('returns true when working dir has changes', () => {
      (execSync as any).mockImplementation(() => {
        throw new Error('non-zero exit');
      });
      
      expect(isDirty()).toBe(true);
    });

    it('returns false when working dir is clean', () => {
      (execSync as any).mockReturnValue('');
      
      expect(isDirty()).toBe(false);
    });
  });

  describe('stashChanges', () => {
    it('creates stash when dirty', () => {
      (execSync as any)
        .mockImplementationOnce(() => { throw new Error(); }) // isDirty check
        .mockReturnValueOnce(''); // stash push
      
      const result = stashChanges();
      
      expect(result).toBe(true);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('stash push'),
        expect.any(Object)
      );
    });

    it('returns false when clean', () => {
      (execSync as any).mockReturnValue(''); // diff --quiet succeeds
      
      const result = stashChanges();
      
      expect(result).toBe(false);
    });
  });

  describe('checkout', () => {
    it('checks out ref', () => {
      (execSync as any).mockReturnValue('');
      
      checkout('feature-branch');
      
      expect(execSync).toHaveBeenCalledWith(
        'git checkout feature-branch',
        expect.any(Object)
      );
    });
  });

  describe('captureState', () => {
    it('captures branch, commit, and stash status', () => {
      (execSync as any)
        .mockReturnValueOnce('main\n') // branch
        .mockReturnValueOnce('abc1234\n') // commit
        .mockReturnValueOnce(''); // diff --quiet (clean)
      
      const state = captureState();
      
      expect(state.branch).toBe('main');
      expect(state.commit).toBe('abc1234');
      expect(state.stashed).toBe(false);
    });
  });

  describe('restoreState', () => {
    it('restores branch', () => {
      (execSync as any).mockReturnValue('');
      
      restoreState({ branch: 'main', commit: 'abc', stashed: false });
      
      expect(execSync).toHaveBeenCalledWith(
        'git checkout main',
        expect.any(Object)
      );
    });

    it('pops stash if was stashed', () => {
      (execSync as any).mockReturnValue('');
      
      restoreState({ branch: 'main', commit: 'abc', stashed: true });
      
      expect(execSync).toHaveBeenCalledWith(
        'git stash pop',
        expect.any(Object)
      );
    });
  });

  describe('withCheckout', () => {
    it('restores state after function completes', async () => {
      const calls: string[] = [];
      (execSync as any).mockImplementation((cmd: string) => {
        calls.push(cmd);
        if (cmd.includes('diff --quiet')) {
          return ''; // clean
        }
        return 'main\n';
      });
      
      await withCheckout('feature', async () => {
        // Do work
      });
      
      // Should checkout back to original
      expect(calls).toContain('git checkout main');
    });

    it('restores state after error', async () => {
      const calls: string[] = [];
      (execSync as any).mockImplementation((cmd: string) => {
        calls.push(cmd);
        if (cmd.includes('diff --quiet')) {
          return ''; // clean
        }
        return 'main\n';
      });
      
      await expect(
        withCheckout('feature', async () => {
          throw new Error('test error');
        })
      ).rejects.toThrow('test error');
      
      // Should still restore
      expect(calls.filter(c => c.includes('checkout main'))).toHaveLength(1);
    });
  });

  describe('refExists', () => {
    it('returns true for valid ref', () => {
      (execSync as any).mockReturnValue('abc1234\n');
      
      expect(refExists('main')).toBe(true);
    });

    it('returns false for invalid ref', () => {
      (execSync as any).mockImplementation(() => {
        throw new Error('fatal: not a valid ref');
      });
      
      expect(refExists('nonexistent')).toBe(false);
    });
  });

  describe('getChangedFiles', () => {
    it('returns list of changed files', () => {
      (execSync as any).mockReturnValue('src/index.ts\nsrc/utils.ts\n');
      
      const files = getChangedFiles('main', 'feature');
      
      expect(files).toEqual(['src/index.ts', 'src/utils.ts']);
    });

    it('returns empty array when no changes', () => {
      (execSync as any).mockReturnValue('');
      
      const files = getChangedFiles('main', 'main');
      
      expect(files).toEqual([]);
    });
  });
});
