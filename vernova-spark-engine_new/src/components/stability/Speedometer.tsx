import React, { useEffect, useMemo, useState } from 'react';

/**
 * Line Speedometer:
 * Semicircular sweep from left (-180°) through top (-90°) to right (0°).
 */
const START_DEG = -180;
const END_DEG = 0;
const SWEEP_DEG = 180;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function niceStep(max: number, targetMajors: number): number {
  if (!(max > 0) || !Number.isFinite(max)) return 1;
  const raw = max / Math.max(1, targetMajors);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
}

function formatTick(v: number, step: number): string {
  if (step >= 100) return String(Math.round(v));
  if (step >= 1) return v % 1 === 0 ? String(Math.round(v)) : v.toFixed(1);
  if (step >= 0.1) return v.toFixed(1);
  return v.toFixed(2);
}

export function Speedometer({
  value,
  max,
  label,
  isCalculating = false,
  size = 'md',
  tone = 'current',
}: {
  value: number;
  max: number;
  label: string;
  isCalculating?: boolean;
  size?: 'xs' | 'sm' | 'md';
  /** Previous CFG dials stay readable but muted vs current lime. */
  tone?: 'current' | 'previous';
}) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [scanAngle, setScanAngle] = useState(START_DEG);
  const uid = React.useId().replace(/:/g, '');
  const safeMax = max > 0 && Number.isFinite(max) ? max : 1;

  // Smooth count-up / count-down animation
  useEffect(() => {
    let startTime: number | null = null;
    const startVal = animatedValue;
    const targetVal = value;
    const duration = 650;

    if (Math.abs(startVal - targetVal) < 0.0001) {
      setAnimatedValue(targetVal);
      return;
    }

    let frameId: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(startVal + (targetVal - startVal) * easeOut);
      if (progress < 1) frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Scanning needle while calculating
  useEffect(() => {
    if (!isCalculating) return;

    let frameId: number;
    let startTime: number | null = null;
    const scan = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      // Oscillate across the 180° sweep
      setScanAngle(-90 + Math.sin(elapsed * 4.5) * 60);
      frameId = requestAnimationFrame(scan);
    };
    frameId = requestAnimationFrame(scan);
    return () => cancelAnimationFrame(frameId);
  }, [isCalculating]);

  const percentage = Math.min(Math.max(animatedValue / safeMax, 0), 1);
  const calculatedAngle = START_DEG + percentage * SWEEP_DEG;
  const angle = isCalculating ? scanAngle : calculatedAngle;

  const scale = useMemo(() => {
    const majorCount = size === 'md' ? 4 : 4;
    const majorStep = niceStep(safeMax, majorCount);
    const minorStep = majorStep / 2;
    const byAngle = new Map<
      string,
      { key: string; deg: number; len: 'major' | 'minor'; label?: string }
    >();

    const add = (v: number, len: 'major' | 'minor') => {
      const clamped = Math.min(Math.max(v, 0), safeMax);
      const deg = START_DEG + (clamped / safeMax) * SWEEP_DEG;
      const angKey = deg.toFixed(2);
      const next = {
        key: `${len}-${clamped.toFixed(2)}`,
        deg,
        len,
        label: len === 'major' ? formatTick(clamped, majorStep) : undefined,
      };
      const prev = byAngle.get(angKey);
      if (!prev || len === 'major') byAngle.set(angKey, next);
    };

    for (let v = 0; v <= safeMax + minorStep * 0.001; v += minorStep) {
      add(Math.round(v / minorStep) * minorStep, 'minor');
    }
    for (let v = 0; v <= safeMax + majorStep * 0.001; v += majorStep) {
      add(Math.round(v / majorStep) * majorStep, 'major');
    }
    add(0, 'major');
    add(safeMax, 'major');

    return Array.from(byAngle.values()).sort((a, b) => a.deg - b.deg);
  }, [safeMax, size]);

  const CX = 50;
  const CY = 56;
  const R_OUTER = 42;
  const R_INNER = 34;
  const R_HUB = 5.2;

  // Arc path generator
  const arcPath = (startDeg: number, endDeg: number, r: number) => {
    const safeEnd = Math.max(startDeg + 0.01, endDeg);
    const p1 = polar(CX, CY, r, startDeg);
    const p2 = polar(CX, CY, r, safeEnd);
    const largeArc = Math.abs(safeEnd - startDeg) > 180 ? 1 : 0;
    const sweepFlag = safeEnd >= startDeg ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${p2.x} ${p2.y}`;
  };

  const display = isCalculating
    ? '...'
    : animatedValue >= 100
      ? animatedValue.toFixed(0)
      : animatedValue >= 10
        ? animatedValue.toFixed(1)
        : animatedValue.toFixed(2);

  const labelMatch = label.match(/^(.*?)\s*(\(.*\))?$/);
  const mainLabel = labelMatch ? labelMatch[1].trim() : label;
  const unitLabel = labelMatch && labelMatch[2] ? labelMatch[2].trim() : '';
  const isXs = size === 'xs';
  const isSm = size === 'sm' || isXs;
  const isPrev = tone === 'previous';

  const strokeColor = isPrev ? 'rgba(180, 200, 200, 0.75)' : '#FFFFFF';
  const strokeInnerColor = isPrev ? 'rgba(180, 200, 200, 0.55)' : 'rgba(255, 255, 255, 0.85)';
  const activeColor = isPrev ? 'rgba(200, 220, 220, 0.9)' : 'var(--primary, #C8FF08)';
  const readoutColor = isPrev ? '#B0BEBE' : 'var(--primary, #C8FF08)';
  const unitClass = isPrev ? 'text-diagram-line/75' : 'text-lime/95';

  return (
    <div className={`flex flex-col items-center select-none ${isPrev ? 'opacity-90' : ''}`}>
      {/* Dial Header / Label */}
      <div
        className={`font-bold tracking-[0.12em] text-center ${
          isPrev
            ? 'text-diagram-line/80'
            : 'text-primary drop-shadow-[0_0_6px_rgba(200,255,8,0.35)]'
        } ${isXs ? 'text-xs mb-0.5' : isSm ? 'text-xs mb-1' : 'text-sm mb-1.5'}`}
      >
        <span className="uppercase">{mainLabel}</span>
        {unitLabel && (
          <span
            className={`ml-1 font-mono tracking-normal font-semibold ${unitClass} text-xs`}
          >
            {unitLabel}
          </span>
        )}
      </div>

      {/* Clean Instrument Housing */}
      <div
        className={`relative bg-gradient-to-b from-white/10 via-black/40 to-black/80 shadow-[0_6px_16px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.08)] border border-white/10 ${
          isXs
            ? 'w-[86px] h-[78px] p-[2px] rounded-[0.85rem]'
            : isSm
              ? 'w-[100px] h-[92px] p-[3px] rounded-[0.95rem]'
              : 'w-[132px] h-[118px] p-[3px] rounded-[1.15rem]'
        }`}
      >
        <div className="relative w-full h-full rounded-[0.85rem] overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,rgba(25,40,40,0.92)_0%,rgba(6,16,18,0.98)_75%)]">
          <svg viewBox="0 0 100 88" className="w-full h-full relative z-[1]">
            <defs>
              <filter id={`needle-glow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="1.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 1. Outer Bold Arc (starts slightly below horizontal, matching reference image) */}
            <path
              d={arcPath(-184, 4, R_OUTER)}
              fill="none"
              stroke={strokeColor}
              strokeWidth="3.2"
              strokeLinecap="round"
            />

            {/* 2. Inner Concentric Arc with Horizontal End Caps */}
            {/* Left horizontal foot */}
            <line
              x1={CX - R_INNER}
              y1={CY}
              x2={CX - R_OUTER + 2}
              y2={CY}
              stroke={strokeInnerColor}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Inner semi-circle arc */}
            <path
              d={arcPath(START_DEG, END_DEG, R_INNER)}
              fill="none"
              stroke={strokeInnerColor}
              strokeWidth="1.6"
            />
            {/* Right horizontal foot */}
            <line
              x1={CX + R_INNER}
              y1={CY}
              x2={CX + R_OUTER - 2}
              y2={CY}
              stroke={strokeInnerColor}
              strokeWidth="1.6"
              strokeLinecap="round"
            />

            {/* Active Range Highlight (subtle colored arc track) */}
            {(percentage > 0 || isCalculating) && (
              <path
                d={arcPath(START_DEG, angle, (R_OUTER + R_INNER) / 2)}
                fill="none"
                stroke={activeColor}
                strokeWidth="2.2"
                strokeLinecap="round"
                opacity={0.7}
              />
            )}

            {/* 3. Inward Radial Tick Marks + Scale Numbers */}
            {scale.map((t) => {
              const isMajor = t.len === 'major';
              const tickInnerR = isMajor ? (isSm ? 25 : 24) : (isSm ? 28.5 : 28);
              const pOuter = polar(CX, CY, R_INNER, t.deg);
              const pInner = polar(CX, CY, tickInnerR, t.deg);
              const pText = polar(CX, CY, isSm ? 18 : 17, t.deg);

              return (
                <g key={t.key}>
                  <line
                    x1={pOuter.x}
                    y1={pOuter.y}
                    x2={pInner.x}
                    y2={pInner.y}
                    stroke={isMajor ? strokeColor : strokeInnerColor}
                    strokeWidth={isMajor ? 1.8 : 1.0}
                    strokeLinecap="round"
                  />
                  {t.label != null && (
                    <text
                      x={pText.x}
                      y={pText.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isPrev ? 'rgba(180, 200, 200, 0.8)' : 'rgba(240, 248, 248, 0.85)'}
                      fontSize={isXs ? 3.6 : isSm ? 4.2 : 4.8}
                      fontFamily="'GE Inter', 'Inter', sans-serif"
                      fontWeight="600"
                    >
                      {t.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 4. Needle (Tapered pointer originating at center hub) */}
            {/* Needle shadow */}
            <g transform={`rotate(${angle} ${CX} ${CY})`} opacity={0.35}>
              <polygon
                points={`${CX},${CY - 1.6} ${CX + 30},${CY} ${CX},${CY + 1.6}`}
                fill="#000000"
              />
            </g>
            {/* Needle body */}
            <g
              transform={`rotate(${angle} ${CX} ${CY})`}
              filter={isPrev ? undefined : `url(#needle-glow-${uid})`}
            >
              <polygon
                points={`${CX},${CY - 1.8} ${CX + 31},${CY} ${CX},${CY + 1.8}`}
                fill={isPrev ? '#E0E8E8' : strokeColor}
              />
            </g>

            {/* 5. Center Hub (Hollow Ring with clean stroke matching reference image) */}
            <circle
              cx={CX}
              cy={CY}
              r={R_HUB}
              fill="rgba(8, 20, 22, 0.95)"
              stroke={strokeColor}
              strokeWidth="1.8"
            />
            <circle
              cx={CX}
              cy={CY}
              r={R_HUB - 2.8}
              fill={isPrev ? 'rgba(180, 200, 200, 0.5)' : activeColor}
            />

            {/* 6. Digital Value Readout Box */}
            <g transform={`translate(0, ${isSm ? 0 : 0})`}>
              <rect
                x="22"
                y="68"
                width="56"
                height="16"
                rx="3"
                fill="rgba(0, 0, 0, 0.82)"
                stroke="rgba(255, 255, 255, 0.22)"
                strokeWidth="0.75"
              />
              <text
                x="50"
                y="76.5"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={isXs ? 9.5 : isSm ? 10.2 : 11}
                fontFamily="'GE Inter', 'Inter', sans-serif"
                fontWeight="800"
                fill={readoutColor}
                className={isCalculating ? 'animate-pulse' : undefined}
              >
                {display}
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
