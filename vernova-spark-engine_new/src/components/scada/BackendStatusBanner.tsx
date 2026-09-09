import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, RefreshCw, X, CheckCircle2, Server, HelpCircle } from "lucide-react";

export type BackendHealthState = {
  isChecking: boolean;
  isOnline: boolean | null;
  sourcePath?: string;
  lastChecked?: Date;
  error?: string;
};

export function BackendStatusBanner() {
  const [health, setHealth] = useState<BackendHealthState>({
    isChecking: true,
    isOnline: null,
  });
  const [isDismissed, setIsDismissed] = useState(false);
  const [showHelpDetails, setShowHelpDetails] = useState(false);

  const checkHealth = useCallback(async () => {
    setHealth((prev) => ({ ...prev, isChecking: true }));
    try {
      const res = await fetch("/api/v1/health", { method: "GET" });
      if (!res.ok) {
        setHealth({
          isChecking: false,
          isOnline: false,
          lastChecked: new Date(),
          error: `HTTP ${res.status}: Backend service not ready`,
        });
        return;
      }
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!ct.includes("json")) {
        setHealth({
          isChecking: false,
          isOnline: false,
          lastChecked: new Date(),
          error: "Invalid response from server (expected JSON)",
        });
        return;
      }
      const data = await res.json().catch(() => null);
      if (data && data.ok === true) {
        setHealth({
          isChecking: false,
          isOnline: true,
          sourcePath: data.source,
          lastChecked: new Date(),
        });
      } else {
        setHealth({
          isChecking: false,
          isOnline: false,
          lastChecked: new Date(),
          error: "Health probe returned status not ok",
        });
      }
    } catch (err: unknown) {
      setHealth({
        isChecking: false,
        isOnline: false,
        lastChecked: new Date(),
        error: err instanceof Error ? err.message : "Network error",
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Periodically re-check health every 45 seconds
    const interval = setInterval(checkHealth, 45000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Do not render any indicator when online (hidden from all pages per user request)
  if (health.isOnline === true) {
    return null;
  }

  if (health.isOnline === false) {
    if (isDismissed) {
      return (
        <div className="fixed bottom-3 right-3 z-50 pointer-events-auto transition-all duration-300">
          <button
            onClick={() => setIsDismissed(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-300 text-xs font-medium backdrop-blur-md shadow-2xl hover:bg-amber-900 transition-all hover:scale-105"
            title="Click to view FastAPI backend warning"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>FastAPI Offline (Static Mode)</span>
          </button>
        </div>
      );
    }

    return (
      <div className="fixed top-12 left-3 z-50 max-w-md w-[calc(100vw-24px)] sm:w-auto pointer-events-auto transition-all duration-300">
        <div className="rounded-xl bg-gradient-to-br from-amber-950/95 via-amber-900/95 to-stone-950/95 border border-amber-500/60 text-amber-100 shadow-2xl shadow-black/80 backdrop-blur-md p-3.5">
          <div className="flex items-start justify-between gap-3">
            {/* Left Info Section */}
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-400/40 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-xs text-amber-200 tracking-wide">
                    FastAPI Backend Offline
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    Static Mode Active
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/80 mt-1 leading-snug">
                  FastAPI server unreachable. Application is running in{" "}
                  <strong className="text-amber-100 font-semibold">Static Databank Mode</strong>.
                </p>
                {showHelpDetails && (
                  <div className="mt-2 p-2 rounded bg-black/60 border border-amber-500/20 text-[11px] font-mono text-amber-300 space-y-1">
                    <p>💡 Start both servers in terminal:</p>
                    <div className="bg-black/80 px-2 py-0.5 rounded text-emerald-400 font-semibold text-[10px] inline-block">
                      npm run dev &nbsp;<span className="text-muted-foreground font-normal">(or npm run api)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-md hover:bg-amber-800/50 text-amber-400 hover:text-amber-100 transition-colors shrink-0"
              title="Dismiss warning"
              aria-label="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons Footer */}
          <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex items-center justify-between gap-2">
            <button
              onClick={() => setShowHelpDetails((v) => !v)}
              className="px-2 py-0.5 text-[10px] rounded border border-amber-500/30 bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 transition-colors flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3 text-amber-400" />
              <span>{showHelpDetails ? "Hide Help" : "Help Info"}</span>
            </button>

            <button
              onClick={checkHealth}
              disabled={health.isChecking}
              className="px-2.5 py-1 text-[11px] font-medium rounded border border-amber-400/40 bg-amber-500/25 hover:bg-amber-500/35 text-amber-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 text-amber-300 ${health.isChecking ? "animate-spin" : ""}`} />
              <span>{health.isChecking ? "Checking..." : "Retry Connection"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
