# P2R_18 lower pane backups

| Pattern | Meaning |
|---------|---------|
| `p2r_18.conf.pre-mvups-baseline-*.json` | Before the reverted “rebuild MVUPS from baseline” experiment |
| `p2r_18.conf.pre-flat-mvups-mirror-*.json` | Before flat mirror of expanded upper baseline onto lower pane |
| `p2r_18.conf.pre-mvups-tail-*.json` | Before MVUPS tail (Meaghan flat section) appended to lower pane |

**Restore any backup:**

```bash
cp designs/p2r_18/tmp/<backup-file>.json designs/p2r_18/p2r_18.conf.json
```

**Rebuild flat lower = expanded upper baseline (no collapse, no sparkles):**

```bash
node scripts/cloneP2r18BaselineExpandedToLower.js
```

**Append MVUPS downstream (MVUPS, Aux CB, Aux #4, DC CB, IT rack) from Meaghan flat schematic:**

```bash
node scripts/appendP2r18MvupsTailFromMeaghan.js
```

**Restore upper baseline from last git commit (keep lower MVUPS exploded + tail):**

```bash
node scripts/restoreP2r18BaselineKeepMvupsLower.js
```
