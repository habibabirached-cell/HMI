import React from 'react';

const ACCENT = '#26c6da';
const ACCENT_SOFT = 'rgba(38, 198, 218, 0.55)';
const ACCENT_CORE = '#7aebf7';

/** Motor — cylindrical body + shaft. */
function MotorGlyph() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="20" width="26" height="16" rx="2.5" />
      <rect x="32" y="23" width="10" height="10" rx="1.5" />
      <circle cx="11" cy="28" r="3.2" />
      <line x1="2" y1="28" x2="6" y2="28" strokeWidth="2" />
      <path d="M14 24v8M19 24v8" opacity="0.65" strokeWidth="1.1" />
    </g>
  );
}

/** Cooling fan — hub + blades. */
function FanGlyph() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="24" cy="28" r="14" />
      <circle cx="24" cy="28" r="3.5" fill={ACCENT_CORE} fillOpacity="0.35" stroke="currentColor" />
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x2 = 24 + Math.cos(rad) * 11;
        const y2 = 28 + Math.sin(rad) * 11;
        return <line key={deg} x1="24" y1="28" x2={x2} y2={y2} strokeWidth="2.2" />;
      })}
    </g>
  );
}

/** Incandescent bulb. */
function BulbGlyph() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 14c0-4.4 3.6-8 8-8s8 3.6 8 8c0 3.2-1.8 5.8-4.2 7.2L26 30h-4l-1.8-8.8C17.8 19.8 16 17.2 16 14z" />
      <path d="M20 30h8M21 33h6M22 36h4" strokeWidth="1.3" />
      <path
        d="M22 16c1.5 1.2 2.5 2.8 2.5 4.5M24 14v6M26 16c-1.5 1.2-2.5 2.8-2.5 4.5"
        strokeWidth="1.1"
        opacity="0.85"
      />
    </g>
  );
}

/** Distribution / aux panel. */
function PanelGlyph() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="12" width="28" height="26" rx="2" />
      <line x1="10" y1="20" x2="38" y2="20" opacity="0.7" />
      <rect x="14" y="24" width="6" height="5" rx="0.8" />
      <rect x="24" y="24" width="6" height="5" rx="0.8" />
      <line x1="16" y1="34" x2="16" y2="38" strokeWidth="1.8" />
      <line x1="24" y1="34" x2="24" y2="38" strokeWidth="1.8" />
      <line x1="32" y1="34" x2="32" y2="38" strokeWidth="1.8" />
    </g>
  );
}

/** IT server rack — shelves + status LEDs. */
function ItRackGlyph() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="14" y="8" width="20" height="34" rx="2" />
      <line x1="14" y1="16" x2="34" y2="16" opacity="0.75" />
      <line x1="14" y1="24" x2="34" y2="24" opacity="0.75" />
      <line x1="14" y1="32" x2="34" y2="32" opacity="0.75" />
      <circle cx="18" cy="12" r="1.2" fill={ACCENT_CORE} stroke="none" />
      <circle cx="18" cy="20" r="1.2" fill={ACCENT_CORE} stroke="none" />
      <circle cx="18" cy="28" r="1.2" fill={ACCENT_CORE} stroke="none" />
      <rect x="22" y="10" width="8" height="3" rx="0.6" opacity="0.7" />
      <rect x="22" y="18" width="8" height="3" rx="0.6" opacity="0.7" />
      <rect x="22" y="26" width="8" height="3" rx="0.6" opacity="0.7" />
      <line x1="17" y1="36" x2="31" y2="36" strokeWidth="1.8" />
    </g>
  );
}

const GLYPH_SIZE = 48;
const GLYPH_ANCHOR_X = 24;
const GLYPH_ANCHOR_Y = 28;

/** IT rack — center; motor / fan / bulb / panel on ellipse (W / N / S / E). */
const ORBIT_GLYPHS = [
  { id: 'motor', Icon: MotorGlyph, angleDeg: 180 },
  { id: 'fan', Icon: FanGlyph, angleDeg: -90 },
  { id: 'bulb', Icon: BulbGlyph, angleDeg: 90 },
  { id: 'panel', Icon: PanelGlyph, angleDeg: 0 },
];

function ellipsePoint(cx, cy, rx, ry, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + rx * Math.cos(rad),
    y: cy + ry * Math.sin(rad),
  };
}

/**
 * Collapsed aggregate art for Aux / IT / Rack loads — IT rack center, four glowy orbit icons.
 * Used instead of the PNG texture on large collapse-preview tiles only.
 */
export default function SchematicAuxLoadsAggregate({
  width,
  height,
  strokeColor,
  strokeWidthVal,
  glowFilterId = 'aux-loads-aggregate-glow',
}) {
  const titleBand = height * 0.17;
  const artTop = titleBand + height * 0.05;
  const artBottom = height * 0.94;
  const cx = width / 2;
  const cy = (artTop + artBottom) / 2;
  const artH = artBottom - artTop;
  const padX = width * 0.085;
  const padY = artH * 0.06;
  const rx = Math.max(40, width / 2 - padX);
  const ry = Math.max(28, artH / 2 - padY);

  const satelliteScale =
    Math.min((rx * 2) / 4.35 / GLYPH_SIZE, (ry * 2) / 2.75 / GLYPH_SIZE) * 1.08;
  const centerScale = satelliteScale * 1.22;
  const iconHalf = GLYPH_SIZE * satelliteScale * 0.52;
  const orbitInset = iconHalf * 0.28;

  return (
    <>
      <defs>
        <filter
          id={glowFilterId}
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter
          id={`${glowFilterId}-icon`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="2.2" result="iconBlur" />
          <feMerge>
            <feMergeNode in="iconBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={`${glowFilterId}-sheen`} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="rgba(38, 198, 218, 0.12)" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
        </radialGradient>
      </defs>

      <rect width={width} height={height} fill="#050608" rx="4" />
      <rect
        width={width}
        height={height}
        fill={`url(#${glowFilterId}-sheen)`}
        rx="4"
        pointerEvents="none"
      />

      {ORBIT_GLYPHS.map(({ id, Icon, angleDeg }) => {
        const { x, y } = ellipsePoint(cx, cy, rx - orbitInset, ry - orbitInset, angleDeg);
        return (
          <g
            key={id}
            transform={`translate(${x}, ${y}) scale(${satelliteScale}) translate(-${GLYPH_ANCHOR_X}, -${GLYPH_ANCHOR_Y})`}
            color={ACCENT}
            filter={`url(#${glowFilterId}-icon)`}
            opacity="0.96"
          >
            <Icon />
          </g>
        );
      })}

      <g
        transform={`translate(${cx}, ${cy}) scale(${centerScale}) translate(-${GLYPH_ANCHOR_X}, -${GLYPH_ANCHOR_Y})`}
        color={ACCENT}
        filter={`url(#${glowFilterId}-icon)`}
        opacity="0.98"
      >
        <ItRackGlyph />
      </g>

      {/* Soft elliptical glow behind the cluster */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx * 0.72}
        ry={ry * 0.78}
        fill={ACCENT_SOFT}
        opacity="0.18"
        filter={`url(#${glowFilterId})`}
        pointerEvents="none"
      />
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx * 0.38}
        ry={ry * 0.42}
        fill={ACCENT_CORE}
        opacity="0.06"
        filter={`url(#${glowFilterId})`}
        pointerEvents="none"
      />

      {/* Orbit guide — faint ellipse (decorative) */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx - orbitInset}
        ry={ry - orbitInset}
        fill="none"
        stroke={ACCENT}
        strokeWidth={1}
        opacity="0.12"
        pointerEvents="none"
      />

      <rect
        width={width}
        height={height}
        fill="none"
        stroke={ACCENT}
        strokeWidth={Math.max(1.4, strokeWidthVal * 1.2)}
        rx="4"
        opacity="0.55"
        filter={`url(#${glowFilterId})`}
        pointerEvents="none"
      />
      <rect
        width={width}
        height={height}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidthVal}
        rx="4"
      />
    </>
  );
}
