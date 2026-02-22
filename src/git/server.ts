import { spawn, ChildProcess } from 'child_process';
import { createServer } from 'http';
import { join, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

export interface ServerOptions {
  port?: number;
  host?: string;
  path?: string;
  timeout?: number;
}

export interface ServerHandle {
  url: string;
  port: number;
  stop: () => Promise<void>;
}

/**
 * Wait for server to be ready
 */
async function waitForReady(url: string, timeout: number = 30000): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, 100));
  }
  
  throw new Error(`Server failed to start within ${timeout}ms: ${url}`);
}

/**
 * Find an available port
 */
async function findPort(start: number = 3000): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr !== null ? addr.port : start;
      server.close(() => resolve(port));
    });
    server.on('error', () => resolve(start + Math.floor(Math.random() * 1000)));
  });
}

/**
 * Start a static file server
 */
export async function startServer(options: ServerOptions = {}): Promise<ServerHandle> {
  const port = options.port ?? await findPort();
  const host = options.host ?? 'localhost';
  const servePath = options.path ?? process.cwd();
  const timeout = options.timeout ?? 30000;
  
  // Use npx serve for simple static serving
  const proc = spawn('npx', ['serve', '-l', String(port), '-s', servePath], {
    stdio: 'pipe',
    detached: false,
  });
  
  const url = `http://${host}:${port}`;
  
  // Wait for server to be ready
  try {
    await waitForReady(url, timeout);
  } catch (error) {
    proc.kill('SIGTERM');
    throw error;
  }
  
  return {
    url,
    port,
    stop: async () => {
      proc.kill('SIGTERM');
      
      // Give it 5 seconds then force kill
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          proc.kill('SIGKILL');
          resolve();
        }, 5000);
        
        proc.on('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    },
  };
}

/**
 * Run function with server, ensuring cleanup
 */
export async function withServer<T>(
  fn: (url: string) => Promise<T>,
  options: ServerOptions = {}
): Promise<T> {
  const server = await startServer(options);
  
  try {
    return await fn(server.url);
  } finally {
    await server.stop();
  }
}

/**
 * Check if serve is available
 */
export function hasServe(): boolean {
  try {
    const proc = spawn('npx', ['serve', '--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
