import { spawn, ChildProcess } from 'child_process';
import { once } from 'events';

let serverProcess: ChildProcess | null = null;
let serverUrl: string | null = null;

/**
 * Start Next.js server for integration tests
 * In CI, assumes server is already running (started by workflow)
 * Locally, starts dev server
 */
export async function startTestServer(port = 3000): Promise<string> {
  // If server is already running (e.g., in CI), just return the URL
  const url = `http://localhost:${port}`;
  
  // Check if server is already running
  try {
    const response = await fetch(`${url}/api/health`);
    if (response.ok) {
      serverUrl = url;
      return url;
    }
  } catch {
    // Server not running, continue to start it
  }

  // Only start server if not in CI (where it's started by workflow)
  if (process.env.CI === 'true') {
    // In CI, wait for server to be ready (started by workflow)
    const maxWait = 60000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      try {
        const response = await fetch(`${url}/api/health`);
        if (response.ok) {
          serverUrl = url;
          return url;
        }
      } catch {
        // Not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error(`Server not ready in CI after ${maxWait}ms`);
  }

  // Local development: start dev server
  if (serverProcess) {
    return serverUrl!;
  }

  serverUrl = url;

  // Start Next.js dev server
  // Use shell: false and specify the command properly to avoid deprecation warning
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'npm.cmd' : 'npm';
  serverProcess = spawn(command, ['run', 'dev'], {
    stdio: 'pipe',
    shell: false,
    env: {
      ...process.env,
      PORT: port.toString(),
    },
  });

  // Wait for server to be ready
  let serverReady = false;
  const maxWait = 60000; // 60 seconds
  const startTime = Date.now();

  serverProcess.stdout?.on('data', (data: Buffer) => {
    const output = data.toString();
    if (output.includes('Ready') || output.includes('Local:') || output.includes('started server')) {
      serverReady = true;
    }
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    const output = data.toString();
    // Ignore warnings, but log errors
    if (output.includes('Error') && !output.includes('Warning')) {
      console.error('Server error:', output);
    }
  });

  // Poll until server is ready
  while (!serverReady && Date.now() - startTime < maxWait) {
    try {
      const response = await fetch(`${url}/api/health`).catch(() => null);
      if (response?.ok) {
        serverReady = true;
        break;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (!serverReady) {
    throw new Error(`Server failed to start within ${maxWait}ms`);
  }

  // Give it a moment to fully initialize
  await new Promise(resolve => setTimeout(resolve, 1000));

  return url;
}

/**
 * Stop the test server
 */
export async function stopTestServer(): Promise<void> {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    await once(serverProcess, 'exit').catch(() => {});
    serverProcess = null;
    serverUrl = null;
  }
}

/**
 * Get the current test server URL
 */
export function getTestServerUrl(): string {
  return serverUrl || 'http://localhost:3000';
}
