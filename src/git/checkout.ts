import { execSync } from 'child_process';

export interface GitState {
  branch: string;
  commit: string;
  stashed: boolean;
}

/**
 * Execute git command and return output
 */
function git(args: string, cwd?: string): string {
  return execSync(`git ${args}`, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

/**
 * Get current branch name
 */
export function getCurrentBranch(cwd?: string): string {
  return git('rev-parse --abbrev-ref HEAD', cwd);
}

/**
 * Get current commit hash
 */
export function getCurrentCommit(cwd?: string): string {
  return git('rev-parse HEAD', cwd);
}

/**
 * Check if working directory has uncommitted changes
 */
export function isDirty(cwd?: string): boolean {
  try {
    git('diff --quiet HEAD', cwd);
    return false;
  } catch {
    return true;
  }
}

/**
 * Stash current changes
 */
export function stashChanges(cwd?: string): boolean {
  if (!isDirty(cwd)) {
    return false;
  }
  git('stash push -m "lighthouse-diff: auto-stash"', cwd);
  return true;
}

/**
 * Pop stashed changes
 */
export function popStash(cwd?: string): void {
  git('stash pop', cwd);
}

/**
 * Checkout a ref (branch, tag, or commit)
 */
export function checkout(ref: string, cwd?: string): void {
  git(`checkout ${ref}`, cwd);
}

/**
 * Capture current git state
 */
export function captureState(cwd?: string): GitState {
  return {
    branch: getCurrentBranch(cwd),
    commit: getCurrentCommit(cwd),
    stashed: stashChanges(cwd),
  };
}

/**
 * Restore git state
 */
export function restoreState(state: GitState, cwd?: string): void {
  checkout(state.branch, cwd);
  if (state.stashed) {
    popStash(cwd);
  }
}

/**
 * Execute function with a different checkout, then restore
 */
export async function withCheckout<T>(
  ref: string,
  fn: () => Promise<T>,
  cwd?: string
): Promise<T> {
  const state = captureState(cwd);
  
  try {
    checkout(ref, cwd);
    return await fn();
  } finally {
    restoreState(state, cwd);
  }
}

/**
 * Check if a ref exists
 */
export function refExists(ref: string, cwd?: string): boolean {
  try {
    git(`rev-parse --verify ${ref}`, cwd);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get list of changed files between two refs
 */
export function getChangedFiles(base: string, head: string = 'HEAD', cwd?: string): string[] {
  const output = git(`diff --name-only ${base}...${head}`, cwd);
  if (!output) return [];
  return output.split('\n').filter(Boolean);
}
