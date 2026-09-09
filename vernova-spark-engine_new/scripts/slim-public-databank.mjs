import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATABANK_DIR = path.join(ROOT, 'public', 'databank');
const TARGET_POINTS = 2500;

async function slimCsvFile(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size < 2 * 1024 * 1024) {
    // Already small (<2MB)
    return null;
  }

  const tmpPath = filePath + '.tmp';
  const out = fs.createWriteStream(tmpPath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  // First count approximate rows based on size
  const avgLineBytes = 160;
  const approxRows = Math.max(1, Math.floor(stat.size / avgLineBytes));
  const step = Math.max(1, Math.ceil(approxRows / TARGET_POINTS));

  let headerDone = false;
  let idx = 0;
  let written = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!headerDone) {
      out.write(line.replace(/^\uFEFF/, '') + '\n');
      headerDone = true;
      continue;
    }
    if (idx % step === 0) {
      out.write(line + '\n');
      written++;
    }
    idx++;
  }

  await new Promise((resolve, reject) => {
    out.end(() => resolve());
    out.on('error', reject);
  });

  fs.unlinkSync(filePath);
  fs.renameSync(tmpPath, filePath);

  const newStat = fs.statSync(filePath);
  return {
    oldMB: (stat.size / (1024 * 1024)).toFixed(2),
    newMB: (newStat.size / (1024 * 1024)).toFixed(2),
    rows: idx,
    written,
  };
}

async function scanAndSlim(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await scanAndSlim(fullPath);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.csv')) {
      const rel = path.relative(DATABANK_DIR, fullPath);
      const res = await slimCsvFile(fullPath);
      if (res) {
        console.log(`Slimmed ${rel}: ${res.oldMB} MB (${res.rows} rows) -> ${res.newMB} MB (${res.written} rows)`);
      } else {
        console.log(`Skipped ${rel} (already < 2MB)`);
      }
    }
  }
}

async function main() {
  console.log(`Scanning ${DATABANK_DIR}...`);
  await scanAndSlim(DATABANK_DIR);
  console.log('All files processed.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
