import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'src-tauri', 'icons');

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// 1x1 transparent PNG header + IHDR/IDAT chunks base64 for fallback valid PNG image
const samplePngPath = path.join(ROOT, 'public', 'image1.png');

if (fs.existsSync(samplePngPath)) {
  const pngData = fs.readFileSync(samplePngPath);
  const iconNames = [
    '32x32.png',
    '128x128.png',
    '128x128@2x.png',
    'Square30x30Logo.png',
    'Square44x44Logo.png',
    'Square71x71Logo.png',
    'Square89x89Logo.png',
    'Square107x107Logo.png',
    'Square142x142Logo.png',
    'Square150x150Logo.png',
    'Square284x284Logo.png',
    'Square310x310Logo.png',
    'StoreLogo.png',
    'icon.ico',
    'icon.icns'
  ];

  for (const name of iconNames) {
    const dest = path.join(ICONS_DIR, name);
    fs.writeFileSync(dest, pngData);
  }
  console.log(`Successfully generated ${iconNames.length} icon files in src-tauri/icons`);
} else {
  console.error('public/image1.png not found');
}
