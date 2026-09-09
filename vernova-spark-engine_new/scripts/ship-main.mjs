/**
 * Single ship flow for Ameen + Gyan (GitLab origin + Netlify prod).
 *
 * - On a feature branch: merge into main, push main
 * - Already on main: sync / push main if needed
 * - Always: production Netlify redeploy (publish = dist)
 *
 * Usage: npm run ship
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const REMOTE = 'origin';
const MAIN = 'main';
const NETLIFY_SITE_ID = '252d299e-a77d-441f-a8fe-29dda7ada6a7';
const PROD_URL = 'https://verona-spark-engine-aplus-04.netlify.app';

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  return execSync(cmd, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    ...opts,
  });
}

function runCapture(cmd) {
  return execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
  }).trim();
}

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

function main() {
  console.log('════════════════════════════════════════');
  console.log('  SHIP → main + Netlify production');
  console.log('════════════════════════════════════════');

  // 1) Safety: no uncommitted work
  const dirty = runCapture('git status --porcelain');
  if (dirty) {
    fail(
      'Working tree has uncommitted changes. Commit or stash first, then run: npm run ship',
    );
  }

  // 2) Fetch latest
  run(`git fetch ${REMOTE} --prune`);

  const branch = runCapture('git branch --show-current');
  if (!branch) fail('Detached HEAD is not supported. Checkout a branch first.');

  console.log(`\nCurrent branch: ${branch}`);

  // 3) Merge into main when needed
  if (branch !== MAIN) {
    console.log(`\n→ Feature branch detected. Merging ${branch} → ${MAIN}…`);

    // Ensure feature branch is on remote (helps Gyan / history)
    const upstream = (() => {
      try {
        return runCapture(`git rev-parse --abbrev-ref --symbolic-full-name @{u}`);
      } catch {
        return '';
      }
    })();
    if (!upstream) {
      run(`git push -u ${REMOTE} HEAD`);
    } else {
      run(`git push ${REMOTE} HEAD`);
    }

    run(`git checkout ${MAIN}`);
    run(`git pull ${REMOTE} ${MAIN}`);

    try {
      run(`git merge ${branch} -m "Merge branch '${branch}' into ${MAIN}"`);
    } catch {
      fail(
        `Merge conflict while merging ${branch} into ${MAIN}. Resolve conflicts, then run: npm run ship`,
      );
    }

    run(`git push ${REMOTE} ${MAIN}`);
  } else {
    console.log(`\n→ Already on ${MAIN}. Syncing with ${REMOTE}/${MAIN}…`);
    run(`git pull ${REMOTE} ${MAIN}`);

    const ahead = runCapture(
      `git rev-list --count ${REMOTE}/${MAIN}..HEAD`,
    );
    if (Number(ahead) > 0) {
      console.log(`\n→ Local ${MAIN} is ${ahead} commit(s) ahead. Pushing…`);
      run(`git push ${REMOTE} ${MAIN}`);
    } else {
      console.log(`\n→ ${MAIN} already up to date with remote. Nothing to merge.`);
    }
  }

  const tip = runCapture('git log -1 --oneline');
  console.log(`\n✓ ${MAIN} tip: ${tip}`);

  // 4) Build (Netlify Nitro preset) then production deploy
  console.log('\n→ Building production bundle (NITRO_PRESET=netlify)…');
  run(
    process.platform === 'win32'
      ? 'set NITRO_PRESET=netlify&& npm run build'
      : 'NITRO_PRESET=netlify npm run build',
  );

  console.log('\n→ Deploying to Netlify production…');
  run(
    `npx netlify deploy --prod --site=${NETLIFY_SITE_ID} --dir=dist --message "ship: ${tip.replace(/"/g, '')}"`,
  );

  console.log('\n════════════════════════════════════════');
  console.log('  ✓ SHIP COMPLETE');
  console.log(`  Live: ${PROD_URL}`);
  console.log('  Hard-refresh (Ctrl+F5) if cache looks stale.');
  console.log('════════════════════════════════════════\n');
}

try {
  if (!existsSync(path.join(ROOT, 'netlify.toml'))) {
    fail('netlify.toml not found — run from repo root.');
  }
  main();
} catch (err) {
  fail(err?.message || String(err));
}
