import {
  STABILITY_INITIAL_X_SEC,
  getInitialXSize,
  computeEventXMax,
  chartXAxisMax,
} from '../src/lib/stabilityInitialX.ts';
import {
  phaseForActiveEvent,
  getEventTimeSec,
  getDatabankCsvUrl,
  getDatabankAnalyticsCsvUrl,
} from '../src/lib/stabilityDatabank.ts';
import { ticksPerUiFrame } from '../src/lib/stabilityTick.ts';
import { preeventCsvUrl } from '../src/lib/stabilityPreevent.ts';

let fail = 0;
function ok(cond: boolean, msg: string) {
  console.log(`${cond ? 'OK' : 'FAIL'} — ${msg}`);
  if (!cond) fail += 1;
}

const WA: Record<string, number> = {
  CFG1: 40,
  CFG2: 40,
  CFG3: 40,
  CFG4: 70,
  CFG5: 40,
  CFG6: 10,
  CFG7: 5,
  CFG8: 40,
  CFG9: 8,
  CFG10: 40,
  CFG11: 30,
};

console.log('=== Code helpers vs Gyan WhatsApp / pack ===');
for (const [k, v] of Object.entries(WA)) {
  ok(STABILITY_INITIAL_X_SEC[k] === v && getInitialXSize(k) === v, `InitialX ${k}=${v}`);
}
ok(getInitialXSize('CFG12') === null, 'CFG12 no InitialX');
ok(getInitialXSize('CFG13') === null, 'CFG13 no InitialX');

ok(phaseForActiveEvent('none') === 'pre', 'idle → pre');
ok(phaseForActiveEvent('fault') === 'post', 'event → post');
ok(phaseForActiveEvent('phase_jump') === 'post', 'phase_jump → post');

ok(getDatabankCsvUrl('CFG1', 'fault', 'pre') === '/databank/CFG1/SCL.pre.csv', 'pre URL');
ok(getDatabankCsvUrl('CFG1', 'fault', 'post') === '/databank/CFG1/SCL.post.csv', 'post URL');
ok(
  getDatabankAnalyticsCsvUrl('CFG7', 'rocof') === '/databank/CFG7/Analytics/ROCOF.csv',
  'Analytics URL',
);
ok(preeventCsvUrl('CFG1') === '/databank/CFG1/SCL.pre.csv', 'idle preevent URL');

ok(getEventTimeSec('CFG1', 'fault') === 40, 'CFG1 t_event');
ok(getEventTimeSec('CFG4', 'fault') === 80, 'CFG4 t_event');
ok(getEventTimeSec('CFG7', 'fault') === 5, 'CFG7 t_event');
ok(getEventTimeSec('CFG9', 'fault') === 2, 'CFG9 t_event');

ok(computeEventXMax({ cfgName: 'CFG1', xPre: 0.5, tEvent: 40, tLast: 80 }) === 40.5, 'CFG1 x_max');
ok(computeEventXMax({ cfgName: 'CFG7', xPre: 1, tEvent: 5, tLast: 10 }) === 6, 'CFG7 x_max');
ok(computeEventXMax({ cfgName: 'CFG4', xPre: 2, tEvent: 80, tLast: 150 }) === 72, 'CFG4 x_max');
ok(
  computeEventXMax({ cfgName: 'CFG1', xPre: 0, tEvent: 40, tLast: 90 }) === 50,
  'uses max(InitialX, csvSpan)',
);

ok(chartXAxisMax({ cfgName: 'CFG7', graphTime: 0.2, eventXMax: null, hasPoints: true }) === 5, 'no shrink CFG7');
ok(chartXAxisMax({ cfgName: 'CFG4', graphTime: 0, eventXMax: null, hasPoints: false }) === 70, 'CFG4 start 70');
ok(chartXAxisMax({ cfgName: 'CFG1', graphTime: 10, eventXMax: 40.5, hasPoints: true }) === 40.5, 'extends with x_max');
ok(chartXAxisMax({ cfgName: 'CFG1', graphTime: 3, eventXMax: null, hasPoints: true }) === 40, 'floor InitialX');

ok(ticksPerUiFrame(0.00025) > ticksPerUiFrame(0.00025, 0.02), 'slightly faster than 0.02');

console.log('\nFAILS:', fail);
process.exit(fail ? 1 : 0);
