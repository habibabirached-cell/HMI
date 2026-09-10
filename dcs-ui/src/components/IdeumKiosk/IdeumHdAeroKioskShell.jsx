import React from 'react';
import Ideum05BackButton from './Ideum05BackButton';
import './IdeumKioskNavShell.css';

/**
 * Reference 500 MW — HD_Aero schematic + Ideum control panels (no app chrome / nav 3D).
 */
export default function IdeumHdAeroKioskShell({ onBack, children }) {
  return (
    <div className="ideum-kiosk-nav-shell ideum-kiosk-hd-aero-shell">
      <div className="ideum-kiosk-nav-shell__viewport ideum-kiosk-hd-aero-shell__viewport">
        <div className="ideum-kiosk-hd-aero-shell__top">
          <Ideum05BackButton onBack={onBack} />
        </div>
        {children}
      </div>
    </div>
  );
}
