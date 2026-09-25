Maingear 4-screen wall — startup scripts

FIRST TIME after git pull (run once, or when cluster/network was reset):
  1) 01_FIRST_TIME_Copy_Maingear_Cluster_Json.bat
  2) 02_FIRST_TIME_Setup_Ethernet_Admin.bat  (needs Administrator — sets 192.168.50.1)
  3) 03_FIRST_TIME_Create_Desktop_Shortcut.bat  (creates "Genesis 4-Screen Wall" on desktop)

EVERY demo day:
  Double-click desktop "Genesis 4-Screen Wall" OR START_Daily_Genesis_4_Screens.bat
  (Docker + Vernova + two fullscreen Chrome walls — DCS :3003 and Vernova :5173;
   also starts winScreenSaver in a minimized window — sweeps all displays when idle;
   edit winScreenSaver\config.py for IDLE_SECONDS)

Legacy paths still work: BAT\z_genesis.start.bat, set-maingear-ethernet-ip.bat, maingear.copy.bat
