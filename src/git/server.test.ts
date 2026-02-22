import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { startServer, withServer } from './server.js';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Mock http server for findPort
vi.mock('http', () => ({
  createServer: vi.fn(() => ({
    listen: vi.fn((port, cb) => cb()),
    address: vi.fn(() => ({ port: 3000 })),
    close: vi.fn((cb) => cb()),
    on: vi.fn(),
  })),
}));

describe('git server', () => {
  let mockProc: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockProc = {
      kill: vi.fn(),
      on: vi.fn((event, cb) => {
        if (event === 'exit') {
          // Simulate quick exit
          setTimeout(cb, 10);
        }
      }),
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
    };
    
    (spawn as any).mockReturnValue(mockProc);
    mockFetch.mockResolvedValue({ ok: true });
  });

  describe('startServer', () => {
    it('spawns serve process', async () => {
      const server = await startServer({ port: 3000 });
      
      expect(spawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['serve', '-l', '3000']),
        expect.any(Object)
      );
      
      await server.stop();
    });

    it('waits for server to be ready', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      
      const server = await startServer({ port: 3000 });
      
      expect(mockFetch).toHaveBeenCalled();
      
      await server.stop();
    });

    it('throws on timeout', async () => {
      mockFetch.mockRejectedValue(new Error('connection refused'));
      
      await expect(
        startServer({ port: 3000, timeout: 100 })
      ).rejects.toThrow('Server failed to start');
    });

    it('returns server handle with url and stop', async () => {
      const server = await startServer({ port: 3000 });
      
      expect(server.url).toBe('http://localhost:3000');
      expect(server.port).toBe(3000);
      expect(typeof server.stop).toBe('function');
      
      await server.stop();
    });
  });

  describe('stop', () => {
    it('sends SIGTERM', async () => {
      const server = await startServer({ port: 3000 });
      
      await server.stop();
      
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
    });
  });

  describe('withServer', () => {
    it('cleans up on success', async () => {
      let serverUrl: string | undefined;
      
      await withServer(async (url) => {
        serverUrl = url;
        return 'result';
      }, { port: 3000 });
      
      expect(serverUrl).toBe('http://localhost:3000');
      expect(mockProc.kill).toHaveBeenCalled();
    });

    it('cleans up on error', async () => {
      await expect(
        withServer(async () => {
          throw new Error('test error');
        }, { port: 3000 })
      ).rejects.toThrow('test error');
      
      expect(mockProc.kill).toHaveBeenCalled();
    });

    it('returns function result', async () => {
      const result = await withServer(async () => {
        return 'expected result';
      }, { port: 3000 });
      
      expect(result).toBe('expected result');
    });
  });
});
