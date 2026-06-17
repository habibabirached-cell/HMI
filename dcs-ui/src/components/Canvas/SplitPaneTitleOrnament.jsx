import React, { useId, useMemo } from 'react';

const VIEW_W = 144;
const VIEW_H = 44;
const MARGIN = { left: 16, top: 6, right: 8, bottom: 12 };

function buildSinhCurvePath(plotLeft, plotTop, plotWidth, plotHeight, samples = 64) {
  const uMin = -1.35;
  const uMax = 1.35;
  const originY = plotTop + plotHeight * 0.56;
  const maxSinh = Math.sinh(uMax);
  const yAmp = plotHeight * 0.4;
  const parts = [];

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const u = uMin + t * (uMax - uMin);
    const x = plotLeft + t * plotWidth;
    const y = originY - (Math.sinh(u) / maxSinh) * yAmp;
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return { path: parts.join(' '), originY, originX: plotLeft + plotWidth * 0.5 };
}

const PALETTES = {
  upper: {
    stops: [
      { offset: '0%', color: '#d8f0ff' },
      { offset: '38%', color: '#5eb3ff' },
      { offset: '72%', color: '#1a5fa8' },
      { offset: '100%', color: '#0d3d72' },
    ],
    glow: 'rgba(64, 156, 255, 0.5)',
    axis: 'rgba(94, 179, 255, 0.55)',
    grid: 'rgba(94, 179, 255, 0.14)',
    tick: 'rgba(140, 200, 255, 0.45)',
    label: 'rgba(180, 220, 255, 0.7)',
  },
  lower: {
    stops: [
      { offset: '0%', color: '#e8fff4' },
      { offset: '35%', color: '#7dffb8' },
      { offset: '68%', color: '#2e9b5e' },
      { offset: '100%', color: '#1a5c38' },
    ],
    glow: 'rgba(64, 220, 140, 0.48)',
    axis: 'rgba(125, 255, 184, 0.52)',
    grid: 'rgba(125, 255, 184, 0.13)',
    tick: 'rgba(160, 255, 200, 0.42)',
    label: 'rgba(190, 255, 220, 0.68)',
  },
};

export default function SplitPaneTitleOrnament({ variant = 'upper' }) {
  const uid = useId().replace(/:/g, '');
  const palette = PALETTES[variant] || PALETTES.upper;
  const gradId = `split-plot-grad-${variant}-${uid}`;
  const glowId = `split-plot-glow-${variant}-${uid}`;

  const geometry = useMemo(() => {
    const plotLeft = MARGIN.left;
    const plotTop = MARGIN.top;
    const plotWidth = VIEW_W - MARGIN.left - MARGIN.right;
    const plotHeight = VIEW_H - MARGIN.top - MARGIN.bottom;
    const plotRight = plotLeft + plotWidth;
    const plotBottom = plotTop + plotHeight;

    const { path, originY, originX } = buildSinhCurvePath(
      plotLeft,
      plotTop,
      plotWidth,
      plotHeight,
    );

    const xAxisY = originY;
    const yAxisX = originX;

    const gridH = [];
    const gridV = [];
    for (let i = 1; i <= 3; i += 1) {
      const gy = plotTop + (plotHeight * i) / 4;
      gridH.push(`M${plotLeft},${gy} L${plotRight},${gy}`);
      const gx = plotLeft + (plotWidth * i) / 4;
      gridV.push(`M${gx},${plotTop} L${gx},${plotBottom}`);
    }

    const xTicks = [-1, 0, 1].map((u) => {
      const t = (u - -1.35) / (1.35 - -1.35);
      return plotLeft + t * plotWidth;
    });

    const yTicks = [-0.8, 0, 0.8].map((v) => {
      const maxSinh = Math.sinh(1.35);
      const yAmp = plotHeight * 0.4;
      return originY - (v / 0.8) * ((Math.sinh(1.35) / maxSinh) * yAmp * 0.55);
    });

    return {
      mainPath: path,
      plotLeft,
      plotTop,
      plotRight,
      plotBottom,
      xAxisY,
      yAxisX,
      gridH,
      gridV,
      xTicks,
      yTicks,
    };
  }, []);

  const {
    mainPath,
    plotLeft,
    plotTop,
    plotRight,
    plotBottom,
    xAxisY,
    yAxisX,
    gridH,
    gridV,
    xTicks,
    yTicks,
  } = geometry;

  return (
    <span
      className={`canvas-split-pane-title__ornament canvas-split-pane-title__ornament--${variant}`}
      aria-hidden="true"
    >
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            {palette.stops.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
          <filter id={glowId} x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur stdDeviation="1.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x={plotLeft}
          y={plotTop}
          width={plotRight - plotLeft}
          height={plotBottom - plotTop}
          fill="none"
          stroke={palette.axis}
          strokeWidth="0.6"
          opacity="0.35"
          rx="1"
        />

        {gridH.map((d) => (
          <path key={d} d={d} stroke={palette.grid} strokeWidth="0.5" strokeDasharray="2 2.5" />
        ))}
        {gridV.map((d) => (
          <path key={d} d={d} stroke={palette.grid} strokeWidth="0.5" strokeDasharray="2 2.5" />
        ))}

        <path
          d={`M${plotLeft},${xAxisY} L${plotRight - 2},${xAxisY}`}
          stroke={palette.axis}
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d={`M${plotRight - 2},${xAxisY} L${plotRight - 5},${xAxisY - 2} M${plotRight - 2},${xAxisY} L${plotRight - 5},${xAxisY + 2}`}
          stroke={palette.axis}
          strokeWidth="0.9"
          strokeLinecap="round"
        />

        <path
          d={`M${yAxisX},${plotBottom} L${yAxisX},${plotTop + 2}`}
          stroke={palette.axis}
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d={`M${yAxisX},${plotTop + 2} L${yAxisX - 2},${plotTop + 5} M${yAxisX},${plotTop + 2} L${yAxisX + 2},${plotTop + 5}`}
          stroke={palette.axis}
          strokeWidth="0.9"
          strokeLinecap="round"
        />

        {xTicks.map((x) => (
          <path
            key={`xt-${x}`}
            d={`M${x},${xAxisY - 2} L${x},${xAxisY + 2}`}
            stroke={palette.tick}
            strokeWidth="0.7"
          />
        ))}
        {yTicks.map((y) => (
          <path
            key={`yt-${y}`}
            d={`M${yAxisX - 2},${y} L${yAxisX + 2},${y}`}
            stroke={palette.tick}
            strokeWidth="0.7"
          />
        ))}

        <text
          x={plotRight - 1}
          y={xAxisY + 9}
          fill={palette.label}
          fontSize="5.5"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontStyle="italic"
          textAnchor="end"
        >
          x
        </text>
        <text
          x={yAxisX + 5}
          y={plotTop + 7}
          fill={palette.label}
          fontSize="5.5"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontStyle="italic"
          textAnchor="start"
        >
          y
        </text>
        <text
          x={plotRight - 2}
          y={plotTop + 8}
          fill={palette.label}
          fontSize="5"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontStyle="italic"
          textAnchor="end"
          opacity="0.85"
        >
          sinh(x)
        </text>

        <path
          className="canvas-split-pane-title__ornament-glow"
          d={mainPath}
          fill="none"
          stroke={palette.glow}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.42"
        />
        <path
          className="canvas-split-pane-title__ornament-main"
          d={mainPath}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />
      </svg>
    </span>
  );
}
