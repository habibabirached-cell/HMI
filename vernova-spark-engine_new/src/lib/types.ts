import type { NetworkModel } from "@/components/scada/NetworkDiagram";

export type HybridType = "GFMe" | "GFM" | "SynCon";

export interface PlacedComponent {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  animOff?: boolean;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface NetworkLayout {
  placed: PlacedComponent[];
  connections: Connection[];
}

export interface EventMarker {
  type: string;
  timeSec: number;
  label: string;
}

export interface UseCase {
  id: string;
  name: string;
  network: NetworkModel;
  hybrid: HybridType;
  allowedComponents: string[];
  csvPath: string;
  events: EventMarker[];
  hidden?: boolean;
}

export interface LibItem {
  key: string;
  label: string;
  icon: string;
}
