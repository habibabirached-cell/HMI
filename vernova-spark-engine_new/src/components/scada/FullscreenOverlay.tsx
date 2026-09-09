import { X } from "lucide-react";
import type { ReactNode } from "react";

export function FullscreenOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="green-theme fixed inset-0 z-50 flex flex-col bg-[#1e4a4a] text-white">
      <div className="flex shrink-0 items-center justify-between border-b border-white/25 px-4 py-2.5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-lime">{title}</h2>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-md bg-lime px-3 py-1.5 text-sm font-bold text-[#005E60] hover:brightness-110"
          aria-label="Close full view"
        >
          <X className="h-4 w-4" /> Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
    </div>
  );
}
