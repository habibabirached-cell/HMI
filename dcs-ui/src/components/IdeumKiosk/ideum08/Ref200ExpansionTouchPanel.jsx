import React from 'react';
import Ref200HorizontalToggleRow from './Ref200HorizontalToggleRow';
import './Ref200MwSubmenu.css';

/** Breakers / Peripherals — same Maingear commands as ref200Mw (no frame, horizontal toggles). */
export default function Ref200ExpansionTouchPanel({
  ideumExpansionMirror,
  onIdeumExpansionToggle,
  zoom = 1,
}) {
  const breakersCompact = ideumExpansionMirror?.breakersCompact !== false;
  const peripheralsCompact = ideumExpansionMirror?.peripheralsCompact !== false;
  const busy = ideumExpansionMirror?.busy === true;

  return (
    <div className="ideum08-ref200-expansion" aria-label="Breakers and peripherals">
      <Ref200HorizontalToggleRow
        zoom={zoom}
        leftLabel="Collapse breakers"
        rightLabel="Expand breakers"
        rightActive={!breakersCompact}
        onToggle={() => onIdeumExpansionToggle?.('breakers')}
        ariaLabel="Collapse or expand breakers on Maingear"
        disabled={busy}
      />
      <Ref200HorizontalToggleRow
        zoom={zoom}
        leftLabel="Collapse peripherals"
        rightLabel="Expand peripherals"
        rightActive={!peripheralsCompact}
        onToggle={() => onIdeumExpansionToggle?.('peripherals')}
        ariaLabel="Collapse or expand peripherals on Maingear"
        disabled={busy}
      />
    </div>
  );
}
