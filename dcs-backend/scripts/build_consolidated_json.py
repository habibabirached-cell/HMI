#!/usr/bin/env python3
"""Build consolidated.json from consolidated.transpose.xlsx."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "configuratorData" / "data" / "consolidated.transpose.xlsx"
OUT_PATHS = [
    ROOT / "configuratorData" / "data" / "consolidated.json",
    ROOT.parent / "dcs-ui" / "src" / "configuratorData" / "consolidated.json",
]

INPUT_KEY_MAP = {
    "Reliability": "reliabilityTarget",
    "CFE % ( Energy) this is percent": "minCfePercent",
    "Peak Load": "loadMW",
    "Place": "place",
}
OUTPUT_KEY_MAP = {
    "HD - 7HA.02": "hd7ha02",
    "HD - 7F.05": "hd7f05",
    "LM2500+G4": "lm2500g4",
    "LM2500 22MW": "lm250022mw",
    "Wind": "wind",
    "Solar": "solar",
    "BESS": "battery",
    "LCOE": "lcoe",
    "Realibility": "achievedReliability",
}


def main() -> None:
    raw = pd.read_excel(SRC, sheet_name=0, header=None)
    split_col = next(
        i for i, v in enumerate(raw.iloc[0].tolist()) if isinstance(v, str) and v.strip().upper() == "INPUT"
    )
    out_headers = [str(x).strip() for x in raw.iloc[1, :split_col].tolist() if pd.notna(x)]
    in_headers = [str(x).strip() for x in raw.iloc[1, split_col:].tolist() if pd.notna(x)]

    records = []
    for r in range(2, raw.shape[0]):
        row = raw.iloc[r]
        inputs: dict = {}
        outputs: dict = {}
        for j, h in enumerate(out_headers):
            key = OUTPUT_KEY_MAP.get(h)
            if key and pd.notna(row.iloc[j]):
                outputs[key] = float(row.iloc[j])
        for j, h in enumerate(in_headers):
            key = INPUT_KEY_MAP.get(h)
            col = split_col + j
            if key and pd.notna(row.iloc[col]):
                inputs[key] = str(row.iloc[col]).strip().upper() if key == "place" else float(row.iloc[col])
        if inputs and outputs:
            records.append({"id": f"record-{len(records) + 1}", "inputs": inputs, "outputs": outputs})

    doc = {
        "meta": {
            "source": "consolidated.transpose.xlsx",
            "recordCount": len(records),
            "outputFields": list(OUTPUT_KEY_MAP.values()),
            "inputFields": list(INPUT_KEY_MAP.values()),
            "places": sorted({rec["inputs"]["place"] for rec in records}),
        },
        "records": records,
    }

    for path in OUT_PATHS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(doc, indent=2), encoding="utf-8")
        print(f"Wrote {path} ({len(records)} records)")


if __name__ == "__main__":
    main()
