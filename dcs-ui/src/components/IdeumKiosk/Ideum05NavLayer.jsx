import React, { useLayoutEffect, useState } from 'react';
import {
  getIdeum05NavCardLayout,
  getIdeum05NavCards,
  IDEUM05_DATA_CENTERS_PREVIEW_ASPECT,
  IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP,
  isIdeum05NavCardDisabled,
  isIdeum05NavCardFeatured,
} from '../../utils/ideum05Navigation';
import './Ideum05NavLayer.css';
import './IdeumComponentLayer.css';
import Ideum05BackButton from './Ideum05BackButton';
import Ideum05Nav3DViewer from './Ideum05Nav3DViewer';

const TITLE_BAR_PX = 44;
const INNER_PAD_PX = 12;
const STACKED_MIN_MODEL_PX = 72;

function stackedPreviewWidth(slot) {
  return Math.max(8, Math.round(slot.width));
}

function stackedPreviewHeight(slot, zoom) {
  return Math.max(
    120,
    slot.pixelHeight - Math.round(TITLE_BAR_PX * zoom),
  );
}

function previewAreaSize(slot, zoom, stacked = false) {
  if (stacked) {
    return {
      width: stackedPreviewWidth(slot),
      height: stackedPreviewHeight(slot, zoom),
    };
  }
  return {
    width: Math.max(8, Math.round(slot.width - INNER_PAD_PX * 2 * zoom)),
    height: Math.max(
      80,
      slot.pixelHeight - Math.round((TITLE_BAR_PX + INNER_PAD_PX * 2) * zoom),
    ),
  };
}

function previewImageAspect(card) {
  if (card.previewImageAspect) return card.previewImageAspect;
  if (card.previewImageMatchGroup === IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP) {
    return IDEUM05_DATA_CENTERS_PREVIEW_ASPECT;
  }
  return null;
}

function previewImageStripHeight(slot, zoom, area, matchedImageSizes) {
  if (!slot.card.previewImageUrl || !slot.card.modelUrl) return area.height;

  const matched = matchedImageSizes?.get(slot.id);
  if (matched?.height) return matched.height;

  const aspect = previewImageAspect(slot.card);
  if (aspect) {
    const naturalH = Math.round(area.width / aspect);
    const maxH = Math.round(
      area.height * (slot.card.previewImageHeightShare ?? 0.72),
    );
    return Math.min(naturalH, maxH, area.height - STACKED_MIN_MODEL_PX);
  }

  const share = slot.card.previewImageHeightShare ?? 0.72;
  return Math.max(48, Math.round(area.height * share));
}

function computeStackedSplit(slot, zoom, matchedImageSizes) {
  const area = previewAreaSize(slot, zoom, true);
  const imageStripH = previewImageStripHeight(slot, zoom, area, matchedImageSizes);
  return {
    previewW: area.width,
    previewH: area.height,
    imageStripH,
    modelStripH: Math.max(STACKED_MIN_MODEL_PX, area.height - imageStripH),
  };
}

function hasStackedImageAndModel(card) {
  return Boolean(card.previewImageUrl && card.modelUrl);
}

/** Same pixel width/height for stacked diagram images in a match group. */
function computeMatchedImageSizes(slots, zoom) {
  const byGroup = new Map();
  for (const slot of slots) {
    const group = slot.card.previewImageMatchGroup;
    if (!group || !slot.card.previewImageUrl || !slot.card.modelUrl) continue;
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push(slot);
  }

  const sizes = new Map();
  for (const groupSlots of byGroup.values()) {
    if (groupSlots.length < 2) continue;

    let minW = Infinity;
    for (const slot of groupSlots) {
      minW = Math.min(minW, stackedPreviewWidth(slot));
    }

    const aspect =
      previewImageAspect(groupSlots[0].card) ?? IDEUM05_DATA_CENTERS_PREVIEW_ASPECT;
    const width = minW;
    const height = Math.round(minW / aspect);

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

    const container = canvasEl.parentElement;

    const update = () => {
      const viewport = container
        ? { width: container.clientWidth, height: container.clientHeight, zoom }
        : { zoom };
      const cardLayout = getIdeum05NavCardLayout(screenId, viewport);
      setSlots(
        cards.map((card, i) =>
          layoutNavCard(card, cardLayout[i], pan, zoom),
        ),
      );
    };

    update();

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
        const stacked = hasStackedImageAndModel(slot.card);
        const matchedImageSizesForSlot = matchedImageSizes;
        const split = stacked
          ? computeStackedSplit(slot, zoom, matchedImageSizesForSlot)
          : null;
        const previewW = split?.previewW
          ?? Math.max(8, Math.round(slot.width - INNER_PAD_PX * 2 * zoom));
        const previewH = split?.previewH
          ?? Math.max(
            80,
            slot.pixelHeight - Math.round((TITLE_BAR_PX + INNER_PAD_PX * 2) * zoom),
          );
        const imageStripH = split?.imageStripH ?? previewH;
        const modelStripH = split?.modelStripH ?? previewH;
        const disabled = isIdeum05NavCardDisabled(slot.card);
        const featured = isIdeum05NavCardFeatured(slot.card);
        return (
          <button
            key={slot.id}
            type="button"
            disabled={disabled}
            className={`ideum-component-btn ideum-component-btn--nav-card${
              featured ? ' ideum-component-btn--nav-card-featured' : ''
            }${disabled ? ' ideum-component-btn--nav-card-disabled' : ''}`}
            style={{
              left: slot.left,
              top: slot.top,
              width: slot.width,
              height: slot.height,
            }}
            onClick={(e) => {
              if (disabled) return;
              e.preventDefault();
              e.stopPropagation();
              onSelectCard?.(slot.card.id);
            }}
            aria-label={slot.card.label}
            aria-disabled={disabled || undefined}
          >
            <span
              className={`ideum-component-btn__title${
                featured ? ' ideum-component-btn__title--featured' : ''
              }${disabled ? ' ideum-component-btn__title--disabled' : ''}`}
              style={{ fontSize: slot.titleFontPx, height: TITLE_BAR_PX * zoom }}
            >
              {slot.card.label}
            </span>
            <div
              className={`ideum05-nav-card__preview${
                stacked
                  ? ' ideum05-nav-card__preview--stacked'
                  : slot.card.modelUrl
                    ? ' ideum05-nav-card__preview--3d'
                    : slot.card.previewImageUrl
                      ? ' ideum05-nav-card__preview--image'
                      : ''
              }`}
              style={{ padding: stacked ? 0 : INNER_PAD_PX * zoom, minHeight: previewH }}
            >
              {stacked ? (
                <>
                  <div
                    className="ideum05-nav-card__preview-image-strip"
                    style={{ height: imageStripH, minHeight: imageStripH, maxHeight: imageStripH }}
                  >
                    <img
                      className={`ideum05-nav-card__preview-image ideum05-nav-card__preview-image--stacked${
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
                  </div>
                  <div
                    className="ideum05-nav-card__preview-3d-strip"
                    style={{ height: modelStripH, minHeight: modelStripH }}
                  >
                    <Ideum05Nav3DViewer
                      width={previewW}
                      height={modelStripH}
                      modelUrl={slot.card.modelUrl}
                      fitScale={slot.card.modelFitScale}
                      modelYOffset={slot.card.modelYOffset}
                      cameraPitchLift={slot.card.cameraPitchLift}
                    />
                  </div>
                </>
              ) : slot.card.modelUrl ? (
                <Ideum05Nav3DViewer
                  width={previewW}
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
