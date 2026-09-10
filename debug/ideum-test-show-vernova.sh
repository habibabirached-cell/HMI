#!/usr/bin/env bash
# Run on Ideum (192.168.50.2) — POST showVernova to Maingear (192.168.50.1).
# Usage: bash debug/ideum-test-show-vernova.sh
# Requires: curl, Ethernet to Maingear, Maingear z_genesis + focus server running.

set -euo pipefail

MAINGEAR_BASE="${MAINGEAR_BASE:-http://192.168.50.1:5000}"
IDEUM_BASE="${IDEUM_BASE:-http://192.168.50.2:5000}"

echo "=== Ideum local role (${IDEUM_BASE}) ==="
curl -s "${IDEUM_BASE}/api/cluster/machine-role"
echo -e "\n"

echo "=== Maingear peer role (${MAINGEAR_BASE}) ==="
curl -s "${MAINGEAR_BASE}/api/cluster/machine-role"
echo -e "\n"

echo "=== POST showVernova (Grid Connected) ==="
curl -s -X POST "${MAINGEAR_BASE}/api/cluster/remote-command" \
  -H "Content-Type: application/json" \
  -d '{"command":"showVernova","source":"ideum"}'
echo -e "\n"

echo "Done. Vernova wall on Maingear should be in front."
