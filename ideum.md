# Ideum touch-table remote control (Maingear ↔ Ideum)

This document summarizes the **Ideum05** remote-control setup added for the Datacenter HMI: a simplified touch UI on the Ideum table that sends commands to the Maingear display running **statcom05**.

Use this when porting or debugging the Ideum machine with Cursor.

---

## Architecture

| Machine | Role | Static IP (direct Ethernet) | UI |
|--------|------|-------------------------------|-----|
| **Maingear** | Primary display + simulation host | `192.168.50.1` | Full **statcom05** (4 displays) |
| **Ideum** | Touch remote control | `192.168.50.2` | **Ideum05** design (2 touch buttons) |

- Same Docker image on both machines.
- Ideum talks to Maingear backend over the cable: `http://192.168.50.1:5000` (not the UI proxy on `:3003`).
- Maingear UI listens on WebSocket `/ws/cluster` for incoming commands.

```
Ideum (Ideum05)  --HTTP POST-->  Maingear backend (:5000)
                                      |
                                      v WebSocket broadcast
                                 Maingear browser (statcom05)
                                      |
                                      v runs quick-scenario preset
```

---

## Network setup (run once per machine)

### Maingear

```bat
set-maingear-ethernet-ip.bat
```

Sets IP `192.168.50.1`, removes any old `cluster.local.json`, and copies `cluster.local.json.example` → `cluster.local.json`.

### Ideum

```bat
set-ideum-ethernet-ip.bat
```

Sets IP `192.168.50.2`, removes any old `cluster.local.json`, and copies `cluster.local.json.ideum.example` → `cluster.local.json`.

**Setting only the IP in Windows is not enough** — you must run the bat (or copy the ideum example manually). Without that file the app does not know this PC is the Ideum.

`cluster.local.json` is gitignored. Examples: `cluster.local.json.example` (Maingear), `cluster.local.json.ideum.example` (Ideum).

**Maingear “not listening” fix:** the statcom05 browser must connect to `ws://localhost:5000/ws/cluster`. Refresh the Maingear page after loading statcom05 and wait a few seconds before tapping on Ideum.

---

## Designs

### Ideum05 (`dcs-backend/designs/ideum05/`)

Touch-table layout. Key conf fields:

| Field | Purpose |
|-------|---------|
| `ideumKioskMode: true` | Hides left component library + all simulation/property panels; keeps top header/toolbar |
| `ideumControlButtons` | Defines the two touch buttons (label, command, `componentIds`, `grouped`) |
| `remoteControlTarget` | Points at statcom05 on Maingear |

**Canvas layout — Ideum-only component types (not regular schematic blocks):**

| Component type | Title | Command | Appearance |
|----------------|-------|---------|------------|
| `ideum-turbine-button` | Add 8 turbine | `add8Turbines` | Teal border, single gas-turbine 3D |
| `ideum-bess-gfme-button` | Add BESS and GFMe | `addStatcomAndGFMe` | **Green border**, BESS + GFMe 3D side by side in **one box** |

Each Ideum component has `properties.title` and `properties.ideumCommand`. They are rendered only by `IdeumComponentLayer` (HTML), **not** by the normal SVG `CanvasBlock` — so left-click never opens properties, charts, or context menus.

Regenerate the design:

```bash
docker compose exec dcs-backend python scripts/create_ideum05.py
```

### Statcom05 (`dcs-backend/designs/statcom05/`)

Maingear main design. Includes `remoteControlProfile` mapping:

| Remote command | Quick-scenario preset |
|----------------|----------------------|
| `add8Turbines` | `noBessNoStatcom` |
| `addStatcomAndGFMe` | `withBessandStatCom` |

**Maingear must have statcom05 loaded** and the browser connected to `/ws/cluster` for commands to run.

---

## Touch / click behavior

Ideum components are a **separate species** from regular canvas blocks (`dcs-ui/src/utils/ideumComponent.js`):

- Excluded from SVG rendering and from `CanvasBlock` (no drag, select, resize, or wiring)
- Rendered by **`IdeumComponentLayer`** with embedded 3D viewers and a single click target
- Left-click → `handleIdeumControlButtonClick` only (no property panel, no chart context menu)

### Role handling (`handleIdeumControlButtonClick` in `App.js`)

| Machine | On button click |
|---------|-----------------|
| **Maingear** | Alert: *“You are on the Maingear. These buttons send commands from the Ideum touch table…”* |
| **Ideum** | `POST http://192.168.50.1:5000/api/cluster/remote-command` with `{ command, source: "ideum" }` |
| **Unknown role** | Alert to check `cluster.local.json` |

---

## Key source files

| Path | What it does |
|------|----------------|
| `dcs-backend/cluster_peer.py` | Machine role, WebSocket hub, remote-command validation |
| `dcs-backend/app.py` | `GET /api/cluster/machine-role`, `POST /api/cluster/remote-command`, `WS /ws/cluster` |
| `dcs-ui/src/utils/clusterPeer.js` | `fetchMachineRole`, `sendRemoteCommandToMaingear`, `connectClusterWebSocket` |
| `dcs-ui/src/App.js` | `ideumKioskMode`, `handleIdeumControlButtonClick`, `handleRemoteClusterCommand` |
| `dcs-ui/src/utils/ideumComponent.js` | Ideum type helpers (`isIdeumComponent`, commands) |
| `dcs-ui/src/components/IdeumKiosk/IdeumComponentLayer.jsx` | Renders Ideum-only touch buttons + 3D |
| `dcs-ui/src/components/Canvas/Canvas.jsx` | Ideum mode wiring, 3D click forwarding |
| `dcs-backend/scripts/create_ideum05.py` | Builds `ideum05.conf.json` |
| `set-direct-ethernet-ip.ps1` | Static IP + writes `cluster.local.json` |
| `set-maingear-ethernet-ip.bat` / `set-ideum-ethernet-ip.bat` | One-click network setup |

---

## Ideum deployment checklist

1. Run `set-ideum-ethernet-ip.bat` **as Administrator** on the Ideum PC.
2. Start the same Docker stack as Maingear (`docker compose up`).
3. Open the UI (e.g. `http://localhost:3003` or positioned Chrome — see `open-chrome-window.ps1`).
4. **Load Design → Ideum05** (reload after updates to pick up new `ideum05.conf.json`).
5. On Maingear: run `set-maingear-ethernet-ip.bat`, open **statcom05**, ensure simulation controls can receive cluster commands.
6. On Ideum: tap **Add 8 turbine** or the green **Add BESS and GFMe** box.
7. Maingear should run the matching quick-scenario preset.

### Troubleshooting

| Symptom | Check |
|---------|--------|
| No Maingear alert when testing on Maingear | Reload Ideum05; confirm `ideumControlButtons` in conf; restart UI if needed |
| Ideum sends but Maingear does nothing | statcom05 open on Maingear; WebSocket connected; `remoteControlProfile.enabled` in statcom05 |
| “Unknown machine role” on Ideum | Run `set-ideum-ethernet-ip.bat`; verify `dcs-backend/cluster.local.json` has `"role": "ideum"` |
| Command HTTP error | Direct cable link; ping `192.168.50.1` from Ideum; backend on `:5000` |

---

## UI layout notes (Ideum05)

- **Not** full-screen kiosk — top menu/header stays (Load, Save, zoom).
- **Hidden:** component library (left), property panel, simulation controls (right), chart peek dock.
- `ideum-bess-gfme-button`: BESS and GFMe **side by side** inside one **green-bordered** box titled **Add BESS and GFMe**.
- `ideum-turbine-button`: **teal-bordered** box titled **Add 8 turbine**.

---

## Commands reference

```json
// Ideum → Maingear
POST /api/cluster/remote-command
{ "command": "add8Turbines" | "addStatcomAndGFMe", "source": "ideum" }

// Role probe (either machine)
GET /api/cluster/machine-role
```

WebSocket message on Maingear:

```json
{ "type": "remote_command", "command": "add8Turbines" }
```
