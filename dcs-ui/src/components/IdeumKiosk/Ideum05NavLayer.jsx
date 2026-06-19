import React, { useLayoutEffect, useState } from 'react';
import {
  getIdeum05NavCards,
  IDEUM05_MW_REF_IMAGE_ASPECT,
  IDEUM05_MW_REF_IMAGE_MATCH_GROUP,
  IDEUM05_NAV_CARD_LAYOUT,
} from '../../utils/ideum05Navigation';
import './Ideum05NavLayer.css';
import './IdeumComponentLayer.css';
import Ideum05BackButton from './Ideum05BackButton';
import Ideum05Nav3DViewer from './Ideum05Nav3DViewer';

const TITLE_BAR_PX = 44;
const INNER_PAD_PX = 12;

function previewAreaSize(slot, zoom) {
  return {
    width: Math.max(8, Math.round(slot.width - INNER_PAD_PX * 2 * zoom)),
    height: Math.max(
      80,
      slot.pixelHeight - Math.round((TITLE_BAR_PX + INNER_PAD_PX * 2) * zoom),
    ),
  };
}

/** Same pixel width/height for cards sharing previewImageMatchGroup (e.g. 300/500 MW). */
function computeMatchedImageSizes(slots, zoom) {
  const byGroup = new Map();
  for (const slot of slots) {
    const group = slot.card.previewImageMatchGroup;
    if (!group || !slot.card.previewImageUrl) continue;
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push(slot);
  }

  const sizes = new Map();
  for (const groupSlots of byGroup.values()) {
    if (groupSlots.length < 2) continue;

    let minW = Infinity;
    let minH = Infinity;
    for (const slot of groupSlots) {
      const area = previewAreaSize(slot, zoom);
      minW = Math.min(minW, area.width);
      minH = Math.min(minH, area.height);
    }

    const aspect =
      groupSlots[0].card.previewImageMatchGroup === IDEUM05_MW_REF_IMAGE_MATCH_GROUP
        ? IDEUM05_MW_REF_IMAGE_ASPECT
        : minW / minH;

    let width;
    let height;
    if (minW / minH > aspect) {
      height = minH;
      width = Math.round(minH * aspect);
    } else {
      width = minW;
      height = Math.round(minW / aspect);
    }

    for (const slot of groupSlots) {
      sizes.set(slot.id, { width, height });
    }
  }

  return sizes;
}

function layoutNavCard(card, layout, pan, zoom) {
  const slotW = layout.width * zoom;
  const slotH = layout.height * zoom;
  return {
    id: card.id,
    card,
    left: pan.x + layout.x * zoom,
    top: pan.y + layout.y * zoom,
    width: slotW,
    height: slotH,
    pixelHeight: Math.max(8, Math.round(slotH)),
    titleFontPx: Math.max(14, Math.round(20 * zoom)),
  };
}

/**
 * Ideum05 landing / sub-menu cards (placeholders) before the control surface.
 */
export default function Ideum05NavLayer({
  screenId,
  pan,
  zoom,
  canvasRef,
  onSelectCard,
  onBack,
  showBack = false,
}) {
  const [slots, setSlots] = useState([]);
  const cards = getIdeum05NavCards(screenId);

  useLayoutEffect(() => {
    const canvasEl = canvasRef?.current;
    if (!canvasEl || !cards.length) {
      setSlots([]);
      return undefined;
    }

    const update = () => {
      setSlots(
        cards.map((card, i) =>
          layoutNavCard(card, IDEUM05_NAV_CARD_LAYOUT[i], pan, zoom),
        ),
      );
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
  }, [cards, pan, zoom, canvasRef, screenId]);

  if (!slots.length) return null;

  const matchedImageSizes = computeMatchedImageSizes(slots, zoom);

  return (
    <div className="ideum05-nav-layer" aria-hidden={false}>
      {showBack && <Ideum05BackButton onBack={onBack} />}
      {slots.map((slot) => {
        const previewH = Math.max(
          80,
          slot.pixelHeight - Math.round((TITLE_BAR_PX + INNER_PAD_PX * 2) * zoom),
        );
        return (
          <button
            key={slot.id}
            type="button"
            className="ideum-component-btn ideum-component-btn--nav-card"
            style={{
              left: slot.left,
              top: slot.top,
              width: slot.width,
              height: slot.height,
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelectCard?.(slot.card.id);
            }}
            aria-label={slot.card.label}
          >
            <span
              className="ideum-component-btn__title"
              style={{ fontSize: slot.titleFontPx, height: TITLE_BAR_PX * zoom }}
            >
              {slot.card.label}
            </span>
            <div
              className={`ideum05-nav-card__preview${
                slot.card.modelUrl
                  ? ' ideum05-nav-card__preview--3d'
                  : slot.card.previewImageUrl
                    ? ' ideum05-nav-card__preview--image'
                    : ''
              }`}
              style={{ padding: INNER_PAD_PX * zoom, minHeight: previewH }}
            >
              {slot.card.modelUrl ? (
                <Ideum05Nav3DViewer
                  width={Math.max(8, Math.round(slot.width - INNER_PAD_PX * 2 * zoom))}
                  height={previewH}
                  modelUrl={slot.card.modelUrl}
                  fitScale={slot.card.modelFitScale}
                  modelYOffset={slot.card.modelYOffset}
                  cameraPitchLift={slot.card.cameraPitchLift}
                />
              ) : slot.card.previewImageUrl ? (
                <img
                  className={`ideum05-nav-card__preview-image${
                    matchedImageSizes.has(slot.id)
                      ? ' ideum05-nav-card__preview-image--matched'
                      : ''
                  }`}
                  src={slot.card.previewImageUrl}
                  alt={slot.card.label}
                  draggable={false}
                  style={
                    matchedImageSizes.has(slot.id)
                      ? matchedImageSizes.get(slot.id)
                      : undefined
                  }
                />
              ) : (
                <span className="ideum05-nav-card__preview-text">{slot.card.preview}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
