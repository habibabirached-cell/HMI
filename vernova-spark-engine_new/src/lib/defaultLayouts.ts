import type { NetworkModel } from "@/components/scada/NetworkDiagram";
import type { NetworkLayout } from "./types";

/** Built-in SVG diagram renders the default network — overlays start empty. */
export const DEFAULT_LAYOUTS: Record<NetworkModel, NetworkLayout> = {
  SMIB: { placed: [], connections: [] },
  MMI: { placed: [], connections: [] },
  TWOAREA: { placed: [], connections: [] },
};
