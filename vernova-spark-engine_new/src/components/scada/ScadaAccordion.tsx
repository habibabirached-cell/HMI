import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function ScadaAccordion({
  label,
  selectedLabel,
  open,
  onToggle,
  variant = "default",
  children,
}: {
  label: string;
  selectedLabel?: string;
  open: boolean;
  onToggle: () => void;
  variant?: "default" | "accent";
  children: ReactNode;
}) {
  const isAccent = variant === "accent";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-all duration-200",
        open
          ? "border-lime/50 bg-[#0f2f2f]/90 shadow-[0_0_20px_-8px_rgba(200,255,8,0.45)]"
          : "border-white/35 bg-[#163d3d]/70 hover:border-lime/40",
      )}
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lime/80">
            {label}
          </div>
          {selectedLabel && (
            <div className="mt-1 flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-[13px] font-bold leading-tight",
                  isAccent
                    ? "bg-lime/15 text-lime ring-1 ring-lime/35"
                    : "bg-lime text-[#005E60] shadow-sm",
                )}
              >
                {selectedLabel}
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
          className={cn(
            "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition-colors",
            open
              ? "border-lime/40 bg-lime/10 text-lime hover:bg-lime/20"
              : "border-white/30 bg-black/20 text-white/60 hover:border-lime/40 hover:text-lime",
          )}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div className="border-t border-white/20 px-2 pb-2 pt-1">
          <div className="space-y-1">{children}</div>
        </div>
      )}
    </div>
  );
}

export function ScadaOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition-all",
        active
          ? "bg-lime/15 text-lime ring-1 ring-lime/35"
          : "text-white/80 hover:bg-white/10 hover:text-white",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full border",
          active ? "border-lime bg-lime shadow-[0_0_6px_var(--lime)]" : "border-white/35 bg-transparent",
        )}
      />
      <span className="truncate">{children}</span>
    </button>
  );
}
