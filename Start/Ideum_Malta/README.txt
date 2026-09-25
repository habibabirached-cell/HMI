Ideum Malta — one PC, two displays (touch table + 85" wall)

Prerequisites on this PC (once): Git, Docker Desktop, Google Chrome, Node.js LTS (npm in PATH for Vernova).

No Ethernet link to a separate Maingear PC. cluster.local.json role is "malta":
touch commands and wall visuals share the same backend (127.0.0.1:5000).

Chrome layout (set Windows display 1 = touch, display 2 = 85" extended):
  Display 1 — DCS Ideum05 touch (?maltaView=touch), fullscreen
  Display 2 — Vernova (FlexSim) behind + DCS wall (?maltaView=wall), fullscreen

FIRST TIME after git pull:
  1) 01_FIRST_TIME_Copy_Ideum_Cluster_Json.bat  (copies cluster.local.json.malta)
  2) 02_FIRST_TIME_Create_Desktop_Shortcut.bat

EVERY demo day:
  Desktop "Ideum DCS Kiosk (Malta)" OR START_Daily_Ideum_Malta_Kiosk.bat

Windows must see two monitors (Extend, not Duplicate only). Touch = primary (Display 1), 85in = Display 2.

If Chrome opens on the wrong screen, from repo root run:
  open-chrome-window.bat -ListDisplays
Then adjust -Display 1 / 2 in BAT\open-malta-*-chrome.bat if needed.
