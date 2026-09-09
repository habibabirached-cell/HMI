# Maingear kiosk — quick start

Run these on the **Maingear** PC (4×4K wall).

## Full startup (recommended)

Double-click:

```
BAT\maingear-kiosk-start.bat
```

This starts:

- DataCenterSmartPower (Docker) → `http://localhost:3003`
- Vernova Spark Engine (`npm run dev`) → `http://localhost:5173`
- Two fullscreen Chrome windows (DCS on top, Vernova preloaded behind)

Wait until the script finishes and the DCS wall is visible.

If something fails, the script prints **`BAT\debug.txt`** at the end. Push that file to git and pull on another machine for diagnosis.

## Switch displays manually (test)

| Action | Double-click |
|---|---|
| Show Vernova on the wall | `BAT\maingear-kiosk-focus-vernova.bat` |
| Show DataCenter again | `BAT\maingear-kiosk-focus-dcs.bat` |

## DCS only (legacy, no Vernova)

From repo root:

```
open-hmi-chrome-4displays.bat
```

## Prerequisites

- Docker Desktop running
- Node.js + npm
- Google Chrome
- Repo cloned with `vernova-spark-engine_new` present
- `.env` at repo root (for `docker compose`)

## Vernova port override

Default Vernova URL is `http://localhost:5173`. To use another port:

```bat
set VERNOVA_KIOSK_URL=http://localhost:5174
BAT\maingear-kiosk-start.bat
```
