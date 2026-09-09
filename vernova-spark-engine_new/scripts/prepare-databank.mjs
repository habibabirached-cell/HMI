/**
 * Stream Databank_Aug14 CSVs → cropped public/databank copies (WP5 Option A).
 *
 * Hard rule (Gyan): never thin / average / invent samples — crop/split only.
 * Writes per event:
 *   {SCL|ROCOF|PHJUMP|VSTEP}.pre.csv  — ~2 s before event → event
 *   {SCL|ROCOF|PHJUMP|VSTEP}.post.csv — event → end of source
 *   {SCL|ROCOF|PHJUMP|VSTEP}.csv      — combined (pre+post) for legacy / Analytics
 *
 * Usage: node scripts/prepare-databank.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_AUG14 = path.join(ROOT, 'Databank_Aug14');
const SRC_AUG12 = path.join(ROOT, 'DataBank_Aug12th');
const SRC_LEGACY = path.join(ROOT, 'Databank');
const OUT = path.join(ROOT, 'public', 'databank');
const EVENTS = ['SCL', 'ROCOF', 'PHJUMP', 'VSTEP'];
/** Seconds of pre-event context (Asha/Gyan §4.9). */
const PRE_EVENT_S = 2.0;
/** Cap post window so browser/Netlify stay usable (still full sample rate inside window). */
const POST_EVENT_S = 12.0;
/** Lead-in kept inside .post.csv so Inertia (P just before tr) works on post-only loads. */
const POST_LEAD_S = 2.0;

/** Event start times (s) from Databank_Info_Aug14.xlsx → DataBank_Info */
const EVENT_TIME_SEC = {
  CFG1: { SCL: 40, ROCOF: 40, PHJUMP: 40, VSTEP: 40 },
  CFG2: { SCL: 40, ROCOF: 40, PHJUMP: 40, VSTEP: 40 },
  CFG3: { SCL: 40, ROCOF: 40, PHJUMP: 40, VSTEP: 40 },
  CFG4: { SCL: 80, ROCOF: 80, PHJUMP: 80, VSTEP: 80 },
  CFG5: { SCL: 40, ROCOF: 40, PHJUMP: 40, VSTEP: 40 },
  CFG6: { SCL: 10, ROCOF: 10, PHJUMP: 10, VSTEP: 10 },
  CFG7: { SCL: 5, ROCOF: 5, PHJUMP: 5, VSTEP: 5 },
  CFG8: { SCL: 40, ROCOF: 40, PHJUMP: 40, VSTEP: 40 },
  CFG9: { SCL: 2, ROCOF: 2, PHJUMP: 2, VSTEP: 2 },
  CFG10: { SCL: 40, ROCOF: 40, PHJUMP: 40, VSTEP: 40 },
  CFG11: { SCL: 40, ROCOF: 40, PHJUMP: 40, VSTEP: 40 },
};

function folderHasCfgDirs(dir) {
  if (!fs.existsSync(dir)) return false;
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .some((d) => d.isDirectory() && /^CFG\d+$/i.test(d.name));
}

function resolveSourceRoot() {
  if (folderHasCfgDirs(SRC_AUG14)) return SRC_AUG14;
  if (folderHasCfgDirs(SRC_AUG12)) return SRC_AUG12;
  return SRC_LEGACY;
}

function parseCsvLine(line, sep) {
  return line.split(sep).map((c) => c.trim());
}

/** Fast t0/t1 from first data row + last ~64KB of file. */
function getTimeRange(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const headBuf = Buffer.alloc(Math.min(8192, fs.statSync(filePath).size));
    fs.readSync(fd, headBuf, 0, headBuf.length, 0);
    const headText = headBuf.toString('utf8').replace(/^\uFEFF/, '');
    const headLines = headText.split(/\r?\n/).filter((l) => l.trim());
    if (headLines.length < 2) return null;
    const sep = headLines[0].includes(';') ? ';' : ',';
    const header = parseCsvLine(headLines[0], sep);
    const tIdx = header.findIndex(
      (h) => /^t(\s+main)?$/i.test(h) || h.toLowerCase() === 't main',
    );
    if (tIdx < 0) return null;

    let t0 = null;
    for (let i = 1; i < headLines.length; i++) {
      const cols = parseCsvLine(headLines[i], sep);
      const v = parseFloat(cols[tIdx]);
      if (!Number.isNaN(v)) {
        t0 = v;
        break;
      }
    }
    if (t0 == null) return null;

    const size = fs.statSync(filePath).size;
    const tailLen = Math.min(65536, size);
    const tailBuf = Buffer.alloc(tailLen);
    fs.readSync(fd, tailBuf, 0, tailLen, size - tailLen);
    const tailText = tailBuf.toString('utf8');
    const tailLines = tailText.split(/\r?\n/).filter((l) => l.trim());
    let t1 = t0;
    for (let i = tailLines.length - 1; i >= 0; i--) {
      const cols = parseCsvLine(tailLines[i], sep);
      if (cols.length <= tIdx) continue;
      const v = parseFloat(cols[tIdx]);
      if (!Number.isNaN(v)) {
        t1 = v;
        break;
      }
    }
    return { t0, t1, tIdx, sep };
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Prefer CSV whose window contains Excel event time.
 * Tie-break: non-backup over backup; then preferred filename.
 */
function pickCsv(eventDir, cfg, event) {
  const csvs = fs
    .readdirSync(eventDir)
    .filter((f) => f.toLowerCase().endsWith('.csv'));
  if (!csvs.length) return null;

  const eventTime = EVENT_TIME_SEC[cfg]?.[event] ?? null;
  const scored = csvs.map((name) => {
    const full = path.join(eventDir, name);
    const range = getTimeRange(full);
    const isBackup = /_backup\.csv$/i.test(name);
    let score = 0;
    if (range && eventTime != null) {
      if (range.t0 - 0.5 <= eventTime && eventTime <= range.t1 + 0.5) score += 100;
      if (range.t0 <= 1) score += 5;
    }
    if (!isBackup) score += 2;
    const preferred = [`${event}_${cfg}.csv`, `${event}.csv`, `${cfg}_${event}.csv`].some(
      (p) => p.toLowerCase() === name.toLowerCase(),
    );
    if (preferred) score += 1;
    return { name, score, range, isBackup };
  });

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const best = scored[0];
  if (
    eventTime != null &&
    best.range &&
    !(best.range.t0 - 0.5 <= eventTime && eventTime <= best.range.t1 + 0.5)
  ) {
    console.warn(
      `  warn ${cfg}/${event}: no CSV window contains t=${eventTime}s — using ${best.name} [${best.range.t0}..${best.range.t1}]`,
    );
  } else if (best.isBackup) {
    console.log(`  note ${cfg}/${event}: using backup (matches event t=${eventTime}s)`);
  }
  return best.name;
}

/**
 * Crop/split with identical sample values (no downsample).
 * pre:  [te - PRE_EVENT_S, te]
 * post: [te - POST_LEAD_S, te + POST_EVENT_S]  (lead-in for Inertia dial)
 * full: [te - PRE_EVENT_S, te + POST_EVENT_S]
 */
async function cropSplitCsv(srcFile, destPre, destPost, destFull, eventTime) {
  await fs.promises.mkdir(path.dirname(destFull), { recursive: true });

  const meta = getTimeRange(srcFile);
  if (!meta) throw new Error(`Cannot read time column: ${srcFile}`);
  const { tIdx, sep } = meta;
  const tStart = Math.max(0, eventTime - PRE_EVENT_S);
  const tEnd = eventTime + POST_EVENT_S;
  const postStart = Math.max(0, eventTime - POST_LEAD_S);

  const outPre = fs.createWriteStream(destPre, { encoding: 'utf8' });
  const outPost = fs.createWriteStream(destPost, { encoding: 'utf8' });
  const outFull = fs.createWriteStream(destFull, { encoding: 'utf8' });

  const rl = readline.createInterface({
    input: fs.createReadStream(srcFile, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let headerDone = false;
  let scanned = 0;
  let preN = 0;
  let postN = 0;

  const writeAll = (line) => {
    outPre.write(line);
    outPost.write(line);
    outFull.write(line);
  };

  for await (const raw of rl) {
    if (!raw.trim()) continue;
    const line = (headerDone ? raw : raw.replace(/^\uFEFF/, '')) + '\n';
    if (!headerDone) {
      writeAll(line);
      headerDone = true;
      continue;
    }
    scanned++;
    const cols = parseCsvLine(raw, sep);
    const t = parseFloat(cols[tIdx]);
    if (Number.isNaN(t)) continue;
    if (t + 1e-9 < tStart) continue;
    if (t > tEnd + 1e-9) continue;

    outFull.write(line);
    if (t <= eventTime + 1e-9) {
      outPre.write(line);
      preN++;
    }
    if (t + 1e-9 >= postStart) {
      outPost.write(line);
      postN++;
    }
  }

  await Promise.all(
    [outPre, outPost, outFull].map(
      (s) =>
        new Promise((resolve, reject) => {
          s.end(() => resolve());
          s.on('error', reject);
        }),
    ),
  );

  return { scanned, preN, postN, tStart, tEnd, eventTime };
}

async function main() {
  const SRC = resolveSourceRoot();
  if (!fs.existsSync(SRC)) {
    console.error(`Missing source folder: ${SRC}`);
    process.exit(1);
  }

  console.log(`Source: ${SRC}`);
  console.log(`Mode: crop/split only (pre=${PRE_EVENT_S}s) — NO downsample`);

  const onlyCfg = process.argv.find((a) => /^CFG\d+$/i.test(a))?.toUpperCase();

  const cfgDirs = fs
    .readdirSync(SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^CFG\d+$/i.test(d.name))
    .map((d) => d.name)
    .filter((n) => !onlyCfg || n.toUpperCase() === onlyCfg)
    .sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ''), 10);
      const nb = parseInt(b.replace(/\D/g, ''), 10);
      return na - nb;
    });

  console.log(`Found ${cfgDirs.length} CFG folder(s)`);

  for (const cfg of cfgDirs) {
    for (const event of EVENTS) {
      const eventDir = path.join(SRC, cfg, event);
      if (!fs.existsSync(eventDir)) {
        console.log(`  skip ${cfg}/${event} (no folder)`);
        continue;
      }
      const chosen = pickCsv(eventDir, cfg, event);
      if (!chosen) {
        console.log(`  skip ${cfg}/${event} (no csv)`);
        continue;
      }
      const eventTime = EVENT_TIME_SEC[cfg]?.[event];
      if (eventTime == null) {
        console.log(`  skip ${cfg}/${event} (no EVENT_TIME)`);
        continue;
      }
      const srcFile = path.join(eventDir, chosen);
      const stem = path.join(OUT, cfg, event);
      process.stdout.write(`  ${cfg}/${event} ← ${chosen} @${eventTime}s ... `);
      const t0 = Date.now();
      const stats = await cropSplitCsv(
        srcFile,
        `${stem}.pre.csv`,
        `${stem}.post.csv`,
        `${stem}.csv`,
        eventTime,
      );
      const mb = (fs.statSync(`${stem}.csv`).size / (1024 * 1024)).toFixed(2);
      console.log(
        `pre=${stats.preN} post=${stats.postN} (scanned ${stats.scanned}) → ${mb} MB in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
      );
    }
  }

  console.log(`\nDone. Cropped files in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
