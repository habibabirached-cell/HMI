import React from 'react';
import IdeumKioskHomeButton from './IdeumKioskHomeButton';
import IdeumKioskResetButton from './IdeumKioskResetButton';
import './IdeumKioskHomeCluster.css';

/** Home (⌂) with optional Maingear Reset — grouped on bucket title bars. */
export default function IdeumKioskHomeCluster({
  onHome,
  onReset,
  className = '',
}) {
  if (!onHome && !onReset) return null;
  return (
    <div
      className={`ideum-kiosk-home-cluster${className ? ` ${className}` : ''}`}
    >
      {onReset ? (
        <IdeumKioskResetButton
          onReset={onReset}
          className="ideum-kiosk-home-cluster__reset"
        />
      ) : null}
      {onHome ? (
        <IdeumKioskHomeButton
          onHome={onHome}
          className="ideum-kiosk-home-cluster__home"
        />
      ) : null}
    </div>
  );
}
