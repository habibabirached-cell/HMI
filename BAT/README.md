# BAT — Maingear dual-wall kiosk scripts

Windows batch and PowerShell helpers for the **Maingear** demo PC (4×4K displays). They run two fullscreen Chrome “app mode” windows—**DataCenterSmartPower** and **Vernova Spark Engine**—and switch between them instantly without reloading pages.

## Why two windows?

The CEO demo needs an instant switch from the DataCenter HMI (`localhost:3003`) to Vernova (`localhost:5173`) when **Grid Connected** is tapped on the Ideum touch table. Reloading one browser tab is too slow.

Instead:

1. **Vernova** opens first, spanning all displays, but stays **behind** (preloaded).
2. **DCS** opens on top (what the audience sees).
3. A focus command brings the Vernova window **forward** (~milliseconds, like a targeted Alt+Tab—not a random window cycle).

Ideum will eventually send those focus commands over the existing cluster link; these scripts prove the Maingear side works standalone first.

## Directory layout

| File | Purpose |
|---|---|
| `z_genesis.start.bat` | **Double-click this** — Docker + Vernova dev + both Chrome walls |
| `maingear-kiosk-focus-vernova.bat` | Bring Vernova wall to front |
| `maingear-kiosk-focus-dcs.bat` | Bring DataCenter wall to front |
| `open-vernova-chrome-4displays.bat` | Open Vernova Chrome only (optional `-NoActivate`) |
| `open-dcs-chrome-4displays.bat` | Open DCS Chrome only (foreground) |
| `focus-kiosk-window.bat` / `.ps1` | Generic focus: `Dcs` or `Vernova` |
| `kiosk-windows.ps1` | Window registry, HWND save/restore, port wait helpers |
| `_paths.bat` | Sets `BAT_DIR` and `REPO_ROOT` for other scripts |
| `kiosk-windows.json` | Auto-generated window handles (gitignored) |
| `debug.txt` | Startup summary (commit & share for remote diagnosis) |
| `docker-compose.log` | `docker compose up` + `docker compose ps` output |
| `ports-wait.log` | TCP port wait output |
| `chrome-launch.log` | Chrome launcher output |
| `vernova-dev.log` | Vernova `npm run dev` output |
| `start-vernova-dev.bat` | Helper that runs Vernova dev with logging |
| `_debug-log.bat` | Internal logging helpers |
| `userManual.md` | Short operator instructions |

**Repo root** (not in `BAT/`):

| File | Purpose |
|---|---|
| `open-chrome-window.ps1` | Core Chrome launcher (position, span displays, app mode) |
| `open-hmi-chrome-4displays.bat` | Legacy DCS-only launcher |

## Startup sequence (`z_genesis.start.bat`)

1. `docker compose up -d` — DCS UI `:3003`, backend `:5000`
2. `npm run dev` in `vernova-spark-engine_new` (minimized cmd)
3. Wait for TCP ports 5000, 3003, 5173
4. Launch Vernova Chrome → saved as **Vernova**, `-NoActivate` (behind)
5. Launch DCS Chrome → saved as **Dcs** (foreground)

## Window identity (how focus knows which Chrome)

Ideum does **not** need window IDs. Maingear resolves targets locally:

1. **Primary:** `BAT/kiosk-windows.json` stores each window’s HWND when launched.
2. **Fallback:** Scan visible Chrome windows (largest span / title hints).

Each app uses a separate Chrome profile:

- `%LOCALAPPDATA%\DataCenterSmartPower\chrome-kiosk-dcs`
- `%LOCALAPPDATA%\DataCenterSmartPower\chrome-kiosk-vernova`

## URLs and ports

| Service | URL | Port |
|---|---|---|
| DataCenter UI | `http://localhost:3003` | 3003 |
| DCS backend (API / cluster) | `http://localhost:5000` | 5000 |
| Vernova UI | `http://localhost:5173` | 5173 |

Override Vernova URL with env `VERNOVA_KIOSK_URL` before running startup.

## Relationship to Ideum cluster (future)

Today, Reference 500 MW on Ideum → Maingear uses:

- **HTTP POST** (Ethernet) Ideum → Maingear backend `:5000`
- **WebSocket** Maingear backend → Maingear browser on `:3003`
- Browser loads HD_Aero inside the same DCS app

Grid Connected will add cluster commands such as `showVernova` / `showDcs` that call `focus-kiosk-window.ps1` on Maingear—same effect as the manual focus bats.

## Troubleshooting

If startup fails (Docker OK but no Chrome / no Vernova), re-run `z_genesis.start.bat`, then open **`BAT/debug.txt`**. It captures every step, docker output, port waits, Chrome launch errors, and the Vernova dev log. Commit and push `debug.txt` so it can be reviewed off-machine.

| Problem | Check |
|---|---|
| Vernova port timeout | `BAT/debug.txt` and `BAT/vernova-dev.log`; run `npm run api:install` in `vernova-spark-engine_new` |
| Chrome permission denied | Run `npm install` inside `vernova-spark-engine_new` |
| Focus finds wrong window | Re-run `z_genesis.start.bat`; close extra Chrome windows |
| Docker fails | Docker Desktop running; `.env` present at repo root |
| Display layout wrong | Run `open-chrome-window.bat -ListDisplays` from repo root |

## See also

- `userManual.md` — brief operator steps
- `ideum.md` — Ideum ↔ Maingear cluster architecture
- Repo root `open-chrome-window.ps1` — display geometry and Chrome flags
