# GUI Development Follow-Up — Meeting Notes

| Field | Detail |
|-------|--------|
| **Meeting** | GUI Development Follow Up |
| **Date** | 28 July 2026 |
| **Recording** | `GUI Development Follow Up-20260728_155712-Meeting Recording.mp4` (~34 min) |
| **Participants** | Sonam Gupta (GE Vernova), Asha Radhakrishnan (GE Vernova), Gyanendra Rai (Aplus) |
| **Focus** | Wind Farm Stabilisation use-case GUI (not Stability SMIB) |
| **Related PPT** | `CIGRE_Demo_FLEXSIM (arun.jose@gevernova.com).pptx` — Wind Farm Stabilisation slides |

---

## 1. Meeting purpose

Align the **Wind Farm Stabilisation** dashboard design and behaviour with GE Vernova (Sonam / Asha), using the PPT mockups and a live Dash prototype demo. Clarify what to build now vs later, how events work, and how dual-network comparison should look.

---

## 2. Page scope (what this screen is / is not)

### Agreed for now
- This page is **only** the **Wind Farm Stabilisation** use case.
- **Remove** SMIB / MMIB / TWO-AREA tabs from this page (team had put them back by mistake).
- MMIB / other network types can be added **later if needed**.
- Hybrid Solutions as a separate left-rail “drag and drop” area is **not required** on this page right now.
- Keep an **asset library** of configurations (same idea as Stability launch page), but limited set of configs for this use case.

### Layout concept
- **Two columns** side by side:
  - **Left:** without solution (e.g. wind farm alone / No GFMe)
  - **Right:** with solution (e.g. With GFMe STATCOM, or GFMe STATCOM + Synchronous Condenser)
- Each column has:
  - Single-line diagram (SLD / network diagram)
  - Plots / waveforms
  - System status
- Goal: **comparative analysis** — show benefit of adding GFMe / hybrid asset.

---

## 3. Header controls

| Button | Intent |
|--------|--------|
| **Start** | Start / restart simulation; show steady-state behaviour (similar spirit to closing the breaker on Stability) |
| **Reset** | Reset simulation / UI state |
| **Analytics** | Navigate to analytics / deeper results |

### Notes from discussion
- Prefer **Start** over relying only on a breaker for this page, because there are **two** networks.
- Breaker may still exist conceptually on the solution side for configuration selection.
- Exact Start vs “apply event” flow was debated (see §6); Start stays for now.

---

## 4. Asset library (configurations)

| Decision | Detail |
|----------|--------|
| Show now | **CFG 8** (GFMe STATCOM) and **CFG 11** only |
| Label in mock | “GE Vernova asset library (Library of 11 configurations)” — full library later |
| Why only two | Data currently available for CFG 8 and CFG 11 |
| Later | Add more configs when more databank / CSV data exists |
| Icons | Reuse same panel / Display icons as on Stability launch page |

### Use-case selection flow (conceptual)
1. Select use case / solution type (e.g. With GFMe STATCOM **or** With GFMe STATCOM + SynCon).
2. Adjust SCR / Fault / Load.
3. Start simulation.
4. Waveforms and status update for both columns.

---

## 5. Control panel — SCR, Fault, Load

### Principle
- Do **not** scatter event triggers across the two diagrams in a confusing way.
- Keep selection **consolidated** (control panel / one place).
- Selection should **reflect on both** network diagrams (synced).
- Indicators live **on the SLD**, near the physical meaning:
  - **SCR** near **Grid**
  - **Fault** near fault location on the network
  - **Load** near load (triangle) symbol

### SCR Change
- Event-based (predefined cases), not a live short-circuit calculation engine in the UI.
- UI shows SCR on a dial / switch / selectable control near the grid on **both** diagrams.
- Values discussed: **20**, **1**, **1.6** (examples / current sample set).
- **Do not use 16** — that was a misread of **1.6**.
- Range idea: about **1 → 20**.
- Fractional values allowed to **one decimal** (e.g. 1.1, 1.6) — exact tick list frozen later when test cases finalize.
- Both diagrams stay **in sync** when SCR changes.
- Alternatives discussed (slider, “fan regulator” style switch) — open to polish; behaviour matters more than exact widget.

### Fault
- Types (fixed set discussed):
  - Three-phase (ABC)
  - Line-to-line (LL)
  - Single line-to-ground (SLG)
- Selecting a fault type should make the **fault indicator active** on the diagram.
- Not a continuous “intensity” slider for fault — **type selection**.
- **Common mistake to avoid:** Fault is **not** numeric “fault values” like SCR. It is **which type** of fault (ABC / SLG / LL). Choosing a type activates the lightning/fault marker on **both** SLDs and applies that event.

### Load Change
- Values discussed: **1 pu**, **0.8 pu**, **0.5 pu**
- Indicator near load symbol on SLD.

### Bottom control panel vs on-diagram only
- Early mock showed a bottom control panel (SCR / Fault / Load / asset library).
- Discussion: if SCR / fault / load live **on the diagrams**, a separate bottom “events box” may be less necessary — but selection UI still needs a clear place.
- Agreed direction: **select once → show on both diagrams**; keep UX clear for the presenter.

---

## 6. Simulation / event flow

### Steady state
1. Start (or breaker close) → play **steady-state** data on **both** columns.
2. Left and right use **different CSVs** (without vs with solution), so steady-state values can differ.

### Events
1. User selects SCR / Fault / Load parameters.
2. Event is applied (immediately on selection, or via Start / Apply — see open points).
3. Waveforms seek / switch to that event’s time window (same idea as Stability event playback).
4. **One event at a time.**

### Start vs Apply Event
- Question raised: after selecting fault type / load / SCR, do we need a separate **“Apply event”** trigger, or does changing the selection fire the event?
- Temporary agreement:
  - Prefer firing on selection (like Stability) **or** use Start after setup.
  - Can add an explicit **Apply event** later if the UX feels wrong once implemented.

### Sequence example (from discussion)
1. Steady state running (SCR = 20).
2. User changes SCR 20 → 1 → dials update; waveforms switch to SCR step-change case.
3. User may then apply next event (fault / load) in sequence as product allows — keep presenter flow simple.

---

## 7. System status labels

Status is **not always “Normal”**. It must change with the event and differ between columns.

| Phase | Left (No GFMe / without solution) | Right (With GFMe / with solution) |
|-------|-------------------------------------|-------------------------------------|
| Steady state | **Normal** | **Normal** |
| During / after disturbance | **Unstable** (or “Instability detected” → Unstable) | **Anchoring** (transient) → **Stable** |

### Demo reference (Dash prototype)
- App shown at `http://127.0.0.1:8055` — “FLEXSIM RENEWABLE FARM ANCHORING”.
- Line Trip applied:
  - Left: Normal → **Instability detected / Unstable** (keeps oscillating).
  - Right: Normal → **Anchoring** → **Stable**.
- This is the core story of the dual-network page.

### States called out
1. **Normal**
2. **Instability detected** (optional intermediate on left)
3. **Unstable**
4. **Anchoring**
5. **Stable**

Status text should remain visible even though waveforms already show the behaviour.

---

## 8. Plots / charts

### Per column (both sides)
Agreed set to keep:
1. **Active power** at Wind farm PCC  
2. **Reactive power** at Wind farm PCC (include — dual P/Q waveform OK)  
3. **Three-phase voltages** at PCC  

### Notes
- Mock slides sometimes show only P + V; meeting confirmed **Q should also be kept**.
- Frequency plot appeared in an earlier WIP UI; meeting focus was **P, Q, V**.

---

## 9. Data / CSV / Excel

| Topic | Decision / note |
|-------|------------------|
| Sample for this use case | `SMIB_WF_LineTrip_No_GFMe` and `SMIB_WF_LineTrip_GFMe` (Line Trip) |
| Mapping | Left column ← No GFMe; Right column ← With GFMe |
| More events later | More CSVs / cases when databank grows |
| Excel / event details | Stability (first use case) Excel already updated by Asha |
| Wind farm Excel | **Not fully updated yet** — Sonam to extract / map columns for wind-farm stabilisation |
| Action for Gyan | Use sample Excel/CSV to wire plots now; Sonam to pin column mapping like Stability |

---

## 10. Diagram animation & event highlighting

| Item | Request |
|------|---------|
| Wind farm | Animate turbines (major visual) |
| Fault event | Highlight fault region on **both** diagrams |
| SCR event | Highlight grid / SCR region on both diagrams |
| Line trip | Show affected transmission / CB region when that event is active |

---

## 11. Stability page side discussion (end of call)

Not the main Wind Farm topic, but covered briefly:

- Hover / event details on Stability (SMIB) are looking good.
- Event details panel above meter dials: on fault click, show event detail content.
- Optional: small waveform preview next to event details — Asha suggested snapshotting current dashboard into a PPT slide and placing the plot where desired for clarity.
- Column name / number (A/B/C/D style) for event metadata: applicable across configurations; add if useful for all configs.

---

## 12. Action items

| # | Owner | Action | Status at meeting end |
|---|--------|--------|------------------------|
| 1 | Dev (Gyan / Ameen) | Rebuild Wind Farm page as dual-column only (no SMIB/MMIB/TWO-AREA) | To implement |
| 2 | Dev | Header: Start / Reset / Analytics | To implement |
| 3 | Dev | Asset library: CFG 8 + CFG 11 only for now | To implement |
| 4 | Dev | SCR / Fault / Load selection synced to both SLDs | To implement |
| 5 | Dev | Status: Normal / Unstable / Anchoring / Stable | To implement |
| 6 | Dev | Plots: Active P, Reactive Q, 3-phase V from No-GFMe / With-GFMe CSVs | To implement |
| 7 | Dev | Wind animation + event region highlights | To implement |
| 8 | Sonam | Extract / map wind-farm event data into Excel (like Stability) | Pending |
| 9 | Sonam / Asha | Update PPT with agreed points and convey changes to Gyan | Agreed before wrap-up |
| 10 | Team | Decide later if explicit “Apply event” button is needed | Open / after first build |

---

## 13. Open questions (not fully frozen)

1. Exact SCR tick list (beyond sample 20 / 1 / 1.6) once test cases finalize.  
2. Start-only vs selection-fires-event vs separate Apply Event.  
3. Exact wording of status strings (“Instability detected” vs jump straight to “Unstable”).  
4. How much of the bottom control panel remains vs on-diagram controls only.  
5. Whether Use case -1/-2/-3/-4 tabs stay, or solution-pair tabs only (With GFMe vs With GFMe + SynCon).

---

## 14. Implementation checklist (for developers)

Use this against the live `/dashboard` Wind Farm page:

- [ ] Page is Wind Farm Stabilisation only (no SMIB / MMIB / TWO-AREA chrome)
- [ ] Dual columns: without solution | with solution
- [ ] Start / Reset / Analytics in header
- [ ] Asset library shows CFG 8 and CFG 11
- [ ] SCR / Fault / Load controls exist and sync both diagrams
- [ ] SLD indicators near Grid / fault / load
- [ ] Status cycles: Normal → Unstable (left) and Normal → Anchoring → Stable (right) on disturbance
- [ ] Three plots per column: P, Q, V
- [ ] Wire No-GFMe and With-GFMe LineTrip CSVs
- [ ] Wind animation + event highlight
- [ ] Align naming/title with PPT: “WIND FARM STABILISATION USE CASES”

---

## 15. Reference materials

| Item | Location / note |
|------|-----------------|
| Meeting recording | Repo root: `GUI Development Follow Up-20260728_155712-Meeting Recording.mp4` |
| Auto transcript | `.tmp-meeting/transcript.txt` (local working copy; do not commit unless needed) |
| Client PPT | `CIGRE_Demo_FLEXSIM (arun.jose@gevernova.com).pptx` |
| Sample CSVs | `public/sample-data/SMIB_WF_LineTrip_No_GFMe.csv`, `..._GFMe.csv` |
| Dash prototype (demoed) | Local `127.0.0.1:8055` — FLEXSIM Renewable Farm Anchoring (reference behaviour) |
| Live React app | https://verona-spark-engine-version2-aplus.netlify.app |

---

## 16. Manager follow-up call — 29 Jul 2026 (~22:51)

Recording: `2026-07-29 22-51-43.mp4` · Transcript: `.tmp-meeting2/transcript.txt`

### Concept (fridge stabilizer)
- **Same customer network on both sides** (no different “with STATCOM” SLD as the story).
- Left = without GE solution; right = connect GE solution via **breaker** (like Stability).
- Breaker **default OPEN** → both sides show **same** waveforms (No GFMe CSV).
- Drag or click **CFG8 / CFG11** from library (Panel tiles), then **close breaker** → right uses With-GFMe data.
- Show dropped solution **on top of the diagram** like Stability (`CFG8 Connected` badge + Display SVG overlay).
- Use **exact Stability breaker SVGs** (`Breakeropen.svg` / `Breakerclosed.svg`) and CB Open/Closed badge.
- **Do not** use column headings “With GFMe STATCOM / + SynCon”.
- SCR as **regulator** 1–20 (0.1 steps), synced on both dials; slow down plot playback.

### Implemented after this call
- Dual same-base SLD (WFMS1); right drop zone + Stability-style CB + Display CFG overlay.
- Diagram header badge (`CFG8 Connected` / Ready) + trash clear while CB open.
- Solutions library uses Panel SVGs; click/drag only while CB open.
- CSV switch only when solution dropped **and** breaker closed.
- SCR range slider + presets; slower playback; removed wrong headings.

---

*Document created from the 28 Jul 2026 GUI Development Follow-Up recording and transcript for Verona Spark Engine / FLEXSIM GUI work.*
