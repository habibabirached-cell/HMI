/**
 * Y-axis ranges from Asha PDF:
 * CIGRE_FLEXIQSIM_StabilityCharData_CFG1-11_v4_YAxisDetails.pdf pp.16–17
 *
 * Rule: zero-centered; fit DOMINANT signal; share same min/max/tick on BOTH Ip and Iq panes.
 * Idle / no event → use SCL (fault) row for that CFG (Gyan WhatsApp).
 */

import type { StabilityEventType } from "./stabilityDatabank";

export type YAxisRange = {
  min: number;
  max: number;
  tickStep: number;
  /** Dominant signal name from PDF (informational) */
  dominant: "Ip_GEP_pu Main" | "Iq_GEP_pu Main";
};

type EventKey = StabilityEventType;

/** PDF subsection → UI event */
const TABLE: Record<string, Record<EventKey, YAxisRange>> = {
  CFG1: {
    phase_jump: { min: -0.5, max: 0.5, tickStep: 0.1, dominant: "Ip_GEP_pu Main" },
    rocof: { min: -1, max: 1, tickStep: 0.2, dominant: "Ip_GEP_pu Main" },
    fault: { min: -6, max: 6, tickStep: 1, dominant: "Iq_GEP_pu Main" },
    voltage_step: { min: -0.3, max: 0.3, tickStep: 0.05, dominant: "Iq_GEP_pu Main" },
  },
  CFG2: {
    phase_jump: { min: -0.5, max: 0.5, tickStep: 0.1, dominant: "Ip_GEP_pu Main" },
    rocof: { min: -0.5, max: 0.5, tickStep: 0.1, dominant: "Ip_GEP_pu Main" },
    fault: { min: -5, max: 5, tickStep: 1, dominant: "Iq_GEP_pu Main" },
    voltage_step: { min: -0.2, max: 0.2, tickStep: 0.05, dominant: "Iq_GEP_pu Main" },
  },
  CFG3: {
    phase_jump: { min: -0.75, max: 0.75, tickStep: 0.25, dominant: "Ip_GEP_pu Main" },
    rocof: { min: -0.6, max: 0.6, tickStep: 0.1, dominant: "Ip_GEP_pu Main" },
    fault: { min: -4, max: 4, tickStep: 1, dominant: "Iq_GEP_pu Main" },
    voltage_step: { min: -0.25, max: 0.25, tickStep: 0.05, dominant: "Iq_GEP_pu Main" },
  },
  CFG4: {
    phase_jump: { min: -0.4, max: 0.4, tickStep: 0.1, dominant: "Ip_GEP_pu Main" },
    rocof: { min: -0.4, max: 0.4, tickStep: 0.1, dominant: "Iq_GEP_pu Main" },
    fault: { min: -4, max: 4, tickStep: 1, dominant: "Iq_GEP_pu Main" },
    voltage_step: { min: -0.3, max: 0.3, tickStep: 0.05, dominant: "Iq_GEP_pu Main" },
  },
  CFG5: {
    phase_jump: { min: -0.5, max: 0.5, tickStep: 0.1, dominant: "Ip_GEP_pu Main" },
    rocof: { min: -0.75, max: 0.75, tickStep: 0.25, dominant: "Ip_GEP_pu Main" },
    fault: { min: -4, max: 4, tickStep: 1, dominant: "Iq_GEP_pu Main" },
    voltage_step: { min: -0.25, max: 0.25, tickStep: 0.05, dominant: "Iq_GEP_pu Main" },
  },
  CFG6: {
    phase_jump: { min: -0.6, max: 0.6, tickStep: 0.1, dominant: "Ip_GEP_pu Main" },
    rocof: { min: -0.5, max: 0.5, tickStep: 0.1, dominant: "Ip_GEP_pu Main" },
    fault: { min: -2.5, max: 2.5, tickStep: 0.5, dominant: "Iq_GEP_pu Main" },
    voltage_step: { min: -0.3, max: 0.3, tickStep: 0.05, dominant: "Iq_GEP_pu Main" },
  },
  CFG7: {
    phase_jump: { min: -0.2, max: 0.2, tickStep: 0.05, dominant: "Ip_GEP_pu Main" },
    rocof: { min: -0.02, max: 0.02, tickStep: 0.005, dominant: "Iq_GEP_pu Main" },
    fault: { min: -1.5, max: 1.5, tickStep: 0.25, dominant: "Iq_GEP_pu Main" },
    voltage_step: { min: -0.4, max: 0.4, tickStep: 0.1, dominant: "Iq_GEP_pu Main" },
  },
  CFG8: {
    phase_jump: { min: -0.6, max: 0.6, tickStep: 0.1, dominant: "Ip_GEP_pu Main" },
    rocof: { min: -0.6, max: 0.6, tickStep: 0.1, dominant: "Ip_GEP_pu Main" },
    fault: { min: -1.2, max: 1.2, tickStep: 0.2, dominant: "Iq_GEP_pu Main" },
    voltage_step: { min: -0.3, max: 0.3, tickStep: 0.05, dominant: "Iq_GEP_pu Main" },
  },
  CFG9: {
    phase_jump: { min: -0.2, max: 0.2, tickStep: 0.05, dominant: "Ip_GEP_pu Main" },
    rocof: { min: -0.05, max: 0.05, tickStep: 0.01, dominant: "Ip_GEP_pu Main" },
    fault: { min: -1.2, max: 1.2, tickStep: 0.2, dominant: "Iq_GEP_pu Main" },
    voltage_step: { min: -0.25, max: 0.25, tickStep: 0.05, dominant: "Iq_GEP_pu Main" },
  },
  CFG10: {
    phase_jump: { min: -0.75, max: 0.75, tickStep: 0.25, dominant: "Ip_GEP_pu Main" },
    rocof: { min: -0.5, max: 0.5, tickStep: 0.1, dominant: "Ip_GEP_pu Main" },
    fault: { min: -1.25, max: 1.25, tickStep: 0.25, dominant: "Iq_GEP_pu Main" },
    voltage_step: { min: -0.3, max: 0.3, tickStep: 0.05, dominant: "Iq_GEP_pu Main" },
  },
  CFG11: {
    phase_jump: { min: -1, max: 1, tickStep: 0.2, dominant: "Ip_GEP_pu Main" },
    rocof: { min: -0.4, max: 0.4, tickStep: 0.1, dominant: "Ip_GEP_pu Main" },
    fault: { min: -3, max: 3, tickStep: 0.5, dominant: "Iq_GEP_pu Main" },
    voltage_step: { min: -0.6, max: 0.6, tickStep: 0.1, dominant: "Iq_GEP_pu Main" },
  },
  CFG12: {
    phase_jump: { min: -50, max: 200, tickStep: 50, dominant: "Ip_GEP_pu Main" },
    rocof: { min: -50, max: 200, tickStep: 50, dominant: "Ip_GEP_pu Main" },
    fault: { min: -50, max: 200, tickStep: 50, dominant: "Iq_GEP_pu Main" },
    voltage_step: { min: -50, max: 200, tickStep: 50, dominant: "Iq_GEP_pu Main" },
  },
  CFG13: {
    phase_jump: { min: -50, max: 200, tickStep: 50, dominant: "Ip_GEP_pu Main" },
    rocof: { min: -50, max: 200, tickStep: 50, dominant: "Ip_GEP_pu Main" },
    fault: { min: -50, max: 200, tickStep: 50, dominant: "Iq_GEP_pu Main" },
    voltage_step: { min: -50, max: 200, tickStep: 50, dominant: "Iq_GEP_pu Main" },
  },
};

const DEFAULT_RANGE: YAxisRange = {
  min: -1,
  max: 1,
  tickStep: 0.2,
  dominant: "Ip_GEP_pu Main",
};

/** Idle default = SCL/fault row (WhatsApp). CFG12/CFG13 fixed at [-50, 200]. */
export function getYAxisRange(
  cfgName: string | null | undefined,
  event: "none" | StabilityEventType,
  signal?: "active" | "reactive",
): YAxisRange {
  if (!cfgName) return DEFAULT_RANGE;
  const match = cfgName.toUpperCase().match(/CFGR?(\d+)/);
  const upper = match ? `CFG${match[1]}` : cfgName.toUpperCase().trim();
  if (upper === "CFG12" || upper === "CFG13") {
    return {
      min: -50,
      max: 200,
      tickStep: 50,
      dominant: "Ip_GEP_pu Main",
    };
  }

  // Only in case of CFG7 Rocof event:
  // Active power (Ip) graph = -0.06 to 0.06
  // Reactive power (Iq) graph = -0.300 to 0.300
  if (upper === "CFG7" && event === "rocof") {
    if (signal === "active") {
      return {
        min: -0.06,
        max: 0.06,
        tickStep: 0.02,
        dominant: "Ip_GEP_pu Main",
      };
    }
    if (signal === "reactive") {
      return {
        min: -0.3,
        max: 0.3,
        tickStep: 0.1,
        dominant: "Iq_GEP_pu Main",
      };
    }
    return {
      min: -0.3,
      max: 0.3,
      tickStep: 0.1,
      dominant: "Iq_GEP_pu Main",
    };
  }

  const cfg = TABLE[upper];
  if (!cfg) return DEFAULT_RANGE;
  const key: EventKey = event === "none" ? "fault" : event;
  return cfg[key] ?? DEFAULT_RANGE;
}
