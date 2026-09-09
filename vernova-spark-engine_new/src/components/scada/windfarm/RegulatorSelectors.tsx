import React, { useEffect, useState, useRef, useId } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------
// 1. SCR ROTARY REGULATOR SELECTOR (Continuous 1.0 - 20.0)
// ---------------------------------------------------------
interface ScrRegulatorSelectorProps {
  value: number;
  onChange: (v: number) => void;
  active?: boolean;
  compact?: boolean;
}

export function ScrRegulatorSelector({
  value,
  onChange,
  active = false,
  compact = false,
}: ScrRegulatorSelectorProps) {
  const [animatedValue, setAnimatedValue] = useState<number>(value);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDragging = useRef(false);
  const uid = useId().replace(/:/g, "");

  const min = 1;
  const max = 20;
  const presets = [20, 1.6, 1] as const;

  // Smooth value interpolation
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
    const cy = rect.top + rect.height / 2;
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
        // ignore
      }
    }
  };

  const percentage = Math.min(Math.max((animatedValue - min) / (max - min), 0), 1);
  const angle = -135 + percentage * 270;

  // Ticks around regulator ring
  const tickValues = [1, 5, 10, 15, 20];
  const ticks = tickValues.map((v) => {
    const p = (v - min) / (max - min);
    const deg = -135 + p * 270;
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      val: v,
      deg,
      x1: 50 + 44 * Math.cos(rad),
      y1: 50 + 44 * Math.sin(rad),
      x2: 50 + 38 * Math.cos(rad),
      y2: 50 + 38 * Math.sin(rad),
      lx: 50 + 31 * Math.cos(rad),
      ly: 50 + 31 * Math.sin(rad),
    };
  });

  return (
    <div className="flex flex-col items-center select-none">
      {compact && (
        <div className="text-[8px] sm:text-[9px] font-bold text-lime tracking-wider uppercase mb-0.5 drop-shadow-[0_0_4px_rgba(200,255,8,0.5)]">
          SCR
        </div>
      )}
      {/* 3D Industrial Regulator Base Plate */}
      <div
        className={cn(
          "relative rounded-full transition-all duration-300 p-[3px]",
          "bg-gradient-to-b from-white/30 via-white/10 to-black/70",
          "shadow-[0_8px_18px_rgba(0,0,0,0.6),0_2px_0_rgba(255,255,255,0.15)]",
          compact
            ? "w-[56px] h-[56px] sm:w-[66px] sm:h-[66px] p-[2px]"
            : "w-[130px] h-[130px] sm:w-[140px] sm:h-[140px] p-[4px]",
          active && "ring-2 ring-lime/60 shadow-[0_0_20px_rgba(200,255,8,0.35)]"
        )}
      >
        <div
          className="relative w-full h-full rounded-full overflow-hidden cursor-pointer touch-none
            bg-[radial-gradient(circle_at_50%_35%,rgba(35,55,55,0.98)_0%,rgba(10,24,24,0.99)_75%)]
            border border-white/15
            shadow-[inset_0_3px_8px_rgba(255,255,255,0.12),inset_0_-8px_20px_rgba(0,0,0,0.75)]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Turn regulator knob to change SCR"
        >
          {/* Specular glass reflection top curve */}
          <div className="pointer-events-none absolute inset-x-2 top-0.5 h-6 rounded-full bg-gradient-to-b from-white/20 to-transparent opacity-75" />

          <svg ref={svgRef} viewBox="0 0 100 100" className="w-full h-full relative z-[1]">
            <defs>
              <linearGradient id={`knob-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4a5a5a" />
                <stop offset="50%" stopColor="#223030" />
                <stop offset="100%" stopColor="#101818" />
              </linearGradient>
              <linearGradient id={`rim-grad-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                <stop offset="50%" stopColor="rgba(120,140,140,0.3)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.7)" />
              </linearGradient>
              <radialGradient id={`cap-${uid}`} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#2e3e3e" />
                <stop offset="70%" stopColor="#141f1f" />
                <stop offset="100%" stopColor="#0a1010" />
              </radialGradient>
              <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="1.5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Outer Knurled / Ribbed Regulator Rim */}
            <circle cx="50" cy="50" r="47" fill="none" stroke={`url(#rim-grad-${uid})`} strokeWidth="3" />

            {/* Ticks and Values around Dial Ring */}
            {ticks.map((t) => (
              <g key={t.val}>
                <line
                  x1={t.x1}
                  y1={t.y1}
                  x2={t.x2}
                  y2={t.y2}
                  stroke="rgba(255,255,255,0.75)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                {!compact && (
                  <text
                    x={t.lx}
                    y={t.ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="5"
                    fontWeight="700"
                    fill="rgba(255,255,255,0.65)"
                  >
                    {t.val}
                  </text>
                )}
              </g>
            ))}

            {/* Central Rotary Knob Body */}
            <circle
              cx="50"
              cy="50"
              r="24"
              fill={`url(#knob-grad-${uid})`}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1"
              className="shadow-2xl"
            />

            {/* Knurled Grip Grooves on Knob Edge */}
            {Array.from({ length: 16 }).map((_, i) => {
              const rot = i * 22.5;
              const rad = ((rot - 90) * Math.PI) / 180;
              const x1 = 50 + 23.5 * Math.cos(rad);
              const y1 = 50 + 23.5 * Math.sin(rad);
              const x2 = 50 + 21 * Math.cos(rad);
              const y2 = 50 + 21 * Math.sin(rad);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Inner Knob Cap */}
            <circle cx="50" cy="50" r="18" fill={`url(#cap-${uid})`} stroke="rgba(200,255,8,0.2)" strokeWidth="0.8" />

            {/* Rotating Pointer / Indicator Line on Knob */}
            <g transform={`rotate(${angle} 50 50)`}>
              {/* Glowing Pointer Line extending out */}
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="12"
                stroke="#C8FF08"
                strokeWidth="2.8"
                strokeLinecap="round"
                filter={`url(#glow-${uid})`}
              />
              {/* Pointer LED Dot */}
              <circle cx="50" cy="14" r="2.2" fill="#FFFFFF" />
            </g>

            {/* Center Cap Screw / Hub */}
            <circle cx="50" cy="50" r="4" fill="rgba(0,0,0,0.7)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          </svg>

          {/* Integrated Digital Readout Box at Bottom of Knob */}
          <div className={cn("absolute left-1/2 -translate-x-1/2 z-[2] pointer-events-none", compact ? "bottom-0.5" : "bottom-2")}>
            <div className={cn("rounded bg-black/85 border border-lime/50 text-center shadow-md", compact ? "px-1 py-0.2 scale-90" : "px-2 py-0.5")}>
              <span className={cn("font-bold text-lime font-mono leading-none", compact ? "text-[8px]" : "text-[10px]")}>
                {animatedValue.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Quick Buttons (only in full mode) */}
      {!compact && (
        <div className="mt-2 flex gap-1 justify-center">
          {presets.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={cn(
                "rounded px-2.5 py-0.5 text-[10px] font-semibold border transition-all cursor-pointer",
                value === v
                  ? "bg-[#8ec4dc] text-[#0a2a2a] border-[#a8d4e8] shadow-[0_0_8px_rgba(142,196,220,0.4)] font-bold"
                  : "border-white/25 text-white/75 hover:border-white/50 hover:bg-white/10"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// 2. FAULT ROTARY REGULATOR SELECTOR (3 Detent Switch)
// ---------------------------------------------------------
interface FaultRegulatorSelectorProps {
  value: "abc" | "slg" | "ll";
  onChange: (fault: "abc" | "slg" | "ll") => void;
  active?: boolean;
  compact?: boolean;
}

const FAULT_DETENTS = [
  { id: "abc", label: "Three phase", short: "3-PHASE", angle: -90 },
  { id: "slg", label: "SLG", short: "SLG", angle: 0 },
  { id: "ll", label: "LL", short: "LL", angle: 90 },
] as const;

export function FaultRegulatorSelector({
  value,
  onChange,
  active = false,
  compact = false,
}: FaultRegulatorSelectorProps) {
  const uid = useId().replace(/:/g, "");
  const selectedMeta = FAULT_DETENTS.find((f) => f.id === value) ?? FAULT_DETENTS[1];
  const targetAngle = selectedMeta.angle;

  const [animatedAngle, setAnimatedAngle] = useState<number>(targetAngle);

  useEffect(() => {
    let startTime: number | null = null;
    const startVal = animatedAngle;
    const duration = 300;

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
      {compact && (
        <div className="text-[8px] sm:text-[9px] font-bold text-amber-300 tracking-wider uppercase mb-0.5 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)] flex items-center gap-1">
          <span>⚡</span> FAULT
        </div>
      )}
      {/* 3D Industrial Regulator Base Plate */}
      <div
        className={cn(
          "relative rounded-full transition-all duration-300 p-[3px]",
          "bg-gradient-to-b from-white/30 via-white/10 to-black/70",
          "shadow-[0_8px_18px_rgba(0,0,0,0.6),0_2px_0_rgba(255,255,255,0.15)]",
          compact
            ? "w-[56px] h-[56px] sm:w-[66px] sm:h-[66px] p-[2px]"
            : "w-[130px] h-[130px] sm:w-[140px] sm:h-[140px] p-[4px]",
          active && "ring-2 ring-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.4)]"
        )}
      >
        <div
          className="relative w-full h-full rounded-full overflow-hidden
            bg-[radial-gradient(circle_at_50%_35%,rgba(45,35,18,0.98)_0%,rgba(18,14,6,0.99)_75%)]
            border border-white/15
            shadow-[inset_0_3px_8px_rgba(255,255,255,0.12),inset_0_-8px_20px_rgba(0,0,0,0.75)]"
        >
          {/* Specular glass reflection top curve */}
          <div className="pointer-events-none absolute inset-x-2 top-0.5 h-6 rounded-full bg-gradient-to-b from-white/20 to-transparent opacity-75" />

          <svg viewBox="0 0 100 100" className="w-full h-full relative z-[1]">
            <defs>
              <linearGradient id={`knob-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5a4a30" />
                <stop offset="50%" stopColor="#302410" />
                <stop offset="100%" stopColor="#181208" />
              </linearGradient>
              <linearGradient id={`rim-grad-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                <stop offset="50%" stopColor="rgba(180,150,100,0.3)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.7)" />
              </linearGradient>
              <radialGradient id={`cap-${uid}`} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#3e301a" />
                <stop offset="70%" stopColor="#1f180c" />
                <stop offset="100%" stopColor="#100b05" />
              </radialGradient>
              <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="1.5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Outer Knurled Rim */}
            <circle cx="50" cy="50" r="47" fill="none" stroke={`url(#rim-grad-${uid})`} strokeWidth="3" />

            {/* 3 Detent Position Ticks & Glowing Status LEDs */}
            {FAULT_DETENTS.map((f) => {
              const rad = ((f.angle - 90) * Math.PI) / 180;
              const x1 = 50 + 44 * Math.cos(rad);
              const y1 = 50 + 44 * Math.sin(rad);
              const x2 = 50 + 38 * Math.cos(rad);
              const y2 = 50 + 38 * Math.sin(rad);
              const lx = 50 + 29 * Math.cos(rad);
              const ly = 50 + 29 * Math.sin(rad);
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
                    strokeWidth={isSelected ? "2.5" : "1.4"}
                    strokeLinecap="round"
                  />
                  {/* Status LED Dot */}
                  <circle
                    cx={50 + 41 * Math.cos(rad)}
                    cy={50 + 41 * Math.sin(rad)}
                    r={isSelected ? "2.5" : "1.6"}
                    fill={isSelected ? "#fbbf24" : "rgba(255,255,255,0.3)"}
                    filter={isSelected ? `url(#glow-${uid})` : undefined}
                  />
                  {!compact && (
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="4.8"
                      fontWeight="700"
                      fill={isSelected ? "#fbbf24" : "rgba(255,255,255,0.65)"}
                      className="transition-colors group-hover:fill-amber-300"
                    >
                      {f.short}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Central Rotary Switch Knob */}
            <circle
              cx="50"
              cy="50"
              r="24"
              fill={`url(#knob-grad-${uid})`}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1"
            />

            {/* Knurled Grip Grooves on Knob Edge */}
            {Array.from({ length: 16 }).map((_, i) => {
              const rot = i * 22.5;
              const rad = ((rot - 90) * Math.PI) / 180;
              const x1 = 50 + 23.5 * Math.cos(rad);
              const y1 = 50 + 23.5 * Math.sin(rad);
              const x2 = 50 + 21 * Math.cos(rad);
              const y2 = 50 + 21 * Math.sin(rad);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Inner Knob Cap */}
            <circle cx="50" cy="50" r="18" fill={`url(#cap-${uid})`} stroke="rgba(251,191,36,0.25)" strokeWidth="0.8" />

            {/* Rotating Pointer / Indicator Line */}
            <g transform={`rotate(${animatedAngle} 50 50)`}>
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="12"
                stroke="#fbbf24"
                strokeWidth="2.8"
                strokeLinecap="round"
                filter={`url(#glow-${uid})`}
              />
              <circle cx="50" cy="14" r="2.2" fill="#FFFFFF" />
            </g>

            {/* Center Cap Screw */}
            <circle cx="50" cy="50" r="4" fill="rgba(0,0,0,0.7)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          </svg>

          {/* Integrated Digital Readout Plate */}
          <div className={cn("absolute left-1/2 -translate-x-1/2 z-[2] pointer-events-none", compact ? "bottom-0.5" : "bottom-2")}>
            <div className={cn("rounded bg-black/85 border border-amber-400/50 text-center shadow-md", compact ? "px-1 py-0.2 scale-90" : "px-2 py-0.5")}>
              <span className={cn("font-bold text-amber-300 font-mono leading-none", compact ? "text-[7.5px]" : "text-[9px]")}>
                {selectedMeta.short}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Option Selection Buttons (only in full mode) */}
      {!compact && (
        <div className="mt-2 flex gap-1 justify-center max-w-[150px] flex-wrap">
          {FAULT_DETENTS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange(f.id)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-semibold border transition-all cursor-pointer",
                value === f.id
                  ? "bg-amber-400 text-[#1a1a00] border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.5)] font-bold"
                  : "border-white/25 text-white/75 hover:border-white/50 hover:bg-white/10"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// 3. LOAD ROTARY REGULATOR SELECTOR (3 Detent Switch)
// ---------------------------------------------------------
interface LoadRegulatorSelectorProps {
  value: "1 pu" | "0.8 pu" | "0.5 pu" | "0 pu";
  onChange: (load: "1 pu" | "0.8 pu" | "0.5 pu" | "0 pu") => void;
  active?: boolean;
  compact?: boolean;
}

const LOAD_DETENTS = [
  { id: "0 pu", label: "0 pu", short: "0.0", angle: -105 },
  { id: "0.5 pu", label: "0.5 pu", short: "0.5", angle: -35 },
  { id: "0.8 pu", label: "0.8 pu", short: "0.8", angle: 35 },
  { id: "1 pu", label: "1.0 pu", short: "1.0", angle: 105 },
] as const;

export function LoadRegulatorSelector({
  value,
  onChange,
  active = false,
  compact = false,
}: LoadRegulatorSelectorProps) {
  const uid = useId().replace(/:/g, "");
  const selectedMeta = LOAD_DETENTS.find((l) => l.id === value) ?? LOAD_DETENTS[2];
  const targetAngle = selectedMeta.angle;

  const [animatedAngle, setAnimatedAngle] = useState<number>(targetAngle);

  useEffect(() => {
    let startTime: number | null = null;
    const startVal = animatedAngle;
    const duration = 300;

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
      {compact && (
        <div className="text-[8px] sm:text-[9px] font-bold text-[#8ec4dc] tracking-wider uppercase mb-0.5 drop-shadow-[0_0_4px_rgba(142,196,220,0.5)]">
          LOAD
        </div>
      )}
      {/* 3D Industrial Regulator Base Plate */}
      <div
        className={cn(
          "relative rounded-full transition-all duration-300 p-[3px]",
          "bg-gradient-to-b from-white/30 via-white/10 to-black/70",
          "shadow-[0_8px_18px_rgba(0,0,0,0.6),0_2px_0_rgba(255,255,255,0.15)]",
          compact
            ? "w-[56px] h-[56px] sm:w-[66px] sm:h-[66px] p-[2px]"
            : "w-[130px] h-[130px] sm:w-[140px] sm:h-[140px] p-[4px]",
          active && "ring-2 ring-[#8ec4dc]/70 shadow-[0_0_20px_rgba(142,196,220,0.4)]"
        )}
      >
        <div
          className="relative w-full h-full rounded-full overflow-hidden
            bg-[radial-gradient(circle_at_50%_35%,rgba(20,45,55,0.98)_0%,rgba(6,18,24,0.99)_75%)]
            border border-white/15
            shadow-[inset_0_3px_8px_rgba(255,255,255,0.12),inset_0_-8px_20px_rgba(0,0,0,0.75)]"
        >
          {/* Specular glass reflection top curve */}
          <div className="pointer-events-none absolute inset-x-2 top-0.5 h-6 rounded-full bg-gradient-to-b from-white/20 to-transparent opacity-75" />

          <svg viewBox="0 0 100 100" className="w-full h-full relative z-[1]">
            <defs>
              <linearGradient id={`knob-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#304a55" />
                <stop offset="50%" stopColor="#182a33" />
                <stop offset="100%" stopColor="#0a151b" />
              </linearGradient>
              <linearGradient id={`rim-grad-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                <stop offset="50%" stopColor="rgba(120,160,180,0.3)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.7)" />
              </linearGradient>
              <radialGradient id={`cap-${uid}`} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#1f3540" />
                <stop offset="70%" stopColor="#0d1b22" />
                <stop offset="100%" stopColor="#050d12" />
              </radialGradient>
              <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="1.5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Outer Knurled Rim */}
            <circle cx="50" cy="50" r="47" fill="none" stroke={`url(#rim-grad-${uid})`} strokeWidth="3" />

            {/* 3 Detent Position Ticks & Glowing Status LEDs */}
            {LOAD_DETENTS.map((l) => {
              const rad = ((l.angle - 90) * Math.PI) / 180;
              const x1 = 50 + 44 * Math.cos(rad);
              const y1 = 50 + 44 * Math.sin(rad);
              const x2 = 50 + 38 * Math.cos(rad);
              const y2 = 50 + 38 * Math.sin(rad);
              const lx = 50 + 29 * Math.cos(rad);
              const ly = 50 + 29 * Math.sin(rad);
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
                    strokeWidth={isSelected ? "2.5" : "1.4"}
                    strokeLinecap="round"
                  />
                  {/* Status LED Dot */}
                  <circle
                    cx={50 + 41 * Math.cos(rad)}
                    cy={50 + 41 * Math.sin(rad)}
                    r={isSelected ? "2.5" : "1.6"}
                    fill={isSelected ? "#8ec4dc" : "rgba(255,255,255,0.3)"}
                    filter={isSelected ? `url(#glow-${uid})` : undefined}
                  />
                  {!compact && (
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="5"
                      fontWeight="700"
                      fill={isSelected ? "#8ec4dc" : "rgba(255,255,255,0.65)"}
                      className="transition-colors group-hover:fill-cyan-200"
                    >
                      {l.short}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Central Rotary Switch Knob */}
            <circle
              cx="50"
              cy="50"
              r="24"
              fill={`url(#knob-grad-${uid})`}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1"
            />

            {/* Knurled Grip Grooves on Knob Edge */}
            {Array.from({ length: 16 }).map((_, i) => {
              const rot = i * 22.5;
              const rad = ((rot - 90) * Math.PI) / 180;
              const x1 = 50 + 23.5 * Math.cos(rad);
              const y1 = 50 + 23.5 * Math.sin(rad);
              const x2 = 50 + 21 * Math.cos(rad);
              const y2 = 50 + 21 * Math.sin(rad);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Inner Knob Cap */}
            <circle cx="50" cy="50" r="18" fill={`url(#cap-${uid})`} stroke="rgba(142,196,220,0.25)" strokeWidth="0.8" />

            {/* Rotating Pointer / Indicator Line */}
            <g transform={`rotate(${animatedAngle} 50 50)`}>
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="12"
                stroke="#8ec4dc"
                strokeWidth="2.8"
                strokeLinecap="round"
                filter={`url(#glow-${uid})`}
              />
              <circle cx="50" cy="14" r="2.2" fill="#FFFFFF" />
            </g>

            {/* Center Cap Screw */}
            <circle cx="50" cy="50" r="4" fill="rgba(0,0,0,0.7)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          </svg>

          {/* Integrated Digital Readout Box */}
          <div className={cn("absolute left-1/2 -translate-x-1/2 z-[2] pointer-events-none", compact ? "bottom-0.5" : "bottom-2")}>
            <div className={cn("rounded bg-black/85 border border-cyan-400/50 text-center shadow-md", compact ? "px-1 py-0.2 scale-90" : "px-2 py-0.5")}>
              <span className={cn("font-bold text-[#8ec4dc] font-mono leading-none", compact ? "text-[7.5px]" : "text-[9px]")}>
                {selectedMeta.label.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Option Selection Buttons (only in full mode) */}
      {!compact && (
        <div className="mt-2 flex gap-1 justify-center">
          {LOAD_DETENTS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onChange(l.id)}
              className={cn(
                "rounded px-2.5 py-0.5 text-[10px] font-semibold border transition-all cursor-pointer",
                value === l.id
                  ? "bg-[#8ec4dc] text-[#0a2a2a] border-[#a8d4e8] shadow-[0_0_8px_rgba(142,196,220,0.5)] font-bold"
                  : "border-white/25 text-white/75 hover:border-white/50 hover:bg-white/10"
              )}
            >
              {l.id}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
