import { cn } from "@/lib/utils";

export type WindNetworkModel = "SMIB" | "MMIB" | "TWOAREA";
export type WindHybrid = "GFMe" | "GFM" | "GFMe_STATCOM";

function resolveGridSrc(model: WindNetworkModel, hybrid: WindHybrid): string {
  // Prefer .1 / .2 variants (include BESS / hybrid gear) for GFMe hybrids
  const withBess = hybrid === "GFMe" || hybrid === "GFMe_STATCOM";
  if (model === "SMIB") {
    return withBess
      ? "/svgs/WindFarm/usecase1/Grid1_US1.1.svg"
      : "/svgs/WindFarm/usecase1/Grid1_US1.svg";
  }
  return withBess
    ? "/svgs/WindFarm/usecase2/Grid1_US2.2.svg"
    : "/svgs/WindFarm/usecase2/Grid1_US2.svg";
}

export function WindFarmDiagram({
  model,
  hybrid,
  cbOn,
  running,
  onToggleCb,
}: {
  model: WindNetworkModel;
  hybrid: WindHybrid;
  cbOn: boolean;
  running: boolean;
  onToggleCb: () => void;
}) {
  const src = resolveGridSrc(model, hybrid);

  return (
    <div className="flex flex-col h-full min-h-[200px] sm:min-h-[240px] gap-1.5">
      {/* CB control lives outside the SLD so it never covers manager artwork */}
      <div className="flex items-center justify-end gap-2 shrink-0 px-0.5">
        {running && (
          <span className="mr-auto rounded bg-lime/20 border border-lime/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-lime">
            Running
          </span>
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Circuit Breaker</span>
        <span
          className="rounded-lg px-3 py-1 text-[11px] font-bold uppercase tracking-wider border bg-lime text-[#005E60] border-lime select-none"
          title="Circuit Breaker (Closed)"
        >
          CB CLOSED
        </span>
      </div>

      {/* Manager SLD only — no photo / red-box overlays on top of the SVG */}
      <div className="relative flex-1 min-h-0 rounded-lg border border-white/35 bg-[#004a4c]/30 overflow-hidden">
        <img
          key={src}
          src={src}
          alt={`${model} network diagram`}
          className="absolute inset-0 w-full h-full object-contain object-center p-2 sm:p-3"
          draggable={false}
        />
      </div>
    </div>
  );
}
