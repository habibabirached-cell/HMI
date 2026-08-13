import React, { useState } from 'react';

export default function ConfInfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="conf-info-tooltip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      role="button"
      aria-label="More information"
    >
      <span className="conf-info-tooltip__icon" aria-hidden="true">i</span>
      {open && <span className="conf-info-tooltip__bubble">{text}</span>}
    </span>
  );
}
