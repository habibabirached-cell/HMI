# Databank_Aug14 — client package inventory

| Field | Value |
|-------|-------|
| **Received** | 15 Aug 2026 (GE / Asha — same pack as Box `Databank_Aug14`) |
| **Local path** | `D:\verona-spark-engine\Databank_Aug14\` (repo root) |
| **Mapping workbook** | `Databank_Aug14/Databank_Info_Aug14.xlsx` |
| **Authority** | Mandatory source of truth for Stability CFG1–11 CSVs + event times / Base MVA (Asha: *use DataBank_Aug14 for all references and data*) |
| **Replaces** | Prefer over `DataBank_Aug12th` / older `Databank/` crops when timings or columns differ |
| **Do not commit** | Raw CSVs (~**2.82 GB**, 44 files) — gitignore like other databank trees; commit only slim `public/databank/**` after prepare |
| **Related** | [GUI-Development-Follow-Up-2026-08-15.md](./GUI-Development-Follow-Up-2026-08-15.md) · [CIGRE-FLEXIQSIM-StabilityCharData-CFG1-11-v3.md](./CIGRE-FLEXIQSIM-StabilityCharData-CFG1-11-v3.md) |

> Open the real xlsx when coding. Numbers below were read from `Databank_Info_Aug14.xlsx` on 15 Aug 2026 — do **not** invent times or MVA.

---

## 1. Package layout

```
Databank_Aug14/
  Databank_Info_Aug14.xlsx
  CFG1/ … CFG11/
    SCL/SCL_CFGn.csv
    ROCOF/ROCOF_CFGn.csv
    PHJUMP/PHJUMP_CFGn.csv
    VSTEP/VSTEP_CFGn.csv
```

| Item | Count / size |
|------|----------------|
| CFG folders with CSVs | **CFG1–11** only |
| Events per CFG | **4** — `SCL`, `ROCOF`, `PHJUMP`, `VSTEP` |
| CSV files | **44** |
| Approx total | **~2.82 GB** |
| CFG12 / CFG13 CSVs | **Not in this drop** (assets only listed in Excel) |

File naming: `{EVENT}_CFG{n}.csv` (e.g. `SCL_CFG1.csv`).

Rough per-CFG footprint (all four events): CFG1 ~242 MB · CFG2 ~60 MB · CFG3 ~64 MB · CFG4 ~306 MB · CFG5 ~625 MB · CFG6 ~153 MB · CFG7 ~71 MB · CFG8 ~617 MB · CFG9 ~16 MB · CFG10 ~616 MB · CFG11 ~51 MB.

---

## 2. Workbook tabs (`Databank_Info_Aug14.xlsx`)

| Tab | Purpose |
|-----|---------|
| **DataBank_Info** | CFG assets / specs, **Base MVA**, event start times \(t_f, t_r, t_p, t_v\), sim duration window, dial / inertia notes |
| **Sheet1** | Signals for **Three-phase bolted fault** + **RoCoF** (CFG1–11) |
| **VoltageStep_PhaseJump** | Signals for **V-step** + **Phase jump** (CFG1–11) |
| **EventDetails** | Hover / Event Details copy (fault type, ROCOF ramp, V-step %, phase jump, grid fixed values) |

---

## 3. Event start times & Base MVA (from `DataBank_Info`)

Event columns: Short Circuit \(t_f\) · ROCOF −1 Hz/s \(t_r\) · PhaseJump −20° \(t_p\) · V Step −10% \(t_v\).

| CFG | Base MVA | \(t_f / t_r / t_p / t_v\) (s) | Duration window (s) | Assets (summary) |
|-----|----------|------------------------------|---------------------|------------------|
| CFG1 | **300** | **40 / 40 / 40 / 40** | **0 – 80** | 2× SynCon 150 MVA, H = 10.3 s |
| CFG2 | **300** | **40 / 40 / 40 / 40** | **0 – 80** | SynCon 42.5 + SynCon 150 + GFL BESS 107.884 MVA |
| CFG3 | **300** | **40 / 40 / 40 / 40** | **0 – 80** | SynCon 150 + GFM BESS 152.68 MVA |
| CFG4 | **300** | **80 / 80 / 80 / 80** | **0 – 150** | SynCon 300 MVA, H = 1.58 s |
| CFG5 | **450** | **40 / 40 / 40 / 40** | **0 – 80** | SynCon 150 + GFMe STATCOM 300 MVA |
| CFG6 | **343** | **10 / 10 / 10 / 10** | **0 – 20** | SynCon 42.5 + GFMe STATCOM 300 MVA |
| CFG7 | **343** | **5 / 5 / 5 / 5** | **0 – 10** | SynCon 42.5 + GFL STATCOM 300 MVA |
| CFG8 | **300** | **40 / 40 / 40 / 40** | **0 – 80** | GFMe STATCOM 300 MVA |
| CFG9 | **326** | **2 / 2 / 2 / 2** | **0 – 10** | GFM STATCOM 326 MVA |
| CFG10 | **350** | **40 / 40 / 40 / 40** | **0 – 80** | GFMe STATCOM 300 + GFM BESS 152.68 MVA |
| CFG11 | **200** | **40 / 40 / 40 / 40** | **0 – 70** | 2× SynCon 65 MVA RS12 + GFM BESS 70 MVA |
| CFG12 | *(blank in sheet)* | *(blank)* | *(blank)* | SynCon 50 RS6 ×2 + GFM BESS 100 MVA — **no CSVs here** |
| CFG13 | *(blank in sheet)* | *(blank)* | *(blank)* | SynCon 70 RS8 ×2 + GFM BESS 50 MVA — **no CSVs here** |

**Corrections vs earlier OCR / Meet notes:** CFG4 V-step start is **80 s** (not 83). CFG9 all starts **2 s**, duration **0–10** (not 0–4). CFG11 duration **0–70** (not 0–80).

---

## 4. Dial / chart signal notes (from Excel)

| Topic | Excel / product rule |
|-------|----------------------|
| SCL dial sample time | **`Iq_GEP_kA Main` at \(t_f + 0.04\) s** (e.g. \(t_f=80\) → sample **80.04 s**) |
| Also listed | `Iq_GEP_pu Main` under dial notes — **product dial for demo is kA** per Asha 15 Aug email |
| Waveforms (typical) | `Iq_GEP_pu Main`, `Ip_GEP_pu Main` (V-step / PhaseJump also list `Qpos_GEP_MVAR Main`, `Ppos_GEP_MW Main`) |
| Inertia | \(\Delta P = \mathrm{mean}(Ppos\_GEP\_MW\ Main\ from\ t_r\ to\ t_r+1) - P\) just before \(t_r\); Inertia (MW·s) \(= \Delta P \cdot f_0 / (2 \cdot ROCOF)\) with \(f_0=50\), \(ROCOF=1\) |
| Sheet1 quirk | CFG11 fault/RoCoF rows name `Iq_GEP_kA Main` / `Ip_GEP_kA Main` with units cell still “pu” — treat as **kA column names**; prefer Asha + dial note for SCL UI |

**CSV reality check (Aug14 files):** headers are **name-based**, not fixed Excel column letters. Typical columns include `source_file`, `t Main`, `V_PM_GEP_pu Main`, `Iq_GEP_pu Main`, `Ip_GEP_pu Main`, `Qpos_GEP_MVAR Main`, `Ppos_GEP_MW Main`, …, **`Iq_GEP_kA Main`**, **`Ip_GEP_kA Main`**. Use **signal names** in code; Sheet1 “Column No” letters may be stale vs this export.

---

## 5. EventDetails hover copy (from Excel)

| Event | Hover / plot notes |
|-------|--------------------|
| ROCOF | Grid Frequency Rampdown: **−1 Hz/s** · plot `FreqMeasA 220kV` · dial **Inertia** |
| Three Phase Fault | ABC-G · duration **140 ms** · Z = **0.02 + j0.2 Ω** · plot `V_PM_GEP_pu Main` · dial **SCL** |
| Voltage Step | Grid Voltage **−10%** Prefault · plot `V_PM_GEP_pu Main` · Time Domain · `Iq_GEP_pu Main` |
| Phase Jump | Phase angle step **−20°** · plot `Theta_p_GEP Main` · Time Domain · `Ip_GEP_pu Main` |
| Grid (fixed) | Voltage **220 kV** · Frequency **50 Hz** · SCR **3** |

---

## 6. Dev implications

1. Point ingest / `prepare:databank` (or FastAPI) at **`Databank_Aug14/`**, not Aug12.
2. Copy **Base MVA** and **EVENT_TIMES** from §3 into app mapping — no invented values.
3. SCL dial → **`Iq_GEP_kA Main`** at **\(t_f+0.04\)**; UI label **SCL (kA)** / SHORT CIRCUIT LEVEL (kA).
4. Show **`Base MVA = xxx MVA`** above Ip/Iq charts from §3.
5. Full CSVs are too large for the browser — split clean windows (~2 s pre-event + event→end) or HTTP windowed fetch; **do not manipulate** sample values (15 Aug manager ask).
6. CFG12/13: Excel lists plant assets only; study CSVs remain the separate Spain / AEMO packs from earlier meetings.

---

## 7. Git / deploy hygiene

- Ignore: `Databank_Aug14/**/*.csv` (same policy as `Databank/` and `DataBank_Aug12th/`).
- Safe to track: `Databank_Info_Aug14.xlsx` if the team wants the mapping in git (optional; currently under local package).
- Never push multi-GB raw Aug14 CSVs to GitLab / Netlify.
