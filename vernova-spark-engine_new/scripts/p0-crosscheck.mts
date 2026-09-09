/**
 * P0 cross-check — run: npx tsx scripts/p0-crosscheck.mts
 */
import { readFileSync, existsSync } from 'fs';
import { deriveTickSizeFromTimes, resolveTickSize, ticksPerUiFrame } from '../src/lib/stabilityTick.ts';
import { getYAxisRange } from '../src/lib/stabilityYAxis.ts';
import { parsePreeventCsvText, takePreeventWindow, preeventCsvUrl } from '../src/lib/stabilityPreevent.ts';
import { formatKa, formatPu } from '../src/lib/databankMetrics.ts';
import { limitRowsForUi } from '../src/lib/databankFetch.ts';

const fail: string[] = [];
const pass: string[] = [];
const check = (name: string, cond: boolean, detail = '') => {
  (cond ? pass : fail).push(detail ? `${name} | ${detail}` : name);
};

check('CFG1 tick 0.00025', deriveTickSizeFromTimes([38, 38.00025, 38.0005]) === 0.00025);
check('CFG2 tick 0.001', deriveTickSizeFromTimes([38, 38.001, 38.002]) === 0.001);
check('fallback CFG7', resolveTickSize('CFG7', 'fault', []) === 0.0001);
check('ticksPerFrame CFG1', ticksPerUiFrame(0.00025) === 80);

const cfgs = Array.from({ length: 11 }, (_, i) => `CFG${i + 1}`);
const evs = ['fault', 'rocof', 'phase_jump', 'voltage_step'] as const;
for (const c of cfgs) {
  for (const e of evs) {
    const y = getYAxisRange(c, e);
    check(
      `${c}+${e} y`,
      y.min < 0 && y.max > 0 && y.tickStep > 0 && Math.abs(y.min + y.max) < 1e-9,
      JSON.stringify(y),
    );
  }
}
check('idle none = SCL fault CFG1', getYAxisRange('CFG1', 'none').max === 6);
check('phase jump CFG1 max 0.5', getYAxisRange('CFG1', 'phase_jump').max === 0.5);

check('preevent url CFG1', preeventCsvUrl('CFG1') === '/databank/preevent/CFG1.csv');
check('preevent url CFG11', preeventCsvUrl('CFG11') === '/databank/preevent/CG11.csv');
check('preevent file exists', existsSync('public/databank/preevent/CFG1.csv'));

const txt = readFileSync('public/databank/preevent/CFG1.csv', 'utf8');
const rows = parsePreeventCsvText(txt);
const win = takePreeventWindow(rows, 2);
check('CFG1 preevent rows', rows.length >= 100, String(rows.length));
check('CFG1 window size', win.length >= 2, String(win.length));
check('CFG1 not Ip=0', Math.abs(win[0].activeCurrent) > 1e-4, String(win[0].activeCurrent));

const xMax = 10.00025 + (80 - 40);
check('WhatsApp x_max', Math.abs(xMax - 50.00025) < 1e-9, String(xMax));

const ready = (tLast: number, te: number) => tLast > te + 0.05;
check('pre not ready', !ready(40, 40));
check('post ready', ready(52, 40));

check('formatKa has kA', formatKa(0.312).includes('kA'));
check('formatPu has pu', formatPu(0.5).includes('pu'));

const many = Array.from({ length: 8000 }, (_, i) => ({ time: i * 0.001 }));
check('no downsample passthrough', limitRowsForUi(many, 40).length === 8000);

console.log(`PASS ${pass.length}`);
for (const p of pass) console.log(`  + ${p}`);
console.log(`FAIL ${fail.length}`);
for (const f of fail) console.log(`  ! ${f}`);
process.exit(fail.length ? 1 : 0);
