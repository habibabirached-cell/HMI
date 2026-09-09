import type { NetworkModel } from "@/components/scada/NetworkDiagram";
import type { NetworkLayout } from "./types";
import { DEFAULT_LAYOUTS } from "./defaultLayouts";

const LAYOUT_KEY = "flexiqsim_network_layouts_v2";

type LayoutStore = Record<NetworkModel, NetworkLayout>;

function read(): Partial<LayoutStore> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "{}") as Partial<LayoutStore>;
  } catch {
    return {};
  }
}

function write(store: Partial<LayoutStore>) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(store));
}

export function getNetworkLayout(model: NetworkModel): NetworkLayout {
  const saved = read()[model];
  if (saved?.placed?.length) {
    return {
      placed: saved.placed.map((p) => ({ ...p })),
      connections: saved.connections?.map((c) => ({ ...c })) ?? [],
    };
  }
  const def = DEFAULT_LAYOUTS[model];
  return {
    placed: def.placed.map((p) => ({ ...p })),
    connections: def.connections.map((c) => ({ ...c })),
  };
}

export function saveNetworkLayout(model: NetworkModel, layout: NetworkLayout) {
  const store = read();
  store[model] = layout;
  write(store);
}

export function resetNetworkLayout(model: NetworkModel): NetworkLayout {
  const store = read();
  delete store[model];
  write(store);
  return getNetworkLayout(model);
}

export function getAllLayouts(): Partial<LayoutStore> {
  return read();
}
