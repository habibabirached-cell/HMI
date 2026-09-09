# GUI Development Follow-Up — Meeting Notes

| Field | Detail |
|-------|--------|
| **Meeting** | Final Stability / GUI fix walkthrough (Google Meet) — Asha email + Databank_Aug14 + live UI |
| **Date** | **15 August 2026** (morning IST) |
| **Recording** | `2026-08-15 10-34-21.mp4` (~**27 min 38 s**, 1280×720) |
| **Approx. wall clock** | ~**10:34 AM – ~11:02 AM** IST (filename `10-34-21`; taskbar ~10:34–10:59 during share) |
| **Meet code** | `meet.google.com/gds-jsue-cgn` |
| **Participants** | **Gyanendra Nath Rai (Aplus)** — screen share / walks fixes + Box + email; **Ameen Pasha A (Aplus)** — implements carefully |
| **Focus** | **Final / careful** changes from **Asha’s 15 Aug email** (screenshots attached to this call pack) + **DataBank_Aug14**: (1) SVG labels + Transformer naming; (2) **GFM green / GFL white**; (3) CFG12/13 Event Details placeholder + hover study cards; (4) rename **Wind Farm → IBR Farm Stabilization** + Status sequencing; (5) remove **Settling Time**; (6) **SCL dial → kA** via `Iq_GEP_kA Main`; (7) **Base MVA** above Ip/Iq charts; (8) Aug14 event-time map; (9) **clean CSV split and/or FastAPI** — no data manipulation |
| **Demo URLs seen** | Local Stability: `http://localhost:5173/stability` · IBR/Wind Farm: `http://localhost:5173/windfarmstability` · FlexIQSim Stability tabs also open |
| **Key source email** | **Asha Radhakrishnan (GE Vernova)** → Gyanendra — *Re: GUI Development Follow Up* (**Sat 15 Aug 2026**) — “compiled discussion points… please make necessary changes” |
| **Extra evidence** | Client requirement screenshots from that email (config labels, GFM/GFL colour sheet, CFG12/13 Event Details 3a/3b, IBR Status table, Stability Settling/SCL/Base MVA) — filed with recording review on 15 Aug |
| **Prior notes** | [GUI-Development-Follow-Up-2026-08-13.md](./GUI-Development-Follow-Up-2026-08-13.md) |

> **How these notes were produced:** Frames every ~30 s (`.tmp-meeting-20260815/frames/`, do not commit) + Whisper STT (`.tmp-meeting-20260815/transcript.txt`, Hindi+English). Prefer **on-screen email / Excel / PDF text** over STT for exact wording. Call language mixed **Hindi + English**. Whisper may mishear terms (e.g. “SCL”, “GFM/GFL”, “SynCon”, “RoCoF”, “kA”, “pu”).

> **Priority for implementation:** Treat this document as the **final change list** for Stability until GE says otherwise. Prefer **Asha’s email text** + **DataBank_Aug14** / `Databank_Info_Aug14.xlsx` over older Aug12 mapping when they disagree.

> **Execution checklist (tasks only, no extras):** [Final-Delivery-Plan-2026-08-15.md](./Final-Delivery-Plan-2026-08-15.md)

---

## 1. Meeting purpose

1. Walk the **live Stability UI** and confirm what still looks wrong vs what GE already signed off.
2. Open **Box `Databank_Aug14`** (updated today by Asha) and **`Databank_Info_Aug14.xlsx`** as the **new source of truth** for CSVs + event start times.
3. Cross-check **CIGRE Stability Characterization PDF** (`CIGRE_FLEXIQSIM_StabilityCharData_CFG1-11_v3.pdf`) — metrics shown are **Response / Rise / Peak (kA)** (and SCL / Inertia), **not Settling**. Full tables → [CIGRE-FLEXIQSIM-StabilityCharData-CFG1-11-v3.md](./CIGRE-FLEXIQSIM-StabilityCharData-CFG1-11-v3.md).
4. Read **Asha’s compiled email** (15 Aug) line-by-line — these are the **final GUI fixes** to implement carefully.
5. Read **Asha’s compiled email** (15 Aug) line-by-line — including IBR Farm rename / Status sequencing — these are the **final GUI fixes**.
6. Confirm **CFG12 / CFG13** Event Details empty-state copy and per-event hover cards (study id + CB line + sketch).

---

## 2. Participants & roles (as seen)

| Person | Role in this call |
|--------|-------------------|
| **Gyanendra Nath Rai** | Manager / presenter — shares Stability localhost, Box databank, CIGRE PDF, Asha email; explains what Ameen must change |
| **Ameen Pasha A** | Implementer — present on Meet; owns careful code + databank wiring |
| **Asha Radhakrishnan (GE)** | Author of today’s written fix list (email); updated Box `Databank_Aug14` folders |
| **Sonam Gupta (GE)** | Referenced in email / Excel header — prior instruction to use Aug14 databank; owns configuration content historically |

---

## 3. Chronological agenda (what was on screen)

| ~Wall clock | ~Elapsed | Frames (approx.) | Content |
|-------------|----------|------------------|---------|
| 10:34–10:36 | 0–2 min | f_001–f_004 | Meet join; FlexIQSim / Stability tabs already open |
| 10:36–10:41 | ~2–7 min | f_005–f_013 | **Stability Solution Characterization** live UI — CFG strip, SLD, Event Details placeholder, dials (**Inertia** + **SCL (pu)**), Time Domain table still shows **SETTLING**, Ip/Iq analytics |
| 10:41–10:50 | ~7–16 min | f_014–f_030 | Box **`Databank_Aug14`** folders (CFG1–11); **`Databank_Info_Aug14.xlsx`** event times / Base MVA / durations |
| 10:50–10:54 | ~16–20 min | f_031–f_039 | Local Stability / Wind Farm quick checks (`localhost:5173`) |
| 10:54–10:56 | ~20–22 min | f_040–f_043 | **CIGRE PDF** characterization tables — SCL (pu **and** kA), Inertia; TD metrics **without Settling** |
| 10:56–11:00 | ~22–26 min | f_045–f_050 | **Asha email** — compiled final points (Settling remove, SCL→kA, SVG labels, GFM/GFL colours, CFG12/13 placeholder) + older Sonam Hostinger mail for history |
| ~11:00–end | ~26–28 min | f_051–f_055 | Wind Farm / older slide imagery in mail (context only) |

---

## 4. What they want (cleaned requirements) — FINAL

### 4.1 Source of truth — **DataBank_Aug14** (mandatory)

| Topic | Decision |
|-------|----------|
| Package (Box) | `FlexSim GUI Dashboard → Data Bank CSV Files → **Databank_Aug14**` |
| Package (**local — received**) | **`D:\verona-spark-engine\Databank_Aug14\`** — full inventory in [Databank-Aug14.md](./Databank-Aug14.md) |
| Contents | **CFG1–11** × four events (`SCL` / `ROCOF` / `PHJUMP` / `VSTEP`) = **44 CSVs (~2.82 GB)** + **`Databank_Info_Aug14.xlsx`**; **no CFG12/13 CSVs** in this drop |
| Mapping sheet | **`Databank_Info_Aug14.xlsx`** tabs: `DataBank_Info`, `Sheet1`, `VoltageStep_PhaseJump`, `EventDetails` |
| Rule (Asha email, on screen) | *“As Sonam has communicated before, please use **DataBank_Aug14** for all references and data.”* |
| Replaces | Prefer Aug14 over **DataBank_Aug12th** / older public databank crops when timings or columns differ |

**Dev implication:** Re-run prepare/slim pipeline from **local** Aug14 CSVs; update `EVENT_TIMES`, `CFG_SPECS` / Base MVA, and any dial column names to match Aug14. Do **not** invent times — copy from Excel. Do **not** commit the multi-GB raw CSVs.

#### Event start times / Base MVA (verified from local `Databank_Info_Aug14.xlsx`)

| CFG | Base MVA | Event starts \(t_f / t_r / t_p / t_v\) | Duration window (s) |
|-----|----------|----------------------------------------|---------------------|
| CFG1 | 300 | **40 s** (all four) | **0 – 80** |
| CFG2 | 300 | **40 s** | **0 – 80** |
| CFG3 | 300 | **40 s** | **0 – 80** |
| CFG4 | 300 | **80 s** | **0 – 150** |
| CFG5 | 450 | **40 s** | **0 – 80** |
| CFG6 | 343 | **10 s** | **0 – 20** |
| CFG7 | 343 | **5 s** | **0 – 10** |
| CFG8 | 300 | **40 s** | **0 – 80** |
| CFG9 | 326 | **2 s** | **0 – 10** |
| CFG10 | 350 | **40 s** | **0 – 80** |
| CFG11 | 200 | **40 s** | **0 – 70** |
| CFG12 / CFG13 | *(blank)* | *(blank)* | Assets only in Excel; CSVs not in this package |

> Full asset / dial / EventDetails tables: [Databank-Aug14.md](./Databank-Aug14.md). Earlier Meet OCR guesses (e.g. CFG4 V-step 83 s, CFG9 window 0–4) are **superseded** by this xlsx.

---

### 4.2 Remove **Settling Time** everywhere (Stability) — email §5

| Topic | Decision |
|-------|----------|
| Written ask (Asha § **5. Stability Solution Characterization**) | **Remove “Settling Time”** from the application — explicitly including **Detailed Analytics** |
| Why it matches engineering PDF | CIGRE characterization slides shown in the call list **Response / Rise / Peak** (and SCL / Inertia) — **no Settling** row |
| Current UI bug (seen live) | Time Domain metrics table still shows a **SETTLING** row (`-- ms`) under Ip and Iq |

**Dev implication:** Delete Settling from:

- Time Domain metrics table (Current / Previous)
- Any Detailed Analytics / compare tables that still show Settling
- Reference step-response artwork / legend if it still calls out \(t_s\) as a product metric (keep visual only if GE still wants the sketch, but **do not report Settling as a computed value**)

---

### 4.3 SCL dial → **Short Circuit Level in kA** (not pu) — email §5

| Topic | Decision |
|-------|----------|
| Label (preferred) | **SHORT CIRCUIT LEVEL (kA)** |
| Label (if space tight) | **SCL (kA)** |
| Data column | Use **`Iq_GEP_kA Main`** — **not** `Iq_GEP_pu Main` for this dial |
| Reference | Folder **`Databank_Aug14`** · sheet **`Databank_Info_Aug14.xlsx`** (email wording: *Databank_Aug14folder* / *Databank_info_Aug14.xlsx*) |
| Live UI today | Dial still labelled **SCL (pu)** / similar — must change |

**Dev implication:**

1. Rename dial UI string(s) to **SCL (kA)** / full name as space allows.
2. Point SCL dial sampling / latch logic at **`Iq_GEP_kA Main`** (same event-time sampling rule as today, but **kA column**).
3. Revisit Previous/Current dial compare so both sides use **kA** on a comparable base (do not mix pu dial vs kA dial).
4. Confirm Analytics / tooltips do not still say “SCL (pu)” for this dial.

**Engineering cross-check:** CIGRE PDF shows both **SCL @ 40 ms (pu)** and **(kA)** — product dial for the demo is now the **kA** story per Asha.

---

### 4.3b **Base MVA** above Ip / Iq waveforms — email §5 (new detail from screenshots)

| Topic | Decision |
|-------|----------|
| Placement | At the **top of the Ip and Iq waveform area** (Stability Analytics / GEP charts), show a clear lime headline |
| Exact pattern | **`Base MVA = xxx MVA`** (example shown: `Base MVA = 200 MVA`) |
| Value source | Per-CFG **plant / Base MVA** from **`Databank_Aug14\Databank_Info_Aug14.xlsx`** |
| Helper note in mock | “(populate according to CFG PLANT MVA – Refer excel sheet Databank)” — do **not** hardcode one MVA for all CFGs |

**Dev implication:** When a CFG is connected, read its Base MVA from the Aug14 mapping (same source as dials/event times) and render it above the Active / Reactive current charts. Update when CFG changes.

---

### 4.4 SVG / SLD component labels & hover — email §1 Configuration validation

| Topic | Decision |
|-------|----------|
| Status (green in email) | **Nameplate values for all configurations are correct** — do not rework ratings numbers unless Excel says otherwise |
| Bring back (red in email) | Descriptions of the **SVG diagrams** as specified below |
| Placement | **Every component** in the SVG must show its **name at the bottom** of the symbol (e.g. **Synchronous Condenser**) |
| Transformers (diagram) | Label must be only **`Transformer`**. Do **not** use “three-winding” or “four-winding” on the diagram |
| Hover / specs card | Remove **“Three-Winding”** / **“Three Winding Transformer”** — show only **`Transformer`** (plus MVA / kV rating lines as today) |
| Visual reference | Email mock shows CFG with labels under Transformer + two Synchronous Condensers; hover card currently wrongly says “Three Winding Transformer” |

**Dev implication:** New client Display SVGs already include bottom names for many CFGs — verify all CFG1–13. Fix **CFG_SPECS** / hover card strings so transformers never say three-/four-winding.

---

### 4.5 Colour coding — **GFM = green**, **GFL / others = white** — email §2

| Topic | Decision |
|-------|----------|
| Rule (red text) | **Only GFM components** are **GREEN**. **All other** components (including **GFL**) are **WHITE** |
| Reference strip in email | **GFL BESS** white · **GFM BESS** green · **GFMe STATCOM** green · **GFM STATCOM** green · **GFL STATCOM** white |
| Action | Correct and verify across Stability Display + Panel icons / connected plant art |

**Dev implication:** Audit SVG fills/strokes and any CSS filters. SynCon and transformers stay **white** (not GFM). Hybrid CFGs must colour each sub-component correctly, not the whole CFG green.

---

### 4.6 CFG12 / CFG13 — Event Details (email §3a + §3b)

#### 3a — Empty / guidance placeholder (exact wording)

| Topic | Decision |
|-------|----------|
| Applies to | **CFG12** and **CFG13** only (when no study/event story is active yet) |
| Old / wrong copy | “Hover or click an event on the diagram to show details (fault / RoCoF / V / ø)…” |
| Near-miss copy seen in one mock | “Select a study from drop down in the toolbar to proceed” (**missing** “the” / “menu” / hyphen) |
| **Required exact text** | **`Select a study from the drop-down menu in the toolbar to proceed`** |

#### 3b — On hover of each event (keep / match this content model)

Email shows that for CFG12/13, hovering each event currently (and should continue to) present a rich **EVENT DETAILS** preview card, for example:

| Event | Example title | Study id | CB line | Sketch |
|-------|---------------|----------|---------|--------|
| RoCoF | RoCoF 50 → 49 Hz — BESS & SynCon | Study **A_20** | RS CB: Close · BESS CB: Close | Ramp 50→49 vs t |
| Voltage step | Step-Down −10% — BESS & SynCon | Study **A_11** | RS CB: Close · BESS CB: Close | Step 1.0→0.9 vs t |
| Phase jump | Phase Jump −30° — BESS & SynCon | Study **A_26** | RS CB: Close · BESS CB: Close | Jump 0°→−30° vs t |

**Dev implication:**

1. Empty state uses the **exact** 3a sentence (with “the drop-down menu”).
2. After a study/mode is selectable from the toolbar, hover/click must keep **title + study id + CB status + sketch** (same story on hover and click — aligns with 13 Aug).
3. Do not replace the rich hover cards with the empty placeholder once a study/event is active.

---

### 4.7 **IBR Farm Stabilization** rename — email §4

| Topic | Decision |
|-------|----------|
| Rename | Change every user-facing **“Wind Farm Stabilization”** (and equivalent “Wind Farm Stabilisation”) to **`IBR Farm Stabilization`** |
| Scope | Page title, nav / home cards, headers, docs strings in product UI — anywhere the demo product name appears |
| Route | Keep technical route `/windfarmstability` unless product asks to change URL separately (not stated in email) |

**Dev implication:** Global string pass in UI components for the windfarm stability surface. Update home “solutions” card labels if they still say Wind Farm.

---

### 4.8 IBR Farm — **Status** sequencing for **0.4 pu load Fault** case — email §4

Follow the colour coding of the Status pill (green / yellow-orange / red). Required sequence:

| UI interaction | Timing | Without Solution (Left) Status | With Solution (Right) Status |
|----------------|--------|--------------------------------|------------------------------|
| Click **START SIMULATION** | — | **Normal** (green) | **Normal** (green) |
| Click **20→1.6** | immediate | **Weak Grid Detected** (yellow/orange) | **Weak Grid Detected** (yellow/orange) |
| (after 20→1.6) | **FROM 0.2 s TO 2 s** after click | **Weak Grid Detected** (yellow/orange) | **Anchoring** (red) |
| (after 20→1.6) | **2 s** after click | **Stable** (green) | **Stable** (green) |
| Click **Ag 0.5 pu** | immediate | **Fault Detected** (yellow/orange) | **Fault Detected** (yellow/orange) |
| (after Ag 0.5 pu) | **FROM 0.3 s TO 2 s** after click | **Unstable** (red) | **Anchoring** (red) |
| (after Ag 0.5 pu) | **From 2 s onwards** till end of simulation | **Unstable** (red) | **Stable** (green) |

**Dev implication:** Fix live Status state machine on the IBR Farm page for the **0.4 pu load Fault** scenario so **With Solution** shows **Anchoring** in the intermediate windows and ends **Stable**, matching colours above. Without Solution must still end **Unstable** after the fault path.

---

### 4.9 Plot loading / clean CSV + HTTP API (spoken — architecture; **note carefully**)

Gyan’s point in the Meet (Hindi+English): databank files are now **too large** to keep loading the **whole CSV into the React browser app**. Need a **new strategy** with **zero manipulation** of GE’s numbers.

#### Why

| Fact | Meaning |
|------|---------|
| Event often at **~40 s** (CFG4 ~**80 s**, etc.) | Long quiet lead-in before the event |
| Sample step ~**0.001 s** | File size explodes; ~**half the file** can be unused for the demo plot |
| Downsampling in code | **Risky** — can miss dips / peaks (“data going to be missing”) — **do not** invent or thin values in the UI |
| Goal | **No data loss** of real samples; **do not overload the browser** |

#### Hard rule (he repeated at the end)

> Data should **not be manipulated by our code**. We can **only split and use**, **or** bring a **FastAPI** (HTTP API) layer.

#### Option A — **Clean / split CSV** (near-term, can stay in existing pipeline)

1. Do **not** keep shipping the full 0→event lead-in as the only playback file.
2. **Split** (or crop) so that:
   - **Pre-event file / window:** about **2 seconds before** the event time (enough to loop/steady-state until the user triggers the event) — **not** the full unused 40 s.
   - **Event file / window:** from **event time → end** of the useful run; when the event fires, **jump** to that segment and keep plotting to the end.
3. He also floated **two smaller CSVs** (short pre-event + event half) so the browser may load without changing much plot logic; if that is not enough, change logic as above.
4. When the event is active, **resize the chart X-axis** so the plot runs to the **complete end** of that loaded segment (not stuck on a useless long axis).

“Clean CSV” here means **crop/split for performance** — **same sample values**, just less unused lead-in in what the client loads.

#### Option B — **FastAPI / HTTP API layer** (preferred)

1. Keep full/clean databank on a **backend service**.
2. React app **queries the API according to need** (CFG + event + time window) — data is **not** all preloaded into the browser.
3. Flow he described: when a solution is connected / graph is needed → **query API first** → then start/continue the plot.
4. Fetch logic example: around event time, get the needed slice (he said e.g. data **from event for the needed window** / ~**2 s** context as appropriate) — not the entire multi‑minute file.
5. Gyan: **“FastAPI layer is the best tool”**; starting it **will not take much time**; can do this **or** the CSV split path.

#### How this fits the week’s work

| Priority | Item |
|----------|------|
| Do first | Asha UI + Aug14 mapping (Settling, SCL kA, labels, IBR, etc.) |
| Then | CSV split **and/or** FastAPI fetch — confirm with Gyan which to start first |
| Always | Verify plots against Aug14 Excel timings + CIGRE PDF; **no invented values** |

**Dev implication:** Design `prepare:databank` / loaders so either (A) emit short split CSVs or (B) call an HTTP API for windowed series. Do **not** block P0 UI fixes on a full FastAPI rewrite, but treat this as an explicit **manager ask from the 15 Aug recording**, not optional trivia.

**Implemented (Option B + chart flow):** `api/` FastAPI — `phase=pre` (~2 s) while idle, `phase=post` (event→end) on trigger; X-axis sized to the loaded segment. Static fallback: `.pre.csv` / `.post.csv` (or window + client time filter). Samples never rewritten.

---

### 4.10 Still in force from 13 Aug (do not regress)

These were already agreed on 13 Aug and remain part of the Stability story unless this email overrides them (it does **not** override them):

| Item | Keep |
|------|------|
| Event Details hover = click | Same story / waveform source |
| Gate waveform until CFG connected + CB closed | Guidance text until then |
| Time Domain Current \| Previous layout | Left Current, Right Previous when previous exists |
| CFG12/13 mode latch | BESS / SynCon / Combined → Previous \| Current with mode labels |
| Analytics | CFG12/13 as **three independent** rows each |

**This call’s new / sharper items** are: **Aug14 databank**, **remove Settling**, **SCL→kA**, **Base MVA on charts**, **SVG naming**, **GFM/GFL colours**, **CFG12/13 placeholder + hover cards**, **IBR Farm rename**, **IBR Status sequencing**, **clean CSV / FastAPI**.

---

### 4.11 Client PDF — `CIGRE_FLEXIQSIM_StabilityCharData_CFG1-11_v3.pdf` (golden QA)

Gyan opened this in the Meet as the place to **verify** dials, graphs, and event values. Full tabulated extract:

→ **[DOC/CIGRE-FLEXIQSIM-StabilityCharData-CFG1-11-v3.md](./CIGRE-FLEXIQSIM-StabilityCharData-CFG1-11-v3.md)**  
→ Local file: `CIGRE_FLEXIQSIM_StabilityCharData_CFG1-11_v3.pdf` (**15 pages**, CFG1–11 only)

| What it is | Why it matters for us |
|------------|------------------------|
| Simulation results summary for CIGRE configs | Authoritative **expected** SCL / Inertia / TD numbers |
| P.2 — assets, **Base MVA**, SCL @ 40 ms (**kA + pu**), Inertia (MW·s) | Drives dials + **Base MVA = xxx MVA** banner |
| P.3–4 — TD for all events: **Response / Rise / Peak (kA)** | **No Settling** anywhere — confirms Asha remove-Settling ask |
| P.5–15 — per-CFG Ip/Iq plots + captions | Visual QA of waveforms; fault captions also give **SCL Peak** |
| Signals | Plots titled `Ip_GEP_pu Main` / `Iq_GEP_pu Main` vs `t Main`; TD Peak still reported in **kA** |
| Mapping | Phase Jump & RoCoF → **Ip_GEP**; LLL-G Fault & Voltage Step → **Iq_GEP** |
| Not in PDF | **CFG12 / CFG13** — use other packs + Asha §3a/3b |

**Example (CFG1 fault caption):** SCL @ 40 ms = **4.77 pu \| 3.76 kA**; SCL Peak = **5.32 pu \| 4.19 kA**; Inertia (RoCoF) = **3372 MW·s**.

**Dev implication:** After Aug14 wiring, smoke each CFG1–11 against this PDF before calling Stability “done”. Do not invent alternate Settling or pu Peak for the reference tables.

---

## 5. Development checklist (implement carefully)

### P0 — final must-ship

| # | Item | Detail | Suggested owner | Status (as of 15 Aug notes) |
|---|------|--------|-----------------|------------------------------|
| P0.1 | Switch databank to **Aug14** | Ingest local `Databank_Aug14/` CSVs ([Databank-Aug14.md](./Databank-Aug14.md)); update Excel mapping; regenerate `public/databank` | Dev | **Required** |
| P0.2 | Sync `EVENT_TIMES` / Base MVA | Copy from `Databank_Info_Aug14.xlsx` exactly | Dev | **Required** |
| P0.3 | **Remove Settling Time** | TD table + Detailed Analytics + any Settling outputs | Dev | **Required** |
| P0.4 | SCL dial → **kA** | Label **SHORT CIRCUIT LEVEL (kA)** or **SCL (kA)**; column **`Iq_GEP_kA Main`** | Dev | **Required** |
| P0.5 | **Base MVA = xxx MVA** | Above Ip/Iq waveform charts; per CFG from Aug14 Excel | Dev | **Required** (from email screenshot §5) |
| P0.6 | SVG names under components | Readable bottom labels; transformers = **Transformer** only | Dev | **Required** |
| P0.7 | Hover copy for transformers | Remove Three-/Four-Winding wording in specs card | Dev | **Required** |
| P0.8 | GFM green / GFL white | Match email colour strip (GFL white, GFM/GFMe green) | Dev | **Required** |
| P0.9 | CFG12/13 Event Details placeholder | Exact: *Select a study from the drop-down menu in the toolbar to proceed* | Dev | **Required** |
| P0.10 | CFG12/13 hover study cards | Keep title + Study id + CB line + sketch (3b) | Dev | **Required** — verify not broken |
| P0.11 | Rename to **IBR Farm Stabilization** | All user-facing “Wind Farm Stabilization” strings | Dev | **Required** |
| P0.12 | IBR Status sequencing | 0.4 pu load Fault case table (Anchoring windows + Stable end with solution) | Dev | **Required** |

### P1 — verify / do not break

| # | Item | Detail |
|---|------|--------|
| P1.1 | 13 Aug Event Details + mode latch + Analytics 3-mode rows | Re-test after Aug14 ingest |
| P1.2 | Larger CFG specs typography (13 Aug P1) | Still valuable for TV / screen share |
| P1.4 | **Clean CSV split and/or FastAPI** | §4.9 — no manipulate; split ~2 s pre-event + event→end, or HTTP fetch by need; resize X-axis | Dev / confirm with Gyan | **Required (architecture)** — after or alongside Aug14 ingest |

### Out of scope / context only

- Older July Hostinger email walkthrough (pause/zoom, Event Details placement history) — already largely implemented; do not reopen unless Asha’s 15 Aug list conflicts.
- Unrelated Outlook invite shown mid-call (investor meeting) — ignore.

---

## 6. Suggested implementation order

1. **Freeze source files** — local `Databank_Aug14/` is already in the repo workspace (see [Databank-Aug14.md](./Databank-Aug14.md)); diff vs current `public/databank`.
2. **Remove Settling** from UI + analytics (fast, visible, matches PDF).
3. **SCL dial → kA** (`Iq_GEP_kA Main` + label) and re-smoke Current/Previous dials.
4. **Base MVA** headline above Ip/Iq charts (from Excel per CFG).
5. **Re-map event times / prepare databank** from Aug14 Excel.
6. **SVG label + hover + GFM/GFL colour** pass.
7. **CFG12/13** placeholder + hover study-card verification.
8. **IBR Farm** rename + **Status** sequencing for 0.4 pu Fault.
9. Full smoke: CFG1–13, dials, TD (Response/Rise/Peak only), Analytics, CFG12/13 modes, IBR Status path.

---

## 7. Acceptance checks (for QA / demo)

### Stability

- [ ] All Stability CSV paths / prepare scripts point at **DataBank_Aug14** (not Aug12).
- [ ] Event start times for CFG1–13 match **`Databank_Info_Aug14.xlsx`** (spot-check CFG4, CFG7, CFG9).
- [ ] **No Settling** row/value anywhere on Stability TD or Detailed Analytics.
- [ ] SCL dial reads **kA**, label is **SCL (kA)** or **SHORT CIRCUIT LEVEL (kA)**, series from **`Iq_GEP_kA Main`**.
- [ ] Ip/Iq chart area shows **`Base MVA = <cfg> MVA`** matching Excel for the connected CFG.
- [ ] SLD/SVG: every major component has a **bottom name**; transformers say only **Transformer** on label + hover.
- [ ] GFM assets render **green**; GFL / SynCon / others **white** (matches email strip).
- [ ] CFG12 / CFG13 empty Event Details text is exactly **“Select a study from the drop-down menu in the toolbar to proceed”**.
- [ ] CFG12 / CFG13 event hover still shows study id + CB status + sketch (3b examples).
- [ ] Prior 13 Aug behaviours still pass (hover=click, CB gate, mode Previous\|Current, Analytics 3 rows).
- [ ] Large-CSV strategy agreed: either split/clean windows (~2 s pre-event + event→end) **or** FastAPI windowed fetch; samples never rewritten (§4.9).
- [ ] Spot-check CFG1–11 dials / TD / plot windows against [CIGRE PDF extract](./CIGRE-FLEXIQSIM-StabilityCharData-CFG1-11-v3.md) (§4.11).

### IBR Farm Stabilization

- [ ] No user-facing **“Wind Farm Stabilization”** remains (product title / cards / headers say **IBR Farm Stabilization**).
- [ ] 0.4 pu load Fault Status sequence matches §4.8 table (including **Anchoring** windows and **Stable** with solution after fault).

---

## 8. Open questions / follow-ups

| Question | Who |
|----------|-----|
| Confirm exact CFG4 V-step start (**80 vs 83**) and CFG9 V-step (**2 vs 3**) from the real xlsx | Dev while implementing (open Excel, do not trust OCR) |
| After SCL moves to kA, should Analytics / PDF compare still show pu SCL anywhere, or kA only in product UI? | Confirm with Gyan / Asha if ambiguous |
| Full list of which SVG symbols count as **GFM** vs **GFL** for colour coding (edge cases: SynCon, hybrid CFGs) | Asha / Sonam if not obvious from asset names |
| Are CFG12/13 Aug14 CSVs complete for all three modes? | Check Box folders before claiming done |
| CSV **split now** vs start **FastAPI** data layer first? | Gyan (spoken preference: FastAPI is best; near-term split also OK) |
| Joint verification with **Sonam** after UI + data changes | Sonam available **today / tomorrow** per call — schedule review when P0 done |
| Should `/windfarmstability` URL also rename, or UI strings only? | Product / Gyan (email only mandates display name) |

---

## 9. Source files (local only — do not commit)

| Path | Use |
|------|-----|
| `2026-08-15 10-34-21.mp4` | Source recording |
| `.tmp-meeting-20260815/meeting-audio.mp3` | Extracted audio |
| `.tmp-meeting-20260815/transcript.txt` | Whisper transcript (Hindi+English) |
| `.tmp-meeting-20260815/frames/` | Sample frames (~30 s) |
| `.tmp-meeting-20260815/transcribe.py` | Re-run STT helper |
| Box: `Databank_Aug14` + `Databank_Info_Aug14.xlsx` | Authoritative databank (origin) |
| **Local:** `Databank_Aug14/` + inventory [Databank-Aug14.md](./Databank-Aug14.md) | Received client copy — use this for ingest |
| Box PDF: `CIGRE_FLEXIQSIM_StabilityCharData_CFG1-11_v3.pdf` | Characterization reference (no Settling) — full extract in [CIGRE-FLEXIQSIM-StabilityCharData-CFG1-11-v3.md](./CIGRE-FLEXIQSIM-StabilityCharData-CFG1-11-v3.md) |
| Local copy | `CIGRE_FLEXIQSIM_StabilityCharData_CFG1-11_v3.pdf` (repo root) |
| Email: Asha → Gyan, *Re: GUI Development Follow Up*, **15 Aug 2026** | Written final fix list (+ screenshots §1–§5) |

---

## 10. One-line summary for the team

**Use DataBank_Aug14; remove Settling; SCL dial from `Iq_GEP_kA Main` as SCL (kA); show Base MVA on Ip/Iq charts; SVG names + Transformer-only hover; GFM green / GFL white; CFG12/13 exact drop-down placeholder + study hover cards; rename Wind Farm → IBR Farm Stabilization and fix 0.4 pu Status sequencing; for large CSVs — only split/clean windows or FastAPI fetch (never manipulate samples) — implement carefully with no 13 Aug regressions.**