import React from 'react';
import { useConf3d } from '../utils/conf_3dContext';

/** Configurator-only toggle — unmounts WebGL previews on this page when off. */
export default function Conf3dToggleButton({ className = '', variant = 'icon' }) {
  const { enable3d, toggle3d } = useConf3d();
  const label = variant === 'icon' ? '3D' : (enable3d ? '3D On' : '3D Off');

  return (
    <button
      type="button"
      className={`conf-3d-toggle conf-3d-toggle--${variant}${enable3d ? ' conf-3d-toggle--on' : ' conf-3d-toggle--off'}${className ? ` ${className}` : ''}`}
      onClick={toggle3d}
      aria-pressed={enable3d}
      aria-label={enable3d ? 'Turn off 3D previews' : 'Turn on 3D previews'}
      title={enable3d ? 'Turn off 3D previews (faster UI)' : 'Turn on 3D previews'}
    >
      {label}
    </button>
  );
}
