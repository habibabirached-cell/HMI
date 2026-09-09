/**
 * Prepare slim CFG12 databank from Engie Madrid / Red Eléctrica CSVs.
 * Source: CSV Files - Red Eléctrica_CFG12/
 * Output: public/databank/CFG12/{bess|syncon|combined}/*.csv
 *
 * Usage: node scripts/prepare-cfg12-databank.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_CANDIDATES = [
  path.join(ROOT, 'CSV Files - Red Eléctrica_CFG12'),
  path.join(ROOT, 'CSV Files - Red Electrica_CFG12'),
];
const OUT = path.join(ROOT, 'public', 'databank', 'CFG12');
const TARGET_POINTS = 2000;

/** Excel Sheet3 map: mode → outStem → study folder suffix (A_n) */
const MAP = {
  bess: {
    SCL_450: 'A_1',
    SCL_150: 'A_4',
    VSTEP_p118: 'A_7',
    VSTEP_m10: 'A_10',
    VSTEP_p10: 'A_13',
    VSTEP_m15: 'A_16',
    ROCOF: 'A_19',
    PHJUMP_p30: 'A_22',
    PHJUMP_m30: 'A_25',
    PHJUMP_p35: 'A_28',
    PHJUMP_m35: 'A_31',
  },
  syncon: {
    SCL_450: 'A_3',
    SCL_150: 'A_6',
    VSTEP_p118: 'A_9',
    VSTEP_m10: 'A_12',
    VSTEP_p10: 'A_15',
    VSTEP_m15: 'A_18',
    ROCOF: 'A_21',
    // Sheet2 triples: BESS / Combined / SynCon — A_24/27/30/33 are SynCon ø (mislabeled BESS in Excel)
    PHJUMP_p30: 'A_24',
    PHJUMP_m30: 'A_27',
    PHJUMP_p35: 'A_30',
    PHJUMP_m35: 'A_33',
  },
  combined: {
    SCL_450: 'A_2',
    SCL_150: 'A_5',
    VSTEP_p118: 'A_8',
    VSTEP_m10: 'A_11',
    VSTEP_p10: 'A_14',
    VSTEP_m15: 'A_17',
    ROCOF: 'A_20',
    PHJUMP_p30: 'A_23',
    PHJUMP_m30: 'A_26',
    PHJUMP_p35: 'A_29',
    PHJUMP_m35: 'A_32',
  },
};

function findSrcRoot() {
  for (const p of SRC_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function studyCsvPath(srcRoot, suffix) {
  const folder = `GFM_1571_DC_EngieMadrid_${suffix}`;
  return path.join(srcRoot, folder, `${folder}_Dataframe.csv`);
}

async function slimCopy(srcFile, destFile) {
  await fs.promises.mkdir(path.dirname(destFile), { recursive: true });
  const size = fs.statSync(srcFile).size;
  const approxRows = Math.max(1, Math.floor(size / 80));
  const step = Math.max(1, Math.ceil(approxRows / TARGET_POINTS));

  const out = fs.createWriteStream(destFile, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fs.createReadStream(srcFile, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let headerDone = false;
  let unitRowSkipped = false;
  let idx = 0;
  let written = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const clean = line.replace(/^\uFEFF/, '');
    if (!headerDone) {
      out.write(clean + '\n');
      headerDone = true;
      continue;
    }
    // Skip "Main,Main,..." unit row
    if (!unitRowSkipped) {
      const first = clean.split(',')[0]?.trim().toLowerCase();
      if (first === 'main' || Number.isNaN(parseFloat(first))) {
        unitRowSkipped = true;
        continue;
      }
      unitRowSkipped = true;
    }
    if (idx % step === 0) {
      out.write(clean + '\n');
      written++;
    }
    idx++;
  }

  await new Promise((resolve, reject) => {
    out.end(() => resolve());
    out.on('error', reject);
  });

  return { dataRows: idx, step, written };
}

async function main() {
  const srcRoot = findSrcRoot();
  if (!srcRoot) {
    console.error('Missing CFG12 source folder (CSV Files - Red Eléctrica_CFG12)');
    process.exit(1);
  }
  console.log(`Source: ${srcRoot}`);
  console.log(`Out:    ${OUT}`);

  let ok = 0;
  let fail = 0;

  for (const [mode, stems] of Object.entries(MAP)) {
    for (const [stem, suffix] of Object.entries(stems)) {
      const src = studyCsvPath(srcRoot, suffix);
      const dest = path.join(OUT, mode, `${stem}.csv`);
      if (!fs.existsSync(src)) {
        console.warn(`  MISSING ${mode}/${stem} ← ${suffix}`);
        fail++;
        continue;
      }
      process.stdout.write(`  ${mode}/${stem}.csv ← ${suffix} ... `);
      const t0 = Date.now();
      const { written, step, dataRows } = await slimCopy(src, dest);
      const kb = (fs.statSync(dest).size / 1024).toFixed(1);
      console.log(
        `${written} pts (scanned ${dataRows}, step=${step}) → ${kb} KB in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
      );
      ok++;
    }
  }

  console.log(`\nDone. ${ok} files written, ${fail} missing.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
