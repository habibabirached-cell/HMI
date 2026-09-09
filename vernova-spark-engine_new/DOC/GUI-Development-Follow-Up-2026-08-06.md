# GUI Development Follow-Up — Meeting Notes

| Field | Detail |
|-------|--------|
| **Meeting** | GUI Development Follow Up |
| **Date** | **6 August 2026** (afternoon) |
| **Recording** | `GUI Development Follow Up-20260806_153314-Meeting Recording.mp4` (~**45 min 30 s**, 1920×1080) |
| **Approx. wall clock** | ~**3:33 PM – ~4:19 PM** IST (Teams filename `153314`; taskbar ~15:46–16:09 during demos) |
| **Participants** | **Gyanendra Rai (GR)** — local demo + Box walkthrough; **Gupta, Sonam (GE Vernova)** — databank / signal names / CFG13; **Jose, Arun (GE Vernova)** — CSV signal confirmation + V_pcc/P_pcc; **Segu, Venkata Hareesh (GE Vernova)** — internal deploy / lab hosting; briefly **Radhakrishnan, Asha** early then left |
| **Focus** | (1) **Internal GE host** for FLEXSIM (data ~10 GB; Netlify pain); (2) **Home / landing** product carousels; (3) **CFG12** Spain + upcoming **CFG13 AEMO**; (4) **Wind Farm** SCR/subdivision + **wrong V_pcc / units / post-event P**; (5) Box **CFG13** catalogue + BESS/SynCon SVG grey-out |
| **Demo URLs** | Local: `http://localhost:5173` · `/stability` · `/windfarmstability` · Prior Netlify still referenced from yesterday |
| **Key Box assets** | `FlexSim GUI Dashboard` · `WindFramStablizationCases_Info.xlsx` · `Databank/CFG13/` · `CFG13_AMEO_TestCaseInfo.xlsm` · `Databank_Info …xlsx` (v7) |
| **Prior notes** | [GUI-Development-Follow-Up-2026-08-04.md](./GUI-Development-Follow-Up-2026-08-04.md) |

> **How these notes were produced:** Frames every ~40 s (`.tmp-meeting-20260806/frames/`, do not commit) + full Whisper STT (`.tmp-meeting-20260806/transcript.txt`). Prefer spoken decisions + Excel/CSV headers over OCR. Whisper mishears some names (e.g. “AMO/AMEO” → **AEMO**, “Irvind/Arwin” → **Arvind**, “Ken/GAN” → **Gyan**).

---

## 1. Meeting purpose

1. Confirm whether Dev has a **new public deploy** to show (answer: work still local; yesterday’s link only).
2. Align on **where to host** the app for GE stakeholders now that databank size (~**10 GB**) makes repeated Netlify pushes painful.
3. Walk **landing page**, **Stability (CFG12)**, and **Wind Farm Stabilisation** on Gyan’s localhost.
4. Fix / clarify **Wind Farm plot signals** (`V_pcc`, `P_pcc`) and **units** before the evening brand/dashboard calls.
5. Introduce **CFG13 (AEMO)** databank on Box — same CFG12-style mode/study UX; remove AEMO from CFG12 if it was parked there.

---

## 2. Participants & roles (as seen)

| Person | Role in this call |
|--------|-------------------|
| **Gyanendra Rai** | Screen share — localhost FLEXSIM + Box databank; owns GUI fixes |
| **Sonam Gupta** | Databank owner — Wind Farm signal Excel, CFG12/13 folders, AEMO Excel, Databank_Info |
| **Arun Jose** | Takes screen for CSV deep-dive; confirms `V_pcc:1/2/3 Main` and `P_pcc Main`; units MW / kV |
| **Venkata Hareesh Segu** | GE lab / IT path for internal host; Git access + Bangalore lab server suggestion |
| **Asha Radhakrishnan** | Present early (muted); left before main demo |

---

## 3. Chronological agenda (what was on screen)

| ~Wall clock | ~Elapsed | Frames (approx.) | Content |
|-------------|----------|------------------|---------|
| 3:33–3:45 | 0–12 min | f_001–f_019 | Gallery / verbal — deploy hosting, Netlify limits, `start.bat`, Docker vs bare Node, GitLab access for Arun/Sonam |
| 3:46–3:50 | ~13–17 min | f_020–f_026 | **Home** `localhost:5173` — STATCOM / SynCon / BESS carousels; enter FLEXSIM; **Stability** CFG1–12; CFG12 Combined study dropdown (Spain) |
| 3:51–3:53 | ~18–20 min | f_027–f_031 | Stability idle / platform cards (Stability / Wind Farm / R&D) |
| 3:54–4:01 | ~21–28 min | f_033–f_043 | **Wind Farm** `/windfarmstability` — SCR **1.6** locked, subdivision **0.0 / 0.5**, SLG, CFG8; Unstable vs Anchoring; feedback on V_pcc / units / rotors |
| 4:02–4:05 | ~29–32 min | f_045–f_049 | Box: FlexSim GUI Dashboard; **`WindFramStablizationCases_Info.xlsx`** signal catalogue |
| 4:06–4:09 | ~33–36 min | f_050–f_055 | Arun opens CSV `Ag_0.5_ONW1x_GFMe_No_load_…` — Find `V_pcc`, plot `V_pcc:1` and `P_pcc Main` |
| 4:10–4:13 | ~37–39 min | f_056–f_059 | Gallery / wrap of WF signal decisions; evening meeting logistics |
| 4:14–4:19 | ~40–45 min | f_060–f_068 | Box **CFG11** event folders; **CFG13** (`HYB_GFL_RS8_50_001_A_*`, AEMO Excel); Databank_Info; close |

---

## 4. Deployment & hosting (first ~12 minutes) — what they want

### 4.1 Current pain

- Databank / app payload has grown to ~**10 GB**.
- Repeated push to **Netlify demo links** is slow / problematic; Gyan does **not** want all data on public infra.
- “Demoable” version was already pushed to yesterday’s link; **today’s WIP is local only**.

### 4.2 Preferred path (agreed direction)

| Option | Outcome |
|--------|---------|
| **GE internal machine / Bangalore lab** | Host app so stakeholders open it inside GE network (not public Netlify) |
| **Delivery from Dev** | Application folder + `package.json` + **`start.bat`** (Node server) — “click Start → local server up” |
| **Docker** | Optional; Harish notes Docker compose for lab is fine, but **bare Node** also works on Windows/Linux |
| **Git** | Add **Arun / Sonam** as contributors to Dev’s GitLab; they clone onto lab server and run/build |
| **RAM guidance** | ~**16 GB+** laptop/workstation is enough for this app |

### 4.3 Owners / next steps (hosting)

- **Harish** — check IT approval / how GE has done this before; confirm end of day if possible.
- **Arun / Sonam** — get Git access; then connect with Gyan to deploy on lab machine.
- **Arvind / evening brand & dashboard meetings (5 PM / 7 PM)** — also raise end-deployment; **Chris Gordon** named as related contact for a later deploy discussion.
- **CIGRE / venue laptops** — separate thread: final demo will run on venue machines; practical handoff discussed in tomorrow’s deploy goal.

---

## 5. Landing page (home) — feedback

**Screen:** `localhost:5173` — FLEXSIM hero + three product carousels (**STATCOM / Synchronous Condenser / BESS**), then platform cards (Stability / Wind Farm / R&D).

| Feedback | Owner intent |
|----------|----------------|
| Bigger placeholders already done; headline kept to **2 lines** so product photos dominate on large screens | Keep |
| Some **STATCOM** carousel images look like engineering/people shots — prefer **product-only** photos | Swap when Brand / Arvind folder provides correct assets |
| Right card briefly showed wrong product art (STATCOM under BESS) | Fix so each carousel only shows its product |
| Text under cards may need **copy rework** (Sonam/Arvind) | Dev will update when text is provided |
| Same look-and-feel on platform entry cards | Pictures can be replaced on request |

---

## 6. Stability — CFG12 & CFG13

### 6.1 CFG12 (Spain) — already in UI

- CFG12 tile present; popup specs (SynCon 50 MVA ×2 RS6 + GFM BESS 100 MW style).
- UX: **grid code** (Spain live; AEMO was incorrectly associated) → **BESS / SynCon / Combined** → **study dropdown** (e.g. Combined short-circuit / V-step / RoCoF / phase jump list).
- Stakeholder context: **PCS / Megan** interested after seeing dashboard; **David** has seen the dashboard.
- **Open risk:** some stakeholders may later force UI down to **only 3–4 showcase cases** (rest to R&D). **Wait for confirmation** before ripping data out. Until then keep CFG12 catalogue.

### 6.2 CFG13 (AEMO) — new ask this call

| Item | Detail |
|------|--------|
| **Identity** | **CFG13** = **AEMO** grid code (Australia / Transgrid-related materials on Box) |
| **Box path** | `Data Bank CSV Files → Databank → CFG13` |
| **Catalogue** | `CFG13_AMEO_TestCaseInfo.xlsm` (BESS / SynCon / Combined colour blocks — same pattern as Spain CFG12) |
| **Study family** | Folders `HYB_GFL_RS8_50_001_A_1` … **`A_21`** (~21 cases; each ~2 files) + zip ~347 MB |
| **Also in folder** | `System Description.pdf`, `Experiment_analysis_Transgrid_Aus.csv` |
| **Plant vs CFG12** | Same idea; **RS8** instead of RS12 / ratings differ — specs change mainly; SVG approach like CFG12/11 |
| **GUI UX** | Same selection pattern as CFG12 (grid → mode → study). Dev estimate **~tomorrow**; Sonam **not** expecting same-day deploy |
| **Important** | **AEMO must not live under CFG12** — remove AEMO from CFG12 if present; AEMO = **CFG13 only** |

### 6.3 Stability data quality (CFG1–11)

- Sonam: stop parallel thrash — **sanity-check** measurement-side / V & phase-jump responses (work with **Asha**).
- Gyan: as long as **CSV schema unchanged**, replace files anytime; **CFG12/13 schemas differ** from older CFGs (known).
- Time-domain characterisation correctness is **backend data / mapping**, not architecture.

### 6.4 SVG when only BESS or only SynCon selected

- Yesterday’s open point: if mode is **BESS-only** or **SynCon-only**, unused asset on SLD should show as **X** and/or **greyed out**.
- Dev: try **both** approaches.

---

## 7. Wind Farm Stabilisation — demo + corrections

### 7.1 What was demoed (local)

- Page: `/windfarmstability` — **CFG8** connected, CB closed.
- Controls: Load **1 pu**; Fault **SLG**; Grid strength **SCR 1.6 (Weak)** **locked** (no other SCR options in this build); **Event subdivision 0.0 / 0.5**.
- Event fires only after user picks subdivision (baseline until then).
- Charts: Without solution **Unstable** vs +CFG8 **Anchoring**; event window around **~22 s** onset in data pipeline.
- Animated turbine rotors called out as **WIP** (alignment still imperfect).

### 7.2 Problems called out (priority before evening demos)

| Issue | Desired behaviour |
|-------|-------------------|
| **Voltage plot wrong** | Pre-event should be clean **sinusoid** (~**400 kV** peak scale), not SSO-looking / wrong PU |
| **Units** | Voltage in **kV** (not pu); Active power in **MW** (not pu) — match Excel descriptions |
| **Wrong columns** | Must map by **signal name**, not assumed column index |
| **Post-event P → 0** on “with solution” side | Should **recover**; looks tripped though results have **no trip** — likely wrong series / wrong file slice |
| **Live Event Status** text | AI/placeholder prose OK for now; later replace with **Sonam+Arvind approved** configurable copy |
| **Subdivision label** | Dev used “Event Subdivision”; GE to confirm proper engineering name (fault level / timing) |
| **Turbine rotation** | Keep improving rotor hub alignment |

### 7.3 Authoritative Wind Farm signals (Excel + CSV confirmation)

From `WindFramStablizationCases_Info.xlsx` (Sheet1) and Arun’s CSV `Ag_0.5_ONW1x_GFMe_No_load_ONW1XGFME.csv`:

| GUI / plot | CSV / Excel name | Notes |
|------------|------------------|-------|
| Three-phase voltages at PCC | **`V_pcc:1 Main`**, **`V_pcc:2 Main`**, **`V_pcc:3 Main`** | Three phases (A/B/C). Use **Main**, **not** `V_pcc_L` / load-side |
| Active power at PCC | **`P_pcc Main`** / **`P_pcc`** | Plot in Excel ~**100 MW** range; GUI was wrongly ~0–1 |
| Instantaneous currents | `I_pcc` (kA) | Listed in Excel catalogue |
| Reactive power | `Q_pcc` (MVAr) | Listed |
| RMS voltage | `Vrms_pcc` (pu) | Separate from instantaneous kV `V_pcc` |
| Grid SCR / SCL | `SCL` (GVA) | Listed |
| Fault flag | `FLT` | Listed |

**Dev rule from Arun:** stick to **column header names** (safe if order changes); Excel “Column No” may be empty.

**Priority ask:** get **at least one case** plotting correctly for **7 PM** (Arvind online) — show one solid use case.

---

## 8. Evening / next-day logistics (spoken)

| When | Plan |
|------|------|
| **5 PM** (same day) | Dashboard / brand-related; can show **yesterday’s** Netlify link; Gyan may stay on local if push is heavy |
| **7 PM** (same day) | Prefer **latest** Wind Farm fix if ready; Gyan to demo |
| **Tomorrow** | Another dashboard meeting — possible CFG12/13 layout trim confirmation; CFG13 wiring target |
| **Recording** | Upload **today’s** recording to Box Meeting recordings (older ones already there) |

---

## 9. Action items (clear owners)

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | Remap Wind Farm charts to **`V_pcc:1/2/3 Main`** + **`P_pcc Main`**; units **kV / MW** | **Gyan** | **P0** (before 7 PM if possible) |
| 2 | Investigate post-event **P→0** on +CFG8 (wrong series / trip illusion) | **Gyan** (+ Sonam data check) | **P0** |
| 3 | Confirm subdivision control naming with GE | **Sonam / Arun** → Gyan | P1 |
| 4 | Turbine rotor animation polish | **Gyan** | P2 |
| 5 | Landing carousel: product-only images; fix mis-filed STATCOM/BESS art | **Gyan** (assets from Arvind/Brand) | P1 |
| 6 | CFG12: ensure **AEMO not under CFG12**; Spain only | **Gyan** | P1 |
| 7 | Add **CFG13 AEMO** (same UX as CFG12; RS8 specs; ~21 studies) | **Gyan** | P1 (target ~tomorrow) |
| 8 | BESS-only / SynCon-only: **grey-out or X** unused SLD asset | **Gyan** | P1 |
| 9 | Sanity-check Stability V / phase-jump characterisation CSVs | **Sonam + Asha** | P1 |
| 10 | GE lab host: IT path, Git access for Arun/Sonam, `start.bat` / optional Docker | **Harish + Arun/Sonam + Gyan** | P1 |
| 11 | Upload today’s meeting recording to Box | **Gyan** | P2 |
| 12 | Await stakeholder confirmation if CFG12/13 shrink to 3–4 demo cases | **Sonam / Arvind / David** | Gate |

---

## 10. Dev takeaways (Ameen / Gyan)

1. **Wind Farm signal mapping is the hot fix** — not more UI chrome. Names + units from Sonam Excel / Arun CSV win.
2. **CFG13 = AEMO** is real and on Box; treat like CFG12 Spain catalogue (modes + studies). Do **not** leave AEMO tabs on CFG12.
3. **Hosting story** is shifting from public Netlify-only to **GE-internal Node/`start.bat` (or Docker) + GitLab clone**.
4. **CFG12/13 scope may shrink** after stakeholder alignment — keep flexible catalogue UX; don’t hard-delete studies until confirmed.
5. Live Event Status copy is **placeholder** until GE supplies final text.

---

## 11. Source artefacts (local / do not commit)

| Path | Use |
|------|-----|
| `.tmp-meeting-20260806/frames/` | Visual timeline |
| `.tmp-meeting-20260806/meeting-audio.mp3` | Audio extract |
| `.tmp-meeting-20260806/transcript.txt` | Full STT (588 lines) |
| Recording MP4 (repo root) | Source video |

---

*Notes prepared 6 August 2026 from recording + transcript + screen frames.*
