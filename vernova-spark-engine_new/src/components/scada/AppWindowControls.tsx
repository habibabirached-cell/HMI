import { Power } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Attempts to request F11 fullscreen on the whole document (with Safari/iPad webkit support).
 */
export function requestAppFullscreen() {
  if (typeof document !== "undefined") {
    const docEl = document.documentElement as any;
    const isFullscreen = Boolean(document.fullscreenElement || docEl.webkitFullscreenElement);
    if (!isFullscreen) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen().catch?.(() => {});
      }
    }
  }
}

/**
 * Attempts to exit fullscreen (with Safari/iPad webkit support).
 */
export function exitAppFullscreen() {
  if (typeof document !== "undefined") {
    const doc = document as any;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else if (doc.webkitFullscreenElement) {
      doc.webkitExitFullscreen?.().catch?.(() => {});
    }
  }
}

/**
 * Closes the application:
 * 1. Exits fullscreen mode.
 * 2. Attempts window.close().
 * 3. Falls back to returning to cover view if browser policy prevents script closing.
 */
export function closeApplication() {
  exitAppFullscreen();

  if (typeof window !== "undefined") {
    // Attempt script close
    window.close();

    // Fallback if browser blocks window.close
    setTimeout(() => {
      try {
        sessionStorage.setItem("flexiqsim.showLanding", "1");
        sessionStorage.removeItem("flexiqsim.openUseCases");
      } catch {}
      window.location.href = "/";
    }, 150);
  }
}

/**
 * Unified Close Application control button for headers.
 */
export function AppWindowControls({
  className,
  showLabels = false,
  compact = false,
}: {
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1 shrink-0", className)}>
      {/* Close Application Button */}
      <button
        type="button"
        onClick={closeApplication}
        className={cn(
          "inline-flex items-center justify-center border border-red-500/50 bg-red-500/15 text-red-300 hover:bg-red-500/30 hover:border-red-400 hover:text-red-100 active:scale-95 transition-all cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)] rounded-full shrink-0",
          showLabels
            ? "gap-1.5 px-3.5 h-9 text-xs"
            : "h-9 w-9 min-w-[36px] min-h-[36px] p-0"
        )}
        title="Close Application"
        aria-label="Close Application"
      >
        <Power className="w-4 h-4 text-red-400 shrink-0" />
        {showLabels && (
          <span className="font-sans font-bold uppercase tracking-wider text-[10px] hidden sm:inline text-red-300">
            Close App
          </span>
        )}
      </button>
    </div>
  );
}
