# GUI Development Follow-Up — Meeting Notes

| Field | Detail |
|-------|--------|
| **Meeting** | Quick Stability review (Teams) — Event Details, TD layout, CFG12/13 compare + Analytics |
| **Date** | **13 August 2026** (evening IST) |
| **Recording** | `2026-08-13 20-56-28.mp4` (~**8 min 29 s**, 1280×720, OBS) |
| **Approx. wall clock** | ~**8:56 PM – ~9:05 PM** IST (filename `20-56-28`; taskbar ~20:57–21:00 during demo) |
| **Participants** | **Gupta, Sonam (GE Vernova)** — screen share / Stability walkthrough on `dev.aplus-technology.com`; **Gyanendra Rai (Aplus)** — notes Stability changes, owns UI; **Ameen Pasha A (Aplus)** — present |
| **Focus** | (1) **Event Details hover vs click**; (2) **CFG specs / numbers font size**; (3) **Ip/Iq Current \| Previous** column layout (Arvind); (4) **CFG12 / CFG13 mode compare** (BESS / SynCon / Combined); (5) **Analytics** — CFG12/13 as three separate rows; (6) new Stability data upload (deferred) |
| **Demo URL** | `https://dev.aplus-technology.com/stability` |
| **Prior notes** | [GUI-Development-Follow-Up-2026-08-10.md](./GUI-Development-Follow-Up-2026-08-10.md) |

> **How these notes were produced:** Frames every ~45 s (`.tmp-meeting-20260813/frames/`, do not commit) + Whisper STT (`.tmp-meeting-20260813/transcript.txt`). Prefer spoken decisions + on-screen UI. Whisper often mishears terms (e.g. “rock off” → **RoCoF**, “best / business” → **BESS**, “sincon / sync on” → **SynCon**, “regring” → **re-trigger**, “zumbled” → **jumbled**, “ticker” → sketch / stylised waveform). Call was short (~4 minutes of Stability content before jumping to another call).

---

## 1. Meeting purpose

1. Capture a **clean list of remaining Stability UI changes** before the team jumps to another call.
2. Confirm **Event Details** behaviour: hover was telling the wrong story; click is correct — align them.
3. Confirm **Time Domain Ip/Iq** layout for Current vs Previous (Arvind feedback).
4. Confirm **CFG12 / CFG13** mode switching (BESS / SynCon / Combined) should participate in Previous \| Current compare, and how **Analytics** should list those modes.
5. Note that **new Stability databank files** exist and will be discussed / uploaded separately.

---

## 2. Participants & roles (as seen)

| Person | Role in this call |
|--------|-------------------|
| **Sonam Gupta** | Primary demonstrator — walks Stability on `dev.aplus-technology.com`; owns some configuration / databank content (“leave the configuration to me”) |
| **Gyanendra Rai** | Takes Stability change list; owns UI implementation |
| **Ameen Pasha** | Present; development support |

---

## 3. Chronological agenda (what was on screen)

| ~Wall clock | ~Elapsed | Frames (approx.) | Content |
|-------------|----------|------------------|---------|
| 8:56–8:57 | 0–1 min | f_001 | Join; “take a note of all Stability changes”; CFG connected, CB closed on SLD |
| 8:57–8:59 | ~1–3 min | f_002–f_003 | **Event Details** — hover shows wrong plot story; click (e.g. Voltage / Phase Jump) shows correct representation |
| 8:59–9:00 | ~3–4 min | f_004 | Font size on configuration / specs numbers; Arvind Ip/Iq Current \| Previous layout |
| 9:00–9:02 | ~4–6 min | f_005–f_006 | **CFG12** Spain bar — BESS / SynCon / Combined; Previous \| Current across modes; clear when leaving CFG12 |
| 9:02–9:04 | ~6–8 min | f_007–f_008 | Same for **CFG13**; **Analytics** must list all three modes separately; new data upload deferred; jump to other call |

---

## 4. What they want (cleaned requirements)

### 4.1 Event Details — hover must match click

| Topic | Decision |
|-------|----------|
| Problem | On **hover**, Event Details shows **wrong / jumbled** plots (e.g. frequency story when looking at Voltage / Phase Jump). **Click** shows the **correct** representation. |
| Want | **Hover and click show the same Event Details content** (same story / same visual). |
| Visual style | Team is **OK** with the stylised “ticker” / sketch-style waveform (shape of drop / ramp) **without** axis numbering such as 50 Hz → 49 Hz. Correct **event identity** matters more than numeric ticks on the mini plot. |
| Gate | Do **not** show the waveform diagram until a **CFG is selected** and the **breaker is closed**. Until then, keep events usable but show guidance text in the diagram slot (e.g. select CFG / close CB). Event **text** details can still appear. |

**Dev implication:** Event Details panel must use the **same databank / event source** for hover preview as for active click — not a mismatched sketch or wrong-event series.

---

### 4.2 Configuration details — larger fonts / readable numbers

| Topic | Decision |
|-------|----------|
| Problem | CFG **component specification** / configuration detail numbers are **too small** — hard to read on screen share / TV. |
| Want | Increase font size / contrast so **names and ratings are clearly visible**. |
| Ownership | Sonam will handle some **configuration content** updates herself; UI still needs the **typography / visibility** fix. |

---

### 4.3 Time Domain — Ip / Iq Current \| Previous columns (Arvind)

| Topic | Decision |
|-------|----------|
| Layout | When Previous CFG data exists: **Left = Current** Ip & Iq · **Right = Previous** Ip & Iq. |
| Clarified in call | “Left side Ip and Iq of the **current**; right side Ip and Iq of the **previous**.” |
| Mapping (unchanged from 10 Aug) | Voltage Step → **Iq**; Phase Jump → **Ip**. |

**Dev implication:** Verify Time Domain table / tiles match this L=Current / R=Previous rule whenever `previousSnapshot` is present (and Current-only when no previous).

---

### 4.4 CFG12 / CFG13 — mode changes count as Previous \| Current

CFG12 (Spain) and CFG13 (AEMO) have modes: **BESS**, **SynCon**, **Combined**.

| Scenario | Expected behaviour |
|----------|-------------------|
| Select **Combined**, run events → then switch to **BESS** only | Treat as compare: **Previous = CFG12 Combined**, **Current = CFG12 BESS** (dials + Time Domain). Same idea for SynCon. |
| Same for **CFG13** | Identical Previous \| Current behaviour across its three modes. |
| Leave CFG12 entirely and go to **CFG1** | **Do not** keep CFG12 mode history as Previous. User must **clear / trash completely**, then connect CFG1 (fresh). |

**Dev implication:** Mode change inside CFG12/13 should **promote current metrics → previousSnapshot** (labelled with mode, e.g. `CFG12·Combined`), then load the new mode as current — same latch/trash rules as switching distinct CFGs, but **scoped to mode identity**. Leaving the CFG family clears previous unless an explicit trash flow already did.

---

### 4.5 Analytics — CFG12 / CFG13 as three separate entries

| Topic | Decision |
|-------|----------|
| Problem | Analytics currently treats CFG12 (and 13) too much as **one combined** row, or only shows the **currently selected** mode. |
| Want | In Analytics / CFG compare, **CFG12 BESS**, **CFG12 SynCon**, and **CFG12 Combined** appear as **three independent** options (same for CFG13). |
| Clarification | Selecting one mode for live dashboard does **not** collapse Analytics to only that mode — the compare catalogue should still expose **all three**. |

**Dev implication:** Extend Slide 17 / `StabilityCompareAnalytics` selection model so CFG12/13 expand to **mode-keyed rows** (not a single `CFG12` chip that hides siblings).

---

### 4.6 New Stability data (deferred)

- Sonam: **new data** for Stability cases needs to be **uploaded** — “talk later” / reconnect ~15 minutes.
- No file list or mapping captured in this short call — track as a **follow-up with Sonam** before treating databank as final.

---

## 5. Development checklist (what needs to be built / verified)

### P0 — must fix for Stability story

| # | Item | Detail | Suggested owner | Status (as of notes) |
|---|------|--------|-----------------|----------------------|
| P0.1 | Event Details hover = click | Same event title / lines / waveform source on hover and click | Dev | **In progress** locally (gate diagram until CFG + CB closed; show guidance text) — verify live after deploy |
| P0.2 | Hide waveform until CFG + CB closed | Events stay enabled; diagram slot shows clear guidance copy | Dev | **In progress** locally |
| P0.3 | Ip/Iq L=Current, R=Previous | Confirm TD layout matches Arvind clarification when previous exists | Dev | Partially present from 10–11 Aug work — **re-verify** on `dev` / Netlify |
| P0.4 | CFG12/13 mode → Previous \| Current | Switching BESS / SynCon / Combined latches previous with mode label; trash clears before other CFG | Dev | **Not done** (new ask this call) |
| P0.5 | Analytics: 3 rows per CFG12/13 | Independent selectables for BESS / SynCon / Combined (and CFG13 equivalents) | Dev | **Not done** (new ask this call) |

### P1 — polish / content

| # | Item | Detail | Suggested owner |
|---|------|--------|-----------------|
| P1.1 | Larger CFG specs typography | Component ratings / names more readable in hover + connected card | Dev |
| P1.2 | Configuration content updates | Some CFG detail copy / catalogue — Sonam owns content | Sonam |
| P1.3 | New Stability CSVs | Upload + map new databank files after Sonam shares package | Sonam → Dev |
| P1.4 | Event mini-plot style | Keep stylised shape OK; numeric axis ticks optional / not required | Dev (no change unless click already differs) |

### Out of scope for this recording

- Wind Farm Stabilisation (not walked in this ~8 min clip).
- Common 300 MVA base debate (covered 10 Aug — still engineering alignment if dials look wrong in demo).

---

## 6. Suggested implementation order

1. **Finish & ship Event Details behaviour** (hover = click; guidance text until CFG + CB closed) — already started; deploy when verified.
2. **CFG specs font bump** (quick win, visible on every demo).
3. **CFG12/13 mode latch into Previous \| Current** on the live Stability page (dials + Time Domain labels).
4. **Analytics expansion** for CFG12/13 three modes as separate compare targets.
5. **Ingest new Stability data** when Sonam provides files; re-smoke Event Details + TD for affected CFGs.

---

## 7. Acceptance checks (for QA / demo)

- [ ] With **no CFG** or **CB open**: hover/click event still works; Event Details shows text + **guidance** instead of waveform.
- [ ] With **CFG connected + CB closed**: hover Voltage Step / Phase Jump / RoCoF / Fault shows the **same** Event Details story as click (no jumbled wrong-event plot).
- [ ] Time Domain: with previous present, **left = Current Ip/Iq**, **right = Previous Ip/Iq**.
- [ ] CFG12: Combined → BESS shows Previous (Combined) vs Current (BESS); trash then CFG1 does **not** keep CFG12 previous.
- [ ] Same behaviour for CFG13 modes.
- [ ] Analytics: can select / compare **CFG12·BESS**, **CFG12·SynCon**, **CFG12·Combined** independently (and CFG13 equivalents).
- [ ] CFG component numbers readable without zoom on laptop / screen share.

---

## 8. Open questions / follow-ups

| Question | Who |
|----------|-----|
| Exact package / paths for **new Stability data** mentioned at end of call? | Sonam |
| When switching CFG12 modes, should Previous latch on **every** mode change, or only after events have been run / dials populated? | Confirm with Sonam / Arvind if ambiguous in UI |
| Analytics: default selection when opening Slide 17 — all three CFG12 modes checked, or none until user picks? | Product / Gyan |

---

## 9. Source files (local only — do not commit)

| Path | Use |
|------|-----|
| `2026-08-13 20-56-28.mp4` | Source recording |
| `.tmp-meeting-20260813/meeting-audio.mp3` | Extracted audio |
| `.tmp-meeting-20260813/transcript.txt` | Whisper transcript |
| `.tmp-meeting-20260813/frames/` | Sample frames |
| `.tmp-meeting-20260813/transcribe.py` | Re-run STT helper |
