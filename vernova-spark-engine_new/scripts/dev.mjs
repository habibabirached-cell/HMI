import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

console.log('════════════════════════════════════════════════════════════');
console.log('  GE VERNOVA - SPARK ENGINE DASHBOARD (DEV RUNNER)');
console.log('  Determining available backend port...');
console.log('════════════════════════════════════════════════════════════\n');

function findFreePort(startPort = 8001) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findFreePort(startPort + 1));
    });
  });
}

let pythonProc = null;
let viteProc = null;
let isShuttingDown = false;

function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n[INFO] Stopping development servers...');

  if (pythonProc) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', pythonProc.pid.toString(), '/f', '/t']);
      } else {
        pythonProc.kill('SIGINT');
      }
    } catch (_) {}
  }

  if (viteProc) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', viteProc.pid.toString(), '/f', '/t']);
      } else {
        viteProc.kill('SIGINT');
      }
    } catch (_) {}
  }

  setTimeout(() => process.exit(0), 400);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', shutdown);

async function main() {
  const chosenPort = await findFreePort(8001);
  process.env.FASTAPI_PORT = String(chosenPort);
  console.log(`[INFO] Bound FastAPI backend to fixed port: ${chosenPort}\n`);

  // 1. Start Python FastAPI backend on the fixed port
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  pythonProc = spawn(pythonCmd, ['-u', '-m', 'api.main', '--port', String(chosenPort), '--reload'], {
    cwd: ROOT,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, FASTAPI_PORT: String(chosenPort), PYTHONUNBUFFERED: '1', FORCE_COLOR: '1' },
  });

  pythonProc.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    for (const line of text.split(/\r?\n/)) {
      if (line.trim()) {
        console.log(`\x1b[36m[FastAPI]\x1b[0m ${line}`);
      }
    }
  });

  pythonProc.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    for (const line of text.split(/\r?\n/)) {
      if (line.trim()) {
        console.error(`\x1b[33m[FastAPI]\x1b[0m ${line}`);
      }
    }
  });

  pythonProc.on('close', (code) => {
    if (!isShuttingDown) {
      console.log(`\x1b[31m[FastAPI]\x1b[0m Process exited with code ${code}`);
      if (code !== 0) {
        console.warn(`[WARN] FastAPI server stopped. Frontend will use static databank fallbacks.`);
      }
    }
  });

  // 2. Start Vite dev server with the fixed FASTAPI_PORT
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  viteProc = spawn(npxCmd, ['vite', 'dev'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, FASTAPI_PORT: String(chosenPort), FORCE_COLOR: '1' },
  });

  viteProc.on('close', (code) => {
    if (!isShuttingDown) {
      console.log(`[Vite] Process exited with code ${code}`);
      shutdown();
    }
  });
}

main().catch((err) => {
  console.error('[ERROR] Failed to start dev environment:', err);
  process.exit(1);
});
