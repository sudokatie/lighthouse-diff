import { spawn, ChildProcess } from 'child_process';
import { createServer } from 'http';

export interface ServerOptions {
  command?: string;
  port?: number;
  host?: string;
  timeout?: number;
}

export interface ServerHandle {
  url: string;
  port: number;
  stop: () => Promise<void>;
}

/**
 * Wait for server to respond with 2xx status
 */
export async function waitForReady(url: string, timeout: number = 30000): Promise<void> {
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
  return new Promise((resolve) => {
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
 * Start a server using the provided command
 */
export async function startServer(options: ServerOptions = {}): Promise<ServerHandle> {
  const port = options.port ?? await findPort();
  const host = options.host ?? 'localhost';
  const command = options.command ?? 'npm run dev';
  const timeout = options.timeout ?? 30000;
  
  // Parse command
  const parts = command.split(' ');
  const cmd = parts[0];
  const args = parts.slice(1);
  
  // Set PORT env var for common dev servers
  const env = { ...process.env, PORT: String(port) };
  
  const proc = spawn(cmd, args, {
    stdio: 'pipe',
    detached: false,
    env,
    shell: true,
  });
  
  const url = `http://${host}:${port}`;
  
  // Capture stderr for error reporting
  let stderr = '';
  proc.stderr?.on('data', (data) => {
    stderr += data.toString();
  });
  
  // Wait for server to be ready
  try {
    await waitForReady(url, timeout);
  } catch (error) {
    proc.kill('SIGTERM');
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\nServer stderr: ${stderr.slice(-500)}`);
  }
  
  return {
    url,
    port,
    stop: async () => {
      // Send SIGTERM first
      proc.kill('SIGTERM');
      
      // Wait up to 5 seconds, then SIGKILL
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
