import { createServerFn } from "@tanstack/react-start";
import { parseCsv } from "./csv";
// CSV "dump" data bundled at build time and parsed on the Node server side.
import { telemetryCsv, busesCsv, eventsCsv } from "../data/csvData";

export interface TelemetryPoint {
  t: number;
  activePowerMW: number;
  voltagePu: number;
  frequencyHz: number;
}

export interface NetworkSnapshot {
  model: string;
  cb: string;
  series: TelemetryPoint[];
  buses: {
    busId: string;
    name: string;
    status: string;
    kV: string;
    voltagePu: number;
    frequencyHz: number;
  }[];
  events: { type: string; label: string; location: string; time: string; status: string }[];
}

export const getNetworkSnapshot = createServerFn({ method: "GET" })
  .inputValidator((data: { model: string; cb: string }) => ({
    model: (data?.model ?? "SMIB").toUpperCase(),
    cb: (data?.cb ?? "ON").toUpperCase(),
  }))
  .handler(async ({ data }): Promise<NetworkSnapshot> => {
    const tel = parseCsv(telemetryCsv).filter(
      (r) => r.model === data.model && r.cb === data.cb,
    );
    const buses = parseCsv(busesCsv).filter((r) => r.model === data.model);
    const events = parseCsv(eventsCsv);

    return {
      model: data.model,
      cb: data.cb,
      series: tel.map((r) => ({
        t: Number(r.t),
        activePowerMW: Number(r.activePowerMW),
        voltagePu: Number(r.voltagePu),
        frequencyHz: Number(r.frequencyHz),
      })),
      buses: buses.map((r) => ({
        busId: r.busId,
        name: r.name,
        status: r.status,
        kV: r.kV,
        voltagePu: Number(r.voltagePu),
        frequencyHz: Number(r.frequencyHz),
      })),
      events: events.map((r) => ({
        type: r.type,
        label: r.label,
        location: r.location,
        time: r.time,
        status: r.status,
      })),
    };
  });