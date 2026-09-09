import { Sparkline } from "./Sparkline";
import type { MetricSeries } from "@/lib/simData";
import { cn } from "@/lib/utils";

function Row({
  label,
  value,
  unit,
  series,
  sparkH = 40,
}: {
  label: string;
  value: string;
  unit?: string;
  series?: number[];
  sparkH?: number;
}) {
  return (
    <div className="border-b border-white/20 px-3 sm:px-4 py-2.5 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] sm:text-[14px] text-white/90">{label}</span>
        <span className="text-lg sm:text-xl font-bold tabular-nums text-lime">
          {value}
          {unit && <span className="ml-1 text-sm font-medium text-white/70">{unit}</span>}
        </span>
      </div>
      {series && <Sparkline values={series} height={sparkH} />}
    </div>
  );
}

export function MetricPanel({
  title,
  series,
  cbOn,
  onExpand,
  large,
}: {
  title: string;
  series: MetricSeries;
  cbOn: boolean;
  onExpand?: () => void;
  large?: boolean;
}) {
  const last = series.last;
  const p = series.points.map((s) => s.p);
  const q = series.points.map((s) => s.q);
  const v = series.points.map((s) => s.v);
  const f = series.points.map((s) => s.f);
  const sparkH = large ? 80 : 40;
  return (
    <div className="overflow-hidden rounded-xl border border-white/40 bg-[#0f2f2f]/70">
      <div className="flex items-center justify-between border-b border-white/25 px-3 sm:px-4 py-2 bg-[#184545]/80">
        <span className="text-sm font-semibold text-white/85">{title}</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-lime">
            <span className="live-dot h-2 w-2 rounded-full bg-lime" /> live
          </span>
          {onExpand && (
            <button
              onClick={onExpand}
              className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-lime"
              title="Full view"
              aria-label="Open full view"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <Row label="Active power at PCC (MW)" value={last?.p.toFixed(1) ?? "—"} unit="MW" series={p} sparkH={sparkH} />
      <Row label="Reactive power at PCC (MVAR)" value={last?.q.toFixed(1) ?? "—"} unit="MVAR" series={q} sparkH={sparkH} />
      <Row label="Three phase Voltage at PCC (pu)" value={last?.v.toFixed(3) ?? "—"} unit="pu" series={v} sparkH={sparkH} />
      <Row label="Frequency at PCC (Hz)" value={last?.f.toFixed(2) ?? "—"} unit="Hz" series={f} sparkH={sparkH} />
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5">
        <span className="text-[14px] text-white/90">System status CB</span>
        <span
          className={cn(
            "rounded-md px-3 py-1 text-sm font-bold tracking-wide",
            cbOn ? "bg-lime text-[#005E60]" : "bg-red-500 text-white",
          )}
        >
          {cbOn ? "ON" : "OFF"}
        </span>
      </div>
    </div>
  );
}
