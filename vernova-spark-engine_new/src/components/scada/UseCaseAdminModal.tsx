import { useState } from "react";
import { X } from "lucide-react";
import type { NetworkModel } from "./NetworkDiagram";
import type { HybridType, UseCase, EventMarker } from "@/lib/types";
import { ALL_LIBRARY_ITEMS } from "@/lib/hybridConfig";
import { saveUseCase } from "@/lib/useCaseStore";
import { parseClientCsv } from "@/lib/csvParser";

const NETWORK_OPTS: { value: NetworkModel; label: string }[] = [
  { value: "SMIB", label: "SMIB" },
  { value: "MMI", label: "MMIB" },
  { value: "TWOAREA", label: "Two-Area" },
];

const HYBRID_OPTS: { value: HybridType; label: string }[] = [
  { value: "GFMe", label: "GFM e-STATCOM" },
  { value: "GFM", label: "GFM STATCOM" },
  { value: "SynCon", label: "SynCon" },
];

const EVENT_TYPES = [
  { value: "LINE_TRIP", label: "Line Trip" },
  { value: "LOAD", label: "Load Change" },
  { value: "PQ_CHANGE", label: "P Q Change" },
  { value: "FAULT_3PH", label: "3-ph Fault" },
  { value: "GEN_TRIP", label: "Generator Trip" },
];

export function UseCaseAdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [network, setNetwork] = useState<NetworkModel>("SMIB");
  const [hybrid, setHybrid] = useState<HybridType>("GFMe");
  const [allowed, setAllowed] = useState<string[]>(["grid", "transformer", "tower", "wind"]);
  const [csvPath, setCsvPath] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [events, setEvents] = useState<EventMarker[]>([{ type: "LINE_TRIP", timeSec: 10, label: "Line Trip" }]);
  const [status, setStatus] = useState("");

  if (!open) return null;

  function toggleComponent(icon: string) {
    setAllowed((a) => (a.includes(icon) ? a.filter((x) => x !== icon) : [...a, icon]));
  }

  function addEvent() {
    setEvents((e) => [...e, { type: "LOAD", timeSec: 30, label: "Load Change" }]);
  }

  async function handleSave() {
    if (!name.trim()) {
      setStatus("Enter a use-case name.");
      return;
    }
    if (!allowed.length) {
      setStatus("Select at least one allowed component.");
      return;
    }

    let path = csvPath;
    if (csvFile) {
      const text = await csvFile.text();
      if (!parseClientCsv(text).length) {
        setStatus("CSV could not be parsed. Check the format.");
        return;
      }
      const blob = new Blob([text], { type: "text/csv" });
      path = URL.createObjectURL(blob);
    }
    if (!path) {
      setStatus("Upload a CSV or enter a CSV path.");
      return;
    }

    const uc: UseCase = {
      id: `uc-${Date.now()}`,
      name: name.trim(),
      network,
      hybrid,
      allowedComponents: allowed,
      csvPath: path,
      events,
      hidden: true,
    };
    saveUseCase(uc);
    setStatus("Use case saved (stored in background).");
    setTimeout(onClose, 800);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-lime/40 bg-popover p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-lime uppercase">Create Use Case Configuration</h2>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-xs text-foreground/60">
          Saved in background — used to validate components and load CSV analytics during live demo.
        </p>

        <label className="mb-3 block text-sm">
          <span className="text-foreground/80">Use case name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-panel px-3 py-2 text-sm"
            placeholder="e.g. SMIB Line Trip Demo"
          />
        </label>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="text-foreground/80">Network</span>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as NetworkModel)}
              className="mt-1 w-full rounded-md border border-border bg-panel px-2 py-2 text-sm"
            >
              {NETWORK_OPTS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-foreground/80">Hybrid</span>
            <select
              value={hybrid}
              onChange={(e) => setHybrid(e.target.value as HybridType)}
              className="mt-1 w-full rounded-md border border-border bg-panel px-2 py-2 text-sm"
            >
              {HYBRID_OPTS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mb-3">
          <span className="text-sm text-foreground/80">Allowed components</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ALL_LIBRARY_ITEMS.map((item) => {
              const on = allowed.includes(item.icon);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleComponent(item.icon)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    on ? "bg-lime text-primary-foreground" : "bg-chip text-chip-foreground"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3">
          <span className="text-sm text-foreground/80">CSV file</span>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-xs"
          />
          <input
            value={csvPath}
            onChange={(e) => setCsvPath(e.target.value)}
            placeholder="Or path e.g. /sample-data/SMIB_Default.csv"
            className="mt-2 w-full rounded-md border border-border bg-panel px-3 py-2 text-xs"
          />
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-foreground/80">Event timestamps (seconds)</span>
            <button type="button" onClick={addEvent} className="text-xs font-bold text-lime">+ Add</button>
          </div>
          {events.map((ev, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <select
                value={ev.type}
                onChange={(e) => {
                  const type = e.target.value;
                  const label = EVENT_TYPES.find((t) => t.value === type)?.label ?? type;
                  setEvents((arr) => arr.map((x, j) => (j === i ? { ...x, type, label } : x)));
                }}
                className="flex-1 rounded-md border border-border bg-panel px-2 py-1 text-xs"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                type="number"
                value={ev.timeSec}
                onChange={(e) =>
                  setEvents((arr) =>
                    arr.map((x, j) => (j === i ? { ...x, timeSec: Number(e.target.value) } : x)),
                  )
                }
                className="w-20 rounded-md border border-border bg-panel px-2 py-1 text-xs"
              />
              <span className="self-center text-xs text-foreground/50">sec</span>
            </div>
          ))}
        </div>

        {status && <p className="mb-3 text-xs text-lime">{status}</p>}

        <div className="flex gap-2">
          <button onClick={handleSave} className="flex-1 rounded-md bg-lime py-2 text-sm font-bold text-primary-foreground">
            Save configuration
          </button>
          <button onClick={onClose} className="rounded-md bg-chip px-4 py-2 text-sm font-semibold text-chip-foreground">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
