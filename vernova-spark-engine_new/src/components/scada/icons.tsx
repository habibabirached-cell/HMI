import type { SVGProps } from "react";

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function GridPlantIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 80 64" width={80} height={64} {...base} {...props}>
      <rect x="6" y="30" width="40" height="24" />
      <path d="M6 30 14 18 24 30" />
      <path d="M30 30v-8a6 6 0 016-6h2a6 6 0 016 6v8" />
      <path d="M50 22h10v32H50" />
      <path d="M54 22v-6h2v6" />
      <line x1="12" y1="38" x2="20" y2="38" />
      <line x1="12" y1="46" x2="20" y2="46" />
    </svg>
  );
}

export function TransformerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 70" width={64} height={70} {...base} {...props}>
      <path d="M16 14c0-4 4-7 8-7M28 14c0-4-4-7-8-7M24 7v-5" />
      <path d="M32 14c0-4 4-7 8-7M44 14c0-4-4-7-8-7M40 7v-5" />
      <rect x="10" y="20" width="44" height="30" rx="3" />
      <path d="M30 28l-6 9h8l-6 9" stroke="currentColor" />
      <line x1="20" y1="54" x2="20" y2="60" />
      <line x1="44" y1="54" x2="44" y2="60" />
      <line x1="14" y1="60" x2="50" y2="60" />
    </svg>
  );
}

export function TowerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 70 80" width={70} height={80} {...base} {...props}>
      <path d="M35 4 22 76M35 4 48 76" />
      <path d="M14 26h42M18 40h34M22 56h26" />
      <path d="M35 4 14 26M35 4 56 26M28 40 35 26 42 40M30 56 35 40 40 56" />
      <path d="M10 24c4-2 8-2 12 0M48 24c4-2 8-2 12 0" />
    </svg>
  );
}

// WindIcon: tower meets hub; rotor spins around translate(25, hub) so pivot stays on the mast.
export function WindIcon(props: SVGProps<SVGSVGElement> & { bladeClass?: string }) {
  const { bladeClass, className, ...rest } = props;
  const hub = 26;
  const rotorClass = bladeClass ? `wind-rotor ${bladeClass}` : "wind-rotor";
  return (
    <svg viewBox="0 0 50 64" width={50} height={64} className={className} {...base} {...rest}>
      <line x1="25" y1={hub} x2="25" y2="62" />
      <g transform={`translate(25 ${hub})`}>
        <g className={rotorClass}>
          {/* Invisible circle to make the bounding box exactly centered at (0,0) so fill-box transform-origin: center works perfectly */}
          <circle cx="0" cy="0" r="19" fill="transparent" stroke="none" />
          <circle cx="0" cy="0" r="3" />
          <line x1="0" y1="0" x2="0" y2="-19" />
          <line x1="0" y1="0" x2="-16" y2="10" />
          <line x1="0" y1="0" x2="16" y2="10" />
        </g>
      </g>
    </svg>
  );
}

export function WindFarmIcon(props: SVGProps<SVGSVGElement> & { bladeClass?: string }) {
  const { bladeClass, className, ...rest } = props;
  return (
    <svg viewBox="0 0 130 64" width={130} height={64} className={className} {...base} {...rest}>
      <g transform="translate(0,0)"><WindGroup bladeClass={bladeClass} /></g>
      <g transform="translate(40,0)"><WindGroup bladeClass={bladeClass} /></g>
      <g transform="translate(80,0)"><WindGroup bladeClass={bladeClass} /></g>
    </svg>
  );
}
function WindGroup({ bladeClass }: { bladeClass?: string }) {
  const hub = 26;
  const rotorClass = bladeClass ? `wind-rotor ${bladeClass}` : "wind-rotor";
  return (
    <>
      <line x1="25" y1={hub} x2="25" y2="62" />
      <g transform={`translate(25 ${hub})`}>
        <g className={rotorClass}>
          {/* Invisible circle to make the bounding box exactly centered at (0,0) so fill-box transform-origin: center works perfectly */}
          <circle cx="0" cy="0" r="19" fill="transparent" stroke="none" />
          <circle cx="0" cy="0" r="3" />
          <line x1="0" y1="0" x2="0" y2="-19" />
          <line x1="0" y1="0" x2="-16" y2="10" />
          <line x1="0" y1="0" x2="16" y2="10" />
        </g>
      </g>
    </>
  );
}

export function SolarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 110 60" width={110} height={60} {...base} {...props}>
      <path d="M14 8h40l10 34H4z" />
      <path d="M24 8 18 42M38 8 36 42M50 8 54 42M9 25h50" />
      <path d="M58 8h40l10 34H48z" />
      <path d="M68 8 62 42M82 8 80 42M94 8 98 42M53 25h50" />
    </svg>
  );
}

export function GeneratorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 80 56" width={80} height={56} {...base} {...props}>
      <rect x="8" y="14" width="46" height="34" rx="3" />
      <circle cx="31" cy="31" r="10" />
      <path d="M27 31a4 4 0 014-4 4 4 0 014 4" />
      <path d="M54 22h14v18H54" />
      <line x1="16" y1="14" x2="16" y2="6" />
      <line x1="46" y1="14" x2="46" y2="6" />
    </svg>
  );
}

export function CapacitorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 30 64" width={30} height={64} {...base} {...props}>
      <line x1="15" y1="2" x2="15" y2="18" />
      <rect x="4" y="18" width="22" height="28" rx="2" />
      <line x1="15" y1="46" x2="15" y2="58" />
      <line x1="6" y1="58" x2="24" y2="58" />
    </svg>
  );
}

export function LoadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 46" width={40} height={46} {...base} {...props}>
      <line x1="20" y1="0" x2="20" y2="14" />
      <path d="M6 14h28L20 40z" fill="currentColor" />
    </svg>
  );
}

export function MonitorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 56 56" width={56} height={56} {...base} {...props}>
      <circle cx="28" cy="28" r="24" />
      <path d="M28 28 40 18" />
      <circle cx="28" cy="28" r="3" fill="currentColor" />
    </svg>
  );
}

export function BatteryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 72 48" width={72} height={48} {...base} {...props}>
      <rect x="4" y="10" width="60" height="30" rx="3" />
      <rect x="64" y="18" width="5" height="14" rx="1.5" />
      <path d="M34 16l-7 10h8l-7 10" stroke="currentColor" />
      <line x1="14" y1="18" x2="14" y2="32" />
      <line x1="20" y1="18" x2="20" y2="32" />
      <line x1="50" y1="18" x2="50" y2="32" />
      <line x1="56" y1="18" x2="56" y2="32" />
    </svg>
  );
}

export function StatcomIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 56 64" width={56} height={64} {...base} {...props}>
      <line x1="28" y1="2" x2="28" y2="14" />
      <rect x="8" y="14" width="40" height="34" rx="4" />
      <path d="M28 20a8 8 0 010 16M28 20a8 8 0 000 16" />
      <line x1="28" y1="48" x2="28" y2="60" />
      <line x1="14" y1="60" x2="42" y2="60" />
    </svg>
  );
}

export function SynConIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 56 64" width={56} height={64} {...base} {...props}>
      <line x1="28" y1="2" x2="28" y2="12" />
      <circle cx="28" cy="30" r="16" />
      <path d="M20 30a8 5 0 0116 0" />
      <text
        x="28"
        y="34"
        textAnchor="middle"
        fontSize="11"
        fontWeight="bold"
        fill="currentColor"
        stroke="none"
      >
        SC
      </text>
      <line x1="28" y1="46" x2="28" y2="60" />
      <line x1="14" y1="60" x2="42" y2="60" />
    </svg>
  );
}

export function GeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={className} aria-hidden>
      <circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <text
        x="30"
        y="38"
        textAnchor="middle"
        fontStyle="italic"
        fontFamily="Georgia, serif"
        fontSize="22"
        fill="currentColor"
      >
        ge
      </text>
    </svg>
  );
}