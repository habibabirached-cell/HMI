import React from 'react';
import './IdeumExpansionDock.css';

/**
 * Floating breakers / peripherals toggles on Ideum touch designs.
 * Sends cluster remote commands to the Maingear display (remoteControlTarget design).
 */
export default function IdeumExpansionDock({
  breakersCompact = true,
  peripheralsCompact = true,
  onToggleBreakers,
  onTogglePeripherals,
}) {
  return (
    <div className="ideum-expansion-dock" aria-label="Expansion remote controls">
      <div className="ideum-expansion-dock__title">Expansion</div>
      <div className="ideum-expansion-dock__row">
        <span className="ideum-expansion-dock__label">Breakers</span>
        <button
          type="button"
          role="switch"
          className={`ideum-expansion-dock__switch${
            !breakersCompact ? ' ideum-expansion-dock__switch--on' : ''
          }`}
          aria-checked={!breakersCompact}
          aria-label={breakersCompact ? 'Breakers compact' : 'Breakers expanded'}
          title={breakersCompact ? 'Compact — tap to expand on Maingear' : 'Expanded — tap to compact on Maingear'}
          onClick={() => onToggleBreakers?.()}
        >
          <span className="ideum-expansion-dock__switch-thumb" aria-hidden="true" />
        </button>
      </div>
      <div className="ideum-expansion-dock__row">
        <span className="ideum-expansion-dock__label">Peripherals</span>
        <button
          type="button"
          role="switch"
          className={`ideum-expansion-dock__switch${
            !peripheralsCompact ? ' ideum-expansion-dock__switch--on' : ''
          }`}
          aria-checked={!peripheralsCompact}
          aria-label={peripheralsCompact ? 'Peripherals compact' : 'Peripherals expanded'}
          title={
            peripheralsCompact
              ? 'Compact — tap to expand on Maingear'
              : 'Expanded — tap to compact on Maingear'
          }
          onClick={() => onTogglePeripherals?.()}
        >
          <span className="ideum-expansion-dock__switch-thumb" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
