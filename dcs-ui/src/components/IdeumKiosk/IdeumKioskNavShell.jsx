import React, { useRef } from 'react';
import Ideum05NavLayer from './Ideum05NavLayer';
import '../Canvas/Canvas.css';
import './IdeumKioskNavShell.css';

/**
 * Full-screen Ideum nav cards only — mirrors Canvas + Ideum05NavLayer sibling layout
 * (NavLayer reads canvasRef.current.parentElement for viewport size).
 */
export default function IdeumKioskNavShell({
  screenId,
  onSelectCard,
  onBack,
  showBack = true,
  zoom = 1,
  pan = { x: 0, y: 0 },
}) {
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);

  return (
    <div className="ideum-kiosk-nav-shell">
      <div ref={viewportRef} className="ideum-kiosk-nav-shell__viewport canvas-container">
        <svg ref={canvasRef} className="canvas-svg" aria-hidden="true" />
        <Ideum05NavLayer
          screenId={screenId}
          pan={pan}
          zoom={zoom}
          canvasRef={canvasRef}
          viewportRef={viewportRef}
          onSelectCard={onSelectCard}
          onBack={onBack}
          showBack={showBack}
        />
      </div>
    </div>
  );
}
