import React from 'react';
import GasTurbine3DViewer from '../Canvas/Schematics/GasTurbine3DViewer';
import Bess3DViewer from '../Canvas/Schematics/Bess3DViewer';
import GFMe3DViewer from '../Canvas/Schematics/GFMe3DViewer';
import { getComponentVisualConfig } from '../../data/componentVisuals';
import { getGasTurbine3DModelUrl } from '../../utils/gasTurbine3dLayout';
import { getBess3DModelUrl } from '../../utils/bess3dLayout';
import { getGFMe3DModelUrl } from '../../utils/gfme3dLayout';
import './IdeumKioskScreen.css';

const PREVIEW_W = 520;
const PREVIEW_H = 360;
const BESS_VISUAL = getComponentVisualConfig('bess-50mw');

/**
 * Full-screen Ideum touch-table UI: two 3D buttons, no menus.
 */
export default function IdeumKioskScreen({ machineRole, onCommand }) {
  const runCommand = (command) => {
    if (typeof onCommand === 'function') {
      onCommand({ command });
    }
  };

  return (
    <div className="ideum-kiosk">
      <button
        type="button"
        className="ideum-kiosk-card ideum-kiosk-card--turbines"
        onClick={() => runCommand('add8Turbines')}
        aria-label="Add 8 turbines"
      >
        <h2 className="ideum-kiosk-title">Add 8 turbines</h2>
        <div className="ideum-kiosk-preview ideum-kiosk-preview--single">
          <GasTurbine3DViewer
            width={PREVIEW_W}
            height={PREVIEW_H}
            modelUrl={getGasTurbine3DModelUrl()}
          />
        </div>
      </button>

      <button
        type="button"
        className="ideum-kiosk-card ideum-kiosk-card--bess-gfme"
        onClick={() => runCommand('addStatcomAndGFMe')}
        aria-label="add (GFME) e-Statcom and Bess"
      >
        <h2 className="ideum-kiosk-title">add (GFME) e-Statcom and Bess</h2>
        <div className="ideum-kiosk-preview ideum-kiosk-preview--dual">
          <div className="ideum-kiosk-preview-cell">
            <Bess3DViewer
              width={PREVIEW_W / 2 - 12}
              height={PREVIEW_H}
              modelUrl={getBess3DModelUrl(BESS_VISUAL)}
            />
          </div>
          <div className="ideum-kiosk-preview-cell">
            <GFMe3DViewer
              width={PREVIEW_W / 2 - 12}
              height={PREVIEW_H}
              modelUrl={getGFMe3DModelUrl()}
            />
          </div>
        </div>
      </button>

      {machineRole?.role && (
        <div className="ideum-kiosk-role" aria-live="polite">
          {machineRole.role}
          {machineRole.ethernetIp ? ` · ${machineRole.ethernetIp}` : ''}
        </div>
      )}
    </div>
  );
}
