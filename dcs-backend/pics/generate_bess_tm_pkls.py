#!/usr/bin/env python3
"""Build bessOn.pkl, bessStatOn.pkl, allOff.pkl from Arch3_A_1_Dataframe_reduced.pkl.

All Tm_1 … Tm_1.7 series start at -1 and end at +1. Wiggle strength differs by file:
  allOff     — heavy shared wiggle while ramping
  bessOn     — medium shared wiggle while ramping
  bessStatOn — smooth ramp only (no wiggle)
"""

from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np
import pandas as pd

SOURCE = Path(__file__).resolve().parent / "Arch3_A_1_Dataframe_reduced.pkl"
OUT_DIR = Path(__file__).resolve().parent

TM_COLS = [
    ("Tm_1", "LM2500_1"),
    ("Tm_1.1", "LM2500_2"),
    ("Tm_1.2", "LM2500_3"),
    ("Tm_1.3", "LM2500_4"),
    ("Tm_1.4", "LM2500_5"),
    ("Tm_1.5", "LM2500_6"),
    ("Tm_1.6", "LM2500_7"),
    ("Tm_1.7", "LM2500_8"),
]

# (output filename, wiggle amplitude, oscillation cycle counts, variant seed)
VARIANTS = {
    "allOff.pkl": (0.42, (38, 52, 66, 80, 94), 101),
    "bessOn.pkl": (0.17, (5, 8, 11), 202),
    "bessStatOn.pkl": (0.0, (), 303),
}


def fmt_cell(value: float) -> str:
    """Match string style used in the source dataframe."""
    if value == 0.0:
        return "0"
    ax = abs(value)
    if ax < 0.001 or ax >= 10000:
        return f"{value:.2E}".replace("e", "E")
    text = f"{value:.9f}".rstrip("0").rstrip(".")
    return text if text else "0"


# Per-turbine spread: mostly in phase, ~10% differentiation between columns.
PER_COL_AMP_SPREAD = 0.10
PER_COL_PHASE_SPREAD = 0.14  # radians — small lag, still largely aligned


def _col_variation(col_index: int, variant_seed: int) -> tuple[float, float, float]:
    """Fixed ±10% amplitude scale, tiny phase offset, and mid-run bias per turbine."""
    rng = np.random.default_rng(variant_seed + col_index * 17)
    amp_scale = 1.0 + rng.uniform(-PER_COL_AMP_SPREAD, PER_COL_AMP_SPREAD)
    phase = rng.uniform(-PER_COL_PHASE_SPREAD, PER_COL_PHASE_SPREAD)
    # Separates stacked traces at mid-run; envelope zeros it at both ends.
    bias = rng.uniform(-PER_COL_AMP_SPREAD, PER_COL_AMP_SPREAD)
    return amp_scale, phase, bias


def build_tm_series(
    n: int,
    amplitude: float,
    cycle_freqs: tuple[float, ...],
    col_index: int = 0,
    variant_seed: int = 0,
) -> np.ndarray:
    """Ramp -1 → +1 with optional shared wiggle (envelope vanishes at both ends)."""
    t = np.linspace(0.0, 1.0, n)
    base = -1.0 + 2.0 * t
    envelope = np.sin(np.pi * t) ** 2
    amp_scale, phase, bias = _col_variation(col_index, variant_seed)

    if amplitude <= 0.0 or not cycle_freqs:
        # Smooth ramp only — tiny per-turbine bulge in the middle (no oscillation).
        out = base + bias * envelope
        out[0] = -1.0
        out[-1] = 1.0
        return np.clip(out, -1.0, 1.0)

    # Shared wiggle shape; each turbine differs slightly in amplitude & phase.
    wiggle = sum(
        np.sin(2.0 * np.pi * f * t + phase) for f in cycle_freqs
    ) / len(cycle_freqs)
    # Slow per-turbine drift on wiggle strength (stays in phase with the main wave).
    drift = 1.0 + 0.05 * np.sin(2.0 * np.pi * 1.3 * t + phase * 2.0)
    out = base + amplitude * amp_scale * envelope * wiggle * drift + bias * envelope
    out[0] = -1.0
    out[-1] = 1.0
    return np.clip(out, -1.0, 1.0)


def apply_tm_signals(
    df: pd.DataFrame,
    amplitude: float,
    cycle_freqs: tuple[float, ...],
    variant_seed: int,
) -> pd.DataFrame:
    out = df.copy(deep=True)
    n = len(out)
    for idx, col in enumerate(TM_COLS):
        if col not in out.columns:
            raise KeyError(f"Missing column {col!r} in source dataframe")
        values = build_tm_series(
            n, amplitude, cycle_freqs, col_index=idx, variant_seed=variant_seed
        )
        out[col] = [fmt_cell(float(v)) for v in values]
    return out


def main() -> None:
    with SOURCE.open("rb") as f:
        source = pickle.load(f)

    for filename, (amplitude, cycles, seed) in VARIANTS.items():
        out_df = apply_tm_signals(source, amplitude, cycles, variant_seed=seed)
        out_path = OUT_DIR / filename
        with out_path.open("wb") as f:
            pickle.dump(out_df, f, protocol=pickle.HIGHEST_PROTOCOL)
        print(f"Wrote {out_path}  shape={out_df.shape}  amp={amplitude}  cycles={cycles}")


if __name__ == "__main__":
    main()
