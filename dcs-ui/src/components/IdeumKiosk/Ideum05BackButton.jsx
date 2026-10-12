import React from 'react';
import IdeumKioskBackButton from './common/IdeumKioskBackButton';
import './Ideum05NavLayer.css';

/** Shared back control for Ideum kiosk menus and control surfaces. */
export default function Ideum05BackButton({
  onBack,
  visible = true,
  className = '',
  style,
}) {
  if (!visible) return null;
  return (
    <IdeumKioskBackButton
      onBack={onBack}
      className={`ideum05-nav-back${className ? ` ${className}` : ''}`}
      style={style}
    />
  );
}
