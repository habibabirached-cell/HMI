import React, { useLayoutEffect, useState } from 'react';
import { getComponentVisualConfig } from '../../data/componentVisuals';
import { getScaledCanvasBlockDimensions } from '../Canvas/shapes/canvasBlockUtils';
import './IdeumCanvasTitles.css';

/**
 * Group titles for Ideum touch buttons (e.g. one label above BESS + GFMe pair).
 */
export default function IdeumCanvasTitles({
  buttons = [],
  components = [],
  pan,
  zoom,
  canvasRef,
}) {
  const [titles, setTitles] = useState([]);

  useLayoutEffect(() => {
    const canvasEl = canvasRef?.current;
    if (!canvasEl || !buttons.length) {
      setTitles([]);
      return undefined;
    }

    const update = () => {
      const byId = new Map(components.map((c) => [c.id, c]));
      const next = [];

      for (const button of buttons) {
        const ids = Array.isArray(button.componentIds) ? button.componentIds : [];
        if (ids.length < 2 || !button.label) continue;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let found = 0;

        for (const id of ids) {
          const comp = byId.get(id);
          if (!comp) continue;
          const vis = getComponentVisualConfig(comp.type);
          const { width, height } = getScaledCanvasBlockDimensions(comp, vis, {});
          const x = comp.position?.x ?? 0;
          const y = comp.position?.y ?? 0;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + width);
          found += 1;
        }

        if (found < 2 || !Number.isFinite(minX)) continue;

        const centerX = (minX + maxX) / 2;
        const titleY = minY - 48;
        next.push({
          id: button.id,
          label: button.label,
          left: pan.x + centerX * zoom,
          top: pan.y + titleY * zoom,
          fontSize: Math.max(14, Math.round(22 * zoom)),
        });
      }

      setTitles(next);
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
  }, [buttons, components, pan, zoom, canvasRef]);

  if (!titles.length) return null;

  return (
    <div className="ideum-canvas-titles" aria-hidden={false}>
      {titles.map((t) => (
        <div
          key={t.id}
          className="ideum-canvas-title"
          style={{
            left: t.left,
            top: t.top,
            fontSize: t.fontSize,
          }}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}
