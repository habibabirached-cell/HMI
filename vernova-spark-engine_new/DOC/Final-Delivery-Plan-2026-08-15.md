# Final delivery plan — 15 Aug 2026 (exact scope only)

| Field | Detail |
|-------|--------|
| **Purpose** | Last-stage delivery checklist — **only** what Asha’s 15 Aug email + Gyan’s recording + `Databank_Aug14` ask |
| **Sources** | [GUI-Development-Follow-Up-2026-08-15.md](./GUI-Development-Follow-Up-2026-08-15.md) · [Databank-Aug14.md](./Databank-Aug14.md) · [CIGRE-FLEXIQSIM-StabilityCharData-CFG1-11-v3.md](./CIGRE-FLEXIQSIM-StabilityCharData-CFG1-11-v3.md) |
| **Rule** | Do **exactly** these tasks. No redesign, no “nice to have”, no unrelated refactors. Do **not** skip any row below. |
| **Do not regress** | 13 Aug behaviours (hover=click Event Details, CB gate, Current\|Previous, CFG12/13 mode latch, Analytics 3-mode rows) |

---

## Implementation status (15 Aug evening)

| WP | Status |
|----|--------|
| WP0 Aug14 ingest + EVENT_TIMES + Base MVA map | **Done** — `prepare:databank` crops from `Databank_Aug14` (~2 s pre-event → Excel end, no downsample) |
| WP1 Settling / SCL kA / Base MVA banner | **Done** |
| WP2 Labels + Transformer hover + GFM/GFL colours | **Done** (SVG label paints; CFG2 GFL BESS fix) |
| WP3 CFG12/13 placeholder + hover cards | **Done** (exact 3a sentence) |
| WP4 IBR rename + Status sequence | **Done** |
| WP5 Clean CSV crop + FastAPI | **Done** — Option A: `prepare:databank` writes `.pre.csv` / `.post.csv` / combined (crop only, **no downsample**); Option B: `api/` FastAPI (`npm run api`) + UI prefers `/api/v1/series/...` |
| WP6 Smoke / CIGRE QA | **Manual** — demo checklist below |

> Large cropped CSVs (esp. CFG5/8/10) keep full sample rate in the event window. Prefer `npm run api` locally so Stability fetches windowed Aug14 slices (T5.1b) without changing sample values; static `/databank` remains the Netlify fallback.

### In scope (must ship)

1. Use **`Databank_Aug14`** only for CFG1–11 data + mapping  
2. Remove **Settling Time** everywhere on Stability  
3. SCL dial → **kA** from **`Iq_GEP_kA Main`**  
4. Show **`Base MVA = xxx MVA`** above Ip/Iq charts  
5. SVG labels under components; Transformer name/hover only **Transformer**  
6. **GFM green / GFL (and others) white**  
7. CFG12/13 Event Details **exact** placeholder + rich hover study cards  
8. Rename **Wind Farm → IBR Farm Stabilization**  
9. IBR **0.4 pu load Fault** Status sequence (Anchoring windows)  
10. Large CSV strategy: **split/clean only** and/or **FastAPI** — **no data manipulation**  
11. QA vs Aug14 Excel + CIGRE PDF (Response / Rise / Peak — no Settling)

### Explicitly out of scope (do not do)

- New features not in Asha email / this recording  
- URL rename `/windfarmstability` (email did not ask)  
- Changing nameplate MVA/kV numbers (email: already correct)  
- Reopening July Hostinger / layout history  
- Inventing CFG12/13 Aug14 CSVs (not in this databank drop)  
- UI polish, theme redesign, unrelated docs cleanup  
- Thinning / averaging / downsampling sample values in the browser  

---

## Already done (do not redo unless broken)

| Item | Status |
|------|--------|
| Local `Databank_Aug14/` received + inventoried | Done — [Databank-Aug14.md](./Databank-Aug14.md) |
| New client Display/Panel SVGs copied | Done (prior work) |
| Yellow label **background** removed; label **text** yellow | Done |
| Meeting / email / CIGRE docs written | Done |

---

## Work packages & tasks

Status legend: `TODO` · `IN PROGRESS` · `DONE` · `BLOCKED` (needs Gyan/Asha)

### WP0 — Databank_Aug14 ingest (foundation)

| ID | Task | Exact ask | Done when |
|----|------|-----------|-----------|
| **T0.1** | Point prepare/ingest at `Databank_Aug14/` | Asha: use DataBank_Aug14 for all references | Scripts / loaders no longer use Aug12 as source |
| **T0.2** | Update `EVENT_TIMES` from Excel | Copy CFG1–11 \(t_f,t_r,t_p,t_v\) exactly | Matches [Databank-Aug14.md](./Databank-Aug14.md) §3 (CFG4=80, CFG6=10, CFG7=5, CFG9=2, CFG11 window 0–70, etc.) |
| **T0.3** | Store per-CFG **Base MVA** from Excel | Same sheet | CFG1=300 … CFG11=200 as in §3 |
| **T0.4** | Regenerate slim / windowed files for CFG1–11 | Four events each: SCL, ROCOF, PHJUMP, VSTEP | `public/databank` (or API) serves Aug14-derived series; values unchanged |
| **T0.5** | Confirm dial sample rule | Excel: `Iq_GEP_kA Main` at **\(t_f+0.04\)** | Code samples at event+0.04 using **kA** column |

### WP1 — Stability UI (Asha email §5)

| ID | Task | Exact ask | Done when |
|----|------|-----------|-----------|
| **T1.1** | Remove Settling Time | Email §5 + CIGRE has no Settling | Gone from Time Domain Current/Previous **and** Detailed Analytics |
| **T1.2** | SCL dial label | **SHORT CIRCUIT LEVEL (kA)** or **SCL (kA)** | No “SCL (pu)” on this dial |
| **T1.3** | SCL dial data | Column **`Iq_GEP_kA Main`** | Current + Previous dials both kA; no pu/kA mix |
| **T1.4** | Base MVA banner | Exact pattern **`Base MVA = xxx MVA`** above Ip/Iq area | Updates per connected CFG from Excel |

### WP2 — Configuration visuals (Asha email §1 + §2)

| ID | Task | Exact ask | Done when |
|----|------|-----------|-----------|
| **T2.1** | Component names on SVG | Name under every component (e.g. Synchronous Condenser) | CFG1–13 Display readable |
| **T2.2** | Transformer diagram label | Only **`Transformer`** — no three-/four-winding | All CFG SVGs |
| **T2.3** | Transformer hover / specs card | Remove “Three-Winding…” wording | Card title/name = **Transformer** (+ ratings as today) |
| **T2.4** | GFM colour | **Only GFM / GFMe = green** | Matches email strip |
| **T2.5** | GFL / others colour | **GFL + SynCon + others = white** | Hybrid CFGs colour per asset, not whole CFG |

### WP3 — CFG12 / CFG13 Event Details (Asha email §3a + §3b)

| ID | Task | Exact ask | Done when |
|----|------|-----------|-----------|
| **T3.1** | Empty-state copy | Exact: **`Select a study from the drop-down menu in the toolbar to proceed`** | CFG12 and CFG13 only, when no study active |
| **T3.2** | Hover study cards | Keep title + Study id + CB line + sketch | Hover and click same story (13 Aug); not replaced by placeholder once study/event active |

### WP4 — IBR Farm Stabilization (Asha email §4)

| ID | Task | Exact ask | Done when |
|----|------|-----------|-----------|
| **T4.1** | Product rename | Every user-facing “Wind Farm Stabilization/Stabilisation” → **`IBR Farm Stabilization`** | Home card, page title, headers — UI strings only |
| **T4.2** | Status sequence — START | Both sides **Normal** (green) | Matches §4.8 table |
| **T4.3** | Status — click **20→1.6** | Immediate both **Weak Grid Detected**; then **0.2–2 s**: Left Weak Grid / Right **Anchoring**; at **2 s** both **Stable** | Exact timings |
| **T4.4** | Status — click **Ag 0.5 pu** | Immediate both **Fault Detected**; **0.3–2 s**: Left **Unstable** / Right **Anchoring**; **from 2 s**: Left Unstable / Right **Stable** | 0.4 pu load Fault case only as specified |

### WP5 — Large CSV strategy (recording — Gyan)

| ID | Task | Exact ask | Done when |
|----|------|-----------|-----------|
| **T5.0** | Confirm path with Gyan | Split CSV **or** FastAPI first | **Done** — both: Option A for Netlify static; Option B FastAPI preferred locally |
| **T5.1a** | Option A — clean split | ~**2 s pre-event** + **event→end**; same samples; X-axis to end of segment | **Done** — `.pre.csv` / `.post.csv` + chart playback |
| **T5.1b** | Option B — FastAPI | Query by CFG + event + window; no full-file preload | **Done** — `phase=pre` idle / `phase=post` on event |
| **T5.2** | Hard rule | **Never manipulate** GE numbers (no thin/average/invent) | **Done** — crop/fetch only (ECharts display cap separate) |

> Do **T5** after or with WP0 — do **not** block WP1–WP4 on a full API rewrite if Gyan agrees split-first. Still must complete T5 before calling delivery done.

### WP6 — Regression + golden QA (must pass)

| ID | Task | Exact ask | Done when |
|----|------|-----------|-----------|
| **T6.1** | 13 Aug regression | Hover=click, CB gate, Current\|Previous, CFG12/13 modes, Analytics 3 rows | Smoke pass |
| **T6.2** | CIGRE spot-check CFG1–11 | Dials / TD Response·Rise·Peak / plot windows | Matches PDF extract; no Settling |
| **T6.3** | Aug14 timing spot-check | Especially CFG4, CFG7, CFG9, CFG11 | Event starts match Excel |

---

## Recommended order (careful)

```text
1. WP0  — Aug14 mapping + ingest (T0.1–T0.5)
2. WP1  — Settling off, SCL kA, Base MVA (T1.1–T1.4)   ← visible email §5
3. WP2  — Labels + Transformer hover + GFM/GFL (T2.1–T2.5)
4. WP3  — CFG12/13 copy + hover cards (T3.1–T3.2)
5. WP4  — IBR rename + Status (T4.1–T4.4)
6. WP5  — Split and/or FastAPI after Gyan confirm (T5.*)
7. WP6  — Full smoke + CIGRE QA (T6.*)
```

Do **one logical change at a time**; re-test Stability smoke after WP0+WP1 before SVG/colour pass.

---

## Acceptance checklist (demo-ready)

### Stability

- [ ] Data from **Databank_Aug14** only (CFG1–11)
- [ ] Event times + Base MVA match Excel
- [ ] **No Settling** anywhere
- [ ] SCL dial **kA** via **`Iq_GEP_kA Main`** at \(t_f+0.04\)
- [ ] **`Base MVA = xxx MVA`** above Ip/Iq
- [ ] Component bottom names; Transformer label + hover = **Transformer** only
- [ ] GFM green; GFL/others white
- [ ] CFG12/13 empty text **exact** sentence
- [ ] CFG12/13 hover cards still rich (3b)
- [ ] 13 Aug behaviours intact
- [ ] CSV split **or** FastAPI in place; samples not rewritten
- [ ] CIGRE spot-check OK

### IBR Farm Stabilization

- [ ] UI says **IBR Farm Stabilization** (not Wind Farm…)
- [ ] 0.4 pu Fault Status table fully matched (incl. Anchoring)

---

## Ask Gyan only if blocked

| Topic | Why |
|-------|-----|
| Split CSV first vs FastAPI first | He said both OK; FastAPI preferred — need one start path |
| Analytics still show SCL pu anywhere after dial→kA | Email focuses on dial; confirm if any pu SCL remains |
| `/windfarmstability` URL rename | Not in email — leave unless he asks |

---

## One-line delivery definition

**Aug14 databank wired; Settling gone; SCL dial kA; Base MVA on charts; SVG names + Transformer-only hover; GFM green / GFL white; CFG12/13 exact placeholder + study hover cards; IBR Farm rename + 0.4 pu Status sequencing; clean CSV split and/or FastAPI with zero sample manipulation; 13 Aug + CIGRE QA green — nothing else.**
