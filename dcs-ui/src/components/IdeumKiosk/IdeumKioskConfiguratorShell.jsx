import React from 'react';
import './IdeumKioskNavShell.css';

/**
 * Full-screen isolated configurator shell — opaque layer so DataCenter 3D nav is not visible underneath.
 */
export default function IdeumKioskConfiguratorShell({ children }) {
  return (
    <div className="ideum-kiosk-nav-shell ideum-kiosk-configurator-shell">
      <div className="ideum-kiosk-configurator-shell__content">{children}</div>
    </div>
  );
}
