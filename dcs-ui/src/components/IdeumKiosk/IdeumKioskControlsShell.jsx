import React, { useRef } from 'react';
import IdeumComponentLayer from './IdeumComponentLayer';
import Ideum05BackButton from './Ideum05BackButton';
import Ideum05ResetButton from './Ideum05ResetButton';
import Ideum05LiveRtdsButton from './Ideum05LiveRtdsButton';
import '../Canvas/Canvas.css';
import './IdeumKioskNavShell.css';

/**
 * Reference 200 MW — Ideum touch controls only (no full Canvas / simulation tree).
 */
export default function IdeumKioskControlsShell({
  components = [],
  zoom = 1,
  pan = { x: 0, y: 0 },
  canvasBlockTypeScale = {},
  onBack,
  onReset,
  onLiveRtds,
  onIdeumClick,
  ideumExpansionMirror,
  onIdeumExpansionToggle,
}) {
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);

  return (
    <div className="ideum-kiosk-nav-shell ideum-kiosk-controls-shell">
      <div ref={viewportRef} className="ideum-kiosk-nav-shell__viewport canvas-container">
        <svg ref={canvasRef} className="canvas-svg" aria-hidden="true" />
        <div className="ideum05-nav-layer" aria-hidden={false}>
          <div className="ideum05-nav-top-actions">
            <Ideum05BackButton onBack={onBack} />
            <Ideum05ResetButton onReset={onReset} />
            <Ideum05LiveRtdsButton onLiveRtds={onLiveRtds} />
          </div>
          <IdeumComponentLayer
            components={components}
            pan={pan}
            zoom={zoom}
            canvasRef={canvasRef}
            blockTypeScale={canvasBlockTypeScale}
            onIdeumClick={onIdeumClick}
            ideumExpansionMirror={ideumExpansionMirror}
            onIdeumExpansionToggle={onIdeumExpansionToggle}
          />
        </div>
      </div>
    </div>
  );
}
