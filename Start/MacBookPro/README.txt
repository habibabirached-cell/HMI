MacBook Pro — local development

One-time (after clone or when cluster.local.json was overwritten by another machine):

  cd Start/MacBookPro
  chmod +x 01.makeThisMacBook.sh   # first time only
  ./01.makeThisMacBook.sh

Copies dcs-backend/cluster.local.json.dev → dcs-backend/cluster.local.json (role: dev).

Then run backend + UI as you usually do on localhost (no START_Daily, no Ethernet scripts).
