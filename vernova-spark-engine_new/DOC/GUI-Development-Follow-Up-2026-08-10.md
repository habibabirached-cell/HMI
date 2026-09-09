# GUI Development Follow-Up — Meeting Notes

| Field | Detail |
|-------|--------|
| **Meeting** | GUI Development Follow-Up (Teams) — Stability + Wind Farm review |
| **Date** | **10 August 2026** (afternoon / evening IST) |
| **Recording** | `GUI Development Follow Up-20260810_153039-Meeting Recording.mp4` (~**79 min 48 s**) |
| **Approx. wall clock** | ~**3:30 PM – ~4:50 PM** IST (filename `15:30:39`; taskbar ~3:37–4:47 during demos) |
| **Participants** | **Gyanendra Rai (Aplus)** — screen share / Netlify + local demos, owns UI fixes; **Jose, Arun (GE Vernova)** — technical review (pu base, Time Domain metrics, Wind Farm cases); **Gupta, Sonam (GE Vernova)** — databank / CSV / CFG11 / Wind Farm data; **Radhakrishnan, Asha (GE Vernova)** — CFG data verification notes (joined briefly); **Arvind** referenced from prior feedback (not always on camera) |
| **Focus** | (1) Stability **previous vs current CFG** compare + pu / MVA base; (2) **Time Domain** metric correctness (response / rise / settling / peak); (3) Event waveform / CSV verification; (4) **CFG11** V-step / Phase jump data; (5) Wind Farm **scenario order**, steady-state playback, CSV columns; (6) **SCR 20→1.6** / Line Trip / SSO; (7) Analytics mock (CFG multi-select bars) |
| **Demo URLs** | Live Stability: `https://verona-spark-engine-version3-aplus-497.netlify.app/stability` · Wind Farm: `…/windfarmstability` · Local: `http://localhost:5173/windfarmstability` |
| **Related assets** | Arun PPT: `CIGRE_Demo_FLEXSIM (arun.jose@gevernova.com).pptx` · Box: `WindFarmStablization` / `ONW1xGFMe` |
| **Prior notes** | [GUI-Development-Follow-Up-2026-08-08.md](./GUI-Development-Follow-Up-2026-08-08.md) |

> **How these notes were produced:** Frames every ~40 s (`.tmp-meeting-20260810/frames/`, do not commit) + Whisper STT (`.tmp-meeting-20260810/transcript.txt`). Prefer spoken decisions + on-screen UI. Whisper often mishears names/terms (e.g. “GAN/Ganja” → **Gyan**, “Ash/Ashah” → **Asha**, “sincon” → **SynCon**, “GFME / GFMe”, “face them” → **phase jump**, “far level” → **fault level**, “VINFAM” → **Wind Farm**, “SCL” → **SC / short-circuit**, “I see” → **ICE / demo session**).

---

## 1. Meeting purpose

1. Walk **live Stability** after Saturday / Arvind feedback: previous CFG compare, Event Details placement, dials, Time Domain.
2. Stress-test whether **CFG-to-CFG compare** is technically fair when MVA bases differ (SynCon-only vs SynCon + battery / GFMe).
3. Align **Time Domain** definitions with engineering expectation (especially **response time**).
4. Cross-check **CSV ↔ UI** for Voltage Step / Phase Jump (CFG1, CFG11).
5. Review **Wind Farm Stabilisation** demo flow for the same-day / evening client demos (scenario controls, plots, GFMe vs no-solution).
6. Capture **Analytics** direction from CIGRE mock (multi-CFG bars vs stacked plots).

---

## 2. Participants & roles (as seen)

| Person | Role in this call |
|--------|-------------------|
| **Gyanendra Rai** | Primary demonstrator — Stability Netlify + Wind Farm local/live; commits to CSV download links, column debug, layout tweaks |
| **Arun Jose** | Primary technical challenger — common MVA base, inertia/SC story, Time Domain formulas, Wind Farm “red” cases, SCR step / SSO |
| **Sonam Gupta** | Databank owner — CFG Excel/CSV, column naming (PCC vs POC), strip unused columns, CFG11 re-run |
| **Asha Radhakrishnan** | Early segment — notes per-CFG data issues / timestamps; leaves mid-call to continue offline |
| **Arvind (prior feedback)** | Requirements carried in: previous vs current overlap, Event Details next to events |

---

## 3. Chronological agenda (what was on screen)

| ~Wall clock | ~Elapsed | Frames (approx.) | Content |
|-------------|----------|------------------|---------|
| 3:30–3:40 | 0–10 min | f_001–f_015 | Join; Gyan shares **Stability** Netlify; Phase Jump / CFG compare demo; dials + Time Domain |
| 3:40–3:55 | ~10–25 min | f_016–f_038 | **Pu / MVA base** debate (CFG1 vs CFG2 vs SynCon+battery); inertia drops 3161→1842 discussed as misleading; Time Domain critique |
| 3:55–4:05 | ~25–35 min | f_039–f_048 | Excel **VSTEP_CFG1** open; Iq / Qpos check; CSV filename on charts; CFG11 V-step gap; Asha drops |
| 4:05–4:20 | ~35–50 min | f_049–f_068 | Switch to **Wind Farm** (local + PPT pass/fail tables SCR 1.6); control order; unstable vs anchoring plots |
| 4:20–4:35 | ~50–65 min | f_069–f_090 | Box CSV folder; Sonam column rename / strip plan; Arun leaves after SSO / SCR 20→1.6 ask |
| 4:35–4:50 | ~65–80 min | f_091–f_120 | Gyan + Sonam: Line Trip / SCR step case; steady-state-before-event UX; Analytics mock (slide 16) + wrap |

---

## 4. Stability — previous vs current CFG compare

### 4.1 What they want (still / confirmed)

- Keep **previous CFG numbers visible** after trash / connect next CFG (dials + Time Domain).
- Visual distinction: **grey-out / mute previous**, highlight **current**.
- Layout preference evolving toward **more vertical / side-by-side** previous vs current once reference chart is reduced or removed (space was the blocker).

### 4.2 Clarification still open — **common MVA / pu base**

Arun’s core concern (demo narrative: two SynCons → add battery / GFMe):

| Observation on UI | Risk |
|-------------------|------|
| Inertia e.g. **3161 → 1842 MW·s** | Looks like “capability reduced” when battery added |
| SC e.g. **~2.6 → ~4.0 pu** | Direction OK for SC, but **pu bases differ** by asset MVA |

**Ask:** Convert dial / metric currents to a **common system base** (example discussed: **~300 MVA**) via base conversion (`I_new = I_old × MVA_old / MVA_new` style) so compares are **apple-to-apple**.  
**Voltage base** called out as OK; **MVA / current base** is the concern.  
**Comparing SynCon-only vs GFMe-only** without a fixed base was called **not good** for the story.

**Status:** Discussion / alignment still needed with **Arvind / team** before coding a final base rule. Do **not** treat raw pu compare as final demo truth.

---

## 5. Stability — Time Domain Characterization

### 5.1 Mapping (client)

Confirmed engineering intent in call (and later product ask):

| Event | Latch / focus metric |
|-------|----------------------|
| **Voltage Step** | **Iq** (reactive) |
| **Phase Jump** | **Ip** (active) |

> Dec must keep this mapping for **all CFGs**. Peak / response on the “wrong” axis was called out as confusing during Phase Jump demos.

### 5.2 Metric definitions — what they still need

| Metric | Client position | Current UI concern |
|--------|-----------------|--------------------|
| **Response time** | Should reflect **onset of response after the event** (engineering script; often expected **very fast**, order of **ms**) | UI treating something closer to **delay / 50% of peak excursion** — called **incorrect** vs project script |
| **Rise time** | Reach **~90%** of destination — may be OK | Keep but verify vs script |
| **Settling time** | **±5% band** discussed; values ~20–23 s sometimes OK if within ~30 s window | Optional to **hide** if noisy / confusing; verify vs script |
| **Peak** | First-cycle peak vs baseline | Spot-check Phase Jump Ip / Voltage Step Iq against Excel |

**Action:** Sonam/Asha **engineering script** ↔ UI one-to-one for a few CFGs; then decide which tiles stay visible.

### 5.3 Reference step-response chart

- Consensus lean: **hide / remove** the big reference plot from the main Time Domain panel (creates clutter; dials + numbers matter more).
- Keep definitions available elsewhere (tooltip / Analytics / PPT slide 17) if needed.

### 5.4 Pass / fail

- Optional future: **stable / unstable** or **pass / fail** chip on Time Domain (not finalized).

---

## 6. Stability — Event Details & waveforms

| Need | Detail |
|------|--------|
| Event Details next to events | Reconfirmed from Arvind Saturday feedback — already directionally in UI |
| Show **actual event waveform** | Not only abstract sketch — so reviewers can confirm **correct event** (V-step vs phase jump) |
| CSV transparency | Show **loaded filename**; prefer **download link** to the exact CSV the app used |

### CFG / data issues called out

| Item | Owner | Note |
|------|-------|------|
| Some CFG responses look **unstable / wrong** | **Asha / Sonam** | Timestamp / databank issues being documented per CFG |
| **CFG11** Voltage Step (+ Phase Jump) | **Sonam / Asha** | Re-export / re-run; still a demo blocker |
| CFG1 VSTEP Excel check | Live | Iq variation looked small for −10% step; Qpos column inspection |

---

## 7. Wind Farm Stabilisation — demo requirements

### 7.1 Screens reviewed

- Local / Netlify **Wind Farm** dashboard: Scenario Controls, SLD (Grid → Load → Wind farm → CB → GFMe STATCOM), dual plots **Without solution** vs **+ CFG8/CFG B**.
- Arun PPT summary tables: SCR **1.6**, loads 0–1.0 pu, faults ABCg / ABg / Ag — **Pass / Marginal / Fail**; GFMe makes many **Pass**.
- Box folder example: `…/ONW1xGFMe/Ag_0.5_…_load_1p0_upf/…csv` (Sonam).

### 7.2 Scenario control order (must)

Preferred demo flow (align with Stability “set then play”):

1. Select **Grid strength (SCR)**  
2. Select **Load level**  
3. Select **Fault level** (rename away from “Event subdivision” if still shown)  
4. Select **Fault event** (Three-phase / SLG / LL)  
5. **Start simulation** (steady-state from chosen file)  
6. Then **fire / advance into the disturbance** (auto lag vs explicit button — see open points)

**Ask:** Do **not** start mid-fault or with empty selections. Steady-state should be visible **before** the event for narrative (“explain network 2–3 minutes, then trigger”).

### 7.3 Which cases to show

| Prefer | Avoid |
|--------|--------|
| **Fail / red** cases without GFMe (clear contrast) | “Marginal” / cases that recover even without solution |
| Example tried: load **0.2 pu**, SLG **0.5**, SCR 1.6 | Cases where both sides look fine |

### 7.4 SCR 20 → 1.6 / Line Trip / SSO

- Add demo path for **SCR step (e.g. 20 → 1.6)** / **Line Trip** mapping to show **SSO** improvement with GFMe.
- May be a **separate tab / case** (not mixed with fault-level matrix).
- Sample data referenced as already available; production push timing / large assets called out as constraint same day.

### 7.5 CSV / columns — what they still need

| Need | Detail |
|------|--------|
| **Downloadable CSV** of whatever the UI loaded | Same ask as Stability |
| Print **column name + index** used for P / V plots | Debug wrong / distorted voltage |
| Keep **folder structure + filenames** stable | Code path depends on them |
| Keep required headers (e.g. **`P_pcc`**) | Sonam may rename POC→PCC elsewhere; **do not break headers the app reads** |
| Strip unused columns | After verification; reduce size — only after demo-critical columns confirmed (~10 columns discussed) |
| Fix distorted / non-sinusoidal **V_pcc** when wrong file / column | Especially SMIB LineTrip vs ONW case files |

### 7.6 Status chips

- **Unstable** (without solution) vs **Anchoring** / stable (with GFMe) — keep; ensure they match the intended engineering pass/fail story.

---

## 8. Analytics (CIGRE mock / slide 16)

### Direction discussed

| Keep / build | Drop / avoid |
|--------------|--------------|
| CFG multi-select (e.g. compare CFG1 & CFG5 only) | Plotting **all** CFGs always |
| Bar charts: **SC / inertia** across selected CFGs | Dense waveform grids in Analytics that confuse |
| Time Domain bars (response / rise / peak / settling) for selected CFGs | Duplicate reference plots |
| Start with **CFG1–11**; **CFG12/13 later** (modes × studies → separate analytics) | Treating 12/13 like simple CFG bars today |

**Status:** Gyan to confirm with **Arvind / team** same day; Analytics is **design-align**, not “ship tonight” unless agreed.

---

## 9. Same-day demo constraints (spoken)

- Multiple follow-on meetings (~5:30 / 6:30 / 7:30) — limited time to change production.
- Large databank push / Netlify transfer called out as slow (evening deploy window mentioned).
- Priority for demos: **correct CSV ↔ plot**, **clear Wind Farm contrast cases**, **CFG11 honesty** (don’t fake missing V-step).

---

## 10. Action items (clear owners)

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | Confirm **Voltage→Iq / Phase jump→Ip** latch on all CFGs (product) | **Dev / Gyan** | **P0** |
| 2 | Revisit Time Domain **response-time algorithm** vs Sonam/Asha script; decide tiles to keep | **Dev + Sonam/Asha** | **P0** |
| 3 | Hide or shrink **reference step chart**; improve previous vs current layout (vertical / L current · R previous) | **Dev / Gyan** | P1 |
| 4 | CSV **download link** + loaded filename on Stability **and** Wind Farm charts | **Gyan / Dev** | **P0** |
| 5 | Print **column name + index** used for Wind Farm P/V (and Stability if useful) | **Gyan / Dev** | **P0** |
| 6 | Deliver / wire **CFG11** V-step + Phase Jump CSVs | **Sonam / Asha** → Dev | **P0** |
| 7 | Per-CFG databank sanity (timestamps / unstable responses) | **Asha / Sonam** | P1 |
| 8 | Design decision: **common MVA base** for dial/metric compare | **Arun + Arvind + Gyan** | **P0** (design) |
| 9 | Wind Farm: selection **before** start; steady-state then event; rename fault level | **Gyan / Dev** | **P0** |
| 10 | Prefer **fail/red** demo cases; validate plots vs Excel | **Gyan + Sonam + Arun** | **P0** |
| 11 | Add **SCR 20→1.6 / Line Trip / SSO** path if data ready | **Gyan + Sonam** | P1 |
| 12 | Strip unused Wind Farm CSV columns **without** renaming required headers / folders | **Sonam** (data) · **Gyan** (code) | P1 |
| 13 | Analytics: CFG multi-select bars (1–11 first); defer 12/13 | **Gyan** after Arvind confirm | P2 |

---

## 11. Who said what (short)

| Person | Main asks |
|--------|-----------|
| **Arun** | Common pu/MVA base; response time ≠ delay; Phase jump→Ip / Voltage→Iq; show real event waveforms; Wind Farm red cases; SCR step SSO; steady-state before event |
| **Gyan** | Implement compare UX, download links, column debug, control-order / auto-event lag options, Analytics bars after confirm |
| **Sonam** | Fix/provide CSVs; align column names; strip unused fields; Box source of truth |
| **Asha** | Document per-CFG data defects; re-check CFG11 |

---

## 12. Clarifications still open (need answer before locking UI)

1. **Fixed system MVA for compare** — exact base (300 MVA?) and which quantities convert (dials only vs charts vs Time Domain peaks).  
2. **Time Domain tile set** — keep settling? pass/fail chip? response definition from which script version?  
3. **Wind Farm event fire** — user button vs **~2 s auto lag** after Start vs separate steady-state default file.  
4. **Analytics** — confirm multi-select CFG bars with Arvind; CFG12/13 shape later.  
5. **CFG11** — ETA for corrected VSTEP / PHJUMP files for Netlify.

---

## 13. Suggested next engineering order

1. **P0 demo hygiene:** CSV download + column labels; Wind Farm control order + known-good fail cases; CFG11 honesty.  
2. **P0 correctness:** Ip/Iq event latch; response-time vs script.  
3. **P1 story:** common-base compare design; previous/current layout polish; SCR step / Line Trip.  
4. **P2:** Analytics multi-CFG bars after stakeholder confirm.

---

*Document date: **10 August 2026**. Working media under `.tmp-meeting-20260810/` (local only — do not commit).*
