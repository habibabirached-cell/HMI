---
name: ship-main
description: >-
  Merge current work to main (if on a feature branch) and redeploy Netlify
  production for Verona Spark Engine version2. Use when the user or Gyan asks
  to ship, merge to main and redeploy, publish live, or run the single deploy
  ecosystem command.
---

# Ship to main + Netlify

Shared workflow for **Ameen** and **Gyan** on GitLab `origin` + one Netlify site.

## When to use

User asks to: ship, merge to main and redeploy, publish live, `npm run ship`, or “single command deploy”.

## One command (preferred)

```bash
npm run ship
```

This script:

1. Fails if the working tree is dirty (commit/stash first)
2. Fetches `origin`
3. **Feature branch** → push branch, checkout `main`, pull, merge branch, push `main`
4. **Already on `main`** → pull; push only if local is ahead; otherwise skip merge
5. Runs Netlify **production** deploy (`publish = dist`)

## Manual equivalent (if agent cannot run netlify interactively)

1. Ensure clean tree and commits exist
2. If not on `main`: merge current branch into `main` and `git push origin main` (no force-push)
3. Deploy:

```bash
npx netlify deploy --prod --site=7809e43f-517b-4960-9f17-cbc21d4f19c1 --dir=dist --message "ship"
```

## Facts (do not invent)

| Item | Value |
|------|--------|
| Git remote | `origin` → `https://gitlab.com/ameen_aplus/verona-spark-engine-version2.git` |
| Production branch | `main` |
| Netlify account | `ameenpa05@gmail.com` |
| Netlify site id | `7809e43f-517b-4960-9f17-cbc21d4f19c1` |
| Live URL | https://verona-spark-engine-version3-aplus-497.netlify.app |
| Publish dir | `dist` (see `netlify.toml`) |

## Rules

- Never force-push `main`
- Never skip hooks
- Do not amend unless user explicitly asks
- If merge conflicts: stop and tell the user to resolve, then re-run `npm run ship`
- After success: report `main` tip commit + live URL; remind Ctrl+F5

## Do not use this for

- Deploying only a preview URL
- Pushing to `origin-v1` (legacy repo)
- Shipping uncommitted local WIP
