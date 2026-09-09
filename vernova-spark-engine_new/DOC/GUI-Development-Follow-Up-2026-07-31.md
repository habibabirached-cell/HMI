# GUI Development Follow-Up — Meeting Notes

| Field | Detail |
|-------|--------|
| **Meeting** | GUI Development Follow Up |
| **Date** | **31 July 2026** (evening) |
| **Recording** | `GUI Development Follow Up-20260731_203621-Meeting Recording.mp4` (~57 min 18 s, 1920×1080) |
| **Approx. wall clock** | ~**8:36 PM – ~9:33 PM** IST (taskbar in recording; Teams filename `203621`) |
| **Participants** | **Arun Jose** (GE Vernova — primary presenter); **Gyanendra Rai** (Aplus / GR); **Ameen@aplus**; **vinoth**; **Sonam Gupta** (GE Vernova) |
| **Focus** | Live **Stability Solution Characterization** on Netlify (`…version3-aplus-497…/stability`): CFG walkthrough, **Databank_Info.xlsx** (Box) as source of truth, V-step / RoCoF / 3-ph fault demos, CFG11 databank CSVs, brief Simulink virtual-admittance + OneNote sketch |
| **Demo URL** | https://verona-spark-engine-version3-aplus-497.netlify.app/stability |
| **Related databank** | Box Excel `Databank_Info.xlsx` (tabs: DataBank_Info / Sheet1, VoltageStep_PhaseJump, EventDetails) |
| **Prior notes** | [GUI-Development-Follow-Up-2026-07-30.md](./GUI-Development-Follow-Up-2026-07-30.md) · [GUI-Development-Follow-Up-2026-07-28.md](./GUI-Development-Follow-Up-2026-07-28.md) |

> **How these notes were produced:** Visual pass of the recording (frames every ~40 s → `.tmp-meeting-20260731/frames/`, do not commit). UI text, Excel formulas, dial values, and on-screen warnings below are quoted from shared screens. Full speech-to-text was not reliably available; spoken intent is inferred from demo flow + visible UI/Excel.

**Not shown in this recording (vs 30 Jul):** Wind Farm Stabilisation dashboard, CIGRE PPT slides, PSCAD protection demo, Dash Renewable Farm Anchoring.

---

## 1. Meeting purpose

1. Walk the **live Stability** Netlify app across **CFG1–CFG11** (hover specs, CB, event tiles).
2. Open **`Databank_Info.xlsx`** on Box and treat it as the **authoritative contract** for:
   - per-CFG assets / specifications  
   - **event start times** (tr / ts / tp / tv) for Short Circuit, ROCOF, Phase Jump, V-step  
   - **inertia dial formula** and signals (`Ip_GEP_pu Main`, `Iq_GEP_pu Main`, `Ppos_GEP_MW Main`)
3. Run live events: **Voltage Step (−10%)**, **RoCoF (−1 Hz/s)**, **3-phase fault**, and review dials + Time Domain metrics.
4. Confirm **CFG11** slim CSVs (`SCL` / `ROCOF` / `PHJUMP` / `VSTEP`) in `public/databank/CFG11`.
5. Brief **Simulink** PositiveSequence / virtual admittance context (model story, not a web ticket by itself).

---

## 2. Participants & roles (as seen)

| Person | Role in this call |
|--------|-------------------|
| **Arun Jose (GE Vernova)** | Primary screen share — Stability Netlify + Box Excel + Simulink + OneNote |
| **Gyanendra Rai (GR)** | Opens OneDrive `Dashbord_project` / `public/databank/CFG11` CSVs mid-meeting |
| **Ameen@aplus** | In roster (often muted); receiving Dev follow-ups |
| **vinoth** | In roster; relevant to CFG icons / assets from prior threads |
| **Sonam Gupta** | Client / PPT owner; reviewing Stability behaviour |

---

## 3. Chronological agenda (what was on screen)

| ~Wall clock | ~Elapsed | Frames (approx.) | Content |
|-------------|----------|------------------|---------|
| 8:36–8:44 | 0–8 min | f_001–f_012 | **Stability** idle walkthrough: CFG1, CFG2, CFG11, CFG3, CFG7 — **EVENT: NONE**, **CB: OPEN**, dials 0.00, empty metrics |
| 8:44–8:48 | 8–12 min | f_015–f_018 | Brief Teams gallery; back to Stability (CFG7 / CFG6 / CFG8 hover specs) |
| ~8:52 | ~16 min | f_025 | **PingID MFA** (corporate login) before Box |
| 8:54–9:00 | 18–24 min | f_028–f_035 | **Box Excel `Databank_Info.xlsx`** — CFG1–11 table, event start times, dial example, **inertia formula** |
| 9:01–9:04 | 25–28 min | f_038–f_042 | Live **V-step (CFG9)** then **RoCoF (CFG10 / CFG8)** — settling warning; inertia dials populate on RoCoF |
| ~9:06 | ~29 min | f_045 | **File Explorer** — Gyan OneDrive `GEProject\Dashbord_project` |
| ~9:08+ | ~32 min | f_048 | Explorer → `public/databank/CFG11` → `PHJUMP.csv`, `ROCOF.csv`, `SCL.csv`, `VSTEP.csv` |
| 9:10–9:20 | 33–44 min | f_050–f_068 | Stability again: RoCoF inertia ~10³ MW·s; V-step metrics; **CFG11 3-ph fault** SC ≈ **2.76 pu** |
| ~9:14 | ~37 min | f_055 | **MATLAB Simulink** — GFM Voltage Control / Virtual admittance PositiveSequence |
| ~9:16 | ~39 min | f_060 | **OneNote** sketch (f / 50 Hz style annotation) |
| 9:20–9:33 | 45–57 min | f_070–f_086 | More RoCoF / CFG11 specs hover (SynCon + GFM BESS); idle reset (**EVENT: NONE**, **CB: OPEN**) |

---

## 4. Databank contract (from Excel — must stay aligned with app)

### 4.1 Workbook tabs (visible)

| Tab | Role |
|-----|------|
| **DataBank_Info** (aka Sheet1 in some builds) | CFG1–11 assets, specs, **event start times**, dial notes, inertia formula |
| **VoltageStep_PhaseJump** | V-step / phase-jump related signals / notes |
| **EventDetails** | Right-panel Event Details copy (slide 14) |

### 4.2 Event start times (tr / study times)

- Most CFGs: Short Circuit / ROCOF / Phase Jump / V-step start times commonly **80 s** (Excel columns).
- **CFG9 / CFG10 / CFG11** often use **40 s** (and some phase/V times as low as **3 s** in Excel) — app must not invent a single global event time.
- Dial note on screen: *if tr = 80 s, dial value = 80.04 s* (sample at tr + 40 ms for SC).

### 4.3 Signals & dials (Excel text)

| Topic | Rule shown in Excel / UI |
|-------|---------------------------|
| Charts | `Ip_GEP_pu Main`, `Iq_GEP_pu Main` |
| SC dial | From fault / short-circuit study — Iq at **tr + 0.04 s** |
| Inertia dial | **RoCoF only**: `f0 = 50`, `ROCOF = 1`; `ΔP = mean(Ppos_GEP_MW Main, tr…tr+1) − P just before tr`; `Inertia (MW.s) = ΔP × f0 / (2 × ROCOF)` |
| UI footer seen | “Inertia on RoCoF · SC on fault” (wording varies slightly: “Inertia vs RoCoF”) |

### 4.4 CFG11 assets (Excel + hover in demo)

- **Synchronous Condenser:** e.g. **65 MVA × 2 RS12** (hover/specs in later frames).
- **GFM BESS:** e.g. **70 MVA (3.47 MVA × 20 inverters)** — keep locked to slide 13 / Excel; reject drift (one frame OCR misread as “2.0 MW / 70 MWh” — treat Excel/PPT as truth).

### 4.5 Slim CSVs on disk (Gyan Explorer)

Path reviewed: `…/public/databank/CFG11/`

| File | Role |
|------|------|
| `SCL.csv` | 3-ph fault / SC |
| `ROCOF.csv` | RoCoF / inertia |
| `PHJUMP.csv` | Phase jump |
| `VSTEP.csv` | Voltage step |

Live app serves these from Netlify `dist` (not the multi-GB raw `Databank/**/*.csv` gitignored tree).

---

## 5. Live Stability behaviour reviewed

### 5.1 Idle / CB open

- **EVENT: NONE**, **CB: OPEN** → Ip/Iq flat ~0, dials **0.00**, Time Domain **--**.
- Helper copy: trigger **fault / RoCoF / V / ø** on the diagram (and close CB after placing CFG).

### 5.2 Voltage step (−10% Prefault)

- Event Details + badge **EVENT: VOLTAGE STEP**, **CB: CLOSED**.
- Response / Rise often populate (tens–hundreds of ms depending on CFG).
- **Settling** often **0 ms** or **--** with on-screen warning: *“Settling not resolved… transient below noise vs ±5% p-p band”* (wording sometimes ±2%).
- Peak overshoot sometimes **0.000 pu** then later **non-zero** for same event family — needs consistent calc after zoom/pause.
- Dials: Inertia / SC stay **0.00** or empty on V-step (expected if dials are RoCoF/fault-only — UX must make that obvious).

### 5.3 RoCoF (−1 Hz/s)

- Inertia dial **populates** (examples seen: ~**2604**, ~**1007–1098**, ~**31711** MW·s across CFGs — **sanity-check magnitudes**).
- SC shows **N/A**.
- Time Domain tiles remain **--** with copy that metrics apply to **V-step / Phase jump** only.

### 5.4 Three-phase fault (CFG11)

- Badge **EVENT: 3-PH FAULT** (one frame OCR: “PH FAULT” — check typo).
- Event Details: ABC-G, **~140 ms**, impedance **0.02 + j0.2 Ω** (as shown).
- **SC current ~2.76 pu**; Inertia **N/A** (needle may still move — **binding bug** risk).
- Time Domain empty (by design for fault).

### 5.5 Chart UX

- Zoom → **“PAUSED FOR ZOOMING”**; Reset Zoom present.
- Tooltips show time + pu on Ip/Iq.

---

## 6. Issues / bugs / gaps observed

| # | Issue | Where |
|---|--------|--------|
| 1 | **Settling Time** fails / shows 0 ms / warning on V-step | Time Domain |
| 2 | **Peak overshoot** inconsistent (0.000 vs later non-zero) | Time Domain |
| 3 | **Event start times** in app must match Excel (40 s / 80 s / 3 s per CFG) — plot spikes sometimes look early vs databank | Playback + `stabilityDatabank.ts` |
| 4 | **Inertia magnitude** swings widely across CFGs — verify formula, units, CSV columns | RoCoF dial |
| 5 | Dial **needle vs label** mismatch (needle moves while readout N/A / 0.00) | Grid Diagnostics dials |
| 6 | **CFG hover / modal specs** inconsistent for same CFG across moments (e.g. transformer kV strings) | Solutions strip |
| 7 | **CFG selector vs diagram “Connected” label** sometimes looks out of sync | SLD header |
| 8 | Time Domain empty on RoCoF/fault — OK if intentional; empty-state copy must stay accurate | Time Domain |
| 9 | Header / panel naming: live UI still showed **“GRID DIAGNOSTICS / Asset characterization”** and header title **“STABILITY SOLUTION CHARACTERIZATION”** under logo during this meeting | Naming / branding |
| 10 | Incidental share clutter (PingID, OneNote overlay, Explorer blank popup) — not product bugs | Demo hygiene |

---

## 7. Action items (from this call + carry-over)

| # | Owner | Action | Notes from 31 Jul |
|---|--------|--------|-------------------|
| 1 | Dev | Keep **CFG specs** locked to Excel / slide 13 (esp. **CFG11 SynCon + GFM BESS**) | Hover + modal must match |
| 2 | Dev | Wire / verify **per-CFG event start times** from Databank_Info (not one hard-coded time) | 80 s vs 40 s vs 3 s |
| 3 | Dev | Fix **Settling Time** for V-step / Phase jump (or clear N/A + reason) | Warning already on screen |
| 4 | Dev | Stabilize **Peak Overshoot** after zoom/pause | Seen flipping 0.000 → value |
| 5 | Dev | Dial UX: **Inertia only on RoCoF**, **SC only on fault**; N/A elsewhere; fix needle/label sync | Footer already hints this |
| 6 | Dev | Sanity-check **inertia MW·s** across CFG8/10/11 vs Excel formula | Huge outliers (e.g. ~31711) |
| 7 | Dev | Confirm **CFG11** slim CSVs deployed and events enabled | Explorer showed four files |
| 8 | Dev | Naming: rename **Grid Diagnostics / Asset characterization** → **Stability Solution Characterization**; header logo-only (client ask after this meeting also) | Visible in frames |
| 9 | Dev | Event badge spelling / clarity (**3-PH FAULT**) | Possible “PH FAULT” typo |
| 10 | Client / Arun | Keep Box **Databank_Info.xlsx** as master; notify Dev when tr/specs change | Excel still edited live |
| 11 | vinoth / Dev | Final CFG Display icons stay aligned with Excel assets | Prior thread |

---

## 8. Task board — Done vs still to do

> Status relative to **codebase after** 31 Jul Gyan merges + 30 Jul follow-ups + early 1 Aug naming tweaks. Re-verify on live after next ship.

### Already done / largely done (do not re-open blindly)

| Task | Status | Evidence |
|------|--------|----------|
| CFG11 four events + slim CSVs in `public/databank/CFG11` | Done | Meeting Explorer + repo |
| Event Details panel + hover | Done | Shown throughout demo |
| Inertia on RoCoF / SC on fault + helper copy | Done (UX refined) | Footer + N/A path |
| ECharts-only charts + zoom pause | Done | “PAUSED FOR ZOOMING” |
| CFG11 specs strings SynCon 65 MVA × 2 + GFM BESS 70 MVA | Done in code | Confirm no hover drift |
| Event icon size equalize + f/V position swap (Gyan 31 Jul) | Done on `main` | Commits `233a491`, `7fe683c` |
| CFG11 SCL header NaN parse fix (Gyan 31 Jul) | Done on `main` | Commit `617bde3` |
| Panel title → **Stability Solution Characterization**; remove Asset characterization badge | Done locally (1 Aug ask) | Confirm shipped |
| Header: remove title under logo; larger GE logo | Done locally (1 Aug ask) | Confirm shipped |

### Still pending / verify carefully (Dev)

| Priority | Task | Why (from 31 Jul) |
|----------|------|------------------|
| **P0** | **Settling Time** still wrong / “below noise” on many V-steps | Demo repeatedly showed 0 ms / warning |
| **P0** | **Event times** audit: every CFG’s fault/RoCoF/ø/V start time matches Excel | CFG9–11 40 s vs others 80 s |
| **P0** | **Inertia sanity** — explain/fix outliers; units **MW·s** only | CFG10 ~31711 vs CFG11 ~1098 |
| **P1** | Peak overshoot consistency under zoom/pause | 0.000 then 0.222 |
| **P1** | Dial needle vs numeric **N/A / 0.00** binding | Fault/RoCoF frames |
| **P1** | CFG hover/modal **spec string QA** vs Excel for CFG1–10 | Transformer kV mismatches noted |
| **P2** | Connected badge / CFG strip sync polish | Occasional label confusion |
| **P2** | Event badge copy (**3-PH FAULT**) | Typo risk |
| **P2** | Ship naming/header logo changes to Netlify if not deployed yet | Local-only until ship |
| **P3** | Optional: clearer empty Time Domain when event ≠ V/ø | Copy exists; keep accurate |

### Out of scope for this recording (track elsewhere)

| Item | Notes |
|------|--------|
| Wind Farm dual-column / animation / CFG8 library | Covered in 28–30 Jul notes; **not** exercised 31 Jul |
| PPT Meaghan #12 / model #13 | Client PPT |
| Simulink PositiveSequence deep changes | Context only unless Arun maps a GUI signal |

---

## 9. Implementation checklist (developers)

### Stability (`/stability`)

- [ ] Every CFG event time = Databank_Info Excel (audit table)
- [ ] V-step / Phase jump: Response, Rise, Settling, Peak all trustworthy
- [ ] RoCoF → Inertia only; Fault → SC only; labels never imply false zero
- [ ] Inertia values order-of-magnitude check vs Excel formula on CFG8/10/11
- [ ] CFG hover + modal specs = Excel (no kV/MVA drift)
- [ ] Naming/branding: panel **Stability Solution Characterization**; header logo-only
- [ ] Ship + hard-refresh Netlify after naming/metric fixes

### Databank

- [ ] When Excel changes, re-run `npm run prepare:databank` from `Databank/` → commit `public/databank/**`
- [ ] Never expect raw `Databank/**/*.csv` on GitLab/Netlify

---

## 10. Reference materials

| Item | Location / note |
|------|-----------------|
| Meeting recording | Repo root: `GUI Development Follow Up-20260731_203621-Meeting Recording.mp4` |
| Local frame extract | `.tmp-meeting-20260731/frames/` (working copy; **do not commit**) |
| Box Excel | `Databank_Info.xlsx` on gevernova.ent.box.com |
| Live Stability | https://verona-spark-engine-version3-aplus-497.netlify.app/stability |
| Prior meeting notes | [2026-07-30](./GUI-Development-Follow-Up-2026-07-30.md), [2026-07-28](./GUI-Development-Follow-Up-2026-07-28.md) |

---

## 11. Relationship to 30 Jul meeting

| 30 Jul theme | 31 Jul status in this recording |
|-------------|--------------------------------|
| Wind Farm dual-column / SCR demo | **Not shown** |
| Time Domain Settling gap | **Still visible** on V-step |
| Inertia 0 after fault confusion | Clarified by Excel + live RoCoF (inertia fills); fault → SC |
| CFG11 SynCon + GFM BESS | Confirmed again in Excel + hover |
| Databank as source of truth | **Deep dive** — Excel formulas and tr times are the contract |

---

*Document created from the 31 Jul 2026 GUI Development Follow-Up recording (visual review of shared Stability UI, Box Databank_Info.xlsx, CFG11 CSVs, Simulink/OneNote context) for Verona Spark Engine / FLEXSIM GUI work. No implementation performed in this note-writing pass.*
