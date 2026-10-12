import React, { useCallback, useEffect, useRef, useState } from 'react';

export const BEZEL_MIN = 15;
export const BEZEL_MAX = 85;
export const DEFAULT_BEZEL_SPLIT = { x: 50, y: 50 };

function clampSplit(value) {
  return Math.min(BEZEL_MAX, Math.max(BEZEL_MIN, value));
}

function readStoredSplit(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return DEFAULT_BEZEL_SPLIT;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      return { x: clampSplit(parsed.x), y: clampSplit(parsed.y) };
    }
  } catch (_) {
    /* ignore */
  }
  return DEFAULT_BEZEL_SPLIT;
}

export function useWallBezelSplit(storageKey) {
  const [split, setSplit] = useState(() => readStoredSplit(storageKey));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(split));
    } catch (_) {
      /* ignore */
    }
  }, [split, storageKey]);

  const resetSplit = useCallback(() => setSplit(DEFAULT_BEZEL_SPLIT), []);

  return { split, setSplit, resetSplit };
}

export default function WallBezelShell({
  split,
  setSplit,
  resetSplit,
  children,
  className = '',
  shellClassName = '',
}) {
  const shellRef = useRef(null);
  const dragRef = useRef(null);

  const gridStyle = {
    gridTemplateColumns: `${split.x}% ${100 - split.x}%`,
    gridTemplateRows: `${split.y}% ${100 - split.y}%`,
  };

  const updateSplitFromPointer = useCallback((clientX, clientY, axis) => {
    const rect = shellRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSplit((prev) => {
      const next = { ...prev };
      if (axis === 'x' || axis === 'both') {
        next.x = clampSplit(((clientX - rect.left) / rect.width) * 100);
      }
      if (axis === 'y' || axis === 'both') {
        next.y = clampSplit(((clientY - rect.top) / rect.height) * 100);
      }
      return next;
    });
  }, [setSplit]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    document.body.classList.remove(
      'conf-wall-bezel-dragging',
      'conf-wall-bezel-dragging-x',
      'conf-wall-bezel-dragging-y',
      'conf-wall-bezel-dragging-both',
    );
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();
      updateSplitFromPointer(e.clientX, e.clientY, drag.axis);
    };
    const onUp = () => endDrag();

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [endDrag, updateSplitFromPointer]);

  const startDrag = (axis) => (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { axis };
    document.body.classList.add('conf-wall-bezel-dragging', `conf-wall-bezel-dragging-${axis}`);
    updateSplitFromPointer(e.clientX, e.clientY, axis);
  };

  const handleDividerDoubleClick = (axis) => (e) => {
    e.preventDefault();
    if (axis === 'x') {
      setSplit((prev) => ({ ...prev, x: DEFAULT_BEZEL_SPLIT.x }));
    } else if (axis === 'y') {
      setSplit((prev) => ({ ...prev, y: DEFAULT_BEZEL_SPLIT.y }));
    } else {
      resetSplit();
    }
  };

  return (
    <div
      className={`conf-wall-display-shell ${shellClassName}`.trim()}
      ref={shellRef}
    >
      <div
        className={`conf-wall-display ${className}`.trim()}
        style={gridStyle}
        data-screen-region="results"
      >
        {children}
      </div>

      <div
        className="conf-wall-bezel-divider conf-wall-bezel-divider--vertical"
        style={{ left: `${split.x}%` }}
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(split.x)}
        aria-valuemin={BEZEL_MIN}
        aria-valuemax={BEZEL_MAX}
        aria-label="Drag left or right to resize columns"
        title="Drag to resize · double-click to reset"
        onPointerDown={startDrag('x')}
        onDoubleClick={handleDividerDoubleClick('x')}
      />
      <div
        className="conf-wall-bezel-divider conf-wall-bezel-divider--horizontal"
        style={{ top: `${split.y}%` }}
        role="separator"
        aria-orientation="horizontal"
        aria-valuenow={Math.round(split.y)}
        aria-valuemin={BEZEL_MIN}
        aria-valuemax={BEZEL_MAX}
        aria-label="Drag up or down to resize rows"
        title="Drag to resize · double-click to reset"
        onPointerDown={startDrag('y')}
        onDoubleClick={handleDividerDoubleClick('y')}
      />
      <button
        type="button"
        className="conf-wall-bezel-joint"
        style={{ left: `${split.x}%`, top: `${split.y}%` }}
        aria-label="Drag to move both dividers · double-click to reset"
        title="Drag both dividers · double-click to reset"
        onPointerDown={startDrag('both')}
        onDoubleClick={handleDividerDoubleClick('both')}
      />
    </div>
  );
}
