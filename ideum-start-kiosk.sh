#!/usr/bin/env bash
# Ideum touch table: cluster role + Docker + kiosk browser on http://localhost:3003
# Usage: ./ideum-start-kiosk.sh
# Desktop: mark executable, then link ideum-dcs-kiosk.desktop on the desktop.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="${REPO_ROOT}/dcs-backend/cluster.local.json.ideum"
DST="${REPO_ROOT}/dcs-backend/cluster.local.json"
DCS_URL="http://localhost:3003"
ENV_FILE="${REPO_ROOT}/.env"
COMPOSE_FILE="${REPO_ROOT}/docker-compose-dev.yml"

wait_for_port() {
  local port="$1"
  local label="$2"
  local timeout="${3:-180}"
  local elapsed=0
  echo "Waiting for ${label} on 127.0.0.1:${port} (timeout ${timeout}s)..."
  while ! (echo >/dev/tcp/127.0.0.1/"${port}") 2>/dev/null; do
    sleep 2
    elapsed=$((elapsed + 2))
    if (( elapsed >= timeout )); then
      echo "ERROR: timed out waiting for port ${port}"
      exit 1
    fi
  done
  echo "  OK: ${label}"
}

echo
echo "Ideum DCS kiosk startup..."
echo "Repo: ${REPO_ROOT}"
echo

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not found in PATH."
  exit 1
fi

echo "[1/4] Copy Ideum cluster role config..."
if [[ ! -f "${SRC}" ]]; then
  echo "ERROR: Missing ${SRC}"
  exit 1
fi
cp -f "${SRC}" "${DST}"
echo "  OK: cluster.local.json is Ideum role (Maingear peer http://192.168.50.1:5000)"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "WARN: .env not found at ${ENV_FILE}"
fi

echo
echo "[2/4] Starting Docker stack..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d

echo
echo "[3/4] Waiting for DCS backend and UI..."
wait_for_port 5000 "DCS backend"
wait_for_port 3003 "DCS UI"

echo
echo "[4/4] Opening kiosk browser at ${DCS_URL} ..."
if command -v google-chrome >/dev/null 2>&1; then
  exec google-chrome --kiosk --no-first-run --disable-infobars "${DCS_URL}"
elif command -v google-chrome-stable >/dev/null 2>&1; then
  exec google-chrome-stable --kiosk --no-first-run --disable-infobars "${DCS_URL}"
elif command -v chromium >/dev/null 2>&1; then
  exec chromium --kiosk --no-first-run --disable-infobars "${DCS_URL}"
elif command -v chromium-browser >/dev/null 2>&1; then
  exec chromium-browser --kiosk --no-first-run --disable-infobars "${DCS_URL}"
else
  echo "ERROR: No Chrome/Chromium found. Open ${DCS_URL} manually in kiosk mode."
  exit 1
fi
