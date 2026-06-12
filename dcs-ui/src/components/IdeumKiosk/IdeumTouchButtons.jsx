import React, { useLayoutEffect, useState } from 'react';
import { getComponentVisualConfig } from '../../data/componentVisuals';
import { getScaledCanvasBlockDimensions } from '../Canvas/shapes/canvasBlockUtils';
import './IdeumTouchButtons.css';

function unionBoundsForIds(componentIds, components, blockTypeScale) {
  const byId = new Map(components.map((c) => [c.id, c]));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = 0;

  for (const id of componentIds) {
    const comp = byId.get(id);
    if (!comp) continue;
    const vis = getComponentVisualConfig(comp.type);
    const { width, height } = getScaledCanvasBlockDimensions(comp, vis, blockTypeScale);
    const x = comp.position?.x ?? 0;
    const y = comp.position?.y ?? 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
    found += 1;
  }

  if (found === 0 || !Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * Full-surface touch targets on the canvas (above 3D previews).
 * Single-component buttons wrap one block; grouped buttons wrap a shared rectangle.
 */
export default function IdeumTouchButtons({
  buttons = [],
  components = [],
  pan,
  zoom,
  canvasRef,
  blockTypeScale = {},
  onButtonClick,
}) {
  const [targets, setTargets] = useState([]);

  useLayoutEffect(() => {
    const canvasEl = canvasRef?.current;
    if (!canvasEl || !buttons.length) {
      setTargets([]);
      return undefined;
    }

    const update = () => {
      const next = [];

      for (const button of buttons) {
        const ids = Array.isArray(button.componentIds) ? button.componentIds : [];
        if (!ids.length || !button.label) continue;

        const bounds = unionBoundsForIds(ids, components, blockTypeScale);
        if (!bounds) continue;

        const grouped = ids.length > 1 || button.grouped === true;
        const padTop = grouped ? 48 : 40;
        const padSide = grouped ? 24 : 16;
        const padBottom = grouped ? 24 : 16;
        const gapBetween = grouped ? 20 : 0;

        const x = bounds.minX - padSide;
        const y = bounds.minY - padTop;
        const w = bounds.maxX - bounds.minX + padSide * 2;
        const h = bounds.maxY - bounds.minY + padTop + padBottom + gapBetween;

        next.push({
          id: button.id,
          label: button.label,
          grouped,
          left: pan.x + x * zoom,
          top: pan.y + y * zoom,
          width: w * zoom,
          height: h * zoom,
          labelFontSize: Math.max(14, Math.round((grouped ? 22 : 20) * zoom)),
          button,
        });
      }

      setTargets(next);
    };

    update();

    const container = canvasEl.parentElement;
    if (typeof ResizeObserver !== 'undefined' && container) {
      const ro = new ResizeObserver(update);
      ro.observe(container);
      return () => ro.disconnect();
    }

    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [buttons, components, pan, zoom, canvasRef, blockTypeScale]);

  const handleActivate = (e, button) => {
    e.preventDefault();
    e.stopPropagation();
    onButtonClick?.(button);
  };

  if (!targets.length) return null;

  return (
    <div className="ideum-touch-buttons" aria-hidden={false}>
      {targets.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`ideum-touch-btn${t.grouped ? ' ideum-touch-btn--grouped' : ''}`}
          style={{
            left: t.left,
            top: t.top,
            width: t.width,
            height: t.height,
          }}
          onClick={(e) => handleActivate(e, t.button)}
          aria-label={t.label}
        >
          <span
            className="ideum-touch-btn__label"
            style={{ fontSize: t.labelFontSize }}
          >
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}
