import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { Canvas3DErrorBoundary } from "./Canvas3DErrorBoundary";
import { AppWindowControls, requestAppFullscreen } from "./AppWindowControls";
import { Home } from "lucide-react";

const SynconModelViewer = lazy(() =>
  import("./SynconModelViewer").then((m) => ({ default: m.SynconModelViewer })),
);

const WindTurbineFieldModelViewer = lazy(() =>
  import("./WindTurbineFieldModelViewer").then((m) => ({
    default: m.WindTurbineFieldModelViewer,
  })),
);

const RotatingGlbViewer = lazy(() =>
  import("./RotatingGlbViewer").then((m) => ({ default: m.RotatingGlbViewer })),
);

const StatcomFlythroughViewer = lazy(() =>
  import("./StatcomFlythroughViewer").then((m) => ({
    default: m.StatcomFlythroughViewer,
  })),
);

/** Original valve-enclosure model for the Stability characterization carousel. */
const STATCOM_STABILITY_MODEL_URL = "/models/gfme/g2x2.gltf";
const BESS_MODEL_URL = "/models/Bess.c.glb";
const SYNCON_MODEL_URL =
  "/models/Meshy_AI_Industrial_Processing_0807154644_texture.glb";

/** Stability pane: STATCOM → BESS → Syncon rotating models (centrally aligned). */
const STABILITY_MODEL_SLIDES = [
  {
    id: "statcom",
    label: "STATCOM",
    src: STATCOM_STABILITY_MODEL_URL,
    lookDownDeg: 26,
    modelY: 0,
    lookAtY: 0,
    cameraDistance: 3.2,
    fitSize: 1.45,
  },
  {
    id: "bess",
    label: "BESS",
    src: BESS_MODEL_URL,
    lookDownDeg: 22,
    modelY: 0,
    lookAtY: 0,
    cameraDistance: 3.1,
    fitSize: 1.5,
  },
  {
    id: "syncon",
    label: "Syncon",
    src: SYNCON_MODEL_URL,
    lookDownDeg: 22,
    modelY: 0,
    lookAtY: 0,
    cameraDistance: 3.1,
    fitSize: 1.5,
  },
] as const;

/** R&D Work original images (/models/RnD/womanRnD.png & manRnD.png). */
const RND_IMAGES = [
  {
    src: "/models/RnD/womanRnD.png",
    alt: "R&D Lab Research — Power Electronics",
  },
  {
    src: "/models/RnD/manRnD.png",
    alt: "R&D Lab Research — Grid Forming Simulator",
  },
] as const;

function ModelStageFallback() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime/30 border-t-lime" />
      <span className="font-sans text-[10px] uppercase tracking-wider text-lime/70 font-semibold">
        Loading 3D model…
      </span>
    </div>
  );
}

/** Cover-page product card with a single rotating GLB. */
function ProductModelCard({
  title,
  modelUrl,
  badgeTone = "default",
  borderHover = "hover:border-[#C8FF08]/50",
}: {
  title: string;
  modelUrl: string;
  badgeTone?: "default" | "lime";
  borderHover?: string;
}) {
  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#212121] p-4 sm:p-5 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.6)] group ${borderHover} transition-all gap-2.5 sm:gap-3`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Category Header Badge at top left */}
      <div className="flex items-center justify-start pb-0.5">
        <div
          className={`inline-flex items-center rounded-full px-3.5 py-0.5 text-xs font-sans font-bold uppercase tracking-wider ${
            badgeTone === "lime"
              ? "border border-[#C8FF08]/60 text-[#C8FF08] bg-[#C8FF08]/15 shadow-[0_0_12px_rgba(200,255,8,0.2)]"
              : "border border-white/35 text-white bg-black/60"
          }`}
        >
          <span className="leading-tight">{title}</span>
        </div>
      </div>

      <div className="relative h-[36vh] sm:h-[42vh] lg:h-[50vh] min-h-[260px] sm:min-h-[300px] lg:min-h-[340px] max-h-[580px] w-full overflow-hidden rounded-xl bg-[#181818] flex items-center justify-center border border-white/10">
        <Suspense fallback={<ModelStageFallback />}>
          <RotatingGlbViewer modelUrl={modelUrl} lookAtY={0} modelY={0} />
        </Suspense>
      </div>
    </div>
  );
}

/** STATCOM card: orbit once, fly into chambers, return, repeat. */
export function StatcomModelCard() {
  return (
    <div
      className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#212121] p-4 sm:p-5 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.6)] group hover:border-[#C8FF08]/50 transition-all gap-2.5 sm:gap-3"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Category Header Badge at top left */}
      <div className="flex items-center justify-start pb-0.5">
        <div className="inline-flex items-center rounded-full border border-white/35 bg-black/60 px-3.5 py-0.5 text-xs font-sans font-bold uppercase tracking-wider text-white">
          <span className="leading-tight">STATCOM</span>
        </div>
      </div>

      <div className="relative h-[36vh] sm:h-[42vh] lg:h-[50vh] min-h-[260px] sm:min-h-[300px] lg:min-h-[340px] max-h-[580px] w-full overflow-hidden rounded-xl bg-[#181818] flex items-center justify-center border border-white/10">
        <Suspense fallback={<ModelStageFallback />}>
          <StatcomFlythroughViewer cameraDistance={2.3} />
        </Suspense>
      </div>
    </div>
  );
}

/** Synchronous Condenser card: 3D model stage. */
export function SynconModelCard() {
  return (
    <div
      className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#212121] p-4 sm:p-5 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.6)] group hover:border-[#C8FF08]/50 transition-all gap-2.5 sm:gap-3"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Category Header Badge at top left */}
      <div className="flex items-center justify-start pb-0.5">
        <div className="inline-flex items-center rounded-full border border-white/35 bg-black/60 px-3.5 py-0.5 text-xs font-sans font-bold uppercase tracking-wider text-white">
          <span className="leading-tight">SYNCHRONOUS CONDENSER</span>
        </div>
      </div>

      <div className="relative h-[36vh] sm:h-[42vh] lg:h-[50vh] min-h-[260px] sm:min-h-[300px] lg:min-h-[340px] max-h-[580px] w-full overflow-hidden rounded-xl bg-[#181818] flex items-center justify-center border border-white/10">
        <Suspense fallback={<ModelStageFallback />}>
          <SynconModelViewer />
        </Suspense>
      </div>
    </div>
  );
}

export function ProductMediaShowcase() {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatcomModelCard />
      <SynconModelCard />
      <ProductModelCard
        title="BESS"
        modelUrl={BESS_MODEL_URL}
        badgeTone="default"
        borderHover="hover:border-[#C8FF08]/50"
      />
    </div>
  );
}


/** Column 1: Stability card with STATCOM / BESS / Syncon models (centrally aligned 3D) and mode tabs. */
export function StabilityModelsUseCaseCard({
  buttonLabel,
  targetUrl,
}: {
  buttonLabel: string;
  targetUrl: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % STABILITY_MODEL_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = STABILITY_MODEL_SLIDES[activeIdx % STABILITY_MODEL_SLIDES.length];

  return (
    <div className="flex flex-col gap-3 sm:gap-4 w-full">
      <div
        className="relative h-[36vh] sm:h-[42vh] lg:h-[50vh] min-h-[260px] sm:min-h-[300px] lg:min-h-[340px] max-h-[580px] w-full flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-black/80 shadow-[0_0_35px_rgba(0,0,0,0.7)] p-2"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Centered 3D Viewport — clean without extra top badge */}
        <div className="relative flex-1 w-full overflow-hidden rounded-xl bg-black/90 flex items-center justify-center">
          <Canvas3DErrorBoundary fallback={<ModelStageFallback />}>
            <Suspense fallback={<ModelStageFallback />}>
              <RotatingGlbViewer
                key={slide.id}
                modelUrl={slide.src}
                cameraDistance={slide.cameraDistance ?? 3.1}
                lookDownDeg={slide.lookDownDeg ?? 22}
                lookAtY={0}
                modelY={0}
                fitSize={slide.fitSize ?? 1.5}
              />
            </Suspense>
          </Canvas3DErrorBoundary>
        </div>

        {/* Tab selector buttons - Inter font with Urgency Green active state */}
        <div className="flex items-center justify-center gap-2 pt-2 z-20 shrink-0 min-h-[36px]">
          {STABILITY_MODEL_SLIDES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx(idx);
              }}
              className={`px-3.5 py-1 rounded-full font-sans text-xs uppercase font-bold tracking-wider transition-all active:scale-95 cursor-pointer ${
                activeIdx === idx
                  ? "bg-[#C8FF08] text-black shadow-[0_0_12px_rgba(200,255,8,0.85)]"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Link
        to={targetUrl}
        className="w-full py-3.5 sm:py-4 px-2 sm:px-4 rounded-xl sm:rounded-2xl bg-[#C8FF08] text-black font-sans font-extrabold uppercase tracking-wide text-xs sm:text-sm md:text-base text-center hover:bg-[#bbf000] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(200,255,8,0.35)] flex items-center justify-center min-h-[50px] whitespace-nowrap"
      >
        {buttonLabel}
      </Link>
    </div>
  );
}

/** Column 2: IBR Farm Stabilization card — alternating 3D models (Wind Turbine Field & STATCOM) one by one. */
export function WindFarmModelUseCaseCard({
  buttonLabel,
  targetUrl,
}: {
  buttonLabel: string;
  targetUrl: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % 2);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-3 sm:gap-4 w-full">
      <div
        className="relative h-[36vh] sm:h-[42vh] lg:h-[50vh] min-h-[260px] sm:min-h-[300px] lg:min-h-[340px] max-h-[580px] w-full flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-black/80 shadow-[0_0_35px_rgba(0,0,0,0.7)] p-2"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Full-size 3D Stage cycling one by one */}
        <div className="relative flex-1 w-full overflow-hidden rounded-xl bg-black/90 flex items-center justify-center">
          <Canvas3DErrorBoundary fallback={<ModelStageFallback />}>
            <Suspense fallback={<ModelStageFallback />}>
              {activeIdx === 0 ? (
                <WindTurbineFieldModelViewer />
              ) : (
                <StatcomFlythroughViewer cameraDistance={1.8} />
              )}
            </Suspense>
          </Canvas3DErrorBoundary>
        </div>
      </div>

      <Link
        to={targetUrl}
        className="w-full py-3.5 sm:py-4 px-2 sm:px-4 rounded-xl sm:rounded-2xl bg-[#C8FF08] text-black font-sans font-extrabold uppercase tracking-wide text-xs sm:text-sm md:text-base text-center hover:bg-[#bbf000] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(200,255,8,0.35)] flex items-center justify-center min-h-[50px] whitespace-nowrap"
      >
        {buttonLabel}
      </Link>
    </div>
  );
}

/** Column 3: R&D Work card — displays the full-size R&D lab research images matching full box dimensions in a smooth loop. */
export function RnDMixedMediaUseCaseCard({
  buttonLabel,
  targetUrl,
}: {
  buttonLabel: string;
  targetUrl: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % RND_IMAGES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const currentImg = RND_IMAGES[activeIdx];

  return (
    <div className="flex flex-col gap-3 sm:gap-4 w-full">
      <div
        className="relative h-[36vh] sm:h-[42vh] lg:h-[50vh] min-h-[260px] sm:min-h-[300px] lg:min-h-[340px] max-h-[580px] w-full flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-black/80 shadow-[0_0_35px_rgba(0,0,0,0.7)] p-2"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Full-size R&D image filling the entire inner stage with no letterbox borders and smooth transitions */}
        <div className="relative flex-1 w-full overflow-hidden rounded-xl bg-black/90 flex items-center justify-center">
          <img
            key={currentImg.src}
            src={currentImg.src}
            alt={currentImg.alt}
            className="w-full h-full object-cover object-center select-none animate-in fade-in duration-700"
          />
        </div>
      </div>

      <Link
        to={targetUrl}
        className="w-full py-3.5 sm:py-4 px-2 sm:px-4 rounded-xl sm:rounded-2xl bg-[#C8FF08] text-black font-sans font-extrabold uppercase tracking-wide text-xs sm:text-sm md:text-base text-center hover:bg-[#bbf000] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(200,255,8,0.35)] flex items-center justify-center min-h-[50px] whitespace-nowrap"
      >
        {buttonLabel}
      </Link>
    </div>
  );
}

export function HomePage() {
  const [showLanding, setShowLanding] = useState(true);
  const [theme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  if (showLanding) {
    return (
      <main
        className="relative flex min-h-screen w-full flex-col justify-between bg-[#212121] bg-[radial-gradient(ellipse_at_top,#004745_0%,#002b2a_40%,#212121_100%)] text-white cursor-pointer select-none overflow-x-hidden font-sans animate-in fade-in duration-300"
        onClick={() => {
          requestAppFullscreen();
          setShowLanding(false);
        }}
        title="Click anywhere to enter FLEXIQsim Platform"
      >
        {/* Top Header Logo & Controls — aligned left with first card and right with third card */}
        <header className="relative z-20 w-full shrink-0 pt-4 sm:pt-6 pb-2">
          <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 sm:px-8 lg:px-10">
            <div className="flex items-center -ml-2.5 sm:-ml-3">
              <img
                src="/logos/ge_vernova_white.svg"
                alt="GE Vernova"
                className="h-12 sm:h-14 md:h-16 lg:h-[68px] w-auto max-w-[260px] sm:max-w-[300px] object-contain object-left"
              />
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <AppWindowControls showLabels={false} compact />
            </div>
          </div>
        </header>

        {/* Centered Main Showcase Container — slimmed to 1440px to align with header */}
        <div className="relative z-10 my-auto w-full max-w-[1440px] mx-auto flex flex-col gap-3 sm:gap-4 py-1 flex-1 justify-center px-6 sm:px-8 lg:px-10">
          {/* 2-Line Compact Headline Text in Inter font with increased size */}
          <div className="w-full text-center flex flex-col items-center gap-2 shrink-0 px-2 -translate-y-[3px]">
            <h1 className="font-sans text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold normal-case tracking-wider text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] leading-none">
              FLEXIQsim
            </h1>
            <p className="text-sm sm:text-base md:text-[1.125rem] text-[#C7DBDB] font-sans font-medium leading-relaxed max-w-6xl mx-auto">
              With inverter-based generation reshaping every grid on earth, the ability to rapidly evaluate stability risks and prototype mitigation solutions is no longer a technical nicety — it is the defining operational imperative of the energy transition
            </p>
          </div>

          {/* 3 Separate Cards Side-by-Side (STATCOM, Synchronous Condenser, BESS) */}
          <div className="w-full">
            <ProductMediaShowcase />
          </div>
        </div>

        {/* Click prompt hint at bottom — moved up */}
        <div className="relative z-20 flex justify-center shrink-0 -translate-y-[9px] pb-2">
          <div className="flex items-center gap-2 rounded-full border border-lime/60 bg-[#004745]/85 hover:bg-[#004745] px-6 py-2 backdrop-blur-md text-xs sm:text-sm font-sans font-bold uppercase tracking-wider text-lime transition-all shadow-[0_0_24px_rgba(200,255,8,0.25)]">
            <span>Click anywhere to enter</span>
          </div>
        </div>

        {/* Footer Copyright - GE Brand Guidelines compliant in Inter font (20px box, centered horizontally & vertically) */}
        <footer className="ge-brand-footer">
          <span>
            © 2026 GE Vernova and/or its affiliates. All rights reserved.
          </span>
        </footer>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-y-auto bg-[#212121] bg-[radial-gradient(ellipse_at_top,#004745_0%,#002b2a_40%,#212121_100%)] text-foreground custom-scrollbar font-sans">
      {/* Navigation Header — aligned left with first card and right with third card */}
      <header className="home-stagger-1 relative z-20 w-full shrink-0 bg-transparent border-0 pt-4 sm:pt-6 pb-2">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 sm:px-8 lg:px-10">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setShowLanding(true)}
              title="Return to Cover Page"
              className="hover:opacity-80 transition-opacity p-0 border-0 bg-transparent flex items-center cursor-pointer -ml-2.5 sm:-ml-3"
            >
              <img 
                src="/logos/ge_vernova_white.svg" 
                alt="GE Vernova" 
                className="h-12 sm:h-14 md:h-16 lg:h-[68px] w-auto max-w-[260px] sm:max-w-[300px] object-contain object-left" 
              />
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowLanding(true)}
              className="h-9 w-9 min-w-[36px] min-h-[36px] p-0 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 text-white transition-all shadow-sm group cursor-pointer shrink-0"
              title="Return to Cover Page"
              aria-label="Home"
            >
              <Home className="w-4 h-4 shrink-0 text-white group-hover:text-[#C8FF08] group-hover:scale-110 transition-all" />
            </button>
            <div onClick={(e) => e.stopPropagation()}>
              <AppWindowControls showLabels={false} compact />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container: Clean 3-Column Grid with slimmed max-w matching Header */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-center gap-6 px-6 sm:px-8 lg:px-10 my-auto">
        <div className="grid gap-6 md:grid-cols-3 items-center w-full">
          
          {/* Column 1: Stability — STATCOM / BESS / Syncon rotating models (centrally aligned) */}
          <StabilityModelsUseCaseCard
            buttonLabel="STABILITY CHARACTERIZATION"
            targetUrl="/stability"
          />

          {/* Column 2: IBR Farm Stabilization — only 3D models (Wind Turbine Field & STATCOM), scrolling one by one full size */}
          <WindFarmModelUseCaseCard
            buttonLabel="IBR FARM STABILIZATION"
            targetUrl="/windfarmstability"
          />

          {/* Column 3: R&D Work — only original R&D images (womanRnD & manRnD), scrolling one by one full size */}
          <RnDMixedMediaUseCaseCard
            buttonLabel="R&D WORK"
            targetUrl="/rd"
          />

        </div>
      </div>

      {/* Footer - GE Brand Guidelines compliant in Inter font (20px box, centered horizontally & vertically) */}
      <footer className="ge-brand-footer home-stagger-5">
        <span>
          © 2026 GE Vernova and/or its affiliates. All rights reserved.
        </span>
      </footer>
    </main>
  );
}
