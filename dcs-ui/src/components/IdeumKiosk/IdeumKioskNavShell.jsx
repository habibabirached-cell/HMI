import React, { useRef } from 'react';
import Ideum05NavLayer from './Ideum05NavLayer';
import './IdeumKioskNavShell.css';

/** Full-screen Ideum nav cards only — no canvas, simulation, or root landing. */
export default function IdeumKioskNavShell({
  screenId,
  onSelectCard,
  onBack,
  showBack = true,
  zoom = 1,
  pan = { x: 0, y: 0 },
}) {
  const canvasRef = useRef(null);

  return (
    <div className="ideum-kiosk-nav-shell">
      <div className="ideum-kiosk-nav-shell__viewport">
        <div ref={canvasRef} className="ideum-kiosk-nav-shell__canvas-anchor">
          <Ideum05NavLayer
            screenId={screenId}
            pan={pan}
            zoom={zoom}
            canvasRef={canvasRef}
            onSelectCard={onSelectCard}
            onBack={onBack}
            showBack={showBack}
          />
        </div>
      </div>
    </div>
  );
}
