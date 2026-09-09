/**
 * Blade hub position within client_blades.svg (viewBox 106.27 × 97.83).
 * Hub centre: cx=56.56 cy=60.42 → 53.213% × 61.760%.
 */
const BLADES_HUB_PCT = { x: "53.213%", y: "61.760%" };

/**
 * Tower (client_base.svg) geometry relative to the blades image width.
 *
 * Blades viewBox  : 106.27 × 97.83  (aspect 0.9206)
 * Tower viewBox   : 11.59  × 159.5
 * AnimatedWindmill div width = 4.2% of diagram_width.
 * Div height = 4.2% × 0.9206 × (633.15/226.06) = 10.83% of diagram_height.
 *
 * Hub within div: 61.76% of div_height.
 * Bus line (y=39.75) from div top = 163.7% of div_height.
 * Tower visible height = 163.7% − 61.76% ≈ 102% of div_height → height of clip wrapper.
 *
 * Tower width as % of blades width : 11.59 / 106.27 ≈ 10.91%
 * Tower left so its centre = hub-x (53.213%): 53.213% − 10.91%/2 ≈ 47.76%
 */
const TOWER_CLIP_STYLE = {
  left: "47.76%",
  top: "61.76%",
  width: "10.91%",
  height: "82%", // clips tower bottom exactly at the connecting bus line
} as const;

export function AnimatedWindmill({
  spinning = true,
  className = "",
}: {
  spinning?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none select-none relative ${className}`}
      aria-hidden
    >
      {/* Blades — spinning layer */}
      <img
        src="/svgs/WindFarm/windmill/client_blades.svg"
        alt=""
        draggable={false}
        className={
          spinning
            ? "wf-blade-spin block w-full h-auto drop-shadow-[0_0_3px_rgba(250,250,255,0.7)]"
            : "block w-full h-auto"
        }
        style={{ transformOrigin: `${BLADES_HUB_PCT.x} ${BLADES_HUB_PCT.y}` }}
      />

      {/* Tower / legs — clipped at the bus line via overflow-hidden wrapper */}
      <div
        className="absolute overflow-hidden"
        style={TOWER_CLIP_STYLE}
      >
        <img
          src="/svgs/WindFarm/windmill/client_base.svg"
          alt=""
          draggable={false}
          className="w-full h-auto pointer-events-none"
        />
      </div>
    </div>
  );
}


/**
 * Exact nacelle hub coordinates for Gridplansinglealign.svg (viewBox 633.15 × 226.06).
 * Hubs at x = 390.25, 421.64, 449.25; y = 14.78.
 */
export const WFMS_TURBINE_SLOTS = [
  { left: "61.64%", top: "6.54%" },
  { left: "66.59%", top: "6.54%" },
  { left: "70.95%", top: "6.54%" },
] as const;

