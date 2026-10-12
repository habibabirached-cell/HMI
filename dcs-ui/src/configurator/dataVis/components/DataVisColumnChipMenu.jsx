import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Compact “choose columns” control — opens a wide chip popover (same pattern as filter bar).
 * mode multi: toggle chips up to maxSelected; single: one active chip.
 */
export default function DataVisColumnChipMenu({
  columns,
  mode = 'multi',
  selectedMulti = [],
  selectedSingle = '',
  maxSelected = 12,
  buttonText = 'Choose columns',
  showMaxInButton = true,
  menuHint,
  onToggle,
  onSelect,
  isColumnVisible = () => true,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const visibleColumns = useMemo(
    () => (columns || []).filter(isColumnVisible),
    [columns, isColumnVisible],
  );

  const selectedCount = useMemo(() => {
    if (mode === 'single') return selectedSingle ? 1 : 0;
    return selectedMulti.length;
  }, [mode, selectedMulti.length, selectedSingle]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocPointer = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleChipClick = (col) => {
    if (mode === 'single') {
      onSelect?.(col);
      return;
    }
    onToggle?.(col);
  };

  const isOn = (col) => {
    if (mode === 'single') return col === selectedSingle;
    return selectedMulti.includes(col);
  };

  const isDisabled = (col) => {
    if (mode === 'single') return false;
    if (selectedMulti.includes(col)) return false;
    return selectedMulti.length >= maxSelected;
  };

  const buttonLabel = showMaxInButton
    ? `${buttonText} (up to ${maxSelected})`
    : buttonText;

  return (
    <div
      className={`dataVis-columnChipPicker${className ? ` ${className}` : ''}`}
      ref={rootRef}
    >
      <button
        type="button"
        className={`dataVis-columnChipPicker__btn${open ? ' dataVis-columnChipPicker__btn--open' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        {buttonLabel}
        <span className="dataVis-columnChipPicker__count">{selectedCount} selected</span>
      </button>
      {open ? (
        <div className="dataVis-columnChipMenu" role="dialog" aria-label={buttonText}>
          {menuHint ? <p className="dataVis-columnChipMenu__hint">{menuHint}</p> : null}
          <div className="dataVis-chipRow dataVis-chipRow--columnMenu">
            {visibleColumns.map((col) => (
              <button
                key={col}
                type="button"
                className={`dataVis-chip ${isOn(col) ? 'dataVis-chip--on' : ''}`}
                disabled={isDisabled(col)}
                onClick={() => handleChipClick(col)}
                title={
                  isDisabled(col) ? `Maximum ${maxSelected} selections` : undefined
                }
              >
                {col}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
