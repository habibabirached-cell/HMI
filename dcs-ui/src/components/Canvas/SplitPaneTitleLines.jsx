import React from 'react';

/** Two-line split pane title with optional second line. */
export default function SplitPaneTitleLines({ title }) {
  if (!title) return null;
  const line1 = title.line1 ?? '';
  const line2 = title.line2 ?? '';

  return (
    <div className="canvas-split-pane-title__lines">
      {line1 ? <span className="canvas-split-pane-title__text">{line1}</span> : null}
      {line2 ? <span className="canvas-split-pane-title__text">{line2}</span> : null}
    </div>
  );
}
