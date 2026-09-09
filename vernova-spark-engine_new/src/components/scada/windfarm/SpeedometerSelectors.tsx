import React, { useEffect, useState, useRef, useId } from "react";
import { cn } from "@/lib/utils";

// Helper arc calculation
function arcPath(start: number, end: number, r: number) {
  const safeEnd = Math.max(start + 0.1, end);
  const startRad = ((start - 90) * Math.PI) / 180;
  const endRad = ((safeEnd - 90) * Math.PI) / 180;
  const x1 = 50 + r * Math.cos(startRad);
  const y1 = 50 + r * Math.sin(startRad);
  const x2 = 50 + r * Math.cos(endRad);
  const y2 = 50 + r * Math.sin(endRad);
  const largeArc = safeEnd - start > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

// ---------------------------------------------------------
// 1. SCR SPEEDOMETER SELECTOR (Continuous 1 - 20)
// ---------------------------------------------------------
interface ScrSpeedometerSelectorProps {
  value: number;
  onChange: (v: number) => void;
  active?: boolean;
}

export function ScrSpeedometerSelector({
  value,
  onChange,
  active = false,
}: ScrSpeedometerSelectorProps) {
  const [animatedValue, setAnimatedValue] = useState(value);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDragging = useRef(false);
  const uid = useId().replace(/:/g, "");

  const min = 1;
  const max = 20;
  const presets = [20, 1.6, 1] as const;

  // Smooth needle interpolation
  useEffect(() => {
    let startTime: number | null = null;
    const startVal = animatedValue;
    const targetVal = value;
    const duration = 400;

    if (Math.abs(startVal - targetVal) < 0.01) {
      setAnimatedValue(targetVal);
      return;
    }

    let frameId: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (targetVal - startVal) * easeOut;
      setAnimatedValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  // Convert SVG coordinates to SCR value
  const updateFromCoords = (clientX: number, clientY: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + (rect.height * 50) / 88; // SVG center Y (50/88)
    const dx = clientX - cx;
    const dy = clientY - cy;

    // Angle in degrees from top (0deg at 12 o'clock, clockwise)
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;

    // Convert 0..360 to gauge angle -135..135
    let gaugeAngle = deg;
    if (deg > 180) gaugeAngle = deg - 360;

    // Clamp to gauge arc range [-135, 135]
    const clampedAngle = Math.max(-135, Math.min(135, gaugeAngle));
    const pct = (clampedAngle + 135) / 270;
    const rawVal = min + pct * (max - min);
    const snapped = Math.round(rawVal * 10) / 10;
    onChange(Math.max(min, Math.min(max, snapped)));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromCoords(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updateFromCoords(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging.current) {
      isDragging.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore fallback
      }
    }
  };

  const percentage = Math.min(Math.max((animatedValue - min) / (max - min), 0), 1);
  const angle = -135 + percentage * 270;

  // Major ticks
  const tickValues = [1, 5, 10, 15, 20];
  const ticks = tickValues.map((v) => {
    const p = (v - min) / (max - min);
    const deg = -135 + p * 270;
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      val: v,
      deg,
      x1: 50 + 42 * Math.cos(rad),
      y1: 50 + 42 * Math.sin(rad),
      x2: 50 + 34 * Math.cos(rad),
      y2: 50 + 34 * Math.sin(rad),
      lx: 50 + 26 * Math.cos(rad),
      ly: 50 + 26 * Math.sin(rad),
    };
  });

  return (
    <div className="flex flex-col items-center select-none">
      {/* 3D Gauge Container */}
      <div
        className={cn(
          "relative w-[140px] h-[112px] sm:w-[150px] sm:h-[120px] rounded-[1.25rem] p-[3px] transition-all duration-300",
          "bg-gradient-to-b from-white/25 via-white/5 to-black/50",
          "shadow-[0_8px_18px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.12)]",
          active && "ring-1 ring-lime/50 shadow-[0_0_15px_rgba(200,255,8,0.25)]"
        )}
      >
        <div
          className="relative w-full h-full rounded-[1.05rem] overflow-hidden cursor-pointer touch-none
            bg-[radial-gradient(ellipse_at_50%_35%,rgba(40,70,70,0.95)_0%,rgba(8,22,22,0.98)_70%)]
            border border-white/10
            shadow-[inset_0_2px_6px_rgba(255,255,255,0.08),inset_0_-8px_16px_rgba(0,0,0,0.55)]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Click or drag around dial to change SCR"
        >
          {/* top specular highlight */}
          <div className="pointer-events-none absolute inset-x-2 top-1 h-6 rounded-full bg-gradient-to-b from-white/15 to-transparent opacity-70" />

          <svg ref={svgRef} viewBox="0 0 100 88" className="w-full h-full relative z-[1]">
            <defs>
              <linearGradient id={`rim-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
                <stop offset="45%" stopColor="rgba(160,180,180,0.25)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
              </linearGradient>
              <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="1.4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id={`hub-${uid}`} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#f4ffe0" />
                <stop offset="45%" stopColor="#C8FF08" />
                <stop offset="100%" stopColor="#3d4a00" />
              </radialGradient>
            </defs>

            {/* Bezel Ring */}
            <circle cx="50" cy="50" r="46" fill="none" stroke={`url(#rim-${uid})`} strokeWidth="3.5" />
            <circle cx="50" cy="50" r="43.5" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1" />

            {/* Arc Track Background */}
            <path
              d={arcPath(-135, 135, 38)}
              fill="none"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d={arcPath(-135, 135, 38)}
              fill="none"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Active Arc Fill */}
            {percentage > 0 && (
              <path
                d={arcPath(-135, angle, 38)}
                fill="none"
                stroke="#C8FF08"
                strokeWidth="5"
                strokeLinecap="round"
                filter={`url(#glow-${uid})`}
                opacity={0.95}
              />
            )}

            {/* Ticks & Labels */}
            {ticks.map((t) => (
              <g key={t.val}>
                <line
                  x1={t.x1}
                  y1={t.y1}
                  x2={t.x2}
                  y2={t.y2}
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                <text
                  x={t.lx}
                  y={t.ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="5"
                  fill="rgba(255,255,255,0.6)"
                  fontWeight="600"
                >
                  {t.val}
                </text>
              </g>
            ))}

            {/* Needle */}
            <g transform={`rotate(${angle} 50 50)`}>
              <polygon
                points="48.5,50 51.5,50 50,14"
                fill={`url(#hub-${uid})`}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="0.4"
              />
              <circle cx="50" cy="50" r="5" fill={`url(#hub-${uid})`} stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />
              <circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.85)" />
            </g>

            {/* Digital Readout Plate */}
            <rect
              x="28"
              y="63"
              width="44"
              height="14"
              rx="3"
              fill="rgba(0,0,0,0.65)"
              stroke="rgba(200,255,8,0.3)"
              strokeWidth="0.8"
            />
            <text
              x="50"
              y="73"
              textAnchor="middle"
              fontSize="7.5"
              fontFamily="'GE Inter', 'Inter', sans-serif"
              fontWeight="700"
              fill="#C8FF08"
            >
              {animatedValue.toFixed(1)}
            </text>
          </svg>
        </div>
      </div>

      {/* Preset Quick Buttons */}
      <div className="mt-1.5 flex gap-1 justify-center">
        {presets.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-semibold border transition-all cursor-pointer",
              value === v
                ? "bg-[#8ec4dc] text-[#0a2a2a] border-[#a8d4e8] shadow-[0_0_8px_rgba(142,196,220,0.4)]"
                : "border-white/25 text-white/75 hover:border-white/50 hover:bg-white/10"
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 2. FAULT SPEEDOMETER SELECTOR (3 Discrete positions)
// ---------------------------------------------------------
interface FaultSpeedometerSelectorProps {
  value: "abc" | "slg" | "ll";
  onChange: (fault: "abc" | "slg" | "ll") => void;
  active?: boolean;
}

const FAULT_OPTIONS = [
  { id: "abc", label: "Three phase", short: "3-PHASE", angle: -90 },
  { id: "slg", label: "SLG", short: "SLG", angle: 0 },
  { id: "ll", label: "LL", short: "LL", angle: 90 },
] as const;

export function FaultSpeedometerSelector({
  value,
  onChange,
  active = false,
}: FaultSpeedometerSelectorProps) {
  const uid = useId().replace(/:/g, "");
  const selectedMeta = FAULT_OPTIONS.find((f) => f.id === value) ?? FAULT_OPTIONS[1];
  const targetAngle = selectedMeta.angle;

  const [animatedAngle, setAnimatedAngle] = useState<number>(targetAngle);

  useEffect(() => {
    let startTime: number | null = null;
    const startVal = animatedAngle;
    const duration = 350;

    let frameId: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedAngle(startVal + (targetAngle - startVal) * easeOut);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [targetAngle]);

  return (
    <div className="flex flex-col items-center select-none">
      {/* 3D Gauge Container */}
      <div
        className={cn(
          "relative w-[140px] h-[112px] sm:w-[150px] sm:h-[120px] rounded-[1.25rem] p-[3px] transition-all duration-300",
          "bg-gradient-to-b from-white/25 via-white/5 to-black/50",
          "shadow-[0_8px_18px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.12)]",
          active && "ring-1 ring-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.3)]"
        )}
      >
        <div
          className="relative w-full h-full rounded-[1.05rem] overflow-hidden
            bg-[radial-gradient(ellipse_at_50%_35%,rgba(55,45,25,0.95)_0%,rgba(22,18,8,0.98)_70%)]
            border border-white/10
            shadow-[inset_0_2px_6px_rgba(255,255,255,0.08),inset_0_-8px_16px_rgba(0,0,0,0.55)]"
        >
          {/* top specular highlight */}
          <div className="pointer-events-none absolute inset-x-2 top-1 h-6 rounded-full bg-gradient-to-b from-white/15 to-transparent opacity-70" />

          <svg viewBox="0 0 100 88" className="w-full h-full relative z-[1]">
            <defs>
              <linearGradient id={`rim-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
                <stop offset="45%" stopColor="rgba(200,180,140,0.25)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
              </linearGradient>
              <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="1.4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id={`hub-${uid}`} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fffae0" />
                <stop offset="45%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#451a03" />
              </radialGradient>
            </defs>

            {/* Bezel Ring */}
            <circle cx="50" cy="50" r="46" fill="none" stroke={`url(#rim-${uid})`} strokeWidth="3.5" />
            <circle cx="50" cy="50" r="43.5" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1" />

            {/* Track Background */}
            <path
              d={arcPath(-100, 100, 38)}
              fill="none"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d={arcPath(-100, 100, 38)}
              fill="none"
              stroke="rgba(255, 255, 255, 0.18)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Active Fault Arc Fill */}
            <path
              d={arcPath(-100, Math.max(-99.9, animatedAngle), 38)}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="5"
              strokeLinecap="round"
              filter={`url(#glow-${uid})`}
              opacity={0.95}
            />

            {/* Clickable Tick Points & Labels */}
            {FAULT_OPTIONS.map((f) => {
              const rad = ((f.angle - 90) * Math.PI) / 180;
              const x1 = 50 + 42 * Math.cos(rad);
              const y1 = 50 + 42 * Math.sin(rad);
              const x2 = 50 + 34 * Math.cos(rad);
              const y2 = 50 + 34 * Math.sin(rad);
              const lx = 50 + 24 * Math.cos(rad);
              const ly = 50 + 24 * Math.sin(rad);
              const isSelected = value === f.id;

              return (
                <g
                  key={f.id}
                  onClick={() => onChange(f.id)}
                  className="cursor-pointer group"
                >
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isSelected ? "#fbbf24" : "rgba(255,255,255,0.6)"}
                    strokeWidth={isSelected ? "2" : "1.2"}
                    strokeLinecap="round"
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="4.8"
                    fontWeight="700"
                    fill={isSelected ? "#fbbf24" : "rgba(255,255,255,0.7)"}
                    className="transition-colors group-hover:fill-amber-300"
                  >
                    {f.short}
                  </text>
                </g>
              );
            })}

            {/* Needle */}
            <g transform={`rotate(${animatedAngle} 50 50)`}>
              <polygon
                points="48.5,50 51.5,50 50,14"
                fill={`url(#hub-${uid})`}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="0.4"
              />
              <circle cx="50" cy="50" r="5" fill={`url(#hub-${uid})`} stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />
              <circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.85)" />
            </g>

            {/* Digital Readout Plate */}
            <rect
              x="22"
              y="63"
              width="56"
              height="14"
              rx="3"
              fill="rgba(0,0,0,0.65)"
              stroke="rgba(251,191,36,0.4)"
              strokeWidth="0.8"
            />
            <text
              x="50"
              y="73"
              textAnchor="middle"
              fontSize="6.5"
              fontFamily="'GE Inter', 'Inter', sans-serif"
              fontWeight="700"
              fill="#fbbf24"
            >
              {selectedMeta.label.toUpperCase()}
            </text>
          </svg>
        </div>
      </div>

      {/* Option Selection Buttons */}
      <div className="mt-1.5 flex gap-1 justify-center max-w-[150px] flex-wrap">
        {FAULT_OPTIONS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-semibold border transition-all cursor-pointer",
              value === f.id
                ? "bg-amber-400 text-[#1a1a00] border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                : "border-white/25 text-white/75 hover:border-white/50 hover:bg-white/10"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 3. LOAD SPEEDOMETER SELECTOR (3 Discrete positions)
// ---------------------------------------------------------
interface LoadSpeedometerSelectorProps {
  value: "1 pu" | "0.8 pu" | "0.5 pu";
  onChange: (load: "1 pu" | "0.8 pu" | "0.5 pu") => void;
  active?: boolean;
}

const LOAD_OPTIONS = [
  { id: "0.5 pu", label: "0.5 pu", short: "0.5", angle: -90 },
  { id: "0.8 pu", label: "0.8 pu", short: "0.8", angle: 0 },
  { id: "1 pu", label: "1.0 pu", short: "1.0", angle: 90 },
] as const;

export function LoadSpeedometerSelector({
  value,
  onChange,
  active = false,
}: LoadSpeedometerSelectorProps) {
  const uid = useId().replace(/:/g, "");
  const selectedMeta = LOAD_OPTIONS.find((l) => l.id === value) ?? LOAD_OPTIONS[2];
  const targetAngle = selectedMeta.angle;

  const [animatedAngle, setAnimatedAngle] = useState<number>(targetAngle);

  useEffect(() => {
    let startTime: number | null = null;
    const startVal = animatedAngle;
    const duration = 350;

    let frameId: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedAngle(startVal + (targetAngle - startVal) * easeOut);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [targetAngle]);

  return (
    <div className="flex flex-col items-center select-none">
      {/* 3D Gauge Container */}
      <div
        className={cn(
          "relative w-[140px] h-[112px] sm:w-[150px] sm:h-[120px] rounded-[1.25rem] p-[3px] transition-all duration-300",
          "bg-gradient-to-b from-white/25 via-white/5 to-black/50",
          "shadow-[0_8px_18px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.12)]",
          active && "ring-1 ring-[#8ec4dc]/60 shadow-[0_0_15px_rgba(142,196,220,0.3)]"
        )}
      >
        <div
          className="relative w-full h-full rounded-[1.05rem] overflow-hidden
            bg-[radial-gradient(ellipse_at_50%_35%,rgba(25,50,60,0.95)_0%,rgba(8,20,28,0.98)_70%)]
            border border-white/10
            shadow-[inset_0_2px_6px_rgba(255,255,255,0.08),inset_0_-8px_16px_rgba(0,0,0,0.55)]"
        >
          {/* top specular highlight */}
          <div className="pointer-events-none absolute inset-x-2 top-1 h-6 rounded-full bg-gradient-to-b from-white/15 to-transparent opacity-70" />

          <svg viewBox="0 0 100 88" className="w-full h-full relative z-[1]">
            <defs>
              <linearGradient id={`rim-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
                <stop offset="45%" stopColor="rgba(140,180,200,0.25)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
              </linearGradient>
              <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="1.4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id={`hub-${uid}`} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#e0f7ff" />
                <stop offset="45%" stopColor="#8ec4dc" />
                <stop offset="100%" stopColor="#0f384a" />
              </radialGradient>
            </defs>

            {/* Bezel Ring */}
            <circle cx="50" cy="50" r="46" fill="none" stroke={`url(#rim-${uid})`} strokeWidth="3.5" />
            <circle cx="50" cy="50" r="43.5" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1" />

            {/* Track Background */}
            <path
              d={arcPath(-100, 100, 38)}
              fill="none"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d={arcPath(-100, 100, 38)}
              fill="none"
              stroke="rgba(255, 255, 255, 0.18)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Active Load Arc Fill */}
            <path
              d={arcPath(-100, Math.max(-99.9, animatedAngle), 38)}
              fill="none"
              stroke="#8ec4dc"
              strokeWidth="5"
              strokeLinecap="round"
              filter={`url(#glow-${uid})`}
              opacity={0.95}
            />

            {/* Clickable Ticks & Labels */}
            {LOAD_OPTIONS.map((l) => {
              const rad = ((l.angle - 90) * Math.PI) / 180;
              const x1 = 50 + 42 * Math.cos(rad);
              const y1 = 50 + 42 * Math.sin(rad);
              const x2 = 50 + 34 * Math.cos(rad);
              const y2 = 50 + 34 * Math.sin(rad);
              const lx = 50 + 24 * Math.cos(rad);
              const ly = 50 + 24 * Math.sin(rad);
              const isSelected = value === l.id;

              return (
                <g
                  key={l.id}
                  onClick={() => onChange(l.id)}
                  className="cursor-pointer group"
                >
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isSelected ? "#8ec4dc" : "rgba(255,255,255,0.6)"}
                    strokeWidth={isSelected ? "2" : "1.2"}
                    strokeLinecap="round"
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="5"
                    fontWeight="700"
                    fill={isSelected ? "#8ec4dc" : "rgba(255,255,255,0.7)"}
                    className="transition-colors group-hover:fill-cyan-200"
                  >
                    {l.short}
                  </text>
                </g>
              );
            })}

            {/* Needle */}
            <g transform={`rotate(${animatedAngle} 50 50)`}>
              <polygon
                points="48.5,50 51.5,50 50,14"
                fill={`url(#hub-${uid})`}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="0.4"
              />
              <circle cx="50" cy="50" r="5" fill={`url(#hub-${uid})`} stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />
              <circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.85)" />
            </g>

            {/* Digital Readout Plate */}
            <rect
              x="28"
              y="63"
              width="44"
              height="14"
              rx="3"
              fill="rgba(0,0,0,0.65)"
              stroke="rgba(142,196,220,0.4)"
              strokeWidth="0.8"
            />
            <text
              x="50"
              y="73"
              textAnchor="middle"
              fontSize="7"
              fontFamily="'GE Inter', 'Inter', sans-serif"
              fontWeight="700"
              fill="#8ec4dc"
            >
              {selectedMeta.label.toUpperCase()}
            </text>
          </svg>
        </div>
      </div>

      {/* Option Selection Buttons */}
      <div className="mt-1.5 flex gap-1 justify-center">
        {LOAD_OPTIONS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onChange(l.id)}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-semibold border transition-all cursor-pointer",
              value === l.id
                ? "bg-[#8ec4dc] text-[#0a2a2a] border-[#a8d4e8] shadow-[0_0_8px_rgba(142,196,220,0.5)]"
                : "border-white/25 text-white/75 hover:border-white/50 hover:bg-white/10"
            )}
          >
            {l.id}
          </button>
        ))}
      </div>
    </div>
  );
}
