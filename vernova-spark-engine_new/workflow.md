# GE Vernova FLEXIQSim SCADA Dashboard — Workflow & Build Documentation

This document summarizes what was built and how the pieces fit together.

## 1. Goal
Recreate the GE Vernova FLEXIQSim Renewable Farm Stabilisation SCADA dashboard
(from the client PPTX) with a faithful design, using React for the UI and
Node.js server logic, driven by CSV dump data (dummy data).

## 2. Tech Stack
- Framework: TanStack Start v1 (React 19 + Vite 7, SSR-capable)
- Styling: Tailwind CSS v4 via `src/styles.css` (semantic design tokens)
- Data layer: CSV files parsed on the Node server side via `createServerFn`
- Data fetching: TanStack Query (`useQuery` + `useServerFn`)
- Font: Inter

## 3. Design System
GE Vernova brand tokens in `src/styles.css`:
- Background: dark teal `--background: oklch(0.38 0.055 196)`
- Primary accent: lime green `--primary: oklch(0.86 0.21 122)`
- Supporting tokens: `--chip`, `--panel`, `--diagram-line`, `--label-lime`,
  `--status-on`, `--status-off`, `--grid-bg`
- All colors are semantic tokens — no hardcoded color utilities.

## 4. Data (CSV dump)
CSV files in `src/data/`:
- `telemetry.csv` — time-series (active power MW, voltage pu, frequency Hz),
  keyed by `model` and `cb` state.
- `buses.csv` — bus list per model.
- `events.csv` — grid event log.

CSVs are inlined into `src/data/csvData.ts` for reliable SSR bundling, then
parsed with `parseCsv` in `src/lib/csv.ts`.

## 5. Server Function (Node side)
`src/lib/telemetry.functions.ts` exposes `getNetworkSnapshot`
(`createServerFn({ method: "GET" })`):
1. Accepts `{ model, cb }` (normalized in `inputValidator`).
2. Filters telemetry + buses for the selected model/CB state.
3. Returns a typed `NetworkSnapshot` (`series`, `buses`, `events`).

## 6. UI Components (`src/components/scada/`)
- `Dropdown.tsx` (`ScadaDropdown`) — collapsible pill selectors.
- `EventsPanel.tsx` — event triggers (Line Trip, Load, P Q change, 3-ph Fault,
  Generator Trip); faults/trips flip the CB OFF.
- `MetricPanel.tsx` — live metric rows + sparklines + CB status badge.
- `Sparkline.tsx` — minimal SVG polyline chart.
- `NetworkDiagram.tsx` — SVG single-line diagrams: SMIB, MMI, Two-Area.
- `icons.tsx` — SVG icon set + GE logo.

## 7. Dashboard Page (`src/routes/index.tsx`)
- Header: logo + title + global CB toggle.
- Left sidebar (model/hybrid/library), center (diagram + two metric panels),
  right sidebar (events + event log).
- Fetches snapshot via `useQuery` keyed on `model` + `cb`.
- 1s interval advances a rolling window for a live feel.
- Client-side synthetic fallback renders panels immediately.
- SEO metadata set via route `head()`.

## 8. Assets
- `src/assets/bess.jpg` — generated BESS image used in the diagram.

## 9. How to Modify
- Change data: edit CSVs in `src/data/`, then mirror into `src/data/csvData.ts`.
- Add a model: add an SVG sub-component in `NetworkDiagram.tsx`, add to
  `MODEL_OPTS` in `index.tsx`, add matching CSV rows.
- Adjust branding: edit tokens in `src/styles.css`.

## 10. File Map
```text
src/
  assets/bess.jpg
  components/scada/  Dropdown, EventsPanel, MetricPanel, Sparkline,
                     NetworkDiagram, icons
  data/              telemetry.csv, buses.csv, events.csv, csvData.ts
  lib/               csv.ts, telemetry.functions.ts
  routes/            __root.tsx, index.tsx
  styles.css         GE Vernova design tokens
```
