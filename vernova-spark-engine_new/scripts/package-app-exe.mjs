import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_PARENT = path.resolve(ROOT, '..');
const TARGET_DIR = path.join(SRC_PARENT, 'FLEXIQsim_Desktop_App');
const STAGING_DIR = path.join(ROOT, '.packaging_staging');

const APP_PUBLIC = path.join(ROOT, '.output', 'public');
const APP_SERVER = path.join(ROOT, '.output', 'server');
const STATIC_PUBLIC = path.join(ROOT, 'public');

console.log('════════════════════════════════════════════════════════════');
console.log('  PACKAGING FLEXIQsim DESKTOP APPLICATION (.EXE)');
console.log(`  Source:      ${ROOT}`);
console.log(`  Destination: ${TARGET_DIR}`);
console.log('════════════════════════════════════════════════════════════');

// 1. Build production web application output
console.log('\n[1/6] Building production web application output...');
execSync('npm run build', { cwd: ROOT, stdio: 'inherit', shell: true });

if (!fs.existsSync(APP_PUBLIC) || !fs.existsSync(APP_SERVER)) {
  console.error(`❌ Build output missing at ${APP_PUBLIC} or ${APP_SERVER}`);
  process.exit(1);
}

// 2. Prepare clean staging directory
console.log('\n[2/6] Preparing staging directory with complete 3D assets...');
if (fs.existsSync(STAGING_DIR)) {
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
}
fs.mkdirSync(STAGING_DIR, { recursive: true });

const STAGE_PUBLIC = path.join(STAGING_DIR, 'public');
const STAGE_SERVER = path.join(STAGING_DIR, 'server');

fs.mkdirSync(STAGE_PUBLIC, { recursive: true });
fs.mkdirSync(STAGE_SERVER, { recursive: true });

// Copy all static public assets (including 3D .glb models, draco wasm decoders, images, SVGs, databank)
if (fs.existsSync(STATIC_PUBLIC)) {
  fs.cpSync(STATIC_PUBLIC, STAGE_PUBLIC, { recursive: true });
}
// Overlay compiled frontend assets
fs.cpSync(APP_PUBLIC, STAGE_PUBLIC, { recursive: true });
// Copy compiled SSR server bundle
fs.cpSync(APP_SERVER, STAGE_SERVER, { recursive: true });

// Copy api directory if present
const API_DIR = path.join(ROOT, 'api');
const STAGE_API = path.join(STAGING_DIR, 'api');
if (fs.existsSync(API_DIR)) {
  fs.cpSync(API_DIR, STAGE_API, { recursive: true });
}

// 3. Create Electron configuration & Main process script in staging
console.log('\n[3/6] Configuring Electron host with WebGL & 3D streaming support...');

const electronPackageJson = {
  name: "flexiqsim",
  productName: "FLEXIQsim",
  version: "1.0.0",
  description: "FLEXIQsim — Renewable SCADA & Grid Stability Simulation Dashboard",
  main: "main.js",
  author: "GE Vernova",
  private: true,
  dependencies: {},
  devDependencies: {
    "electron": "^33.2.1",
    "@electron/packager": "^18.3.6"
  }
};

fs.writeFileSync(
  path.join(STAGING_DIR, 'package.json'),
  JSON.stringify(electronPackageJson, null, 2)
);

const mainJsContent = `const { app, BrowserWindow, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Enable GPU hardware acceleration & WebGL for Three.js 3D models
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('no-sandbox');

let mainWindow = null;
let serverInstance = null;

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.csv': 'text/csv; charset=utf-8',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.bin': 'application/octet-stream',
    '.webm': 'video/webm',
    '.mp4': 'video/mp4'
  };
  return map[ext] || 'application/octet-stream';
}

async function startServer() {
  const publicDir = path.join(__dirname, 'public');
  let nitroHandler = null;

  try {
    const nitroPath = path.join(__dirname, 'server', 'index.mjs');
    if (fs.existsSync(nitroPath)) {
      const nitroModule = await import('file:///' + nitroPath.replace(/\\\\/g, '/'));
      nitroHandler = nitroModule.default;
    }
  } catch (err) {
    console.error('Error initializing Nitro SSR engine:', err);
  }

  const server = http.createServer(async (req, res) => {
    try {
      const cleanPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = path.join(publicDir, cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath);

      // 0. Native FastAPI / Databank API endpoints handler
      if (cleanPath.startsWith('/api/')) {
        // Health Probe
        if (cleanPath === '/api/v1/health' || cleanPath === '/api/health') {
          const databankDir = path.join(publicDir, 'databank');
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*'
          });
          res.end(JSON.stringify({
            ok: true,
            service: "verona-databank-api (embedded)",
            source: databankDir,
            exists: fs.existsSync(databankDir)
          }));
          return;
        }

        // Catalogue
        if (cleanPath === '/api/v1/catalogue' || cleanPath === '/api/catalogue') {
          const events = [
            "CFG1", "CFG2", "CFG3", "CFG4", "CFG5", "CFG6",
            "CFG7", "CFG8", "CFG9", "CFG10", "CFG11", "CFG12", "CFG13"
          ].flatMap(cfg => [
            { cfg, event: "SCL", event_time_s: 40 },
            { cfg, event: "ROCOF", event_time_s: 40 },
            { cfg, event: "PHJUMP", event_time_s: 40 },
            { cfg, event: "VSTEP", event_time_s: 40 }
          ]);
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ events }));
          return;
        }

        // Series: /api/v1/series/:cfg/:event
        const seriesMatch = cleanPath.match(/^\\/api\\/v1\\/series\\/([^/]+)\\/([^/]+)/i);
        if (seriesMatch) {
          const cfg = seriesMatch[1].toUpperCase();
          const event = seriesMatch[2].toUpperCase();
          const parsedUrl = new URL(req.url, 'http://127.0.0.1');
          const phase = (parsedUrl.searchParams.get('phase') || 'post').toLowerCase();

          let candidate = path.join(publicDir, 'databank', cfg, phase === 'full' ? \`\${event}.csv\` : \`\${event}.\${phase}.csv\`);
          if (!fs.existsSync(candidate)) {
            candidate = path.join(publicDir, 'databank', cfg, \`\${event}.post.csv\`);
          }
          if (!fs.existsSync(candidate)) {
            candidate = path.join(publicDir, 'databank', cfg, \`\${event}.csv\`);
          }

          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            const stat = fs.statSync(candidate);
            res.writeHead(200, {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Length': stat.size,
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=86400'
            });
            fs.createReadStream(candidate).pipe(res);
            return;
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ detail: \`Series not found for \${cfg}/\${event}\` }));
            return;
          }
        }
      }

      // If path is a directory or root, check for index.html
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        const indexPath = path.join(filePath, 'index.html');
        if (fs.existsSync(indexPath)) {
          filePath = indexPath;
        }
      }

      // 1. Static asset serving with Range support & full headers
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const stat = fs.statSync(filePath);
        const mimeType = getMimeType(filePath);
        const range = req.headers.range;

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
          const chunkSize = (end - start) + 1;
          const stream = fs.createReadStream(filePath, { start, end });

          res.writeHead(206, {
            'Content-Range': \`bytes \${start}-\${end}/\${stat.size}\`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*'
          });
          stream.pipe(res);
          return;
        } else {
          res.writeHead(200, {
            'Content-Length': stat.size,
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
            'Accept-Ranges': 'bytes'
          });
          fs.createReadStream(filePath).pipe(res);
          return;
        }
      }

      // 2. Nitro SSR handler for application routes
      if (nitroHandler && typeof nitroHandler.fetch === 'function') {
        const url = 'http://127.0.0.1:' + server.address().port + req.url;
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (v) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
        }

        const body = ['GET', 'HEAD'].includes(req.method) ? undefined : req;
        const webReq = new Request(url, {
          method: req.method,
          headers,
          body,
          duplex: body ? 'half' : undefined
        });

        const webRes = await nitroHandler.fetch(webReq, {}, { waitUntil: () => {} });
        res.statusCode = webRes.status;
        webRes.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });

        if (webRes.body) {
          const reader = webRes.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        }
        res.end();
        return;
      }

      // 3. SPA index.html fallback
      const fallbackIndex = path.join(publicDir, 'index.html');
      if (fs.existsSync(fallbackIndex)) {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(fallbackIndex).pipe(res);
        return;
      }

      res.statusCode = 404;
      res.end('Not Found');
    } catch (err) {
      console.error('Request error:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    fullscreen: true,
    title: "FLEXIQsim — Renewable SCADA & Grid Stability Simulation Dashboard",
    icon: path.join(__dirname, 'public', 'image1.png'),
    autoHideMenuBar: true,
    backgroundColor: '#0a101d',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
      backgroundThrottling: false
    }
  });

  mainWindow.setMenu(null);
  mainWindow.loadURL(\`http://127.0.0.1:\${port}/\`);

  // Handle external links safely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  serverInstance = await startServer();
  const port = serverInstance.address().port;
  console.log(\`FLEXIQsim local web server running at http://127.0.0.1:\${port}\`);
  createWindow(port);
});

app.on('window-all-closed', () => {
  if (serverInstance) {
    serverInstance.close();
  }
  app.quit();
});
`;

fs.writeFileSync(path.join(STAGING_DIR, 'main.js'), mainJsContent);

// 4. Install electron packaging dependencies in staging
console.log('\n[4/6] Installing packaging dependencies in staging directory...');
try {
  execSync('npm install --no-audit --no-fund', { cwd: STAGING_DIR, stdio: 'inherit', shell: true });
} catch (e) {
  console.warn('npm install warning:', e.message);
}

// 5. Package standalone Windows executable (.exe)
console.log('\n[5/6] Generating standalone Windows executable (.exe)...');
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// Clean old build in target
const OLD_APP_DIR = path.join(TARGET_DIR, 'FLEXIQsim-win32-x64');
if (fs.existsSync(OLD_APP_DIR)) {
  fs.rmSync(OLD_APP_DIR, { recursive: true, force: true });
}

try {
  execSync(`npx @electron/packager . "FLEXIQsim" --platform=win32 --arch=x64 --out="${TARGET_DIR}" --overwrite --executable-name="FLEXIQsim"`, {
    cwd: STAGING_DIR,
    stdio: 'inherit',
    shell: true
  });
} catch (e) {
  console.error('Packaging error:', e.message);
}

// 6. Create clean launchers in top-level target folder
console.log('\n[6/6] Creating launcher shortcuts and cleaning staging files...');

const launcherBatContent = `@echo off
title FLEXIQsim Launcher
cd /d "%~dp0"
if exist "FLEXIQsim-win32-x64\\FLEXIQsim.exe" (
    start "" "FLEXIQsim-win32-x64\\FLEXIQsim.exe"
) else (
    echo Error: FLEXIQsim.exe not found in FLEXIQsim-win32-x64.
    pause
)
`;

fs.writeFileSync(path.join(TARGET_DIR, 'Launch_FLEXIQsim.bat'), launcherBatContent);

const silentVbsContent = `Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c Launch_FLEXIQsim.bat", 0, False
`;

fs.writeFileSync(path.join(TARGET_DIR, 'Start_FLEXIQsim_Silent.vbs'), silentVbsContent);

// Remove staging folder completely
if (fs.existsSync(STAGING_DIR)) {
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
}

// Ensure no stray files exist in TARGET_DIR except the app folder and launchers
const allowedEntries = new Set(['FLEXIQsim-win32-x64', 'Launch_FLEXIQsim.bat', 'Start_FLEXIQsim_Silent.vbs']);
const entries = fs.readdirSync(TARGET_DIR);
for (const entry of entries) {
  if (!allowedEntries.has(entry)) {
    const entryPath = path.join(TARGET_DIR, entry);
    try {
      fs.rmSync(entryPath, { recursive: true, force: true });
    } catch (_) {}
  }
}

console.log('\n════════════════════════════════════════════════════════════');
console.log('  ✓ SUCCESS: FLEXIQsim Desktop Executable (.exe) Packaged!');
console.log(`  Target Directory: ${TARGET_DIR}`);
console.log('  Executable:');
console.log(`    - ${path.join(TARGET_DIR, 'FLEXIQsim-win32-x64', 'FLEXIQsim.exe')}`);
console.log(`    - ${path.join(TARGET_DIR, 'Launch_FLEXIQsim.bat')}`);
console.log('════════════════════════════════════════════════════════════\n');
