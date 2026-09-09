# GUI Development Follow-Up — Meeting Notes

| Field | Detail |
|-------|--------|
| **Meeting** | GUI Development Follow Up |
| **Date** | **4 August 2026** (evening) |
| **Recording** | `GUI Development Follow Up-20260804_200333-Meeting Recording.mp4` (~**76 min 6 s**, 1920×1080) |
| **Approx. wall clock** | ~**8:03 PM – ~9:19 PM** IST (taskbar; Teams filename `200333`) |
| **Participants** | **Gupta, Sonam (GE Vernova / SG)** — primary CFG12 data + Excel share; **Gyanendra Rai (GR)** — Wind Farm + Stability demo; **vinoth**; **Ameen@aplus** |
| **Focus** | (1) **Wind Farm Stabilisation** live demo (CFG8 / CFG11); (2) **CIGRE** windfarm GFMe slide; (3) **Stability** Netlify walkthrough + dials / Time Domain; (4) **CFG12 = Red Eléctrica / Engie Madrid** databank handoff (`Spain Grid Code - Test Description` + 33 study folders) |
| **Demo URLs** | Local WF: `http://localhost:5173/windfarmstability` · Live Stability: https://verona-spark-engine-version3-aplus-497.netlify.app/stability · Home: https://verona-spark-engine-version3-aplus-497.netlify.app |
| **CFG12 data (local copy)** | `CSV Files - Red Eléctrica_CFG12/` (+ `Spain Grid Code - Test Description.xlsm`) |
| **Prior notes** | [GUI-Development-Follow-Up-2026-07-31.md](./GUI-Development-Follow-Up-2026-07-31.md) |

> **How these notes were produced:** Visual pass of the recording (frames every ~40 s → `.tmp-meeting-20260804/frames/`, do not commit) + authoritative parse of the Excel Sonam shared (also present in the CFG12 folder). Full Whisper STT was **blocked** on this machine (App Control / torch DLL); spoken intent is inferred from demo flow, shared Excel, and CSV headers/onsets. Prefer Excel + CSVs over OCR for CFG12 mappings.

---

## 1. Meeting purpose

1. Review **Wind Farm Stabilisation** UI (SCR / fault / load matrix; without-solution vs CFG8/CFG11).
2. Brief **CIGRE Demo FLEXSIM** PPT context (windfarm GFMe pass/fail table).
3. Walk **Stability Solution Characterization** on Netlify (CFG1–11, events, dials, Time Domain).
4. Hand off **CFG12** for Spain / Red Eléctrica — **Engie Madrid** GFM studies: folder naming, test catalogue, and how assets switch (**BESS only / SynCon only / BESS+SynCon**).
5. Align Dev on what must be wired next so CFG12 behaves like other Stability CFGs (diagram + events + charts + dials), with **new signal names**.

---

## 2. Participants & roles (as seen)

| Person | Role in this call |
|--------|-------------------|
| **Gyanendra Rai** | Early share — local Wind Farm Stabilisation (`localhost:5173/windfarmstability`); later Stability Netlify |
| **Sonam Gupta (GE Vernova)** | Primary CFG12 share — Box path `…/Data Bank CSV Files/Databank/CSV Files - Red Eléctrica_CFG12`, Excel **Spain Grid Code - Test Description**, sample Dataframe CSV (e.ort. A_26) |
| **vinoth** | In roster (often muted) |
| **Ameen@aplus** | In roster (often muted); receiving Dev follow-ups |

---

## 3. Chronological agenda (what was on screen)

| ~Wall clock | ~Elapsed | Frames (approx.) | Content |
|-------------|----------|------------------|---------|
| 8:03–8:05 | 0–2 min | f_001 | Teams gallery (SG / GR / vinoth); Ameen joins shortly after |
| 8:05–8:22 | ~2–19 min | f_005–f_025 | **Wind Farm Stabilisation** — CFG8 (and CFG11 path available): SCR 1 / 1.6 / 20, faults Three-phase / SLG / LL, loads 1 / 0.8 / 0.5 / 0 pu; side-by-side **Without Solution** vs **+CFG8** charts; CB open/closed rules |
| ~8:23 | ~20 min | f_030 | **CIGRE_Demo_FLEXSIM** PPT ~slide 20 — *Windfarm stabilization use case with GFMe*, SCR 1.6 pass/fail matrix (GFL alone Fail/Marginal vs GFMe all Pass) |
| 8:24–8:38 | ~21–35 min | f_035–f_050 | **Stability** Netlify — CFG11 (and others): Phase Jump / RoCoF / fault Event Details; Ip/Iq charts; Inertia / SC dials; Time Domain tiles; dial helper (“Calculating… → final value”; keep values across switches / CB) |
| 8:39–8:45 | ~36–42 min | f_055–f_062 | **CFG12 folder** on Box + Excel **Spain Grid Code - Test Description** (BESS / SynCon / Combined colour blocks) |
| 8:45–9:00 | ~42–57 min | f_068–f_085 | Back to Stability (CFG8–11 events, fault Event Details ABC-G ~140 ms); Explorer revisit of CFG12 CSVs |
| 9:00–9:10 | ~57–67 min | f_090–f_098 | Stability with **CFG12** tile/diagram focus (SynCon + GFM BESS style plant); dials still empty until events wired; Sonam opens sample **`…_A_26_Dataframe`** (highlights `P_poc1`, `Q_poc1`) |
| ~9:13+ | ~70+ min | f_105–f_110 | FLEXSIM home cards; wrap / gallery |

---

## 4. Wind Farm Stabilisation (first third of call)

### 4.1 What they demoed

- Page: **WIND FARM STABILISATION USE CASES** (`/windfarmstability`).
- Solutions strip: **CFG8** and **CFG11** only (tooltips: “Click CFG8 or CFG11…”).
- Controls: **Load** (1 / 0.8 / 0.5 / 0 pu), **Fault** (Three phase / SLG / LL), **SCR** (1 / 1.6 / 20).
- CB must be **closed** to run; message when closed: *“CB Closed — open breaker to change solution.”*
- Bottom comparison:
  - Left: **Customer Network (Without Solution)** → often **Unstable** (oscillatory P / V).
  - Right: **Customer Network + CFG8/CFG11** → **Anchoring** / stabilized after disturbance.
- Live status copy example: solution provides fast reactive current + inertia support during SLG/LL on weak/strong SCR.

### 4.2 Related PPT (mid-call)

- **CIGRE_Demo_FLEXSIM** slide ~20: SCR **1.6** farm summary — GFL alone many **Fail/Marginal**; with **GFMe** all **Pass**.
- Footer note on slide: under SCR = 1, sub-synchronous oscillations ~13 Hz.

### 4.3 Dev takeaway (WF)

- No evidence in this recording that **CFG12** is a Wind Farm solution tile.
- CFG12 work is for **Stability / Red Eléctrica grid-code characterisation**, not replacing CFG8/11 on the wind-farm page (unless client later asks otherwise).

---

## 5. Stability page (middle of call) — behaviour they care about

Live app still CFG1–**11** fully databank-driven; CFG12 SVG assets exist in repo (`public/svgs/Panel/CFG12.svg`, `public/svgs/Display/CFG12.svg`) and viewBox constants exist in `StabilityDashboard.tsx`, but **no `stabilityDatabank` CFG12 events / slim CSVs yet**.

Reviewed again on screen:

| Topic | Client-facing behaviour (as shown / discussed) |
|-------|--------------------------------------------------|
| Events | Fault / RoCoF (f) / V-step / Phase jump (ø) on SLD |
| Dials | **Inertia** on RoCoF; **SC** on fault; Calculating… → value |
| Latch | Keep dial values when switching events / opening CB; clear on **trash** |
| Time Domain | Response / Rise / Settling / Peak for Ip & Iq (V / ø) |
| Charts | Ip / Iq at GEP from active event CSV |

> Same latch intent as the 4 Aug client ask already implemented on `main` (`825d795`): f→Inertia, V→Ip, ø→Iq, fault→SC; latch until trash.

---

## 6. CFG12 — main deliverable of this meeting

### 6.1 Identity

| Item | Value |
|------|--------|
| **CFG name in GUI** | **CFG12** |
| **Study family** | `GFM_1571_DC_EngieMadrid_A_*` |
| **Grid code framing** | **Spain / Red Eléctrica** (Excel also mentions future tabs for AEMO / UK — not used yet) |
| **Box path (Sonam)** | `FlexSim GUI Dashboard → Data Bank CSV Files → Databank → CSV Files - Red Eléctrica_CFG12` |
| **Local drop** | `D:\verona-spark-engine\CSV Files - Red Eléctrica_CFG12\` |
| **Catalogue** | `Spain Grid Code - Test Description.xlsm` |

### 6.2 Operating modes (critical UX)

CFG12 is **not one fixed plant mode**. Studies are split into three breaker/asset modes (Excel Sheet3 colour grouping):

1. **BESS only**
2. **SynCon only**
3. **BESS & SynCon** (combined)

Excel Sheet1 (DOE / PSCAD variables) shows separate breakers:

- `RS Circuit Breaker (0=Close;1=Open)` — SynCon / RS side  
- `BESS Circuit Breaker (0=Close;1=Open)` — BESS side  

**What they want in the GUI:** user (or event mapping) must reflect which assets are in service for the selected study — same diagram family (SynCon + GFM BESS), but **CB / asset state** matches the study class.

### 6.3 Master test catalogue (Sheet2 — A_1 … A_33)

Parsed from Excel (authoritative). Folder ↔ description:

#### Short-circuit

| Folder | Description |
|--------|-------------|
| A_1 | Short-Circuit **450 ms** — BESS |
| A_2 | Short-Circuit **450 ms** — BESS & SynCon |
| A_3 | Short-Circuit **450 ms** — SynCon |
| A_4 | Short-Circuit **150 ms** — BESS |
| A_5 | Short-Circuit **150 ms** — BESS & SynCon |
| A_6 | Short-Circuit **150 ms** — SynCon |

#### Voltage steps (multiple magnitudes — not only −10%)

| Folder | Description |
|--------|-------------|
| A_7 | Step-Up **11.8%** — BESS |
| A_8 | Step-Up **11.8%** — BESS & SynCon |
| A_9 | Step-Up **11.8%** — SynCon |
| A_10 | Step-Down **10%** — BESS |
| A_11 | Step-Down **10%** — BESS & SynCon |
| A_12 | Step-Down **10%** — SynCon |
| A_13 | Step-Up **10%** — BESS |
| A_14 | Step-Up **10%** — BESS & SynCon |
| A_15 | Step-Up **10%** — SynCon |
| A_16 | Step-Down **15%** — BESS |
| A_17 | Step-Down **15%** — BESS & SynCon |
| A_18 | Step-Down **15%** — SynCon |

#### RoCoF

| Folder | Description |
|--------|-------------|
| A_19 | RoCoF **50 → 49 Hz** — BESS |
| A_20 | RoCoF **50 → 49 Hz** — BESS & SynCon |
| A_21 | RoCoF **50 → 49 Hz** — SynCon |

#### Phase jump

| Folder | Description (as written in Sheet2) |
|--------|-------------------------------------|
| A_22 | Phase Jump **(+30)** — BESS |
| A_23 | Phase Jump **(+30)** — BESS & SynCon |
| A_24 | Phase Jump **(+30)** — BESS *(see note)* |
| A_25 | Phase Jump **(−30)** — BESS |
| A_26 | Phase Jump **(−30)** — BESS & SynCon |
| A_27 | Phase Jump **(−30)** — BESS *(see note)* |
| A_28 | Phase Jump **(+35)** — BESS |
| A_29 | Phase Jump **(+35)** — BESS & SynCon |
| A_30 | Phase Jump **(+35)** — BESS *(see note)* |
| A_31 | Phase Jump **(−35)** — BESS |
| A_32 | Phase Jump **(−35)** — BESS & SynCon |
| A_33 | Phase Jump **(−35)** — BESS *(see note)* |

> **Excel note:** For SC / V-step / RoCoF the pattern is clean triples **BESS → Combined → SynCon**. For Phase Jump, Sheet2 labels A_24 / A_27 / A_30 / A_33 again as **BESS** (no SynCon-only rows). Sheet3 likewise lists only BESS + Combined for phase jumps. **Confirm with Sonam** whether those four folders are SynCon-only mislabels or true BESS duplicates before wiring the GUI event picker.

### 6.4 Sheet3 view (how Sonam colour-coded live)

On screen, Excel was grouped:

| Block | Mode |
|-------|------|
| White / grey | BESS only |
| Orange | SynCon only |
| Blue | BESS & SynCon |

Meeting highlight while talking: Combined **Step-Up / Step-Down** rows (A_8 / A_11 / A_14 / A_17 family).

### 6.5 CSV signal contract (≠ CFG11)

Every sampled Dataframe uses:

```text
t, Irms_poc1, V_poc1, P_poc1, Q_poc1, fgrid, ANG_Ref, Ang_poc1
```

- Row 2 is a `Main` unit row (skip when parsing).
- Time span ≈ **0 … 30 s** (1 ms step).
- Disturbance onset (sampled A_1 / A_4 / A_7 / A_10 / A_19 / A_26): ≈ **15.0 s**.
- RoCoF files: `fgrid` ramps from **50** toward **~48 Hz** (Excel text says 50→49 — verify which target Event Details should show).

**Implication vs CFG1–11:** charts/dials today expect `Ip_GEP_*` / `Iq_GEP_*` / `Ppos_GEP_MW`. CFG12 needs a **new mapping**:

| Today (CFG11-style) | CFG12 Engie Madrid CSV |
|---------------------|-------------------------|
| Ip_GEP_pu | derive / map from `P_poc1` + `V_poc1` / `Irms_poc1` **or** plot P/Q/V/f directly per client preference |
| Iq_GEP_pu | same for Q / reactive |
| FreqMeas / RoCoF | `fgrid` |
| Phase | `Ang_poc1` / `ANG_Ref` |
| SC dial | from fault study current (`Irms_poc1`) at tr+Δt — **confirm formula with Sonam** |
| Inertia dial | from RoCoF + `P_poc1` (not `Ppos_GEP_MW`) — **confirm formula** |

Sonam highlighted **`P_poc1` / `Q_poc1`** in A_26 on screen — treat those as primary power signals for CFG12.

### 6.6 DOE / event parameter names (Sheet1)

Useful for Event Details copy / future controls:

- Fault Type / Fault Time / Fault Duration  
- Voltage Step XL/XU/OL/OM/OH  
- RoCoF f0 / t0 / RoC / t1  
- Phase Jump X / OL / OH  
- Pref_POI_pu  
- RS CB + BESS CB  

---

## 7. What they want next (actionable)

### P0 — CFG12 on Stability

| # | Action | Detail |
|---|--------|--------|
| 1 | Add **CFG12** to Solutions strip + drop on SLD | Panel/Display SVGs already in `public/svgs/…/CFG12.svg` |
| 2 | Ingest Engie Madrid CSVs into slim databank | Prefer `public/databank/CFG12/` event slices (like CFG11 SCL/ROCOF/PHJUMP/VSTEP) — **or** mode×event matrix if all 33 stay |
| 3 | Map Excel catalogue → UI events | Fault 150/450 ms; V ±10 / ±11.8 / ±15; RoCoF; ø ±30 / ±35; each × asset mode |
| 4 | Wire **signal parser** for `*_poc1` / `fgrid` / angles | Do not assume Ip/Iq_GEP column names |
| 5 | Set event time ≈ **15 s** (verify per file; not CFG11’s 40 s) | Playback + dial sample window |
| 6 | Specs hover / CFG_SPECS entry for CFG12 | SynCon + GFM BESS (confirm ratings with Sonam / Databank_Info if added) |
| 7 | Clarify Phase Jump A_24/27/30/33 labels | Ask Sonam before coding SynCon-only ø |

### P1 — UX / product

| # | Action | Detail |
|---|--------|--------|
| 8 | Mode selector or auto-mode from study | BESS / SynCon / Combined (RS CB + BESS CB story) |
| 9 | Event Details text from Excel descriptions | e.g. “Step-Down −10% — BESS & SynCon” |
| 10 | Keep dial + Time Domain **latch until trash** | Already shipped for general Stability; ensure CFG12 uses same rules |
| 11 | Update Databank_Info / docs when Sonam publishes CFG12 tab | Spain sheet today is separate xlsm |

### P2 — Wind Farm / other

| # | Action | Detail |
|---|--------|--------|
| 12 | WF page stays CFG8 + CFG11 unless asked | Do not assume CFG12 on windfarm |
| 13 | Keep CIGRE GFMe story available for narrative | PPT slide 20 context only |

---

## 8. Repo status vs meeting ask (snapshot after this call)

| Item | Status |
|------|--------|
| `public/svgs/Panel/CFG12.svg` + `Display/CFG12.svg` | Present |
| ViewBox / layout constants for CFG12 in `StabilityDashboard.tsx` | Present |
| `CFG_SPECS.CFG12` | **Missing** |
| `stabilityDatabank.ts` CFG12 events / times | **Missing** |
| `public/databank/CFG12/*.csv` slim files | **Missing** |
| Parser for `Irms_poc1` / `V_poc1` / `P_poc1` / `Q_poc1` / `fgrid` | **Missing** (CFG11 path only) |
| Local raw drop `CSV Files - Red Eléctrica_CFG12/` | Present (do **not** git-commit raw multi-file set blindly — slim first) |
| Dial/Time Domain latch until trash | Done on `main` (`825d795`) — orthogonal but related UX |

---

## 9. Open questions for Sonam / Arun (ask before coding blindly)

1. For Phase Jump folders labeled twice as BESS (A_24 / A_27 / A_30 / A_33): SynCon-only or duplicates?  
2. Charts: keep Ip/Iq **derived**, or plot **P_poc1 / Q_poc1 / V_poc1** natively for CFG12?  
3. Inertia / SC dial formulas using `P_poc1` / `Irms_poc1` — confirm Δt sample (CFG11 uses tr+0.04 s).  
4. Event Details RoCoF text: **50→49 Hz** (Excel) vs data reaching **~48 Hz**.  
5. Should CFG12 appear in **Databank_Info.xlsx** as CFG12 row (times, specs) for one source of truth?  
6. Default demo mode for CFG12 tile: Combined (BESS & SynCon) vs picker of three modes?

---

## 10. One-line summary

**Client handed CFG12 (Red Eléctrica / Engie Madrid): 33 Spain Grid Code studies across BESS / SynCon / Combined for SC, multi-size V-steps, RoCoF, and phase jumps, with new `*_poc1` CSV signals (~15 s onset, 30 s files). Dev must add CFG12 to Stability (SVGs exist; databank + parser + mode/event mapping do not). Wind Farm demo in the same call stays CFG8/CFG11.**
