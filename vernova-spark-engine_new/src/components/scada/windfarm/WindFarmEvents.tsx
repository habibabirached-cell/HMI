import { cn } from "@/lib/utils";

export const WIND_EVENTS = [
  { value: "LINE_TRIP", label: "Line Trip" },
  { value: "GRID_SCR", label: "SCR Change" },
  { value: "FAULT_3PH", label: "Fault" },
  { value: "LOAD", label: "Load Change" },
] as const;

export type WindEventType = (typeof WIND_EVENTS)[number]["value"];

export function WindFarmEvents({
  active,
  onSelect,
}: {
  active: WindEventType | null;
  onSelect: (v: WindEventType) => void;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="rounded-lg bg-lime px-3 py-2 text-center text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#005E60]">
        Events
      </div>
      <div className="flex flex-col gap-1.5">
        {WIND_EVENTS.map((e) => {
          const isActive = active === e.value;
          return (
            <button
              key={e.value}
              type="button"
              onClick={() => onSelect(e.value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-[12px] sm:text-[13px] font-semibold transition-all",
                isActive
                  ? "border-lime bg-lime/20 text-lime shadow-[0_0_12px_rgba(200,255,8,0.25)]"
                  : "border-white/25 bg-[#004745]/80 text-white/85 hover:border-lime/40 hover:text-lime",
              )}
            >
              {e.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
