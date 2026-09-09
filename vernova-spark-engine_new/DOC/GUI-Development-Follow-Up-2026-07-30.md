# GUI Development Follow-Up — Meeting Notes

| Field | Detail |
|-------|--------|
| **Meeting** | GUI Development Follow Up |
| **Date** | 30 July 2026 |
| **Recording** | `GUI Development Follow Up-20260730_150559-Meeting Recording.mp4` (~55 min 39 s, 1920×1080) |
| **Approx. wall clock** | ~15:06 – ~16:00 IST (from taskbar in recording) |
| **Participants** | Jose, Arun (GE Vernova); Gupta, Sonam (GE Vernova); Gyanendra Rai (Aplus / GR); vinoth (joined mid-meeting) |
| **Focus** | Live review of **Wind Farm Stabilisation** + **Stability Solution Characterization** Vite apps, CIGRE PPT (Box), PSCAD distance-protection demo, and Arun’s older Dash “Renewable Farm Anchoring” reference |
| **Related PPT** | `CIGRE_Demo_FLEXSIM (arun.jose@gevernova.com).pptx` (Box file, shown as **v8**; subtitle *FlexSim GUI Dashboard - 28 Jul 2026 by Sonam Gupta*) |
| **Prior notes** | [GUI-Development-Follow-Up-2026-07-28.md](./GUI-Development-Follow-Up-2026-07-28.md) |

> **How these notes were produced:** Full visual pass of the recording (frames every ~45 s across the ~56 min file). UI text, PPT tables, status badges, and on-screen values below are quoted from what was shared. Exact spoken dialogue is summarized from meeting flow / on-screen activity (full STT was not available in this environment).

---

## 1. Meeting purpose

Follow-up after the 28 Jul Wind Farm design alignment:

1. Demo the **live React/Vite apps** (`localhost:5173`) — Wind Farm dual-column dashboard and Stability CFG1–11 launch page.
2. Walk the **updated CIGRE PPT** (especially Stability CFG table / CFG11 = SynCon + GFM BESS, and Wind Farm mock slides).
3. Confirm **CFG11** details, data readiness, and icon/spec mapping.
4. Brief **PSCAD** distance-protection demo (Arun).
5. Compare behaviour with Arun’s older **Dash** “Renewable Farm Anchoring” prototype (SCR sweep / unstable vs stable+GFM).

---

## 2. Participants & roles (as seen)

| Person | Role in this call |
|--------|-------------------|
| **Gyanendra Rai (GR)** | Primary early screen share — Vite apps + Box PPT; collaborative cursor “GR” on Wind Farm later |
| **Jose, Arun (GE Vernova)** | On camera; later shares PSCAD and Dash anchoring demo; collaborative cursor “AJ” |
| **Gupta, Sonam (GE Vernova)** | Client / PPT owner (credited on PPT); reviews Stability + Wind Farm |
| **vinoth** | Joined ~few minutes in; mostly muted; relevant to CFG11 icon / asset updates discussed in prior email thread |

---

## 3. Chronological agenda (what was on screen)

| ~Time | Frames | Content |
|-------|--------|---------|
| 15:06 | f_001 | **Wind Farm Stabilisation** live (`localhost:5173/dashboard`) — dual column, CFG8 tooltip, STOP / RESET / ANALYTICS |
| 15:07 | f_002 | **FLEXSIM landing** (`localhost:5173`) — STATCOM & BESS / SynCon / Wind Power cards |
| 15:08–15:10 | f_003–f_007 | **Stability Solution Characterization** (`…/stability`) — CFG11 selected, idle (EVENT: NONE, CB: OPEN) |
| ~15:11 | f_008 | **PPT slide 18** — Wind Farm mock (“Use case -4”, Cfg 12 on right, blank plot boxes) |
| ~15:12–15:14 | f_009–f_011 | **PPT slide 13** — Stability characterization table CFG1–11; cursor on **CFG11** |
| ~15:14–15:16 | f_012–f_014 | **PPT slide 12** — status table SCR 3 / 220 kV / 50 Hz; cursor on row **#11 RS12 + GFM BESS**; red open items #12–#13 |
| ~15:16–15:19 | f_015–f_019 | Back to **Stability** — CFG11 hover specs; charts starting |
| ~15:20–15:25 | f_020–f_027 | **Stability Analytics** — Native SVG vs **Apache ECharts** comparison; Time Domain metrics (Settling Time empty) |
| ~15:26–15:30 | f_028–f_033 | **PSCAD 5.0.2** — `Protection_x4` Simple Distance Protection |
| ~15:30–15:34 | f_034–f_038 | Teams gallery / no share |
| ~15:35–15:38 | f_040–f_044 | **Stability** with **EVENT: 3-PH FAULT**, CB CLOSED; Event Details + SC dial populated |
| ~15:39–15:48 | f_045–f_057 | **Wind Farm** live SCR sweep (~20 → 12.2 → 9.0 → 7.6 → 13.9); AJ + GR cursors |
| ~15:49 | f_058–f_059 | PSCAD again (long run / TripSignal) |
| ~15:50–15:52 | f_060–f_062 | Gallery / Share content picker |
| ~15:52–15:58 | f_063–f_071 | **FLEXSIM Renewable Farm Anchoring** Dash app `127.0.0.1:8055` (Arun) |
| ~15:59–end | f_072–f_074 | Gallery / wrap-up |

**Not shown on share:** Excel workbook / live CSV databank editor (databank status only inside PPT tables).

---

## 4. FLEXSIM landing page (brief)

**URL:** `localhost:5173`

- Brand: **FLEXSIM**
- Copy about inverter-based generation reshaping grids
- Three carousels / cards: **STATCOM & BESS**, **SYNCHRONOUS CONDENSER**, **WIND POWER**
- CTA: **“Click anywhere to enter”**
- Entry points used in demo: Stability (`/stability`) and Wind Farm (`/dashboard`)

---

## 5. Stability Solution Characterization — live UI reviewed

**URL:** `localhost:5173/stability`  
**Title shown:** **STABILITY SOLUTION CHARACTERIZATION** / GE Vernova branding

### 5.1 Header / solutions strip

- Horizontal **CFG 1 … CFG 11** tiles (Panel-style icons).
- **CFG 11** selected (bright green border) for most of the Stability review.
- Badge: **SOLUTIONS · CFG11**.

### 5.2 Single-line network diagram

- Label variants: **SINGLE-LINE NETWORK DIAGRAM**, **CFG11 Connected**.
- Path: **Grid** → transmission towers → **GEP** → circuit breaker → CFG11 asset card.
- Status badges observed:
  - Idle: **EVENT: NONE**, **CB: OPEN**
  - Fault demo: **EVENT: 3-PH FAULT**, **CB: CLOSED**
- Red **trash** control on CFG11 card (remove when breaker open — Stability pattern).
- Hover card: **CFG11 COMPONENT SPECIFICATIONS**.

### 5.3 CFG11 mapping vs PPT (critical client point)

**PPT / agreed CFG11 (slides 12–13):**

| Asset | Specification |
|-------|----------------|
| **Synchronous Condenser** | **65 MVA × 2 RS12** (also written *65MVA \* 2 RS12* / *RS12 (2 Nos)*) |
| **GFM BESS** | **70 MVA (3.47 MVA × 20 Inverters)** |

**On live UI** (good frames): hover showed SynCon **65 MVA + 2 RS12** and GFM BESS **70 MVA (3.47 MVA × 20 Inverters)** — correct direction.

**Issue observed during review:** some frames showed **drifting / wrong** CFG11 component labels on the SLD hover (e.g. unrelated 10 MVA / 12 MVA / 45 MVA strings). Client expectation is **lock CFG11 labels and icon to SynCon + GFM BESS per slide 13** (Vinoth icon / latest SVG). Display label must read **GFM BESS** (not typos).

**Data readiness (from PPT slide 12 row #11):** *Completed data generated* for RS12 (2 Nos) + GFM BESS.  
Live app should expose **all events** for CFG11 once databank refreshed (SCL / ROCOF / PHJUMP / VSTEP) — previously only fault/RoCoF were wired.

### 5.4 Grid Diagnostics (right panel)

- **Event Details** above meter dials:
  - Idle: *Trigger an event on the diagram to show details (Fault / RoCoF / V / f).*
  - After 3-PH fault:
    - **Three Phase Fault**
    - Fault type: **ABC-G**
    - Fault duration: **140 ms**
    - Fault impedance: **0.02 + j0.2 Ω**
    - Plot signal: **V_PM_GEP_pu Main**
- Dials:
  - **INERTIA (MW.s)** — often stayed **0.00** even when SC dial filled (called out as incomplete).
  - **SC CURRENT (pu)** — ~**2.058–2.06 pu** after fault.
- Helper note: dials empty until event → Calculating… → final value.

### 5.5 Time Domain Characterization (slide 15 topic)

Shown under Grid Diagnostics stack:

- Sections: **ACTIVE CURRENT AT PCC – IP_GEP_PU**, **REACTIVE CURRENT AT PCC – IQ_GEP_PU**
- Metrics per signal: **Response Time**, **Rise Time**, **Settling Time**, **Peak Overshoot**
- Example populated values seen: Response/Rise ~**192 ms**; Peak Overshoot ~**0.16 pu** (Ip) / ~**2.21 pu** (Iq)
- **Bug / gap reviewed:** **Settling Time remained `-- ms`** for both Ip and Iq while other metrics filled.

### 5.6 Stability Analytics charts

Two engines shown side-by-side / stacked for comparison (looks like a **dev comparison build**):

| Engine | Labels on screen |
|--------|------------------|
| Native | **NATIVE SVG ENGINE PLOTTING** / **VECTOR CANVAS ENGINE** — Active / Reactive current at PCC (Ip / Iq) |
| ECharts | **APACHE ECHARTS ENGINE PLOTTING (COMPARISON)** |

Observations:

- Idle SVG: **“No data available for this configuration.”** while ECharts showed empty axes (inconsistent empty states).
- With data: Ip oscillation + Iq spike; ECharts hover tooltips with time / `Iq_GEP_pu Main` values.
- ECharts area often **clipped** at the bottom (needs scroll) — not final UX.
- **Client / review implication:** ship **one** chart engine for demos; remove dual “comparison” stack from customer-facing build when ready.

### 5.7 Event hover on diagram

- Events on SLD: Voltage (V), RoCoF (f), Phase Jump (ø), bolted fault / ground resistor.
- Event Details content should appear on **hover** and in the **right panel** (slide 14 ask from prior email / 28 Jul notes).
- During this call they exercised fault → Event Details + SC dial.

---

## 6. Wind Farm Stabilisation — live UI reviewed

**URL:** `localhost:5173/dashboard`  
**Title:** **GE VERNOVA | WIND FARM STABILISATION USE CASES**

### 6.1 Header controls

| Control | Observed |
|---------|----------|
| **SOLUTIONS** | CFG8 early; CFG11 for most of the SCR demo |
| Tooltip | **“CB Closed — open breaker to change solution.”** |
| **STOP** | Red when running |
| **RESET** | Present |
| **ANALYTICS** | Present (lime/green) |

Note vs 28 Jul notes: header previously discussed as **Start** / Reset / Analytics. Live build showed **STOP** (running state) rather than only Start — confirm naming with client (Start vs Stop toggle is fine if behaviour is clear).

### 6.2 Dual-column layout (confirmed live)

| | **Left (baseline / no solution)** | **Right (with GE solution)** |
|--|-----------------------------------|------------------------------|
| SLD | Grid → Transformer → towers → Load → Transformer → **Wind farm** | Same base + solution branch at WF PCC |
| Solution | — | Red **CB** + CFG schematic (CFG8/CFG11 Display SVG) |
| Badges | `SCR: …`, `SLG` / fault type, `Load: 1 pu` | Same + **`CFG11 CONNECTED`** + **`CB: CLOSED`** |
| Plots | Large **sustained oscillations** (unstable / stressed) | **Flat / damped** near steady value (e.g. active power ~97.3–97.5) |

### 6.3 SCR / Fault / Load (on-diagram)

- Interactive **SCR**, **LOAD (1.0 PU)**, **FAULT (SLG)** dials / selectors on the SLD.
- Values synced across both columns (as designed in 28 Jul follow-up).
- **SCR sweep demoed live** (approx.): **20.0 → 12.2 → 9.0 → 7.6 → 13.9** while AJ + GR cursors pointed at charts.
- Visual story: left stays oscillatory / stressed; right with CFG11 stays anchored / stable.

### 6.4 Waveforms

- Titles seen: **Active power at Wind farm PCC**; also **Reactive power** on early frame.
- Left: high-amplitude sustained oscillation.
- Right with CFG11 connected + CB closed: rapid settle to flat/near-flat line.
- Matches the “fridge stabilizer / anchoring” story from the 29 Jul manager follow-up (same network both sides; solution via breaker).

### 6.5 Gaps vs PPT mock / prior actions

| Topic | PPT / prior ask | Live observation |
|-------|-----------------|------------------|
| System status pill | Normal / Unstable / Anchoring / Stable | Live Vite UI relied more on **CFG11 CONNECTED** / **CB** badges than large status pills |
| Three-phase V plots | PPT mock has P + 3-phase V boxes | Live focus was P (and Q on early frame) |
| Use-case tabs | PPT slide 18: Use case -1…-4, **Cfg 12** on right | Live library was **CFG8 / CFG11** (aligned with 28 Jul data constraint) |
| Wind animation / event region highlight | Asked 28 Jul | Not clearly prominent in frames reviewed |

---

## 7. CIGRE PPT walkthrough (Box)

**File:** `CIGRE_Demo_FLEXSIM (arun.jose@gevernova.com).pptx`  
**Hosted:** Box (`app.box.com/file/…`) · shown as **v8**  
**Credit line:** FlexSim GUI Dashboard — **28 Jul 2026 by Sonam Gupta**  
**Length:** ~24 slides (thumbnails 8–18 visible while reviewing)

### 7.1 Slide 12 — Stability solution characterization (SCR 3 – 220 kV, 50 Hz)

Columns: **# | Configuration | Parameters | Status**

Notable rows discussed (cursor on #11 / #3):

| # | Configuration | Parameters (as shown) | Status |
|---|---------------|------------------------|--------|
| 11 | **RS12 (2 Nos) + GFM BESS** | 65 MVA \* 2 RS12; 70 MVA (3.47 MVA × 20 inverters) | **Completed data generated** |
| 12 | GFM STATCOM + Syn Con | TenneT BAFO model; SC 42.5 MVA, 1.58s | **Need to follow up with Meaghan in this 2025 model** (red) |
| 13 | GFM STATCOM + GFM BESS | TenneT BAFO; BESS 44 × 3.47 MVA INV | **Model development under progress** (red) |
| 1–10 | Various SC / GFL·GFM BESS / GFMe STATCOM combos | — | Completed data generated |

### 7.2 Slide 13 — Stability solution characterization (results table)

- CFG1–CFG11 with Assets, Specification, Short Circuit Test (SCL), ROCOF / Inertia (MW.s), Phase Jump (−20° / −5°) PASS columns.
- **CFG11 (highlighted):**
  - Assets: **Synchronous Condenser** + **GFM BESS**
  - Spec: **65MVA \* 2 RS12** / **70 MVA (3.47 MVA × 20 Inverters)**
  - SCL ~**2.34–2.54**; ROCOF inertia **1210**; Phase Jump **PASS / PASS**

→ This is the authoritative mapping for Stability CFG11 UI + hover specs + icon.

### 7.3 Slide 18 — Wind Farm Stabilisation Use Cases (mock)

- Title: **WIND FARM STABILISATION USE CASES**
- Tabs: Use case -1 … **-4** (active)
- Dual columns with blank **Active power at Wind farm PCC** / **Three phase Voltages at PCC** placeholders
- **System status: Normal** (yellow) on both sides
- Right side still labeled **Cfg 12** in this mock (live app uses CFG11 — keep live library as CFG8/CFG11 until more data)

Other thumbnails noted while paging: slide **15** Time Domain Characterization; slides **16–17** Wind Farm diagram variants.

---

## 8. PSCAD segment (Arun)

**App:** PSCAD **5.0.2** Professional  
**Project:** `Protection_x4 (Simple Distance Protection Scheme)`

- Plots: Voltage (kV), Current (kA), **Ft** (fault trigger), **TripSignal**
- Example timing: fault ~**0.200 s**, trip ~**0.215–0.22 s**
- Status lines: *EMTDC run completed* / *Finished compiling with PSCAD Version 5.0.2*
- Later longer run: TripSignal high; progress ~14–15% at large sim time

**Relevance to FLEXSIM GUI:** context / adjacent GE work — not a change request for the Vite Stability/Wind Farm pages unless Arun maps a specific GUI ask from this demo.

---

## 9. Legacy Dash reference — Renewable Farm Anchoring

**URL:** `127.0.0.1:8055`  
**Title:** **FLEXSIM RENEWABLE FARM ANCHORING**  
**Stack:** Plotly **Dash v4.2.0** (footer also notes update available)

| Control / UI | Detail |
|--------------|--------|
| Buttons | **STOP**, **LINE TRIP** |
| Left | Wind farm only |
| Right | Wind farm + **GFM** |
| SCR 20 | Both sides **Normal** / stable |
| SCR **0.1** | Left **System status: Unstable** (oscillating P/Q, distorted Va/Vb/Vc); Right **Stable** (~97 MW flat, clean 3-phase V) |

**Why it was shown:** Reference behaviour for “without vs with GFM anchoring” under SCR stress — same story the new `/dashboard` CFG11 dual-column demo is meant to tell, with Stability-style CB + CFG library instead of the older Dash chrome.

---

## 10. Discussion themes & communications (what they were aligning on)

1. **CFG11 must match slide 13** — Synchronous Condenser (2× RS12 / 65 MVA) + GFM BESS (70 MVA / 20× 3.47 MVA); data marked complete on slide 12; icon/SVG from Vinoth / latest Display asset.
2. **Stability right panel** — Event Details above dials; Time Domain Characterization metrics; dials fill after event (SC worked; Inertia often still 0).
3. **Chart engine** — SVG vs ECharts comparison still visible; treat as interim; settle on one polished engine for demos.
4. **Wind Farm dual-column** — left stressed / unstable waveforms vs right CFG11-connected stable; SCR dial live and synced; CB must be open to change solution.
5. **PPT still has gaps** — red rows for Meaghan 2025 model follow-up; GFM STATCOM + GFM BESS model under progress; Wind Farm mock still shows Cfg 12 / blank plots.
6. **Legacy Dash** remains a behaviour reference, not the shipping UI.

---

## 11. Issues / bugs observed during the review

| # | Issue | Where |
|---|--------|--------|
| 1 | **Settling Time** stuck at `-- ms` while Response / Rise / Peak Overshoot populate | Stability · Time Domain |
| 2 | **Inertia dial** stays **0.00** after fault while SC current shows ~2.06 pu | Stability · Grid Diagnostics |
| 3 | **CFG11 hover specs** sometimes wrong / drifting vs PPT | Stability · SLD hover |
| 4 | Dual **SVG + ECharts** stack looks unfinished; ECharts clipped | Stability · Analytics |
| 5 | Inconsistent empty states (“No data…” vs blank axes) | Stability · charts idle |
| 6 | Wind Farm **system status pills** / 3-phase V / wind animation less complete than PPT | Wind Farm |
| 7 | PPT slide 18 still **Cfg 12** + empty plot placeholders | PPT |
| 8 | Open models (#12 Meaghan follow-up, #13 under progress) | PPT slide 12 |

---

## 12. Action items (from this call + carry-over)

| # | Owner | Action | Notes / status at meeting |
|---|--------|--------|---------------------------|
| 1 | Dev | Lock **CFG11** Display/Panel icon + hover specs to **SynCon 65 MVA × 2 RS12 + GFM BESS 70 MVA (20× 3.47)** | PPT slides 12–13; Vinoth icon |
| 2 | Dev | Refresh **CFG11 databank** (SCL / ROCOF / **PHJUMP** / **VSTEP**) into slim `/public/databank/CFG11` and enable all four events | Slide 12: data completed |
| 3 | Dev | Fix **Time Domain Settling Time** (and verify Response / Rise / Peak Overshoot definitions vs slide 15) | Visible gap in demo |
| 4 | Dev | Fix **Inertia dial** population for applicable events (esp. RoCoF) | Stayed 0.00 after fault demo |
| 5 | Dev | Event Details: right panel + **hover** on event icons; readable contrast; position next to event | Prior email + this review |
| 6 | Dev | Remove or hide **SVG vs ECharts comparison** for customer demos; keep one engine | Dev build still showed both |
| 7 | Dev | Wind Farm: SCR sweep + dual-column story is working — finish **status pills**, **3-phase V** if required, wind animation / highlights per 28 Jul | Live P/Q + SCR demo looked strong |
| 8 | Sonam / Arun | PPT: keep CFG11 wording aligned; track Meaghan #12 and model #13; update Wind Farm mock (Cfg 12 → CFG8/11, filled plots) | Red rows on slide 12 |
| 9 | vinoth / Dev | Confirm final CFG11 SVG/icon asset is the one on Display (SynCon ×2 + GFM BESS) | Icon thread |

---

## 13. Implementation checklist (developers)

### Stability (`/stability`)
- [ ] CFG11 specs + SVG labels = SynCon + GFM BESS (slide 13)
- [ ] CFG11 has SCL, ROCOF, PHJUMP, VSTEP slim CSVs and UI events enabled
- [ ] Event Details above dials; hover card on V / f / ø / fault
- [ ] Inertia + SC dials populate correctly per event type
- [ ] Time Domain: Response, Rise, Settling, Peak Overshoot all populate for V-step / Phase jump
- [ ] Single chart engine for demos (no dual SVG/ECharts comparison chrome)

### Wind Farm (`/dashboard`)
- [ ] Dual column: baseline vs CFG-connected (CB closed)
- [ ] Solutions library CFG8 + CFG11; change only when CB open
- [ ] SCR / Fault / Load synced both sides
- [ ] Waveforms show unstable vs anchored/stable contrast
- [ ] Status messaging (Normal / Unstable / Anchoring / Stable) if still required
- [ ] Analytics / Reset / Start–Stop behaviours clear for demos

---

## 14. Reference materials

| Item | Location / note |
|------|-----------------|
| Meeting recording | Repo root: `GUI Development Follow Up-20260730_150559-Meeting Recording.mp4` |
| Local frame extract | `.tmp-meeting-20260730/frames/` (working copy; do not commit) |
| Client PPT | `CIGRE_Demo_FLEXSIM (arun.jose@gevernova.com) (1).pptx` / Box v8 |
| CFG11 raw CSVs (latest) | Repo `CFG11/{SCL,ROCOF,PHJUMP,VSTEP}/` |
| CFG11 slim CSVs | `public/databank/CFG11/*.csv` |
| Live Vite apps (local) | `http://localhost:5173/stability`, `http://localhost:5173/dashboard` |
| Dash reference | `http://127.0.0.1:8055` — FLEXSIM Renewable Farm Anchoring |
| Prior meeting notes | [GUI-Development-Follow-Up-2026-07-28.md](./GUI-Development-Follow-Up-2026-07-28.md) |

---

## 15. Relationship to 28 Jul meeting

| 28 Jul theme | 30 Jul status in this recording |
|-------------|--------------------------------|
| Wind Farm dual-column only | **Live** on `/dashboard` |
| CFG8 + CFG11 library | **Live**; CB-gated change |
| SCR / Fault / Load synced | **Live**; SCR sweep demoed |
| Status Normal→Unstable / Anchoring→Stable | Partially — badges strong; large status pills less visible |
| Stability Event Details + Time Domain | **Live** and exercised; Settling / Inertia gaps remain |
| CFG11 → SynCon + GFM BESS | Confirmed again on PPT slides 12–13; must stay locked in UI |

---

*Document created from the 30 Jul 2026 GUI Development Follow-Up recording (visual review of shared screens / PPT / demos) for Verona Spark Engine / FLEXSIM GUI work.*
