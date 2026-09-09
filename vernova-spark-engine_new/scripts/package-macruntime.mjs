import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = 'C:\\Gyan\\Onedrive\\GEProject\\Dashbord_project\\src\\Macruntime';
const APP_DIST = path.join(ROOT, '.output', 'public');

console.log('════════════════════════════════════════════════════════════');
console.log('  PACKAGING APPLICATION FOR MACOS RUNTIME');
console.log(`  Destination: ${TARGET_DIR}`);
console.log('════════════════════════════════════════════════════════════');

// 1. Ensure target dir exists
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// 2. Build web application frontend static distribution
console.log('\n[1/4] Building production web application output...');
execSync('npm run build', { cwd: ROOT, stdio: 'inherit', shell: true });

if (!fs.existsSync(APP_DIST)) {
  console.error(`❌ Build output directory missing at ${APP_DIST}`);
  process.exit(1);
}

// 3. Copy production static bundle to Macruntime/www
const WWW_DIR = path.join(TARGET_DIR, 'www');
if (fs.existsSync(WWW_DIR)) {
  fs.rmSync(WWW_DIR, { recursive: true, force: true });
}
fs.mkdirSync(WWW_DIR, { recursive: true });

console.log('\n[2/4] Copying web distribution files to Macruntime/www...');
fs.cpSync(APP_DIST, WWW_DIR, { recursive: true });

// 4. Create macOS Electron runtime files inside Macruntime
console.log('\n[3/4] Creating macOS runtime host files...');

const macPackageJson = {
  name: "verona-spark-engine-macruntime",
  version: "1.0.0",
  description: "Verona Spark Engine Standalone macOS Desktop Runtime Application",
  main: "main.js",
  private: true,
  dependencies: {
    "express": "^4.21.2"
  }
};

fs.writeFileSync(
  path.join(TARGET_DIR, 'package.json'),
  JSON.stringify(macPackageJson, null, 2)
);

const mainJsContent = `const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const express = require('express');

let mainWindow = null;
let serverInstance = null;

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1536,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Verona Spark Engine — Renewable SCADA & Stability Dashboard",
    icon: path.join(__dirname, 'www', 'image1.png'),
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // macOS Native Menu setup
  if (process.platform === 'darwin') {
    const template = [
      {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { role: 'close' }
        ]
      }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    mainWindow.setMenu(null);
  }

  mainWindow.loadURL(\`http://127.0.0.1:\${port}/\`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const serverApp = express();
  const wwwPath = path.join(__dirname, 'www');

  serverApp.use(express.static(wwwPath));

  // Single page application fallback
  serverApp.get('*', (req, res) => {
    res.sendFile(path.join(wwwPath, 'index.html'));
  });

  serverInstance = serverApp.listen(0, '127.0.0.1', () => {
    const port = serverInstance.address().port;
    console.log(\`Macruntime local web server running at http://127.0.0.1:\${port}\`);
    createWindow(port);
  });
});

app.on('activate', () => {
  if (mainWindow === null && serverInstance) {
    const port = serverInstance.address().port;
    createWindow(port);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverInstance) serverInstance.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverInstance) serverInstance.close();
});
`;

fs.writeFileSync(path.join(TARGET_DIR, 'main.js'), mainJsContent);

// macOS Shell Launcher Script (POSIX newline format)
const shLauncherContent = `#!/bin/bash
DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"
echo "========================================================"
echo "  Launching Verona Spark Engine macOS Desktop Runtime..."
echo "========================================================"

if command -v npx &> /dev/null
then
    npx electron .
else
    echo "[ERROR] Node.js / npx not found in PATH."
    exit 1
fi
`;

fs.writeFileSync(
  path.join(TARGET_DIR, 'Launch_Verona_Spark_Engine.sh'),
  shLauncherContent.replace(/\r\n/g, '\n')
);

// macOS Double-clickable .command file
const commandFileContent = `#!/bin/bash
DIR="$( cd "$( dirname "$0" )" && pwd )"
cd "$DIR"
./Launch_Verona_Spark_Engine.sh
`;

fs.writeFileSync(
  path.join(TARGET_DIR, 'Start_Verona_Spark_Engine.command'),
  commandFileContent.replace(/\r\n/g, '\n')
);

// macOS Info.plist metadata descriptor
const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Launch_Verona_Spark_Engine.sh</string>
    <key>CFBundleIconFile</key>
    <string>www/image1.png</string>
    <key>CFBundleIdentifier</key>
    <string>com.veronaspark.engine.mac</string>
    <key>CFBundleName</key>
    <string>Verona Spark Engine</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
`;

fs.writeFileSync(path.join(TARGET_DIR, 'Info.plist'), infoPlistContent);

console.log('\n[4/4] Installing runtime dependencies in Macruntime folder...');
try {
  execSync('npm install --production --silent', { cwd: TARGET_DIR, stdio: 'inherit', shell: true });
} catch (e) {
  console.warn('npm install warning:', e.message);
}

console.log('\n════════════════════════════════════════════════════════════');
console.log('  ✓ SUCCESS: macOS Runtime package created successfully!');
console.log(`  Location: ${TARGET_DIR}`);
console.log('  Files created:');
console.log(`    - ${path.join(TARGET_DIR, 'www')} (Production web application static assets)`);
console.log(`    - ${path.join(TARGET_DIR, 'main.js')} (Electron macOS main process runtime)`);
console.log(`    - ${path.join(TARGET_DIR, 'package.json')} (Runtime configuration)`);
console.log(`    - ${path.join(TARGET_DIR, 'Launch_Verona_Spark_Engine.sh')} (macOS Shell launcher script)`);
console.log(`    - ${path.join(TARGET_DIR, 'Start_Verona_Spark_Engine.command')} (macOS .command launcher file)`);
console.log(`    - ${path.join(TARGET_DIR, 'Info.plist')} (macOS App plist metadata)`);
console.log('════════════════════════════════════════════════════════════\n');
