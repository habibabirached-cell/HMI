/**
 * Prepare slim CFG13 databank from AEMO / Transgrid HYB_GFL_RS8 studies.
 * Source: CFG13/HYB_GFL_RS8_50_001_A_1/HYB_GFL_RS8_50_001_A_{n}/*_Dataframe.csv
 * Output: public/databank/CFG13/{bess|syncon|combined}/*.csv
 *
 * Usage: node scripts/prepare-cfg13-databank.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(ROOT, 'CFG13');
const STUDY_PARENT = path.join(SRC_ROOT, 'HYB_GFL_RS8_50_001_A_1');
const OUT = path.join(ROOT, 'public', 'databank', 'CFG13');
const TARGET_POINTS = 2000;

/** Excel Sheet2 / Experiment_analysis map: mode → outStem → A_n */
const MAP = {
  bess: {
    SCL_430: 'A_1',
    SCL_150: 'A_4',
    VSTEP_p2: 'A_7',
    VSTEP_m2: 'A_10',
    ROCOF_m1: 'A_13',
    ROCOF_p1: 'A_16',
    PHJUMP_p60: 'A_19',
  },
  syncon: {
    SCL_430: 'A_3',
    SCL_150: 'A_6',
    VSTEP_p2: 'A_9',
    VSTEP_m2: 'A_12',
    ROCOF_m1: 'A_15',
    ROCOF_p1: 'A_18',
    PHJUMP_p60: 'A_21',
  },
  combined: {
    SCL_430: 'A_2',
    SCL_150: 'A_5',
    VSTEP_p2: 'A_8',
    VSTEP_m2: 'A_11',
    ROCOF_m1: 'A_14',
    ROCOF_p1: 'A_17',
    PHJUMP_p60: 'A_20',
  },
};

function studyCsvPath(suffix) {
  const folder = `HYB_GFL_RS8_50_001_${suffix}`;
  return path.join(STUDY_PARENT, folder, `${folder}_Dataframe.csv`);
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
  if (!fs.existsSync(STUDY_PARENT)) {
    console.error(`Missing CFG13 study parent: ${STUDY_PARENT}`);
    process.exit(1);
  }
  console.log(`Source: ${STUDY_PARENT}`);
  console.log(`Out:    ${OUT}`);

  let ok = 0;
  let fail = 0;

  for (const [mode, stems] of Object.entries(MAP)) {
    for (const [stem, suffix] of Object.entries(stems)) {
      const src = studyCsvPath(suffix);
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
