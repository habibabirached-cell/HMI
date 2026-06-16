import React, { useEffect } from 'react';
import './QuickScenarioContextMenu.css';

function QuickScenarioContextMenu({ position, shortcut, onSaveScenarioAs, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!position || !shortcut) return null;

  return (
    <div
      className="quick-scenario-context-overlay"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose?.();
      }}
    >
      <div
        className="quick-scenario-context-menu"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        onClick={(e) => e.stopPropagation()}
        role="menu"
      >
        <button
          type="button"
          className="quick-scenario-context-item"
          role="menuitem"
          onClick={() => {
            onSaveScenarioAs?.(shortcut);
            onClose?.();
          }}
        >
          Save scenario as…
        </button>
      </div>
    </div>
  );
}

export default QuickScenarioContextMenu;
