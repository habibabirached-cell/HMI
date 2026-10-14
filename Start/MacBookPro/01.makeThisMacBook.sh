#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SRC="${REPO_ROOT}/dcs-backend/cluster.local.json.dev"
DST="${REPO_ROOT}/dcs-backend/cluster.local.json"

if [[ ! -f "${SRC}" ]]; then
  echo "ERROR: Source file not found:" >&2
  echo "  ${SRC}" >&2
  exit 1
fi

cp -f "${SRC}" "${DST}"
echo "Copied MacBook Pro (dev) cluster config:"
echo "  ${SRC}"
echo "to:"
echo "  ${DST}"
echo ""
echo "This machine role is now \"dev\" (see GET /api/cluster/machine-role)."
