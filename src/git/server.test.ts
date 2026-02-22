import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitForReady } from './server.js';

// Mock fetch for waitForReady tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('waitForReady', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('succeeds when server responds', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    
    await expect(waitForReady('http://localhost:3000', 1000)).resolves.toBeUndefined();
  });

  it('throws on timeout', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'));
    
    await expect(waitForReady('http://localhost:3000', 100)).rejects.toThrow('failed to start');
  });

  it('retries until success', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Connection refused'))
      .mockRejectedValueOnce(new Error('Connection refused'))
      .mockResolvedValueOnce({ ok: true });
    
    await expect(waitForReady('http://localhost:3000', 5000)).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

// Integration tests for startServer would require actually spawning processes
// Those are better as manual tests or E2E tests
