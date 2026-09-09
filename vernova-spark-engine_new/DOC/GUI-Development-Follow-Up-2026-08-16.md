# GUI Development Follow-Up — Post-Delivery Review Notes

| Field | Detail |
|-------|--------|
| **Purpose** | Capture **exact last-review asks** after Aug15 delivery: (A) **client email**, (B) **post-delivery + post-showcase manager calls**, (C) **manager pre-event pack**, (D) **manager WhatsApp graph logic** (written SoT), (E) **afternoon showcase follow-ups** |
| **Document date** | **16 August 2026** |
| **Status** | **Review / SoT notes** — morning P0/P1 implemented on branch; afternoon Call #4/#5 adds verify/fix + data-pack handoff. **Gyan’s WhatsApp = authoritative Stability graph / tick / X-axis logic** |
| **Prior delivery SoT** | [GUI-Development-Follow-Up-2026-08-15.md](./GUI-Development-Follow-Up-2026-08-15.md) · [Final-Delivery-Plan-2026-08-15.md](./Final-Delivery-Plan-2026-08-15.md) |
| **Live URL reviewed** | https://verona-spark-engine-aplus-04.netlify.app/stability |
| **Working branch (afternoon)** | `feature/stability-p0-p1-2026-08-16` (push `2cd816a` after Call #5 UI polish) |
| **Meet code (calls)** | `meet.google.com/gds-jsue-cgn` |
| **Client email** | To **Gyan** — review of version available **8pm on Aug 15**, plus trailing-mail leftovers; screenshots filed with this review on **16 Aug 2026** |
| **Manager WhatsApp** | To **Ameen** — (1) morning: tick / Y / pre–post X · (2) afternoon: **Initial X size CFG1–11** + extend-at-boundary (**§3.5**) |

> **How these notes were produced:** (1) Client email screenshots (points **1–15**). (2) Five meeting recordings (frames + Whisper). (3) Manager pack `All_CFG_Preevent_Gyan/`. (4) **Gyan WhatsApp** (written graph logic). (5) Asha PDF Y-axis table. (6) Afternoon Meet chat + on-screen Box. Prefer **WhatsApp + PDF + CSV + Meet chat text** over STT for numbers/UI asks.

> **Order / precedence:** Client email for UI polish · **Gyan WhatsApp for Stability graph/data playback** · Pack CSVs for pre/post samples · Call #4/#5 for post-showcase verify + data handoff · Call #2/#3 as spoken context · PDF for Y ranges. Full afternoon reconciliation → **§9**. If spoken STT conflicts with WhatsApp → **follow WhatsApp**.

---

## Sources reviewed

### A. Client email (written — authoritative UI / chart asks)

| Field | Detail |
|-------|--------|
| Addressee | Hi Gyan, |
| Context | Thanks for accommodating many trailing-mail changes; **continue remaining**; reviewing **version at 8pm Aug 15** + call |
| Points | **1–15** (below). **Done in trailing mail:** §3.a, IBR rename, §5. **Still open:** rest as marked |

### B. Recordings (in order)

| # | File | Duration | Approx. wall clock (IST) | Who / nature |
|---|------|----------|---------------------------|--------------|
| **1** | `2026-08-15 22-16-34.mp4` | ~**6 min 48 s** | **22:16 – ~22:23** | Client delivery feedback channelled in call (graph vs documents/CSV; Box updated by **Asha**) |
| **2** | `2026-08-15 22-28-00.mp4` | ~**1 min 36 s** | **22:28 – ~22:29** | **Manager (Gyan) → Ameen** — steady-state pre-event **loop** |
| **3** | `2026-08-16 10-00-20.mp4` | ~**18 min 26 s** | **10:00 – ~10:18** | **Manager (Gyan) → Ameen** — final graph **X / tick / pre–post** logic |
| **4** | `2026-08-16 12-31-52.mp4` | ~**14 min 11 s** (`851.1 s`) | **12:31 – ~12:46** (LastWrite `12:46:05`) | **Post-showcase** — Gyan reviews live Stability on localhost; X-end + speed |
| **5** | `2026-08-16 12-57-43.mp4` | ~**93 min 41 s** (`5621.4 s`) | **12:57 – ~14:31** (LastWrite `14:31:26`) | **Post-showcase working call** — databank pre/post/public; UI polish live; Box |

> **Doc decision:** Same calendar day + same Meet + continuous Stability SoT → **append here** (do **not** create a separate follow-up file). Afternoon content is **§8**.

### C. Manager data pack (Call #2 delivery)

| Field | Detail |
|-------|--------|
| Folder | [`All_CFG_Preevent_Gyan/`](../All_CFG_Preevent_Gyan/) |
| Contents | CFG1–10 + `CG11.csv` (=CFG11) pre-event Ip/Iq snippets — see **§2.4** |

### D. Manager WhatsApp (written graph SoT — 16 Aug)

| Field | Detail |
|-------|--------|
| From | Gyan → Ameen |
| Morning | Root cause (tick mismatch) + full Stability pre-event / event X–Y logic → **§3.1–3.3** |
| Afternoon (after Call #4/#5) | **Initial X size** per CFG1–11 + boundary extend / stop → **§3.5** (+ screenshot in chat) |
| Ties to | Call #3 · Call #4 Ask B · email §10 / §13 / §14 / §15 · Asha PDF · `All_CFG_Preevent_Gyan` · `Gyan Graph & Analytics data/` |

### E. Afternoon post-showcase (same day — §8)

| Field | Detail |
|-------|--------|
| Context | After morning P0/P1 on `feature/stability-p0-p1-2026-08-16`, Ameen **showcased** Stability to Gyan → Calls **#4** + **#5** |
| Bridge work (between #4 and #5) | Client `SVG/` Display CFGs replace · bus↔CFG wire realign · hover stacking (also continued in #5) |
| Full cleaned notes | **§8** below |

### F. Manager Graph & Analytics data pack (Call #5 delivery — received)

| Field | Detail |
|-------|--------|
| Folder | [`Gyan Graph & Analytics data/`](../Gyan%20Graph%20%26%20Analytics%20data/) |
| Received | **16 Aug 2026** (~14:45–14:48 local) — after Call #5 discussion |
| From | **Gyan** (as promised in Call #5: split **graph** vs **analytics**) |
| Inventory + wiring notes | **§8.5** below |
| Status | **RECEIVED** — not yet wired into `public/databank` (doc only until implement ask) |

**On-camera (calls):** Gyanendra Nath Rai + Ameen Pasha A.

---

## 0. Client email — remaining changes (exact)

Opening (paraphrase): *Thank you for accommodating many changes from the trailing mail. Please continue to update the remaining changes. Reviewing the version available at 8pm on Aug 15 and based on our call, please note the following:*

### Email §1 — Component description placement + font

| Status | **DONE (code)** |
|--------|----------|
| Ask | Component descriptions back — thanks. Put description **on the bottom of the component** (not above). |
| Example | **Synchronous Condenser**: currently label **above** icon → move **below** icon (same for other bottom-name components as in email mock). |
| Extra (red) | **Increase font size** of these labels — current size is hard to read. |

### Email §2 — GFME STATCOM colour (IBR Farm)

| Status | **DONE (code)** |
|--------|----------|
| Ask | GFL/GFM colouring thanks. On **IBR Farm Stabilization**, **GFME STATCOM** is still **white** → change to **green**. |

### Email §3 — CFG12 / CFG13 hover (3.b only)

| Status | **3.a DONE** · **3.b DONE (code)** — left Event Details panel on hover (floating card stays OFF per prior client ask) |
|--------|------------------------------|
| 3.a | Trailing-mail empty-state text — client says **done**. Exact text SoT remains in Aug15 doc: *Select a study from the drop-down menu in the toolbar to proceed*. |
| 3.b (red) | **Please take care of point 3.b regarding the hover over data for CFG12 and CFG13.** |
| Meaning | Rich Event Details on hover: **title + Study id + CB line + sketch** in the **left Event Details panel** (not a floating network overlay). |

### Email §4 — IBR Status sequencing

| Status | Rename **DONE** · Status sequence **DONE (code)** |
|--------|--------------------------------------------|
| Done | Name change to **IBR Farm Stabilization**. |
| Open (red) | **Continue to correct the sequencing of ‘Status’.** |
| SoT table | 0.4 pu load Fault path — Normal → Weak Grid / Anchoring windows → Fault / Unstable vs Stable with solution — full table in Aug15 doc §4.8. |

### Email §5 — Trailing mail point 5

| Status | **DONE** (client confirmation) |
|--------|--------------------------------|
| Note | *All changes in point 5 in the trailing mail looks to be completed.* — no further work unless regression found. |

### Email §6 — PEAK unit + column (kA)

| Status | **DONE (code)** — with P0 |
|--------|----------|
| Ask | Change unit of **PEAK** from **`pu`** to **`kA`**. |
| Data | If populating from `Ip_GEP_pu Main` (email repeats the pu name twice), use **`Ip_GEP_kA Main`** instead for Peak. |
| UI | TD Peak shows **— kA** (not **— pu**). |
| Note | Waveform Ip/Iq charts stay in **pu** (see §7). Peak dial/metric is **kA**. |
| PDF check | v4 YAxisDetails pp.3–4 list **Peak (kA)** for every CFG×event (e.g. CFG1 Phase Jump **0.312 kA**). |

### Email §7 — Ip / Iq axis titles

| Status | **DONE (code)** |
|--------|----------|
| X-axis | Add title **`Time (s)`** on both Ip and Iq waveforms. |
| Y-axis | In the title names, add unit **`(pu)`** (annotated on mock as vertical axis unit label). |

### Email §8 — EVENT DETAILS icons (CFG1–11)

| Status | **DONE (code)** |
|--------|----------|
| Problem | After event click, EVENT DETAILS icon is a flat white sketch. |
| Ask | **Bring back** previous styling: **glowing green** line on dark background with axis cues (like old Voltage Step icon). |
| Scope | **All 4 event cases**, styled as above: |

| Event | Shape (from client diagrams) |
|-------|------------------------------|
| Frequency step / RoCoF | Ramp **50 → 49 Hz** over **1 s**; axes `f (Hz)` vs `time (s)` |
| Voltage step | Step **1.0 → 0.9** pu; axes `V (pu)` vs `time (s)` |
| Phase angle step | Step **0 → −20** deg; axes `φ (deg)` vs `time (s)` |
| Fault / FLT | Pulse **0 → 1 → 0**, width **0.14 s**; axes `FLT` vs `time (s)` |

### Email §9 — Pane height ratio

| Status | **DONE (code)** |
|--------|----------|
| Ask | Reduce vertical span of waveforms a little. Network diagram pane : waveforms pane ≈ **1:1**. |

### Email §10 — **AVOID downsampling** (P0 — client)

| Status | **OPEN** |
|--------|----------|
| Ask | **Please AVOID down sampling the data.** Downsampling creates fidelity issues; waveform looks stepped/jagged; actual response is smoother with all points. |
| Link | Matches manager Call #3 concern on **5000-point** `limitRowsForUi` stride. |

### Email §11 — Analytics page cleanup

| Status | **DONE (code)** |
|--------|----------|
| Ask | On Analytics page, **remove**: **AVG SCL**, **AVG H**, **Live GEP** (as circled in email mock). |

### Email §12 — GEP hover info

| Status | **DONE (code)** |
|--------|----------|
| Ask | GEP hover data not visible correctly. Required **GRID ENTRY POINT** hover: |

| Field | Value | Tag |
|-------|-------|-----|
| Short Circuit Ratio | **SCR: 3** | GEP |
| Nominal Voltage | **220 kV** | GEP |
| Nominal Frequency | **50 Hz** | GEP |

### Email §13 — Steady-state before event (not Ip=Iq=0)

| Status | **OPEN** |
|--------|----------|
| Ask | Do **not** load **Ip = 0, Iq = 0** from start of simulation. Use **steady-state data before the event**. Same steady state for all Event CSVs — load from any of them. |
| Link | Same intent as manager Call #2 + Call #3 pre-event path. |
| **Manager files** | Use folder **`All_CFG_Preevent_Gyan/`** (see §2.4) — one CSV per CFG; loop until event. |

### Email §14 — AVOID latching / abrupt clip

| Status | **OPEN** |
|--------|----------|
| Ask | Data appears to **latch** to a single value after a few seconds → feels **clipped abruptly**. **AVOID latching.** |
| Evidence | Email shows Ip/Iq traces that go dynamic then flatten to a hard horizontal hold. |

### Email §15 — Y-axis min / max / tick from client PDF (P0)

| Status | **OPEN** |
|--------|----------|
| Problem | Y min/max ticks and tick size are **non-uniform**; **y-axis 0** sits at different levels across cases. Need good resolution for Ip and Iq. |
| SoT file (repo) | [`CIGRE_FLEXIQSIM_StabilityCharData_CFG1-11_v4_YAxisDetails.pdf`](../CIGRE_FLEXIQSIM_StabilityCharData_CFG1-11_v4_YAxisDetails.pdf) — **17 pages**, titled *Simulation Results Summary CIGRE Configurations (Ip_GEP_pu Main, Iq_GEP_pu Main vs t Main)* |
| Email instruction | Use as guide for logic; **smooth y-axis transitions** when switching events — **avoid abrupt jumps**. |
| Manager WhatsApp | **Hardcode** these Y ranges per CFG+event for both Ip/Iq charts; fix on event click; idle default = **SCL** row for that CFG (§3.2). |

#### PDF structure (what she attached)

| Pages | Content |
|-------|---------|
| 1 | Title |
| 2 | Performance summary: Base MVA, **SCL @ 40ms (kA + pu)**, **Inertia (MW.s)** for CFG1–11 |
| 3–4 | Time-domain summary: Response / Rise / **Peak (kA)** per CFG × 4 events — supports email **§6 Peak → kA** |
| 5–15 | Per-CFG waveform figures (Ip + Iq for each of 4 events) with the intended axis look |
| **16–17** | **Y-Axis Range Summary** — authoritative min / max / tick for UI |

#### Axis rule (PDF footer, pages 16–17) — implement exactly

> **Zero-centered axis**, tightly fit to the **DOMINANT signal** (Ip or Iq) within the plotted window, **per CFG / subchapter**, then **shared with the other** chart (same Y scale on both Ip and Iq for that event).

So for a given CFG+event: look up the **Dominant Signal** column; apply that row’s **Y-Axis Min / Max / Tick Step** to **both** Ip and Iq panes.

#### Y-Axis Range Summary — full table from PDF (SoT)

**Page 1/2 (CFG1–6)**

| CFG | Subsection | Dominant signal | Y min (pu) | Y max (pu) | Tick step (pu) |
|-----|------------|-----------------|------------|------------|----------------|
| CFG1 | PHASE JUMP: −20 deg | `Ip_GEP_pu Main` | −0.500 | 0.500 | 0.100 |
| CFG1 | ROCOF: −1 Hz/s | `Ip_GEP_pu Main` | −1.00 | 1.00 | 0.200 |
| CFG1 | LLL-G FAULT 140ms | `Iq_GEP_pu Main` | −6.00 | 6.00 | 1.00 |
| CFG1 | Voltage Step: −10% | `Iq_GEP_pu Main` | −0.300 | 0.300 | 0.050 |
| CFG2 | PHASE JUMP: −20 deg | `Ip_GEP_pu Main` | −0.500 | 0.500 | 0.100 |
| CFG2 | ROCOF: −1 Hz/s | `Ip_GEP_pu Main` | −0.500 | 0.500 | 0.100 |
| CFG2 | LLL-G FAULT 140ms | `Iq_GEP_pu Main` | −5.00 | 5.00 | 1.00 |
| CFG2 | Voltage Step: −10% | `Iq_GEP_pu Main` | −0.200 | 0.200 | 0.050 |
| CFG3 | PHASE JUMP: −20 deg | `Ip_GEP_pu Main` | −0.750 | 0.750 | 0.250 |
| CFG3 | ROCOF: −1 Hz/s | `Ip_GEP_pu Main` | −0.600 | 0.600 | 0.100 |
| CFG3 | LLL-G FAULT 140ms | `Iq_GEP_pu Main` | −4.00 | 4.00 | 1.00 |
| CFG3 | Voltage Step: −10% | `Iq_GEP_pu Main` | −0.250 | 0.250 | 0.050 |
| CFG4 | PHASE JUMP: −20 deg | `Ip_GEP_pu Main` | −0.400 | 0.400 | 0.100 |
| CFG4 | ROCOF: −1 Hz/s | `Iq_GEP_pu Main` | −0.400 | 0.400 | 0.100 |
| CFG4 | LLL-G FAULT 140ms | `Iq_GEP_pu Main` | −4.00 | 4.00 | 1.00 |
| CFG4 | Voltage Step: −10% | `Iq_GEP_pu Main` | −0.300 | 0.300 | 0.050 |
| CFG5 | PHASE JUMP: −20 deg | `Ip_GEP_pu Main` | −0.500 | 0.500 | 0.100 |
| CFG5 | ROCOF: −1 Hz/s | `Ip_GEP_pu Main` | −0.750 | 0.750 | 0.250 |
| CFG5 | LLL-G FAULT 140ms | `Iq_GEP_pu Main` | −4.00 | 4.00 | 1.00 |
| CFG5 | Voltage Step: −10% | `Iq_GEP_pu Main` | −0.250 | 0.250 | 0.050 |
| CFG6 | PHASE JUMP: −20 deg | `Ip_GEP_pu Main` | −0.600 | 0.600 | 0.100 |
| CFG6 | ROCOF: −1 Hz/s | `Ip_GEP_pu Main` | −0.500 | 0.500 | 0.100 |
| CFG6 | LLL-G FAULT 140ms | `Iq_GEP_pu Main` | −2.50 | 2.50 | 0.500 |
| CFG6 | Voltage Step: −10% | `Iq_GEP_pu Main` | −0.300 | 0.300 | 0.050 |

**Page 2/2 (CFG7–11)**

| CFG | Subsection | Dominant signal | Y min (pu) | Y max (pu) | Tick step (pu) |
|-----|------------|-----------------|------------|------------|----------------|
| CFG7 | PHASE JUMP: −20 deg | `Ip_GEP_pu Main` | −0.200 | 0.200 | 0.050 |
| CFG7 | ROCOF: −1 Hz/s | `Iq_GEP_pu Main` | −0.020 | 0.020 | 0.005 |
| CFG7 | LLL-G FAULT 140ms | `Iq_GEP_pu Main` | −1.00 | 1.00 | 0.200 |
| CFG7 | Voltage Step: −10% | `Iq_GEP_pu Main` | −0.075 | 0.075 | 0.025 |
| CFG8 | PHASE JUMP: −20 deg | `Ip_GEP_pu Main` | −0.600 | 0.600 | 0.100 |
| CFG8 | ROCOF: −1 Hz/s | `Ip_GEP_pu Main` | −0.600 | 0.600 | 0.100 |
| CFG8 | LLL-G FAULT 140ms | `Iq_GEP_pu Main` | −1.20 | 1.20 | 0.200 |
| CFG8 | Voltage Step: −10% | `Iq_GEP_pu Main` | −0.300 | 0.300 | 0.050 |
| CFG9 | PHASE JUMP: −20 deg | `Ip_GEP_pu Main` | −0.100 | 0.100 | 0.020 |
| CFG9 | ROCOF: −1 Hz/s | `Ip_GEP_pu Main` | −0.300 | 0.300 | 0.050 |
| CFG9 | LLL-G FAULT 140ms | `Iq_GEP_pu Main` | −1.20 | 1.20 | 0.200 |
| CFG9 | Voltage Step: −10% | `Iq_GEP_pu Main` | −0.400 | 0.400 | 0.100 |
| CFG10 | PHASE JUMP: −20 deg | `Ip_GEP_pu Main` | −0.750 | 0.750 | 0.250 |
| CFG10 | ROCOF: −1 Hz/s | `Ip_GEP_pu Main` | −0.500 | 0.500 | 0.100 |
| CFG10 | LLL-G FAULT 140ms | `Iq_GEP_pu Main` | −1.25 | 1.25 | 0.250 |
| CFG10 | Voltage Step: −10% | `Iq_GEP_pu Main` | −0.300 | 0.300 | 0.050 |
| CFG11 | PHASE JUMP: −20 deg | `Ip_GEP_pu Main` | −1.00 | 1.00 | 0.200 |
| CFG11 | ROCOF: −1 Hz/s | `Ip_GEP_pu Main` | −0.400 | 0.400 | 0.100 |
| CFG11 | LLL-G FAULT 140ms | `Iq_GEP_pu Main` | −3.00 | 3.00 | 0.500 |
| CFG11 | Voltage Step: −10% | `Iq_GEP_pu Main` | −0.600 | 0.600 | 0.100 |

#### PDF also confirms Peak (kA) — cross-check email §6

Time-domain pages list **Peak (kA)** (not pu). Examples: CFG1 Phase Jump Peak **0.312 kA**; CFG1 LLLG Peak **4.19 kA**. UI Peak unit must be **kA** from `Ip_GEP_kA Main` / matching kA column as in §6.

#### PDF SCL / Inertia dial reference (page 2) — spot-check

| CFG | Base MVA | SCL @ 40ms (kA) | SCL @ 40ms (pu) | Inertia (MW.s) |
|-----|----------|-----------------|-----------------|----------------|
| CFG1 | 300 | 3.76 | 4.77 | 3372 |
| CFG2 | 300 | 2.94 | 3.74 | 1837 |
| CFG3 | 300 | 2.39 | 2.85 | 2405 |
| CFG4 | 300 | 2.91 | 3.70 | 456 |
| CFG5 | 450 | 3.19 | 2.70 | 4515 |
| CFG6 | 343 | 1.83 | 2.03 | 2810 |
| CFG7 | 343 | 0.713 | 0.787 | 66.9 |
| CFG8 | 300 | 0.865 | 1.10 | 2699 |
| CFG9 | 326 | 0.848 | 0.989 | 2.72 |
| CFG10 | 350 | 1.38 | 1.16 | 3427 |
| CFG11 | 200 | 1.33 | 2.53 | 1120 |

> **Caution:** Older email collage / wrong sample ranges (e.g. asymmetric −0.25…2.25) are **not** SoT. Use **this v4 PDF table only**.

---

## 1. Call #1 — Client last-review feedback (15 Aug ~22:16)

### 1.1 What was on screen

| Elapsed | Evidence | Content |
|---------|----------|---------|
| 0–~3 min | Meet only | Gyan + Ameen on Meet (`gds-jsue-cgn`); tabs open: localhost, GUI email, CIGRE, GE Vernova |
| ~4–7 min | Screen share | Box: **`SCL_CFG1.csv`** under `SCL` — banner **“Updated Today by Asha Radhakrishnan”** |

### 1.2 What the client side needs (cleaned)

| # | Ask | Exact meaning | Done when |
|---|-----|---------------|-----------|
| C1 | **Graph must match documents / CSVs** | For some CFGs, UI plot / values do **not** match the client documents or the CSVs they sent | Spot-check CFG1–11 vs Aug14 Excel / CIGRE / client tables |
| C2 | **Use the files they updated** | Asha updated Box databank files (seen: `SCL_CFG1.csv` “Updated Today”) | App reads current Aug14 (or latest Box) content |
| C3 | **Escalate data doubts to Arun** | If CSV vs document still disagree → **message Arun immediately** | Arun confirms or corrects |

### 1.3 Dev implication

- Do **not** invent “fixes” by rewriting GE sample values.
- Verify **source CSV + EVENT_TIMES + column names**; then ask Arun if the **document** is SoT for that CFG.
- Re-crop / re-ingest if Box files changed after last `prepare:databank`.

---

## 2. Call #2 — Manager short instruction (15 Aug ~22:28)

### 2.1 What was on screen

Live Netlify Stability: CFG1, CB CLOSED, EVENT NONE; charts from `SCL.pre.csv` near 0; dials 0.00; Base MVA 300.

### 2.2 What Gyan said

| # | Ask | Exact meaning | Done when |
|---|-----|---------------|-----------|
| M2.1 | Idle must not look like empty zeros | “Starts plotting on zero” is wrong | Pre-event shows **steady-state** waveform |
| M2.2 | Gyan provides CFG1–CFG11 steady-state data | Files in ~10–15 minutes | **Received** as `All_CFG_Preevent_Gyan/` — still need wire + loop |
| M2.3 | **Loop** steady-state until event | Play SS in loop while no event | Idle = loop SS; event = leave loop |

> Aligns with **email §13**.

### 2.3 Dev implication

- Pre-event / idle path must use **this pack**, **looped**.
- Do **not** leave idle charts permanently at 0.00.

### 2.4 Manager delivery — `All_CFG_Preevent_Gyan/` (received)

| Field | Detail |
|-------|--------|
| Path | [`All_CFG_Preevent_Gyan/`](../All_CFG_Preevent_Gyan/) at repo root |
| Purpose | Exact files Gyan said he would send in Call #2: **CFG1–CFG11 steady-state / pre-event** snippets to **loop until event** (not Ip=Iq=0) |
| Aligns with | Call #2 · Call #3 pre-event path · **email §13** |

#### Inventory

| File | Maps to | Rows (data) | Approx. `t Main` window | Median Δt (s) | Notes |
|------|---------|-------------|-------------------------|---------------|-------|
| `CFG1.csv` | CFG1 | 198 | 39.9505 → 39.99975 | **0.00025** | Just before typical \(t_f≈40\) |
| `CFG2.csv` | CFG2 | 95 | 39.905 → 39.999 | **0.001** | |
| `CFG3.csv` | CFG3 | 166 | 39.834 → 39.999 | **0.001** | |
| `CFG4.csv` | CFG4 | 73 | 79.98175 → 79.99975 | **0.00025** | Just before CFG4 \(t_f≈80\) |
| `CFG5.csv` | CFG5 | 182 | 39.9818 → 39.9999 | **0.0001** | |
| `CFG6.csv` | CFG6 | 460 | 9.954 → 9.9999 | **0.0001** | Just before CFG6 event ~10 s |
| `CFG7.csv` | CFG7 | 89 | 4.9911 → 4.9999 | **0.0001** | Just before CFG7 event ~5 s |
| `CFG8.csv` | CFG8 | 90 | 38.5243 → 38.5332 | **0.0001** | Short SS clip (~9 ms span) |
| `CFG9.csv` | CFG9 | 116 | 1.942 → 1.9995 | **0.0005** | Just before CFG9 event ~2 s |
| `CFG10.csv` | CFG10 | 1070 | 39.893 → 39.9999 | **0.0001** | Longest clip |
| **`CG11.csv`** | **CFG11** | 56 | 39.944 → 39.999 | **0.001** | **Filename typo** — treat as CFG11 (no `CFG11.csv`) |

#### Schema (all files identical)

| Column | Role |
|--------|------|
| `t Main` | Sample time in source study (indexes the file; for loop playback use Call #3 **synthetic X += Δt**) |
| `Iq_GEP_pu Main` | Reactive current (pu) |
| `Ip_GEP_pu Main` | Active current (pu) |

No other columns — chart Y only from these Ip/Iq values.

#### Behaviour to implement (manager WhatsApp + email)

1. While **EVENT: NONE** / before event click: load ~**2 s** from that CFG’s pre-event file → plot Ip/Iq → **loop**; X = `0 + tick + …` (**not** CSV `t`); idle combo = **CFG + SCL** for tick + Y (WhatsApp §3.2).
2. Values are **small non-zero** steady-state (e.g. CFG1 Ip ≈ −0.01445, Iq ≈ 0.00074) — **not** flat zero.
3. On event: fix Y from PDF; `x_max = x_pre + (t_last − t_event)`; Y from event CSV at `t_event+…`; graph X continues from `x_pre`; **stop** when data ends.
4. Wire path: this folder as idle source for CFG1–11 (map `CG11.csv` → CFG11).
5. Tick: hardcode per CFG+event **or** `t[1]−t[0]` from target CSV; §2.4 Δt is a hint only.

#### Sample steady levels (sanity — not for hardcoding Y)

| CFG | Ip ≈ | Iq ≈ |
|-----|------|------|
| CFG1 | −0.01445 | 0.00074 |
| CFG4 | −0.01476 | −0.00135 (flat) |
| CFG7 | −0.00725 | −0.00402 |
| CFG11 (`CG11`) | −0.0388 | 0.00356 |

---

## 3. Manager WhatsApp — authoritative Stability graph logic (16 Aug)

> **This section is the written SoT** Gyan said he would send after Call #3. Implement Stability Ip/Iq playback from here. Call #3 spoken notes below only support it.

### 3.0 How this wires to other sources

| WhatsApp rule | Wired to |
|---------------|----------|
| Tick mismatch misses samples | Call #3 · email **§10** (no downsample / no wrong stride) · email **§14** (latch/clip feel) |
| Per-case Δt from CSV (or hardcoded) | Call #3 tick · `All_CFG_Preevent_Gyan` median Δt (hint) · full event CSV `t Main` |
| Save / fix **Y axis** per CFG+event for Ip & Iq | Email **§15** · PDF pp.16–17 table (already transcribed in §15) |
| Pre-event ~**2 s**, loop, **don’t plot CSV time as X** | Call #2 · email **§13** · folder **`All_CFG_Preevent_Gyan/`** |
| Idle default = **SCL** Y + tick (no event selected) | UI default event family = SCL / Fault until user picks another |
| On event: extend Xmax = preX + (t_last − t_event); plot X synthetic | Call #3 continuous X · **afternoon WhatsApp §3.5** Initial X + extend |
| Stop when post data ends | Call #3 study end · email §14 · **§3.5** “once it reaches end, stop” |
| **Initial X window hardcode CFG1–11** | Afternoon WhatsApp **§3.5** · Call #4 Ask B (spoken “~5+40” → exact table) |
| Hardcode from Asha PDF; verify | [`CIGRE_FLEXIQSIM_StabilityCharData_CFG1-11_v4_YAxisDetails.pdf`](../CIGRE_FLEXIQSIM_StabilityCharData_CFG1-11_v4_YAxisDetails.pdf) |

### 3.1 Root cause (WhatsApp point 1) — why client saw wrong / sparse graphs

| Problem | What happens | Fix |
|---------|--------------|-----|
| **Wrong fetch step** | Time series in a case may be **0.001**, **0.0005**, **0.00025**, **0.0001**, etc. If code always adds a **fixed** step (example WhatsApp: add **0.005** while data is **0.001**), it **skips** CSV rows → missing points, jagged / wrong look | For each **CFG + event** (target CSV), use **that case’s time increment** to step through samples |
| How to get Δt | Hardcode per combo **or** derive: take **two consecutive** `t Main` samples from the **target CSV** → `tick = t[1] − t[0]` (verify constant) | Same idea Call #3: “tick size of that particular databank” |

> WhatsApp examples “0.001 or 0.005” illustrate the **class of bug**, not the only legal ticks. Repo pre-event pack already shows **0.00025 / 0.0001 / 0.001 / 0.0005** — always use **the file’s own Δt**.

### 3.2 Stability case — graphs & data logic (WhatsApp point 2)

Treat UI charts as **Active current Ip** and **Reactive current Iq** (`Ip_GEP_pu Main` / `Iq_GEP_pu Main`) — WhatsApp “Active power / Reactive power” wording maps to these GEP current waveforms in the Asha PDF.

#### A. Y-axis (fixed from Asha PDF)

1. **Save** Y-axis config for **each CFG × each event** for **both** charts (Ip and Iq).
2. Source: Asha PDF — **email §15 table** (zero-centered; dominant signal sets shared scale).
3. When user **clicks an event** → **lock** both chart Y axes to that saved CFG+event configuration (smooth transition — email §15).
4. **Preevent / no event selected:** use **SCL** combination as **default** Y (and default tick) for that CFG — “because no event selected, SCL data is default”.

#### B. Preevent state (simulation started, no event yet)

1. Load **~2 seconds** of data from the **target pre-event file** into the graph (`All_CFG_Preevent_Gyan/CFGn.csv`, CFG11=`CG11.csv`).
2. **X-axis time is independent of CSV `t Main`** — **do not use CSV time to plot X**.
3. Calculate X using **tick size** for the active combo (idle → **CFG + SCL** default).
4. Start timer: `x = 0`, then `x += tick` each step; read next Y (Ip/Iq) from the CSV by **sample index / stepping with that tick’s row cadence**; **loop** when the 2 s clip ends.
5. Example WhatsApp: for CFG1 + (later) phase jump combo, tick drives `0 + tick + tick + …` on the graph.

#### C. When user generates / clicks the event

**Worked example (WhatsApp numbers):**

| Symbol | Example |
|--------|---------|
| CSV last time `t_last` | **80** |
| Event time `t_event` | **40** |
| Graph X already at end of preevent `x_pre` | **10.00025** |
| New X max for full post window | **`x_pre + (t_last − t_event)` = 10.00025 + (80 − 40) = 50.00025** |

**Playback after event:**

1. Keep reading **Y** from the **event CSV** starting at wall time **`t_event`**, stepping source time as `t_event + tick`, `t_event + 2·tick`, … (CSV index).
2. On the **graph**, continue X as `x_pre + tick`, `x_pre + 2·tick`, … (**not** plotting 40, 40.00025, … as X).
3. When **post-event data is exhausted** → **stop** the graph (do not invent / latch fake holds — email §14).

```text
PREEVENT:
  target = All_CFG_Preevent_Gyan / CFGn
  tick   = tick[CFG][SCL]   # default combo until event chosen
  yAxis  = ySaved[CFG][SCL] # both Ip & Iq panes
  x = 0
  loop ~2s worth of samples:
    plot (x, Ip), (x, Iq) from file by index
    x += tick

ON EVENT (e.g. Phase Jump / ROCOF / Fault / VStep):
  tick   = tick[CFG][event]   # may equal SCL tick or from that event CSV
  yAxis  = ySaved[CFG][event] # fix from PDF
  x_pre  = current graph X
  t_event, t_last from event CSV
  x_max  = x_pre + (t_last - t_event)
  t_src  = t_event
  while t_src <= t_last and x <= x_max:
    Y = Ip/Iq at t_src (or nearest sample)
    plot (x, Y)
    t_src += tick
    x     += tick
  STOP
```

### 3.3 What we must store (WhatsApp “most importantly”)

| # | Config | How to obtain | Where documented |
|---|--------|---------------|------------------|
| **1** | **Tick size of X** for each **CFG + Event** combo | Hardcode **or** `tick = t[1]−t[0]` from that target CSV (preferred if constant) | Call #3 · §2.4 Δt hints · event CSVs |
| **2** | **Y-axis** for each graph (Ip & Iq) per CFG+event | **Hardcode from Asha PDF**; AI/dev fills table; **Ameen verifies** against PDF | Email §15 full table · PDF pp.16–17 |
| **3** | **Initial X size** per CFG1–11 | **Hardcode from afternoon WhatsApp** | **§3.5** table |

Also needed at runtime: **`t_event`**, **`t_last`**, and **time before event** (for §3.5 boundary extend) per CFG+event.

### 3.4 Call #3 spoken context (same day — aligned, not higher than WhatsApp)

Authoritative details are **§3.1–3.3** + afternoon **§3.5**. Call #3 (~10:00) discussed the same ideas live:

| Call #3 topic | Status vs WhatsApp |
|---------------|-------------------|
| Don’t use CSV `t` as continuous plot X | **Confirmed** in WhatsApp |
| Synthetic X += tick | **Confirmed** + exact `x_max` formula |
| Pre loop then event continue X | **Confirmed**; WhatsApp adds **~2 s** pre + **SCL default** |
| 5000-point stride harm | Still valid with email §10; WhatsApp root cause is **wrong Δt fetch** |
| Excel CFG1 Δt ≈ 0.00025 | Example of per-case tick — derive/hardcode per file |

**Dials / Peak:** unchanged by this WhatsApp (SCL/Inertia Aug14; Peak **kA** email §6). Graph X/Y playback only.

### 3.5 Afternoon WhatsApp — Initial X size CFG1–11 (after Call #4/#5)

> **Written SoT** Gyan sent after the afternoon showcase / working calls. Complements morning §3.2 (synthetic X + `x_max`) with **hardcoded initial chart X window** per CFG. Screenshot of the number column filed in chat 16 Aug (same values as table).

#### Exact WhatsApp text (cleaned)

```text
Initial X size for config 1 to 11:

X calculation logic:
  Initially, keep the x axis as
  CFG1:40
  CFG2:40
  CFG3:40
  CFG4:70
  CFG5:40
  CFG6:10
  CFG7:5
  CFG8:40
  CFG9:8
  CFG10:40
  CFG11:30

When the data time reach end boundary i.e. for CFG1: 40
(Including initial time before event generated),
increase the X axis by time before event generated
to accommodate full data from postevent csv.
Once it reaches end, stop
```

#### Hardcoded Initial X size table

| CFG | Initial X size (s) |
|-----|-------------------:|
| CFG1 | **40** |
| CFG2 | **40** |
| CFG3 | **40** |
| CFG4 | **70** |
| CFG5 | **40** |
| CFG6 | **10** |
| CFG7 | **5** |
| CFG8 | **40** |
| CFG9 | **8** |
| CFG10 | **40** |
| CFG11 | **30** |

#### Logic (how to read this)

| Step | Behaviour |
|------|-----------|
| **1. Start** | Chart X-axis **range / window** starts at **Initial X size[CFG]** (table above). Do **not** shrink this when the event is clicked. |
| **2. Boundary** | When plotted/data time reaches that **end boundary** (example CFG1 → **40**), that window **already includes** the initial time **before** the event was generated. |
| **3. Extend** | Then **increase X** by **“time before event generated”** (pre-event duration on the synthetic axis / pre segment) so the full **`postevent` CSV** can be shown without clipping. |
| **4. Stop** | When post-event data is fully accommodated / end reached → **stop** (same as morning WhatsApp + Call #4). |

```text
x_initial = InitialX[CFG]          # hardcode table §3.5
# … playback with synthetic x += tick …

when x (or data time) reaches x_initial boundary:
  x_window_max += t_before_event   # “time before event generated”
  # continue plotting postevent CSV into the extended window

when postevent exhausted / end reached:
  STOP
```

#### Wire to other SoT (do not invent a third formula)

| Source | Role |
|--------|------|
| Morning WhatsApp §3.2 | Synthetic X += tick; Y from CSV; `x_max = x_pre + (t_last − t_event)` style span for post |
| Afternoon WhatsApp **§3.5** | **Hardcoded first window** per CFG + **extend by pre-event time** at boundary + stop |
| Call #4 Ask B | Live complaint about early stop / X shrink — this WhatsApp is the **written fix** for that |
| `Gyan Graph & Analytics data/` §8.5 | Supply `*_preevent.csv` / `*_postevent.csv` used when wiring |

> If any code used a generic “5 + 40” from Call #4 STT, **replace with this per-CFG table**. Prefer **§3.5 numbers** over STT.

---

## 4. Unified checklist (email + calls + WhatsApp)

| Priority | Source | Task | Done when |
|----------|--------|------|-----------|
| P0 | **WhatsApp §3.1** | Fetch/step CSV with **per-case tick** (never fixed wrong Δt) | **DONE (code)** — verify live CFG1–11 |
| P0 | **WhatsApp §3.2–3.3** | Synthetic X; pre ~**2 s** loop from `All_CFG_Preevent_Gyan`; idle **SCL** default Y+tick; on event `x_max = x_pre+(t_last−t_event)`; stop at end | **DONE (code)** — verify live |
| P0 | **WhatsApp §3.5** | Hardcode **Initial X size** CFG1–11; at boundary extend by pre-event time for full postevent; then **stop** | **DONE (code)** — `stabilityInitialX.ts`; verify live |
| P0 | Email §15 + WhatsApp | Hardcode Y min/max/tick from **v4 PDF**; fix on event click; smooth switch | **DONE (code)** — `stabilityYAxis.ts` |
| P0 | Email §10 + WhatsApp | **No harmful downsampling** / wrong stride | **DONE (code)** — `limitRowsForUi` passthrough |
| P0 | Email §13–14 + Calls #2–3 | Steady-state pack; **no Ip=Iq=0**; **no latch/clip** past data | **DONE (code)** — preevent + stop |
| P0 | Email §6 | Peak unit **kA** via `Ip_GEP_kA Main` | **DONE (code)** — Peak shows kA |
| P0 | Call #1 | Graphs match documents + latest Box/Aug14 | **TEST** after above |
| P1 | Email §1 | Labels **under** components + **larger font** | **DONE (code)** |
| P1 | Email §2 | GFME STATCOM **green** on IBR Farm | **DONE (code)** |
| P1 | Email §3.b | CFG12/13 hover study cards | **DONE (code)** |
| P1 | Email §4 | IBR **Status** sequencing (0.4 pu Fault) | **DONE (code)** |
| P1 | Email §7 | Axis titles: **Time (s)**; Y unit **(pu)** | **DONE (code)** |
| P1 | Email §8 | EVENT DETAILS icons — glowing green × 4 shapes | **DONE (code)** |
| P1 | Email §9 | Diagram : waveforms ≈ **1:1** height | **DONE (code)** |
| P1 | Email §11 | Analytics: remove AVG SCL, AVG H, Live GEP | **DONE (code)** |
| P1 | Email §12 | GEP hover: SCR 3, 220 kV, 50 Hz | **DONE (code)** |
| P2 | Email §5 / §3.a / rename | Already accepted by client | Re-check only if regression |
| P0 | **Call #4** + **§3.5** | Confirm X **does not stop early**; never shrink X on event; use Initial X table + extend + stop | **DONE (code)** — live-verify with Gyan |
| P1 | **Call #4** | Playback **slightly faster** (manager: currently too slow) | **DONE (code)** — `ticksPerUiFrame` 0.02→0.028 |
| P2 | **Call #4** | Line **colour legend** | **DEFER** — Gyan discusses with client; may send later |
| P1 | Bridge + **Call #5** | Replace Display CFGs from client `SVG/` | **DONE (code)** — `public/svgs/Display/CFG1–13.svg` |
| P1 | Bridge + **Call #5** | Bus / network line → CFG feed aligned on all CFGs | **DONE (code)** — offsets + `recompute-cfg-feed-align.py` |
| P1 | Bridge + **Call #5** Meet chat | CFG / Grid / GEP / solutions hover cards **not behind** charts | **DONE (code)** — portals `z-[300]` |
| P1 | **Call #5** | Analytics: remove **“Slide 17”** text | **DONE (code)** |
| P1 | **Call #5** | Push working branch for Gyan pull | **DONE** — `2cd816a` on `feature/stability-p0-p1-2026-08-16` |
| P0 | **Call #5** + pack **§8.5** | Wire Gyan **Graph & Analytics** pack into app (`public/databank` / loaders) | **DONE (code)** — graph → `.pre`/`.post`; analytics → `Analytics/`; charts use **post** |
| P2 | **Call #5** | Split folders analytics vs graph | **CONFIRMED by pack** — `CFG- Graph/` + `CFG_Analytics/` |
| — | **Call #5** end | Note Box updates today (Sonam layout pptx + CIGRE demo PDF) | **AWARE** — pull if Gyan / client points to them |

---

## 5. Explicit non-goals

- Do **not** invent / average GE sample values to “pretty” the graph.
- Do **not** plot CSV `t Main` as the continuous demo X (WhatsApp).
- Do **not** step the CSV with a global fixed Δt that is not that file’s tick.
- Do **not** keep aggressive chart stride if it causes §10 fidelity loss.
- Do **not** leave Peak in **pu** or waveform axes without §7 titles/units.
- Do **not** expand scope beyond listed email + WhatsApp graph-logic items.
- Do **not** implement line colour-legend until Gyan confirms after client discuss (Call #4 defer).
- Do **not** use a single global initial X (e.g. STT “5+40”) — use **§3.5 per-CFG table**.
- Do **not** shrink the Initial X window when the event starts; **extend** at the boundary for full postevent, then **stop**.

---

## 6. Chronological summary

```text
Trailing mail (pre-8pm)     Many items done (3.a, IBR rename, §5, …)
15 Aug ~20:00               Client reviewed build → email points 1–15
                            + Asha v4 YAxisDetails PDF (§15)
15 Aug ~22:16  Call #1      Graph vs documents/CSVs; Asha Box; ask Arun
15 Aug ~22:28  Call #2      Steady-state CFG1–11 loop until event (not zero)
               → delivered as All_CFG_Preevent_Gyan/ (CG11 = CFG11)
16 Aug ~10:00  Call #3      Spoken: synthetic X += tick; Y from CSV
16 Aug         Gyan WhatsApp  WRITTEN SoT: wrong-Δt root cause;
               Y from PDF; pre ~2s loop SCL default; x_max formula;
               stop when post ends; hardcode tick+Y, verify
16 Aug morning              THIS FILE started — email + calls + pack + WhatsApp
16 Aug ~11–12               P0 graph + P1 UI implemented on feature branch
16 Aug ~12:31  Call #4      Showcase review: X-end early-stop concern;
               slightly faster plot; colour legend deferred
16 Aug ~12:49–12:57         Bridge: new Display CFGs from SVG/; bus align;
               hover stacking (GEP/Grid/CFG)
16 Aug ~12:57  Call #5      Working call: public vs output; pre/post/main
               databank; Gyan to zip new data; Slide 17 remove; push
               ~1:14–~2:27 mostly idle screen-share; ~2:27 Box review
16 Aug ~14:45  Gyan pack    `Gyan Graph & Analytics data/` delivered
               (CFG- Graph + CFG_Analytics) — documented §8.5
16 Aug afternoon WhatsApp   Initial X size CFG1–11 + extend at boundary
               + stop — documented §3.5 (screenshot in chat)
16 Aug (doc)                THIS FILE extended — §8 + pack + §3.5
```

---

## 7. Evidence index

| Source | Location |
|--------|----------|
| Client email screenshots (points 1–15) | Provided in chat 16 Aug 2026 (Cursor assets) — do not commit AppData paths |
| Call #1 | `2026-08-15 22-16-34.mp4` → `.tmp-meeting-20260815-2216/` |
| Call #2 | `2026-08-15 22-28-00.mp4` → `.tmp-meeting-20260815-2228/` |
| Call #3 | `2026-08-16 10-00-20.mp4` → `.tmp-meeting-20260816-1000/` |
| Call #4 (post-showcase) | `2026-08-16 12-31-52.mp4` → `.tmp-meeting-20260816-1231/` (frames + `transcript.txt`) |
| Call #5 (post-showcase) | `2026-08-16 12-57-43.mp4` → `.tmp-meeting-20260816-1257/` (frames + partial STT) |
| Manager WhatsApp (graph SoT) | Pasted in chat 16 Aug → cleaned in **§3.1–3.3** of this doc |
| Manager WhatsApp (Initial X size) | Afternoon 16 Aug → **§3.5** (+ screenshot in chat assets) |
| Manager pre-event pack (Call #2) | [`All_CFG_Preevent_Gyan/`](../All_CFG_Preevent_Gyan/) — inventory + Δt in §2.4; `CG11.csv` = CFG11 |
| Y-axis SoT PDF (email §15) | [`CIGRE_FLEXIQSIM_StabilityCharData_CFG1-11_v4_YAxisDetails.pdf`](../CIGRE_FLEXIQSIM_StabilityCharData_CFG1-11_v4_YAxisDetails.pdf) — full Y table transcribed in §15 |
| Client Display CFG art (afternoon) | `D:\verona-spark-engine\SVG\` → `public/svgs/Display/CFG*.svg` |
| Box (Call #5 end) | `FlexSim GUI Dashboard` — Sonam updates **Today** (`Dashboard_layout_GUI_Ver4_14Aug.pptx`, CIGRE demo PDF v34) |
| Manager Graph & Analytics pack (Call #5) | [`Gyan Graph & Analytics data/`](../Gyan%20Graph%20%26%20Analytics%20data/) — inventory **§8.5** |
| Trailing-mail detail (3.b, Status table) | [GUI-Development-Follow-Up-2026-08-15.md](./GUI-Development-Follow-Up-2026-08-15.md) |

---

## 8. Post-showcase manager review (Calls #4 + #5) — 16 Aug afternoon

> **Why in this file:** Same day, same Meet (`gds-jsue-cgn`), continuous Stability delivery thread after morning WhatsApp/P0/P1. Creating a second “follow-up” would split SoT.

### 8.0 Timeline (file times)

| Item | Evidence |
|------|----------|
| Call #4 start | Filename `12-31-52` + Meet/taskbar **12:31** on `16-08-2026` |
| Call #4 end | Duration **851.1 s** ≈ **14.2 min**; LastWriteTime **12:46:05** |
| Bridge (~12:46–12:57) | Chat asks: replace Display CFGs from `SVG/`; fix bus→CFG wire; hover stacking |
| Call #5 start | Filename `12-57-43` + taskbar **12:57** |
| Call #5 active UI / data talk | Frames ~**12:57–~13:14** (Cursor + Stability + Analytics) |
| Call #5 long idle share | Frames ~**13:14–~14:27** mostly static Cursor after push |
| Call #5 Box glance | Frames ~**14:27** — `app.box.com` **FlexSim GUI Dashboard** |
| Call #5 end | Duration **5621.4 s** ≈ **93.7 min**; LastWriteTime **14:31:26** |

**Participants:** Gyanendra Nath Rai + Ameen Pasha A (screen share / localhost `5173/stability`).

**STT note:** Whisper on these recordings is noisy (accents / overlap). Prefer **on-screen Meet chat**, **file/frame evidence**, and **cleaned reconstruction** below. Numbers for Initial X / extend → **§3.5 WhatsApp** (not Call #4 STT).

---

### 8.1 Call #4 — Showcase review (~12:31–12:46)

**What was on screen (frames):** localhost Stability after morning P0/P1 — CFG1 (SCL / Fault / ROCOF), then CFG9 ROCOF; Event Details left panel; Ip/Iq charts with `Time (s)` / `(pu)`; Inertia/SCL gauges; Time Domain Response/Rise/Peak often still `—`; older Display CFG art still present (SynCon-style) **before** afternoon SVG replace.

#### Call #4 — Ask A — Playback speed

| Field | Detail |
|-------|--------|
| Status | **OPEN** |
| Ask | Make plotting **a little faster** — current playback feels **very slow**. |
| Spoken (cleaned) | Gyan: *“Can we make it a little bit faster? … it’s very slowly.”* Ameen: will push a bit faster. |
| Note | Do **not** abandon readability; this is a modest speed-up after X-end is correct. |

#### Call #4 — Ask B — X-axis end / early stop (P0 verify)

| Field | Detail |
|-------|--------|
| Status | **OPEN — implement §3.5** (ties to afternoon WhatsApp) |
| Ask | Confirm morning **X-axis logic** end-to-end. Plot must **run to the computed end**, not stop mid-way. |
| Observed (Gyan) | Example walkthrough: with longer post data, expected X span on order of **~55 s** (pre + post); he saw run **stop around ~30 s**. Graphs otherwise “look good”. |
| Hard rules restated | (1) Do **not** shrink X when event starts. (2) Let it plot through post data. (3) Stop when post/data end reached. (4) **Initial X** is now hardcoded per CFG — **§3.5** (replaces vague STT “~5+40”). |
| Spoken (cleaned) | *“…it’s stopping in between… not calculating that x-axis logic”* · *“After 30 seconds, it stopped automatically… Just let it run”* · *“when I was calculating the first X at the link of event, X was getting smaller… which we don’t want”* · *“Otherwise I think it’s working fine for all the cases.”* |
| SoT cross-check | Prefer **§3.5 Initial X table** + morning §3.2 synthetic X / stop. Call #4 is **live verification**; afternoon WhatsApp is the **written X-window SoT**. |

#### Call #4 — Ask C — Chart stack / uPlot

| Field | Detail |
|-------|--------|
| Status | **NO CHANGE NOW** |
| Ask | Mention of preparing / using **uPlot** — leave as-is for now (*“that’s not bad… we’ll just leave it”*). |

#### Call #4 — Ask D — Line colour legend (deferred)

| Field | Detail |
|-------|--------|
| Status | **DEFER** |
| Ask | There should eventually be a **colour legend on the line(s)** — **do not change now**. Gyan will discuss with client; if required he will give it later. |
| Spoken (cleaned) | *“there should be a colour lens in the line also, but let’s not change it… I will discuss… if it’s going to be, then I can give it to you later.”* |

#### Call #4 — UI observations (not new client email items)

| Observation | Note |
|-------------|------|
| Time Domain Response / Rise / Peak still dashes on several events | Visible on CFG1/CFG9 during showcase — keep on verify list vs databank metrics |
| Labels / axis titles / Peak **kA** units present | Aligns with morning P1 delivery |
| Display CFG artwork still old SynCon-style | Replaced in bridge after Call #4 (§8.2) |

---

### 8.2 Bridge between Call #4 and Call #5 (~12:46–12:57)

These were executed from live chat during / immediately after showcase (same afternoon, same branch). Documented here so Call #5 context is complete.

| # | Ask | Status |
|---|-----|--------|
| B1 | Replace Stability **Display** CFGs only from client folder `D:\verona-spark-engine\SVG\` (drop old Display art) | **DONE** → `public/svgs/Display/CFG1–13.svg` |
| B2 | For **all CFGs**, network / bus line must meet CFG feed (same alignment pattern as prior fixes) | **DONE** — `CFG_TOP_OFFSETS` / `CFG_WIRE_END_X` + `scripts/recompute-cfg-feed-align.py` |
| B3 | Hover cards must not go **behind** Event Details / charts (GEP, Grid, connected CFG, solutions strip) | **DONE** during bridge + Call #5 — portals |

---

### 8.3 Call #5 — Working call (~12:57–~14:31)

**Nature:** Screen-share working session (not a second “requirements dump”). Active discussion ~first **15–20 min**; then long idle share on Cursor after push; near end open Box.

#### Call #5 — Ask E — Databank pre / post / main + public vs build output

| Field | Detail |
|-------|--------|
| Status | **LOGIC ALREADY IN CODE** + pack **RECEIVED** (§8.5) — wire-up still pending |
| Topic | Confirm which files drive idle vs event vs analytics; avoid wrong folder / stale build. |
| Cleaned understanding | (1) **Pre-event / idle** uses manager pack → `public/databank/preevent/` (from `All_CFG_Preevent_Gyan`). (2) **Event post** uses `*.post.csv` (and related). (3) **Main / normal** event CSV used for normal graph load / analytics paths. (4) Runtime must read from **`public/`** (dev) consistently — changing files then relying on stale **`.output/`** build confuses testing (“every time take from public → build → play”). |
| On screen | Explorer showed `public/databank/CFG*` with `PHJUMP` / `ROCOF` / `SCL` / `VSTEP` + `.pre` / `.post` variants; `All_CFG_Preevent_Gyan/CFG8.csv` open. |

#### Call #5 — Ask F — Gyan Graph & Analytics data pack

| Field | Detail |
|-------|--------|
| Status | **RECEIVED** (16 Aug ~14:45) — see **§8.5** |
| Promise in call | New dataset with correct pre / post / main placement; optional **two folders** (analytics vs graph) |
| Delivered as | Folder [`Gyan Graph & Analytics data/`](../Gyan%20Graph%20%26%20Analytics%20data/) (not a zip on disk — same content) |
| Confirms Call #5 split | **`CFG- Graph/`** (plot pre/post) + **`CFG_Analytics/`** (rich analytics CSVs) |
| Scope | **CFG1–11** × events **PHJUMP / ROCOF / SCL / VSTEP** — **no CFG12/13** in this pack |
| Count | **132** CSV files (**88** graph + **44** analytics) |
| Next | Wire into `public/databank` / loaders when implementing — **do not** invent mapping until coding ask |

#### Call #5 — Ask G — Meet chat UI: CFG hover behind

| Field | Detail |
|-------|--------|
| Status | **DONE (code)** |
| Exact Meet chat text (on frame) | *“when i hover the CFG see the card getting behind please fix it”* |
| Fix | Portal connected-CFG / solutions-strip (and related) hover cards above charts (`z-[300]`). |

#### Call #5 — Ask H — Analytics “Slide 17” text

| Field | Detail |
|-------|--------|
| Status | **DONE (code)** |
| Ask | In Analytics / CFG Compare, remove **“Slide 17”** wording from header / selected text. |
| Evidence | Frame ~**13:09** showed `CFG COMPARE • SLIDE 17` before fix; chat ask **13:11**. |

#### Call #5 — Ask I — Push working branch

| Field | Detail |
|-------|--------|
| Status | **DONE** |
| Ask | Push so Gyan can pull latest. |
| Result | Branch `feature/stability-p0-p1-2026-08-16` · commit **`2cd816a`** · *Polish Stability UI: new Display CFGs, bus alignment, hover stacking* |

#### Call #5 — Ask J — Box awareness (end of recording)

| Field | Detail |
|-------|--------|
| Status | **AWARE** (pull only if pointed) |
| On screen ~**14:27** | Box folder **FlexSim GUI Dashboard** |
| Updated **Today** (Sonam Gupta) | `Dashboard_layout_GUI_Ver4_14Aug.pptx` · `CIGRE_Demo_FLEXSIM…` PDF **v34** |
| Also visible | Cross-verification xlsx; Windfarm pptx (Arun); co-owners include **ARUN JOSE**, Sonam, etc. |

#### Call #5 — Recording shape note

Most of the **~94 min** file after ~**13:14** is **static Cursor** (health polls / prior push chat) while Meet/recording stayed open — **not** continuous new requirements. Actionable speech + Meet chat + early frames + late Box frame are captured above.

---

### 8.4 Afternoon unified checklist (only Call #4/#5 + bridge)

| Priority | Source | Task | Status |
|----------|--------|------|--------|
| P0 | Call #4 + WhatsApp **§3.5** | Hardcode Initial X CFG1–11; extend at boundary; stop at end | **DONE (code)** |
| P1 | Call #4 | Slightly faster plot playback | **DONE (code)** |
| P2 | Call #4 | Colour legend on lines | **DEFER** (Gyan↔client) |
| P1 | Bridge | New Display CFGs from `SVG/` | **DONE** |
| P1 | Bridge | Bus↔CFG feed alignment all CFGs | **DONE** |
| P1 | Bridge + Call #5 chat | Hover cards not behind | **DONE** |
| P1 | Call #5 | Remove Analytics “Slide 17” | **DONE** |
| P1 | Call #5 | Push feature branch | **DONE** (`2cd816a`) |
| P0 | Call #5 + §8.5 | Wire `Gyan Graph & Analytics data/` into app | **DONE (code)** |
| — | Call #5 | Note Box layout/demo updates today | **AWARE** |

---

### 8.5 Manager pack — `Gyan Graph & Analytics data/` (received 16 Aug ~14:45)

> **Ties to Call #5 Ask F.** This is the cleaned Graph vs Analytics split Gyan described on the call. Document only here — **not** copied into `public/databank` yet.

| Field | Detail |
|-------|--------|
| Path | [`Gyan Graph & Analytics data/`](../Gyan%20Graph%20%26%20Analytics%20data/) |
| Folder times | Created ~**14:45:25** · LastWrite ~**14:48:25** (16 Aug 2026) |
| CFGs | **CFG1–CFG11** (no CFG12/13) |
| Events | **PHJUMP**, **ROCOF**, **SCL**, **VSTEP** each |
| Total CSVs | **132** = **88** graph + **44** analytics |

#### 8.5.1 Tree (as delivered)

```text
Gyan Graph & Analytics data/
├── CFG- Graph/                         ← Stability Ip/Iq plot playback
│   └── CFGn - Graph/graph/
│       ├── {EVENT}_CFGn_preevent.csv   ← idle / pre loop (3 cols)
│       └── {EVENT}_CFGn_postevent.csv  ← after event (3 cols)
└── CFG_Analytics/                      ← Analytics / metrics (wide CSVs)
    └── CFGn/Analytics/
        └── {EVENT}_CFGn.csv            ← full column set
```

`EVENT` ∈ `{PHJUMP, ROCOF, SCL, VSTEP}` · `n` ∈ `1…11`.

#### 8.5.2 Counts

| Branch | Pattern | Files |
|--------|---------|------:|
| Graph | 11 CFGs × 4 events × 2 (pre + post) | **88** |
| Analytics | 11 CFGs × 4 events × 1 | **44** |
| **Total** | | **132** |

#### 8.5.3 Headers (sampled CFG1 / SCL)

| File role | Example path | Header |
|-----------|--------------|--------|
| Graph **pre** | `CFG- Graph/CFG1 - Graph/graph/SCL_CFG1_preevent.csv` | `t Main,Iq_GEP_pu Main,Ip_GEP_pu Main` |
| Graph **post** | `…/SCL_CFG1_postevent.csv` | same 3 columns |
| Analytics | `CFG_Analytics/CFG1/Analytics/SCL_CFG1.csv` | Wide: `source_file`, `t Main`, `V_PM_GEP_pu Main`, `Iq_GEP_pu Main`, `Ip_GEP_pu Main`, `Qpos_GEP_MVAR Main`, `Ppos_GEP_MW Main`, phase voltages/currents, etc. |

Sample graph times (CFG1 SCL): pre starts ~`t=39.0`; post starts ~`t=40.0` (event boundary style — align with WhatsApp pre ~2 s loop + synthetic X when wiring).

#### 8.5.4 Intended use (from Call #5 + folder names)

| Pack folder | App use (expected) | Replaces / relates to |
|-------------|--------------------|------------------------|
| `CFG- Graph/…/*_preevent.csv` | Idle / pre-event loop Y samples | Earlier `All_CFG_Preevent_Gyan/` + `public/databank/preevent/` (per-event pre now, not only one pre file per CFG) |
| `CFG- Graph/…/*_postevent.csv` | Event waveform after trigger | Current `public/databank/CFGn/{EVENT}.post.csv` style |
| `CFG_Analytics/…/{EVENT}_CFGn.csv` | Analytics / time-domain metrics / compare | Current fat `public/databank/CFGn/{EVENT}.csv` style |

#### 8.5.5 Explicit non-goals until wire-up

- Do **not** assume filenames map 1:1 without a loader change (names are `{EVENT}_CFG{n}_preevent.csv`, not `SCL.csv`).
- Do **not** drop Analytics wide files into the 3-column graph path.
- Do **not** treat this pack as covering CFG12/13.

---

## 9. Cross-check — meetings × WhatsApp × pack (16 Aug afternoon)

> **Verdict:** Calls #4/#5, afternoon WhatsApp (§3.5), and `Gyan Graph & Analytics data/` are **consistent**. Pack numbers **prove** the Initial X table. Wire-up + §3.5 playback still **OPEN** in code.

### 9.1 One story (how the three sources fit)

```text
Call #4 (live)     “X stops early / shrinks — fix end logic; slightly faster; colour legend later”
        ↓ written
WhatsApp §3.5      Initial X[CFG] hardcode → at boundary extend by pre-event time → STOP
        ↓ data
Pack §8.5          CFG- Graph/*_preevent + *_postevent  |  CFG_Analytics/* wide CSVs
                   Initial X[CFG] == (t_last − t_event) of postevent  (verified SCL, all CFG1–11)
```

Morning WhatsApp **§3.1–3.2** still governs: **per-file tick**, synthetic X (not CSV `t` as plot X), Y from PDF, stop when post ends. Afternoon §3.5 **adds** the **Initial X window** table and the **extend-at-boundary** rule Call #4 asked for in words.

### 9.2 Ask-by-ask matrix

| # | Ask | Meeting | WhatsApp | Pack | Status |
|---|-----|---------|----------|------|--------|
| 1 | Per-case tick / no wrong Δt | Call #3 | §3.1 | Graph CSVs have stable Δt (e.g. CFG1 0.00025) | **DONE (code)** — re-verify after pack wire |
| 2 | Synthetic X; don’t plot CSV `t` as X | Call #3 | §3.2 | Pack `t Main` is source time only | **DONE (code)** — re-verify |
| 3 | Pre loop then event; stop at post end | Calls #2–4 | §3.2 + §3.5 | `*_preevent` + `*_postevent` | **Logic partial** — pack not wired; §3.5 Initial X **OPEN** |
| 4 | **Initial X size CFG1–11** + extend by time-before-event + stop | Call #4 Ask B (spoken) | **§3.5** (written) | **Matches post span 11/11** (§9.3) | **OPEN** implement |
| 5 | Slightly faster playback | Call #4 Ask A | — | — | **OPEN** |
| 6 | Colour legend on lines | Call #4 Ask D | — | — | **DEFER** |
| 7 | Split **graph** vs **analytics** folders | Call #5 Ask F | — | **`CFG- Graph/` + `CFG_Analytics/`** | **RECEIVED** |
| 8 | Correct pre / post placement | Call #5 Ask E/F | §3.5 says use postevent | Explicit `*_preevent` / `*_postevent` names | **RECEIVED** — wire **OPEN** |
| 9 | Analytics uses richer / separate files | Call #5 | — | Wide `CFG_Analytics/.../{EVENT}_CFGn.csv` | **RECEIVED** — wire **OPEN** |
| 10 | Hover card not behind | Call #5 Meet chat | — | — | **DONE** |
| 11 | Remove “Slide 17” | Call #5 | — | — | **DONE** |
| 12 | Push branch for Gyan | Call #5 | — | — | **DONE** (`2cd816a`) |
| 13 | Display CFGs + bus align | Bridge after Call #4 | — | — | **DONE** |

### 9.3 Pack proves WhatsApp Initial X (SCL sample — all CFG1–11)

**Finding:** For every CFG, **Initial X size (§3.5) = `t_last − t_event` of `SCL_CFGn_postevent.csv`**.

| CFG | WhatsApp Initial X | Pack `t_event` | Pack `t_last` | Post span | Match |
|-----|-------------------:|---------------:|--------------:|----------:|:-----:|
| CFG1 | 40 | 40 | 80 | 40 | YES |
| CFG2 | 40 | 40 | 80 | 40 | YES |
| CFG3 | 40 | 40 | 80 | 40 | YES |
| CFG4 | 70 | 80 | 150 | 70 | YES |
| CFG5 | 40 | 40 | 80 | 40 | YES |
| CFG6 | 10 | 10 | 20 | 10 | YES |
| CFG7 | 5 | 5 | 10 | 5 | YES |
| CFG8 | 40 | 40 | 80 | 40 | YES |
| CFG9 | 8 | 2 | 10 | 8 | YES |
| CFG10 | 40 | 40 | 80 | 40 | YES |
| CFG11 | 30 | 40 | 70 | 30 | YES |

**Pre files:** each `*_preevent.csv` is ~**1.0 s** of CSV time ending at `t_event` (e.g. CFG1: 39.0 → 40.0). That is the pack’s **“time before event”** segment to use when §3.5 says *increase X by time before event generated*.

> Mild note vs morning WhatsApp “~**2 s** pre”: pack pre clips are ~**1 s**. Prefer **pack duration** for this delivery; keep looping/UI behaviour as Gyan specified in §3.2 unless he says otherwise.

### 9.4 Precedence (if anything conflicts)

1. **Afternoon WhatsApp §3.5** numbers for Initial X  
2. **Pack CSVs** for actual pre/post samples and `(t_last − t_event)`  
3. **Morning WhatsApp §3.1–3.2** for tick / synthetic X / Y / stop  
4. **Call #4/#5 speech** for intent (speed, legend defer, folder split) — not for inventing numbers  

### 9.5 Still open after this cross-check

| Priority | Item |
|----------|------|
| P0 | Implement §3.5 Initial X + boundary extend + stop; verify Call #4 early-stop is gone |
| P0 | Wire `Gyan Graph & Analytics data/` (graph pre/post + analytics wide) into loaders / `public` |
| P1 | Slightly faster plot (Call #4) |
| P2 | Colour legend — wait for Gyan after client discuss |

---

## Document control

| Field | Value |
|-------|--------|
| Title | Post-delivery client email + manager calls + WhatsApp graph SoT + afternoon post-showcase + Graph/Analytics pack + cross-check (15–16 Aug 2026) |
| Author | Meeting + email + WhatsApp + pack review for Ameen / Aplus |
| Audience | Implementers — careful last fixes only |
| Next step | (1) Implement **§3.5 Initial X** using pack (§9.3) · (2) wire §8.5 pack · (3) modest playback speed-up · (4) ship when Gyan okays |

