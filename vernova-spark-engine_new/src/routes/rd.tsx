import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { AppWindowControls } from "@/components/scada/AppWindowControls";

function RdPage() {
  return (
    <div className="flex min-h-screen w-full flex-col justify-between bg-[#212121] bg-[radial-gradient(ellipse_at_top,#004745_0%,#002b2a_40%,#212121_100%)] text-white font-sans select-none">
      {/* Top Header: GE Logo on left, Centered Title in GE Inter, Home & Close on right */}
      <header className="flex flex-row items-center justify-between gap-2 sm:gap-3 px-6 md:px-10 pt-6 md:pt-10 pb-2.5 shrink-0 bg-transparent border-b border-white/10 text-white select-none z-30 font-sans">
        <div className="flex shrink-0 items-center justify-start min-w-0 -ml-2.5 sm:-ml-3">
          <Link to="/" className="shrink-0 hover:opacity-90 transition-opacity">
            <img
              src="/logos/ge_vernova_white.svg"
              alt="GE Vernova"
              className="h-12 sm:h-14 md:h-16 lg:h-[68px] w-auto max-w-[260px] sm:max-w-[300px] object-contain object-left"
            />
          </Link>
        </div>

        {/* Center: Title */}
        <div className="flex-1 flex items-center justify-center min-w-0 px-2">
          <h1 className="font-sans font-extrabold text-sm sm:text-base md:text-lg lg:text-xl text-white uppercase tracking-wider truncate text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            R&D Innovations & Advanced Control
          </h1>
        </div>

        {/* Right: Home, Close App */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/"
            onClick={() => {
              try {
                sessionStorage.setItem("flexiqsim.openUseCases", "1");
              } catch {
                /* private mode */
              }
            }}
            className="h-9 w-9 min-w-[36px] min-h-[36px] p-0 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 text-white transition-all shadow-sm group cursor-pointer shrink-0"
            title="Home"
            aria-label="Home"
          >
            <Home className="w-4 h-4 shrink-0 text-white group-hover:text-[#C8FF08] group-hover:scale-110 transition-all" />
          </Link>
          <AppWindowControls showLabels={false} compact />
        </div>
      </header>

      {/* Main Center Message */}
      <div className="flex flex-col items-center justify-center text-center my-auto px-6 md:px-10 py-12">
        <div className="max-w-2xl w-full p-8 sm:p-12 rounded-2xl border border-white/15 bg-black/40 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.6)] flex flex-col items-center gap-4">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-sans font-extrabold uppercase tracking-wider text-[#C8FF08]">
            R&D Advanced Controls
          </h2>
          <p className="text-[#C7DBDB] max-w-lg text-center font-sans text-sm sm:text-base leading-relaxed">
            Exploring next-generation grid-forming converter architectures, multi-vendor interoperability, and real-time co-simulation models for high-IBR penetration networks.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C8FF08]/50 bg-[#004745]/60 px-5 py-2 text-xs font-sans font-bold uppercase tracking-wider text-[#C8FF08] mt-2">
            <span>Prototype Phase Active</span>
          </div>
        </div>
      </div>

      {/* Footer - GE Brand Guidelines compliant in Inter font (20px box, centered horizontally & vertically) */}
      <footer className="ge-brand-footer">
        <span>
          © 2026 GE Vernova and/or its affiliates. All rights reserved.
        </span>
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/rd")({
  component: RdPage,
});
