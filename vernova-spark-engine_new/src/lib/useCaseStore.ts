import type { NetworkModel } from "@/components/scada/NetworkDiagram";
import type { HybridType, UseCase } from "./types";

const STORE_KEY = "flexiqsim_use_cases_v2";

export const SEED_USE_CASES: UseCase[] = [
  {
    id: "uc-smib-linetrip-gfme",
    name: "SMIB Wind Farm Line Trip (GFMe)",
    network: "SMIB",
    hybrid: "GFMe",
    allowedComponents: ["grid", "transformer", "tower", "wind", "windfarm", "battery", "statcom"],
    csvPath: "/sample-data/SMIB_WF_LineTrip_GFMe.csv",
    events: [{ type: "LINE_TRIP", timeSec: 10, label: "Line Trip" }],
    hidden: true,
  },
  {
    id: "uc-smib-linetrip-no-gfme",
    name: "SMIB Wind Farm Line Trip (No GFMe)",
    network: "SMIB",
    hybrid: "GFMe",
    allowedComponents: ["grid", "transformer", "tower", "wind", "windfarm"],
    csvPath: "/sample-data/SMIB_WF_LineTrip_No_GFMe.csv",
    events: [{ type: "LINE_TRIP", timeSec: 10, label: "Line Trip" }],
    hidden: true,
  },
  {
    id: "uc-smib-default",
    name: "SMIB Default Steady State",
    network: "SMIB",
    hybrid: "GFMe",
    allowedComponents: ["grid", "transformer", "tower", "wind", "windfarm", "battery", "statcom"],
    csvPath: "/sample-data/SMIB_Default.csv",
    events: [
      { type: "LINE_TRIP", timeSec: 10, label: "Line Trip" },
      { type: "LOAD", timeSec: 30, label: "Load Change" },
      { type: "PQ_CHANGE", timeSec: 45, label: "P Q Change" },
    ],
    hidden: true,
  },
  {
    id: "uc-mmi-default",
    name: "MMIB Hybrid Renewable",
    network: "MMI",
    hybrid: "GFMe",
    allowedComponents: ["grid", "transformer", "tower", "wind", "solar", "battery", "statcom"],
    csvPath: "/sample-data/SMIB_Default.csv",
    events: [
      { type: "LINE_TRIP", timeSec: 10, label: "Line Trip" },
      { type: "LOAD", timeSec: 25, label: "Load Change" },
    ],
    hidden: true,
  },
  {
    id: "uc-twoarea-gfme",
    name: "Two-Area System (GFMe)",
    network: "TWOAREA",
    hybrid: "GFMe",
    allowedComponents: ["generator", "transformer", "tower", "wind", "solar", "load", "capacitor", "statcom", "battery"],
    csvPath: "/sample-data/SMIB_Default.csv",
    events: [
      { type: "LINE_TRIP", timeSec: 10, label: "Line Trip" },
      { type: "FAULT_3PH", timeSec: 20, label: "3-ph Fault" },
      { type: "LOAD", timeSec: 35, label: "Load Change" },
    ],
    hidden: true,
  },
  {
    id: "uc-twoarea-gfm",
    name: "Two-Area System (GFM)",
    network: "TWOAREA",
    hybrid: "GFM",
    allowedComponents: ["generator", "transformer", "tower", "wind", "solar", "load", "capacitor", "statcom", "battery"],
    csvPath: "/sample-data/SMIB_Default.csv",
    events: [
      { type: "GEN_TRIP", timeSec: 12, label: "Generator Trip" },
      { type: "FAULT_3PH", timeSec: 20, label: "3-ph Fault" },
      { type: "LOAD", timeSec: 35, label: "Load Change" },
    ],
    hidden: true,
  },
  {
    id: "uc-twoarea-default",
    name: "Two-Area System Demo",
    network: "TWOAREA",
    hybrid: "SynCon",
    allowedComponents: ["generator", "transformer", "tower", "wind", "solar", "load", "capacitor", "syncon"],
    csvPath: "/sample-data/SMIB_Default.csv",
    events: [
      { type: "GEN_TRIP", timeSec: 12, label: "Generator Trip" },
      { type: "FAULT_3PH", timeSec: 20, label: "3-ph Fault" },
      { type: "LOAD", timeSec: 35, label: "Load Change" },
    ],
    hidden: true,
  },
];

function read(): UseCase[] {
  if (typeof window === "undefined") return SEED_USE_CASES;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      localStorage.setItem(STORE_KEY, JSON.stringify(SEED_USE_CASES));
      return SEED_USE_CASES;
    }
    const parsed = JSON.parse(raw) as UseCase[];
    return parsed.length ? parsed : SEED_USE_CASES;
  } catch {
    return SEED_USE_CASES;
  }
}

function write(cases: UseCase[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(cases));
}

export function getUseCases(): UseCase[] {
  return read();
}

export function getVisibleUseCases(): UseCase[] {
  return read().filter((uc) => !uc.hidden);
}

export function saveUseCase(uc: UseCase) {
  const all = read();
  const idx = all.findIndex((x) => x.id === uc.id);
  if (idx >= 0) all[idx] = uc;
  else all.push(uc);
  write(all);
}

export function deleteUseCase(id: string) {
  write(read().filter((x) => x.id !== id));
}

export function canAddComponent(
  network: NetworkModel,
  hybrid: HybridType,
  placedIcons: string[],
  newIcon: string,
): { allowed: boolean; message?: string } {
  const candidates = read().filter((uc) => uc.network === network);
  if (!candidates.length) return { allowed: true };

  const iconInNetwork = candidates.some((uc) => uc.allowedComponents.includes(newIcon));
  if (!iconInNetwork) {
    return {
      allowed: false,
      message: `"${newIcon}" is not allowed for the ${network} network.`,
    };
  }

  const next = [...placedIcons, newIcon];
  const allowedByAny = candidates.some((uc) => next.every((icon) => uc.allowedComponents.includes(icon)));
  if (!allowedByAny) {
    return {
      allowed: false,
      message: `Adding "${newIcon}" does not match any saved use case for ${network}.`,
    };
  }
  return { allowed: true };
}

/** Resolve the active use case: component match first, then network+hybrid default. */
export function resolveActiveUseCase(
  network: NetworkModel,
  hybrid: HybridType,
  placedIcons: string[],
): UseCase | null {
  if (placedIcons.length) {
    const matched = matchUseCase(network, hybrid, placedIcons);
    if (matched) return matched;
  }
  const all = read();
  return (
    all.find((uc) => uc.network === network && uc.hybrid === hybrid) ??
    all.find((uc) => uc.network === network) ??
    null
  );
}

export function matchUseCase(
  network: NetworkModel,
  hybrid: HybridType,
  placedIcons: string[],
): UseCase | null {
  const icons = [...new Set(placedIcons)].sort();
  if (!icons.length) return null;

  const candidates = read().filter((uc) => uc.network === network && uc.hybrid === hybrid);
  let best: UseCase | null = null;
  let bestScore = -1;

  for (const uc of candidates) {
    const allowed = [...uc.allowedComponents].sort();
    const allPlacedAllowed = icons.every((i) => allowed.includes(i));
    if (!allPlacedAllowed) continue;

    const overlap = icons.filter((i) => allowed.includes(i)).length;
    const exactBonus = icons.length === allowed.length ? 10 : 0;
    const score = overlap + exactBonus;
    if (score > bestScore) {
      bestScore = score;
      best = uc;
    }
  }
  return best;
}
