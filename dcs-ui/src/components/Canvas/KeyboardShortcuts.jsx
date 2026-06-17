import React, { useState } from 'react';
import './KeyboardShortcuts.css';

const KeyboardShortcuts = () => {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    { keys: ['Drag'], desc: 'Box-select components & wires (design mode)' },
    { keys: ['Shift', 'Click'], desc: 'Multi-select components' },
    { keys: ['Ctrl/⌘', 'C'], desc: 'Copy selection (blocks, wires, sparklines)' },
    { keys: ['Ctrl/⌘', 'V'], desc: 'Paste beside selection (repeat moves farther)' },
    { keys: ['Ctrl/⌘', 'A'], desc: 'Select all' },
    { keys: ['Esc'], desc: 'Clear selection' },
    { keys: ['↑↓←→'], desc: 'Pan checkerboard (24px per press)' },
    { keys: ['Ctrl/⌘', '↑/↓'], desc: 'Zoom in / out' },
    { keys: ['Shift', '↑↓←→'], desc: 'Nudge selected components (design mode)' },
    { keys: ['Delete'], desc: 'Delete selected' },
    { keys: ['⌘/Ctrl', 'Click'], desc: 'Start/finish connection (right-click = charts on Mac)' },
    { keys: ['Alt', 'Drag'], desc: 'Pan canvas' },
    { keys: ['Trackpad 2-finger'], desc: 'Pan canvas' }
  ];

  if (!isOpen) {
    return (
      <button 
        className="shortcuts-toggle-btn"
        onClick={() => setIsOpen(true)}
        title="Keyboard Shortcuts (K)"
      >
        ⌨️
      </button>
    );
  }

  return (
    <div className="keyboard-shortcuts-panel">
      <div className="shortcuts-header">
        <div className="shortcuts-title">⌨️ Keyboard Shortcuts</div>
        <button 
          className="shortcuts-close"
          onClick={() => setIsOpen(false)}
        >
          ✕
        </button>
      </div>
      
      <div className="shortcuts-list">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="shortcut-item">
            <div className="shortcut-key">
              {shortcut.keys.map((key, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="key-plus">+</span>}
                  <span className="key-badge">{key}</span>
                </React.Fragment>
              ))}
            </div>
            <div className="shortcut-desc">{shortcut.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
