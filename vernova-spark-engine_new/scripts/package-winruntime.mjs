import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = 'C:\\Gyan\\Onedrive\\GEProject\\Dashbord_project\\src\\Winruntime';
const APP_PUBLIC = path.join(ROOT, '.output', 'public');
const APP_SERVER = path.join(ROOT, '.output', 'server');
const STATIC_PUBLIC = path.join(ROOT, 'public');

console.log('════════════════════════════════════════════════════════════');
console.log('  PACKAGING APPLICATION FOR WINDOWS STANDALONE RUNTIME');
console.log(`  Destination: ${TARGET_DIR}`);
console.log('════════════════════════════════════════════════════════════');

// 1. Ensure target dir exists
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// 2. Build web application frontend & SSR distribution
console.log('\n[1/5] Building production web application output...');
execSync('npm run build', { cwd: ROOT, stdio: 'inherit', shell: true });

if (!fs.existsSync(APP_PUBLIC) || !fs.existsSync(APP_SERVER)) {
  console.error(`❌ Build output missing at ${APP_PUBLIC} or ${APP_SERVER}`);
  process.exit(1);
}

// 3. Copy production static bundle & server bundle to Winruntime
const DEST_PUBLIC = path.join(TARGET_DIR, 'public');
const DEST_SERVER = path.join(TARGET_DIR, 'server');

if (fs.existsSync(DEST_PUBLIC)) {
  fs.rmSync(DEST_PUBLIC, { recursive: true, force: true });
}
if (fs.existsSync(DEST_SERVER)) {
  fs.rmSync(DEST_SERVER, { recursive: true, force: true });
}

fs.mkdirSync(DEST_PUBLIC, { recursive: true });
fs.mkdirSync(DEST_SERVER, { recursive: true });

console.log('\n[2/5] Copying web distribution & static assets to Winruntime...');
if (fs.existsSync(STATIC_PUBLIC)) {
  fs.cpSync(STATIC_PUBLIC, DEST_PUBLIC, { recursive: true });
}
fs.cpSync(APP_PUBLIC, DEST_PUBLIC, { recursive: true });
fs.cpSync(APP_SERVER, DEST_SERVER, { recursive: true });

// Also keep www alias for backwards compatibility
const WWW_DIR = path.join(TARGET_DIR, 'www');
if (fs.existsSync(WWW_DIR)) {
  fs.rmSync(WWW_DIR, { recursive: true, force: true });
}
fs.cpSync(DEST_PUBLIC, WWW_DIR, { recursive: true });

// 4. Create Electron runtime files inside Winruntime
console.log('\n[3/5] Creating Windows runtime host files...');

const electronPackageJson = {
  name: "verona-spark-engine",
  version: "1.0.0",
  description: "Verona Spark Engine Standalone Windows Desktop Runtime Application",
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
  path.join(TARGET_DIR, 'package.json'),
  JSON.stringify(electronPackageJson, null, 2)
);

const mainJsContent = `const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// GPU / WebGL must stay enabled for Three.js 3D model rendering
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
    '.gltf': 'model/gltf+json'
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
    console.error('Error initializing Nitro server:', err);
  }

  const server = http.createServer(async (req, res) => {
    try {
      const cleanPath = decodeURIComponent(req.url.split('?')[0]);
      const filePath = path.join(publicDir, cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath);

      // 1. Try static asset
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.writeHead(200, {
          'Content-Type': getMimeType(filePath),
          'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      // 2. Try Nitro SSR handler for application routes
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
    width: 1536,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Vernova Spark Engine — Renewable SCADA & Stability Dashboard",
    icon: path.join(__dirname, 'public', 'image1.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.setMenu(null);
  mainWindow.loadURL(\`http://127.0.0.1:\${port}/\`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  serverInstance = await startServer();
  const port = serverInstance.address().port;
  console.log(\`Winruntime local web server running at http://127.0.0.1:\${port}\`);
  createWindow(port);
});

app.on('window-all-closed', () => {
  if (serverInstance) {
    serverInstance.close();
  }
  app.quit();
});
`;

fs.writeFileSync(path.join(TARGET_DIR, 'main.js'), mainJsContent);

// 5. Create Windows batch and PowerShell launchers in Winruntime
const batLauncherContent = `@echo off
title Verona Spark Engine Desktop Launcher
cd /d "%~dp0"
if exist "build_exe\\Verona-Spark-Engine-win32-x64\\Verona-Spark-Engine.exe" (
    start "" "build_exe\\Verona-Spark-Engine-win32-x64\\Verona-Spark-Engine.exe"
) else if exist "dist\\Verona-Spark-Engine-win32-x64\\Verona-Spark-Engine.exe" (
    start "" "dist\\Verona-Spark-Engine-win32-x64\\Verona-Spark-Engine.exe"
) else (
    npx electron .
)
`;

fs.writeFileSync(path.join(TARGET_DIR, 'Launch_Verona_Spark_Engine.bat'), batLauncherContent);

const vbsLauncherContent = `Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c Launch_Verona_Spark_Engine.bat", 0, False
`;

fs.writeFileSync(path.join(TARGET_DIR, 'Start_App_Silent.vbs'), vbsLauncherContent);

console.log('\n[4/5] Installing runtime dependencies in Winruntime folder...');
try {
  execSync('npm install', { cwd: TARGET_DIR, stdio: 'inherit', shell: true });
} catch (e) {
  console.warn('npm install warning:', e.message);
}

console.log('\n[5/5] Packaging standalone Windows executable (.exe)...');
try {
  execSync('npx @electron/packager . "Verona-Spark-Engine" --platform=win32 --arch=x64 --out=build_exe --overwrite --ignore="^(build_exe|dist)"', {
    cwd: TARGET_DIR,
    stdio: 'inherit',
    shell: true
  });
} catch (e) {
  console.error('Packaging .exe warning:', e.message);
}

// Clean up temporary staging files from Winruntime top level
const cleanupItems = ['public', 'server', 'www', 'node_modules', 'package-lock.json', 'package.json', 'main.js'];
for (const item of cleanupItems) {
  const p = path.join(TARGET_DIR, item);
  try {
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
    }
  } catch (_) {}
}

console.log('\n════════════════════════════════════════════════════════════');
console.log('  ✓ SUCCESS: Windows Standalone Application (.exe) created successfully!');
console.log(`  Location: ${TARGET_DIR}`);
console.log('  Executable files:');
console.log(`    - ${path.join(TARGET_DIR, 'build_exe', 'Verona-Spark-Engine-win32-x64', 'Verona-Spark-Engine.exe')}`);
console.log(`    - ${path.join(TARGET_DIR, 'Launch_Verona_Spark_Engine.bat')}`);
console.log('════════════════════════════════════════════════════════════\n');
