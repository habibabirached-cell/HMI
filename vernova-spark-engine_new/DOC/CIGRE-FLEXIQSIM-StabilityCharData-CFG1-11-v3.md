# CIGRE FlexIQSim — Stability Characterization Data (CFG1–11) v3

| Field | Detail |
|-------|--------|
| **Document** | `CIGRE_FLEXIQSIM_StabilityCharData_CFG1-11_v3.pdf` |
| **Local path** | `D:\verona-spark-engine\CIGRE_FLEXIQSIM_StabilityCharData_CFG1-11_v3.pdf` |
| **Title (PDF)** | Data Document — Simulation Results Summary · CIGRE Configurations |
| **Signals titled** | `Ip_GEP_pu Main`, `Iq_GEP_pu Main` vs `t Main` |
| **Pages** | **15** |
| **Scope** | **CFG1–CFG11 only** (CFG12 / CFG13 **not** in this PDF) |
| **Received / reviewed** | Client pack discussed **15 August 2026** (Gyan Meet + Asha email) |
| **Use with** | Local `Databank_Aug14/` · [Databank-Aug14.md](./Databank-Aug14.md) · [GUI-Development-Follow-Up-2026-08-15.md](./GUI-Development-Follow-Up-2026-08-15.md) |

> **How to use:** This PDF is the **golden reference** for dial / Time Domain / plot shape QA on Stability. UI must **not invent** metrics — compare live CFG1–11 results to these tables and figures. Prefer **Aug14 databank** for CSVs; use this PDF to verify expected **SCL, Inertia, Response / Rise / Peak**.

---

## 1. What the PDF contains

| Pages | Content |
|-------|---------|
| **1** | Cover — simulation results summary for CIGRE configs |
| **2** | **Performance summary — SCL & Inertia** (assets, Base MVA, SCL @ 40 ms kA & pu, Inertia MW·s) |
| **3–4** | **Performance summary — Time Domain** (Response ms, Rise ms, Peak **kA**) for all events · **no Settling** |
| **5–15** | Per-CFG detail pages: four events × Ip/Iq plot pairs + captions (specs, SCL @ 40 ms, SCL Peak, Inertia, TD numbers) |

### Event set (every CFG)

| # | Event (PDF wording) | Typical signal for TD |
|---|---------------------|------------------------|
| x.1 | **PHASE JUMP: −20 deg** | **Ip_GEP** |
| x.2 | **ROCOF: −1 Hz/s** | **Ip_GEP** (+ Inertia MW·s on page) |
| x.3 | **LLL-G FAULT 140 ms** | **Iq_GEP** (+ SCL @ 40 ms pu\|kA and SCL Peak pu\|kA) |
| x.4 | **Voltage Step: −10%** | **Iq_GEP** |

This matches product mapping: Phase Jump / RoCoF → **Ip**; Fault / Voltage Step → **Iq**.

### Metrics the PDF reports (and what it does **not**)

| Included | Not included |
|----------|----------------|
| Response Time (ms) | **Settling Time** — nowhere in summaries or captions |
| Rise Time (ms) | |
| Peak (**kA**) | Peak is **not** listed as pu in the TD summary tables |
| SCL @ 40 ms (pu **and** kA) | |
| SCL Peak (pu **and** kA) on fault captions | |
| Inertia (MW·s) on RoCoF captions + summary | |

**Dev implication (aligns with Asha 15 Aug email):** remove Settling from UI; SCL dial story → **kA** (`Iq_GEP_kA Main`); TD Peak display should be consistent with engineering (**kA** in this PDF).

---

## 2. Performance summary — Base MVA, SCL @ 40 ms, Inertia

From PDF page 2 (extract carefully; verify against file if any OCR doubt):

| CFG | Assets (as listed) | Base MVA | SCL @ 40 ms (kA) | SCL @ 40 ms (pu) | Inertia (MW·s) |
|-----|--------------------|----------|------------------|------------------|----------------|
| **CFG1** | SynCon 150 MVA H=10.3s ×2 | **300** | **3.76** | **4.77** | **3372** |
| **CFG2** | SynCon 42.5 MVA H=1.53s; SynCon 150 MVA H=10.3s; **GFL BESS** 107.884 MVA (3.853×28) | **300** | **2.94** | **3.74** | **1837** |
| **CFG3** | SynCon 150 MVA H=10.3s; **GFM BESS** 152.68 MVA (3.47×44) | **300** | **2.39** | **2.85** | **2405** |
| **CFG4** | SynCon 300 MVA H=1.58s | **300** | **2.91** | **3.70** | **456** |
| **CFG5** | SynCon 150 MVA H=10.3s; **GFMe STATCOM** 300 MVA | **450** | **3.19** | **2.70** | **4515** |
| **CFG6** | SynCon 42.5 MVA H=1.53s; **GFMe STATCOM** 300 MVA | **343** | **1.83** | **2.03** | **2810** |
| **CFG7** | SynCon 42.5 MVA H=1.53s; **GFL STATCOM** 300 MVA | **343** | **0.713** | **0.787** | **66.9** |
| **CFG8** | **GFMe STATCOM** 300 MVA | **300** | **0.865** | **1.10** | **2699** |
| **CFG9** | **GFM STATCOM** 326 MVA | **326** | **0.848** | **0.989** | **2.72** |
| **CFG10** | **GFMe STATCOM** 300 MVA; **GFM BESS** 152.68 MVA (3.47×44) | **350** | **1.38** | **1.16** | **3427** |
| **CFG11** | SynCon 65 MVA RS12 ×2; **GFM BESS** 70 MVA (3.47×20) | **200** | **1.33** | **2.53** | **1120** |

**Colour-coding hint for UI (Asha):** GFM / GFMe assets → green; GFL → white; SynCon → white (not GFM).

**Base MVA column** is what should drive the Stability chart headline **`Base MVA = xxx MVA`** (Asha §5).

---

## 3. Performance summary — Time Domain (Response / Rise / Peak kA)

### CFG1–CFG6 (PDF p.3)

| CFG | Event | Signal | Response (ms) | Rise (ms) | Peak (kA) |
|-----|-------|--------|---------------|-----------|-----------|
| CFG1 | Phase Jump | Ip_GEP | 0.750 | 13.2 | 0.312 |
| CFG1 | ROCOF | Ip_GEP | 5.75 | 732 | 0.691 |
| CFG1 | LLLG Fault | Iq_GEP | 0.750 | 15.0 | 4.19 |
| CFG1 | Voltage Step | Iq_GEP | 0.750 | 321 | 0.212 |
| CFG2 | Phase Jump | Ip_GEP | 1.000 | 14.0 | 0.314 |
| CFG2 | ROCOF | Ip_GEP | 1.000 | 668 | 0.357 |
| CFG2 | LLLG Fault | Iq_GEP | 1.000 | 15.0 | 3.27 |
| CFG2 | Voltage Step | Iq_GEP | 1.000 | 20.0 | 0.147 |
| CFG3 | Phase Jump | Ip_GEP | 1.000 | 19.0 | 0.493 |
| CFG3 | ROCOF | Ip_GEP | 1.000 | 692 | 0.461 |
| CFG3 | LLLG Fault | Iq_GEP | 1.000 | 16.0 | 2.44 |
| CFG3 | Voltage Step | Iq_GEP | 1.000 | 20.0 | 0.168 |
| CFG4 | Phase Jump | Ip_GEP | 0.750 | 13.2 | 0.275 |
| CFG4 | ROCOF | Ip_GEP | 5.75 | 350 | 0.075 |
| CFG4 | LLLG Fault | Iq_GEP | 0.750 | 15.0 | 2.99 |
| CFG4 | Voltage Step | Iq_GEP | 0.750 | 388 | 0.188 |
| CFG5 | Phase Jump | Ip_GEP | 0.700 | 15.0 | 0.481 |
| CFG5 | ROCOF | Ip_GEP | 0.700 | 635 | 0.777 |
| CFG5 | LLLG Fault | Iq_GEP | 0.700 | 16.3 | 3.43 |
| CFG5 | Voltage Step | Iq_GEP | 0.700 | 809 | 0.253 |
| CFG6 | Phase Jump | Ip_GEP | 0.700 | 18.8 | 0.506 |
| CFG6 | ROCOF | Ip_GEP | 0.700 | 376 | 0.394 |
| CFG6 | LLLG Fault | Iq_GEP | 0.700 | 18.8 | 2.02 |
| CFG6 | Voltage Step | Iq_GEP | 0.700 | 526 | 0.241 |

### CFG7–CFG11 (PDF p.4)

| CFG | Event | Signal | Response (ms) | Rise (ms) | Peak (kA) |
|-----|-------|--------|---------------|-----------|-----------|
| CFG7 | Phase Jump | Ip_GEP | 0.100 | 14.4 | 0.170 |
| CFG7 | ROCOF | Ip_GEP | 0.100 | 153 | 0.004 |
| CFG7 | LLLG Fault | Iq_GEP | 0.100 | 15.1 | 0.819 |
| CFG7 | Voltage Step | Iq_GEP | 0.100 | 15.7 | 0.061 |
| CFG8 | Phase Jump | Ip_GEP | 0.700 | 21.3 | 0.415 |
| CFG8 | ROCOF | Ip_GEP | 1.30 | 388 | 0.389 |
| CFG8 | LLLG Fault | Iq_GEP | 0.700 | 23.2 | 0.882 |
| CFG8 | Voltage Step | Iq_GEP | 0.700 | 483 | 0.205 |
| CFG9 | Phase Jump | Ip_GEP | 0.500 | 36.5 | **−0.076** |
| CFG9 | ROCOF | Ip_GEP | 0.500 | 179 | **−0.232** |
| CFG9 | LLLG Fault | Iq_GEP | 1.000 | 34.5 | 0.882 |
| CFG9 | Voltage Step | Iq_GEP | 1.000 | 38.5 | 0.291 |
| CFG10 | Phase Jump | Ip_GEP | 0.700 | 21.3 | 0.813 |
| CFG10 | ROCOF | Ip_GEP | 0.700 | 721 | 0.535 |
| CFG10 | LLLG Fault | Iq_GEP | 0.700 | 25.7 | 1.39 |
| CFG10 | Voltage Step | Iq_GEP | 0.700 | 164 | 0.303 |
| CFG11 | Phase Jump | Ip_GEP | 1.000 | 20.0 | 0.473 |
| CFG11 | ROCOF | Ip_GEP | 1.000 | 372 | 0.160 |
| CFG11 | LLLG Fault | Iq_GEP | 1.000 | 17.0 | 1.39 |
| CFG11 | Voltage Step | Iq_GEP | 1.000 | 707 | 0.278 |

---

## 4. Per-CFG detail pages — plot windows & fault SCL peaks

Each detail page shows **8 plots** (Ip + Iq for each of 4 events) with figure ids like `Fig 1.1.1` / `Fig 1.1.2`.

| CFG | PDF page | Approx. X-axis window on figures | Notes from captions |
|-----|----------|----------------------------------|---------------------|
| CFG1 | 5 | **~40–80 s** | Fault: SCL @ 40 ms = **4.77 pu \| 3.76 kA**; SCL Peak = **5.32 pu \| 4.19 kA**; Inertia = **3372** |
| CFG2 | 6 | **~40–80 s** | SCL @ 40 ms = **3.74 pu \| 2.94 kA**; Peak = **4.15 pu \| 3.27 kA**; Inertia = **1837** |
| CFG3 | 7 | **~40–80 s** | SCL @ 40 ms = **2.85 pu \| 2.39 kA**; Peak = **2.91 pu \| 2.44 kA**; Inertia = **2405** |
| CFG4 | 8 | **~80–120 s** | Later event window (matches Excel ~80 s starts); Inertia = **456** |
| CFG5 | 9 | **~40–80 s** (typical) | Inertia = **4515**; GFMe STATCOM |
| CFG6 | 10 | **~10–20 s** | Matches short duration configs |
| CFG7 | 11 | **~5–10 s** | Inertia = **66.9**; GFL STATCOM |
| CFG8 | 12 | **~40–80 s** | GFMe only; Inertia = **2699** |
| CFG9 | 13 | **~2–10 s** | GFM STATCOM; very low inertia **2.72** |
| CFG10 | 14 | **~40–80 s** | SCL @ 40 ms = **1.16 pu \| 1.38 kA**; Peak = **1.17 pu \| 1.39 kA** |
| CFG11 | 15 | **~40–70+ s** | Base MVA **200**; Inertia = **1120** |

**Dev implication:** After Aug14 ingest, plot X-range / event zoom should land in these windows (supports Gyan’s “resize X-axis to end of useful data” ask).

---

## 5. Implications for Stability GUI (checklist)

| Check | Expected from this PDF |
|-------|-------------------------|
| Time Domain rows | **Response, Rise, Peak** only — **no Settling** |
| Peak units in reference | **kA** (summary tables) |
| SCL dial (product ask) | Prefer **kA** side of “SCL @ 40 ms = pu \| kA” (Asha: `Iq_GEP_kA Main`) |
| Inertia dial | Match RoCoF caption / summary **MW·s** |
| Ip vs Iq event mapping | Phase Jump & RoCoF → **Ip**; Fault & V-step → **Iq** |
| Base MVA banner | Use summary **Base MVA** per CFG |
| CFG12 / CFG13 | **Not covered** here — use separate Engie / AEMO materials + Asha §3a/3b |
| QA method | Pick CFG + event → compare dials + TD numbers + curve shape to the matching figure page |

---

## 6. Source

| Path | Role |
|------|------|
| `CIGRE_FLEXIQSIM_StabilityCharData_CFG1-11_v3.pdf` | Authoritative simulation results summary (do not commit if binary policy forbids; keep locally) |
| Meeting notes | [GUI-Development-Follow-Up-2026-08-15.md](./GUI-Development-Follow-Up-2026-08-15.md) § on CIGRE PDF |
| Databank | Local `Databank_Aug14/` + [Databank-Aug14.md](./Databank-Aug14.md) |

**Extracted:** 15 Aug 2026 via `pypdf` text extract from the local PDF (15 pages). If a number looks wrong in QA, open the PDF page and trust the printed table over this note.
