import type { HybridType, LibItem } from "./types";

const ALL: LibItem[] = [
  { key: "grid", label: "Grid", icon: "grid" },
  { key: "transformer", label: "Transformer", icon: "transformer" },
  { key: "tower", label: "Tx Line", icon: "tower" },
  { key: "wind", label: "Wind Turbine", icon: "wind" },
  { key: "windfarm", label: "Wind Farm", icon: "windfarm" },
  { key: "solar", label: "Solar Farm", icon: "solar" },
  { key: "generator", label: "Generator", icon: "generator" },
  { key: "capacitor", label: "Capacitor", icon: "capacitor" },
  { key: "load", label: "P Q Load", icon: "load" },
  { key: "battery", label: "BESS", icon: "battery" },
  { key: "statcom", label: "STATCOM", icon: "statcom" },
  { key: "syncon", label: "SynCon", icon: "syncon" },
  { key: "pcc", label: "PCC Node", icon: "tower" },
];

const HYBRID_ICONS: Record<HybridType, Set<string>> = {
  GFMe: new Set(["grid", "transformer", "tower", "wind", "windfarm", "solar", "battery", "statcom", "load", "pcc"]),
  GFM: new Set(["grid", "transformer", "tower", "wind", "windfarm", "solar", "battery", "statcom", "load", "pcc"]),
  SynCon: new Set(["grid", "transformer", "tower", "wind", "windfarm", "solar", "generator", "syncon", "capacitor", "load", "battery", "pcc"]),
};

export function getLibraryForHybrid(hybrid: HybridType): LibItem[] {
  const allowed = HYBRID_ICONS[hybrid] ?? HYBRID_ICONS.GFMe;
  return ALL.filter((item) => allowed.has(item.icon));
}

export { ALL as ALL_LIBRARY_ITEMS };
