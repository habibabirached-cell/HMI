# Production Deployment Guide

| | |
|---|---|
| **Document** | Verona Spark Engine version 2 — production deploy |
| **Prepared by** | Ameen Pasha A |
| **Organization** | Aplus Technology |
| **Shared with** | Gyan (manager) and team using the same GitLab + Netlify |
| **Date** | 26 July 2026 |
| **Status** | Current / only official deploy guide for version 2 |

This guide replaces all older version 1 deploy notes. Follow only these steps so
everyone deploys the same repository, branch, and Netlify site.

---

## What is `main`? Which branch do we deploy?

| Term | Meaning |
|------|---------|
| **`main`** | The **production branch**. This is the single source of truth for the live website. Whatever is on `main` (after a successful ship) is what we build and publish to Netlify. |
| **Feature branch** | Any other branch used for day-to-day work (for example `form-bulbing-and-other-changes`). Work here first, then ship merges it into `main` before deploy. |
| **Deploy target** | Always **`main` → Netlify production**. We do **not** deploy feature branches directly to the live URL. |

Simple rule:

1. Develop and commit on a **feature branch** (or on `main` if the change is small and agreed).
2. Run **`npm run ship`**.
3. If you were on a feature branch, the script **merges that branch into `main`**, pushes `main`, then redeploys.
4. If you were already on **`main`**, it only syncs/pushes `main` if needed, then redeploys.
5. Netlify builds from the committed code on **`main`** and publishes the **`dist`** folder to the live site.

So: **live site = content of `main` after ship**, not “whatever branch I happen to be on.”

---

## Production details

| Item | Production value |
|------|------------------|
| Git remote name | `origin` |
| GitLab repository | `https://gitlab.com/ameen_aplus/verona-spark-engine-version2.git` |
| **Branch used for production** | **`main`** |
| Netlify site name | `verona-spark-engine-version3-aplus-497` |
| Netlify site ID | `7809e43f-517b-4960-9f17-cbc21d4f19c1` |
| Live URL | https://verona-spark-engine-version3-aplus-497.netlify.app |
| Netlify account | `ameenpa05@gmail.com` (free; version2 ge-verna credits paused) |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Production Node version | 18 |
| One-command ship | `npm run ship` (`scripts/ship-main.mjs`) |

> Do **not** deploy from `origin-v1`, the old `verona-spark-engine` repo, or
> `.output/public`. The Netlify Nitro build puts CSS, JS, images, and public
> assets in **`dist`**. Publishing the wrong folder can make the live site look
> unstyled or missing images.

---

## When can you run `npm run ship`?

Run it **only when all of these are true**:

| Ready? | Condition |
|--------|-----------|
| Yes | Your changes are **already committed** (`git status` is clean — no modified/untracked files) |
| Yes | You are on the branch that contains the work you want live (feature branch **or** `main`) |
| Yes | You have GitLab push access and Netlify login |
| No | You still have unfinished edits that are not committed |
| No | `git status` shows modified, staged, or untracked files |

### Quick check before ship

```bash
git status
```

You are ready when you see something like:

```text
nothing to commit, working tree clean
```

Then run:

```bash
npm run ship
```

### If ship stops with this error

```text
Working tree has uncommitted changes. Commit or stash first, then run: npm run ship
```

That means you are **not ready yet**. Do this first:

```bash
git status
git add <files>
git commit -m "Describe the completed change"
git status
npm run ship
```

Or, if the local files are not ready to ship, stash them and ship later:

```bash
git stash
npm run ship
git stash pop
```

**Remember:** ship never deploys half-finished local edits. Commit first, then ship.

---

## Recommended workflow: one command

**Only after** the working tree is clean (see section above), from the repository root:

```bash
npm run ship
```

What `npm run ship` does:

1. Stops if there are uncommitted or untracked changes (you must commit first).
2. Fetches the latest branches from `origin`.
3. Reads the current branch name.
4. **If current branch is not `main` (feature branch):**
   - pushes the feature branch to `origin`;
   - checks out `main`;
   - pulls latest `origin/main`;
   - merges the feature branch into `main`;
   - pushes updated `main`.
5. **If current branch is already `main`:**
   - pulls latest `origin/main`;
   - pushes only if local `main` is ahead of remote;
   - skips merge (nothing extra to merge).
6. Builds and deploys **`dist`** to Netlify production.
7. Prints the deployed commit and live URL.

After shipping from a feature branch, your local checkout ends on **`main`**.

---

## Before running `npm run ship`

### 1. Confirm branch and clean status

```bash
git branch --show-current
git status
```

- If you see a name other than `main`, you are on a **feature branch** (that is fine).
- If you see `main`, you are on the **production branch**.
- If `git status` is **not** clean, commit (or stash) before shipping.

### 2. Commit the intended work (required)

```bash
git add <files>
git commit -m "Describe the completed change"
```

Confirm again:

```bash
git status
```

Do not run ship with uncommitted work. The script will stop and will not merge or deploy.

### 3. Confirm access

You need:

- push access to the version 2 GitLab repo;
- permission to update **`main`**;
- Netlify CLI login for this production site.

```bash
npx netlify status
```

If needed:

```bash
npx netlify login
```

---

## Branch behavior (examples)

### A) Work on a feature branch, then deploy

```bash
git checkout my-feature
# ... make changes ...
git add <files>
git commit -m "Describe the completed change"
git status          # must be clean
npm run ship
```

Result: feature branch is pushed → merged into **`main`** → **`main`** is pushed → Netlify production redeploy. Live site updates from **`main`**.

### B) Already on `main`, then redeploy

```bash
git checkout main
# ... make changes (if any) ...
git add <files>
git commit -m "Describe the completed change"
git status          # must be clean
npm run ship
```

Result: sync with `origin/main` → push only if needed → Netlify production redeploy. No feature merge.

## Manual workflow

Use this only when the one-command script cannot be used.

### From a feature branch

Replace `<feature-branch>` with the current branch name:

```bash
git status
git push -u origin <feature-branch>
git checkout main
git pull origin main
git merge <feature-branch> -m "Merge branch '<feature-branch>' into main"
git push origin main
npx netlify deploy --prod --site=7809e43f-517b-4960-9f17-cbc21d4f19c1 --dir=dist --message "Production deploy"
```

### From `main`

```bash
git status
git pull origin main
git push origin main
npx netlify deploy --prod --site=7809e43f-517b-4960-9f17-cbc21d4f19c1 --dir=dist --message "Production redeploy"
```

## Verify the deployment

After the command completes:

1. Confirm that Netlify reports `Deploy is live`.
2. Open https://verona-spark-engine-version3-aplus-497.netlify.app.
3. Hard-refresh with `Ctrl+F5` to bypass cached assets.
4. Confirm that CSS, homepage images, and the changed feature load correctly.
5. If needed, open the deploy URL or build-log URL printed by Netlify CLI.

For an asset-level check, verify that a current CSS or image URL returns HTTP
`200`, not `404`.

## Local build and preview

Build with the same project configuration used for deployment:

```bash
npm run build
```

Preview locally:

```bash
npm run preview
```

The Netlify production output is `dist`, as configured in `netlify.toml`.

## Troubleshooting

### Working tree is not clean

The ship script stops with:

```text
Working tree has uncommitted changes.
```

Commit the intended files or stash unfinished work, then run `npm run ship`
again.

### Merge conflict

The script stops without deploying. Resolve the conflict on `main`, commit the
merge resolution, verify the application, and run:

```bash
npm run ship
```

Do not force-push or rewrite published history.

### Git authentication or permission error

Confirm that `origin` points to the version 2 repository:

```bash
git remote -v
```

Expected push target:

```text
https://gitlab.com/ameen_aplus/verona-spark-engine-version2.git
```

Then confirm that your GitLab account can push to `main`.

### Netlify authentication error

```bash
npx netlify login
npx netlify status
```

Run `npm run ship` again after authentication succeeds.

### Live page has no styling or missing images

Confirm `netlify.toml` contains:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

Deploying `.output/public` can publish stale CSS and omit homepage photos. The
production deployment must use `dist`.

### Build fails

Run the build separately to get the full error:

```bash
npm run build
```

Fix the build error, commit the correction, and run `npm run ship` again.

## Rollback

For an urgent Netlify rollback:

1. Open the Netlify project:
   https://app.netlify.com/projects/verona-spark-engine-version3-aplus-497
2. Open **Deploys**.
3. Select the last known-good production deploy.
4. Choose **Publish deploy**.

This restores the website deployment only. If the Git code must also be
reverted, create a normal revert commit and push it to `main`. Do not reset or
force-push shared history.

## Safety rules

- Never force-push `main` (production branch).
- Never rebase, amend, or squash commits already pushed to shared branches.
- Never deploy from `origin-v1` or the old repository.
- Never publish `.output/public`; always use `dist`.
- Never ship uncommitted work.
- Stop and resolve merge conflicts before deploying.
- Always verify the live URL after production deployment.

---

## Document control

| Field | Value |
|-------|-------|
| Title | Production Deployment Guide — Verona Spark Engine version 2 |
| Author | Ameen Pasha A |
| Company | Aplus Technology |
| Audience | Development team (including Gyan) using shared GitLab + Netlify |
| Effective date | 26 July 2026 |
| Production branch | `main` |
| Live site | https://verona-spark-engine-version3-aplus-497.netlify.app |
