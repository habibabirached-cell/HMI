import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  getIdeum07NavCardLayout,
  getIdeum07NavCards,
  getIdeum07RootLayoutChrome,
  IDEUM07_DATA_CENTERS_HUB,
  IDEUM07_DATA_CENTERS_PREVIEW_ASPECT,
  IDEUM07_DATA_CENTERS_PREVIEW_MATCH_GROUP,
  IDEUM07_NAV_ROOT,
  isIdeum07AutoFitNavScreen,
  isIdeum07NavCardDisabled,
  isIdeum07NavCardFeatured,
} from '../../utils/ideum07Navigation';
import './Ideum05NavLayer.css';
import './IdeumComponentLayer.css';
import './Ideum07DataCentersHub.css';
import Ideum05BackButton from './Ideum05BackButton';
import Ideum05Nav3DViewer from './Ideum05Nav3DViewer';
import Ideum07DataCentersHub from './Ideum07DataCentersHub';

const TITLE_BAR_PX = 44;
/** Ideum07 root subcard title strip — thin vs bucket chrome (~42px at zoom 1). */
const IDEUM07_SUBNAV_TITLE_BAR_SHARE = 0.48;
const INNER_PAD_PX = 12;
const STACKED_MIN_MODEL_PX = 72;
const NAV_PAN_ORIGIN = { x: 0, y: 0 };

function ideum07SubnavTitleHeight(zoom) {
  return Math.max(20, Math.round(TITLE_BAR_PX * IDEUM07_SUBNAV_TITLE_BAR_SHARE * zoom));
}

function ideum07SubnavTitleFontPx(zoom) {
  return Math.max(9, Math.round(11 * zoom));
}

function ideum07RootSubcardBucket(cardId) {
  return cardId === 'grid-connected' ? 'stability' : 'applications';
}

function stackedPreviewWidth(slot) {
  return Math.max(8, Math.round(slot.width));
}

function stackedPreviewHeight(slot, titleBarPx) {
  return Math.max(
    120,
    slot.pixelHeight - Math.round(titleBarPx),
  );
}

function previewAreaSize(slot, zoom, stacked = false, titleBarPx = TITLE_BAR_PX * zoom) {
  const titleH = Math.round(titleBarPx);
  if (stacked) {
    return {
      width: stackedPreviewWidth(slot),
      height: stackedPreviewHeight(slot, titleH),
    };
  }
  return {
    width: Math.max(8, Math.round(slot.width - INNER_PAD_PX * 2 * zoom)),
    height: Math.max(
      80,
      slot.pixelHeight - Math.round(titleH + INNER_PAD_PX * 2 * zoom),
    ),
  };
}

function previewImageAspect(card) {
  if (card.previewImageAspect) return card.previewImageAspect;
  if (card.previewImageMatchGroup === IDEUM07_DATA_CENTERS_PREVIEW_MATCH_GROUP) {
    return IDEUM07_DATA_CENTERS_PREVIEW_ASPECT;
  }
  return null;
}

function previewImageStripHeight(slot, zoom, area, matchedImageSizes) {
  if (!slot.card.previewImageUrl || !slot.card.modelUrl) return area.height;

  const matched = matchedImageSizes?.get(slot.id);
  if (matched?.height) {
    return Math.min(matched.height, area.height - STACKED_MIN_MODEL_PX);
  }

  if (slot.card.previewImageFill) {
    const share = slot.card.previewImageHeightShare ?? 0.72;
    return Math.max(
      48,
      Math.min(Math.round(area.height * share), area.height - STACKED_MIN_MODEL_PX),
    );
  }

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

function computeStackedSplit(slot, zoom, matchedImageSizes, titleBarPx = TITLE_BAR_PX * zoom) {
  const area = previewAreaSize(slot, zoom, true, titleBarPx);
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
      previewImageAspect(groupSlots[0].card) ?? IDEUM07_DATA_CENTERS_PREVIEW_ASPECT;
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
 * Ideum07 landing / hub / sub-menu cards before the control surface.
 */
export default function Ideum07NavLayer({
  screenId,
  pan,
  zoom,
  canvasRef = null,
  viewportRef = null,
  onSelectCard,
  onBack,
  showBack = false,
  onHubOpenConfigurator,
  onHubOpenReferenceArchitectures,
}) {
  const [slots, setSlots] = useState([]);
  const [rootChrome, setRootChrome] = useState(null);
  const cards = getIdeum07NavCards(screenId);
  const isHub = screenId === IDEUM07_DATA_CENTERS_HUB;
  const isRoot = screenId === IDEUM07_NAV_ROOT;
  const autoFitNav = isIdeum07AutoFitNavScreen(screenId);
  const navPan = useMemo(
    () => (autoFitNav ? NAV_PAN_ORIGIN : pan),
    [autoFitNav, pan],
  );

  useLayoutEffect(() => {
    if (isHub) {
      setSlots([]);
      return undefined;
    }
    if (!cards.length) {
      setSlots([]);
      return undefined;
    }

    const measureViewport = () => {
      const svg = canvasRef?.current;
      if (svg?.getBoundingClientRect) {
        const rect = svg.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return { width: rect.width, height: rect.height, zoom };
        }
      }
      const container = viewportRef?.current ?? svg?.parentElement;
      const width = container?.clientWidth
        ?? (typeof window !== 'undefined' ? window.innerWidth : 1920);
      const height = container?.clientHeight
        ?? (typeof window !== 'undefined' ? window.innerHeight : 1080);
      return { width, height, zoom };
    };

    const update = () => {
      const viewport = measureViewport();
      const cardLayout = getIdeum07NavCardLayout(screenId, viewport);
      setRootChrome(isRoot ? getIdeum07RootLayoutChrome(screenId, viewport) : null);
      setSlots(
        cards
          .map((card, i) => {
            const layout = cardLayout[i];
            if (!layout) return null;
            return layoutNavCard(card, layout, navPan, zoom);
          })
          .filter(Boolean),
      );
    };

    update();

    const container = viewportRef?.current ?? canvasRef?.current?.parentElement;
    if (typeof ResizeObserver !== 'undefined' && container) {
      const ro = new ResizeObserver(update);
      ro.observe(container);
      return () => ro.disconnect();
    }

    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [cards, navPan, zoom, canvasRef, viewportRef, screenId, isHub, isRoot]);

  if (isHub) {
    return (
      <Ideum07DataCentersHub
        onBack={onBack}
        onOpenConfigurator={onHubOpenConfigurator}
        onOpenReferenceArchitectures={onHubOpenReferenceArchitectures}
      />
    );
  }

  if (!slots.length) {
    return (
      <div className="ideum05-nav-layer" aria-hidden={false}>
        {showBack ? <Ideum05BackButton onBack={onBack} /> : null}
      </div>
    );
  }

  const matchedImageSizes = computeMatchedImageSizes(slots, zoom);

  return (
    <div className="ideum05-nav-layer" aria-hidden={false}>
      {showBack && <Ideum05BackButton onBack={onBack} />}
      {isRoot && rootChrome ? (() => {
        const bucketTitleH = Math.max(28, Math.round(42 * zoom));
        const bucketWallH = Math.max(14, Math.round(bucketTitleH * 0.5));
        const bucketTitleFont = Math.max(13, Math.round(20 * zoom));
        const bucketWallStyle = {
          '--ideum07-bucket-title': `${bucketTitleH}px`,
          '--ideum07-bucket-wall': `${bucketWallH}px`,
        };
        return (
        <>
          <div
            className="ideum07-root-bucket ideum07-root-bucket--stability"
            style={{
              ...bucketWallStyle,
              left: navPan.x + rootChrome.stability.x * zoom,
              top: navPan.y + rootChrome.stability.y * zoom,
              width: rootChrome.stability.width * zoom,
              height: rootChrome.stability.height * zoom,
            }}
          >
            <span className="ideum07-root-bucket__ring" aria-hidden />
            <span className="ideum07-root-bucket__well" aria-hidden />
            <span
              className="ideum07-root-bucket__label"
              style={{
                height: bucketTitleH,
                fontSize: bucketTitleFont,
              }}
            >
              Stability Solutions
            </span>
          </div>
          <div
            className="ideum07-root-bucket ideum07-root-bucket--applications"
            style={{
              ...bucketWallStyle,
              left: navPan.x + rootChrome.applications.x * zoom,
              top: navPan.y + rootChrome.applications.y * zoom,
              width: rootChrome.applications.width * zoom,
              height: rootChrome.applications.height * zoom,
            }}
          >
            <span className="ideum07-root-bucket__ring" aria-hidden />
            <span className="ideum07-root-bucket__well" aria-hidden />
            <span
              className="ideum07-root-bucket__label"
              style={{
                height: bucketTitleH,
                fontSize: bucketTitleFont,
              }}
            >
              Applications
            </span>
          </div>
        </>
        );
      })() : null}
      {slots.map((slot) => {
        const titleBarPx = isRoot
          ? ideum07SubnavTitleHeight(zoom)
          : Math.round(TITLE_BAR_PX * zoom);
        const stacked = hasStackedImageAndModel(slot.card);
        const matchedImageSizesForSlot = matchedImageSizes;
        const split = stacked
          ? computeStackedSplit(slot, zoom, matchedImageSizesForSlot, titleBarPx)
          : null;
        const previewW = split?.previewW
          ?? Math.max(8, Math.round(slot.width - INNER_PAD_PX * 2 * zoom));
        const previewH = split?.previewH
          ?? Math.max(
            80,
            slot.pixelHeight - Math.round(titleBarPx + INNER_PAD_PX * 2 * zoom),
          );
        const imageStripH = split?.imageStripH ?? previewH;
        const modelStripH = split?.modelStripH ?? previewH;
        const disabled = isIdeum07NavCardDisabled(slot.card);
        const featured = isIdeum07NavCardFeatured(slot.card);
        const dimmed = slot.card.navDimmedPreview === true;
        const subnavTitlePx = isRoot ? ideum07SubnavTitleFontPx(zoom) : slot.titleFontPx;
        const subnavTitleH = titleBarPx;
        return (
          <button
            key={slot.id}
            type="button"
            disabled={disabled}
            className={`ideum-component-btn ideum-component-btn--nav-card${
              isRoot ? ' ideum07-root-subcard' : ''
            }${
              isRoot
                ? ` ideum07-root-subcard--${ideum07RootSubcardBucket(slot.id)}`
                : ''
            }${
              featured ? ' ideum-component-btn--nav-card-featured' : ''
            }${disabled ? ' ideum-component-btn--nav-card-disabled' : ''}${
              dimmed ? ' ideum-component-btn--nav-card-dimmed' : ''
            }`}
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
                isRoot ? ' ideum07-subnav-title' : ''
              }${
                featured ? ' ideum-component-btn__title--featured' : ''
              }${slot.card.navTitleActive ? ' ideum-component-btn__title--active' : ''}${
                disabled ? ' ideum-component-btn__title--disabled' : ''
              }`}
              style={{ fontSize: subnavTitlePx, height: subnavTitleH }}
            >
              {isRoot ? (
                <span className="ideum07-subnav-title__text">{slot.card.label}</span>
              ) : (
                slot.card.label
              )}
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
              }${slot.card.previewImageFill && !stacked ? ' ideum05-nav-card__preview--fill' : ''}`}
              style={{ padding: stacked ? 0 : INNER_PAD_PX * zoom, minHeight: previewH }}
            >
              {stacked ? (
                <>
                  <div
                    className={`ideum05-nav-card__preview-image-strip${
                      slot.card.previewImageFill ? ' ideum05-nav-card__preview-image-strip--fill' : ''
                    }`}
                    style={{ height: imageStripH, minHeight: imageStripH, maxHeight: imageStripH }}
                  >
                    <img
                      className={`ideum05-nav-card__preview-image ideum05-nav-card__preview-image--stacked${
                        slot.card.previewImageFill ? ' ideum05-nav-card__preview-image--fill-strip' : ''
                      }${
                        !slot.card.previewImageFill && matchedImageSizes.has(slot.id)
                          ? ' ideum05-nav-card__preview-image--matched'
                          : ''
                      }`}
                      src={slot.card.previewImageUrl}
                      alt={slot.card.label}
                      draggable={false}
                      style={
                        !slot.card.previewImageFill && matchedImageSizes.has(slot.id)
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
                      shiftUP={slot.card.YShiftParalellToTheScreen ?? slot.card.modelShiftUP}
                      cameraPitchLift={slot.card.cameraPitchLift}
                      rotationMode={slot.card.modelRotationMode}
                      pendulumAmplitudeDeg={slot.card.modelPendulumAmplitudeDeg}
                      pendulumPeriodMs={slot.card.modelPendulumPeriodMs}
                      pendulumOffsetDeg={slot.card.modelPendulumOffsetDeg}
                      faceYawDeg={slot.card.modelFaceYawDeg}
                      faceTriggerWindowDeg={slot.card.modelFaceTriggerWindowDeg}
                      flybyTravelScale={slot.card.modelFlybyTravelScale}
                      flybyDurationMs={slot.card.modelFlybyDurationMs}
                      flybyRepeatCount={slot.card.modelFlybyRepeatCount}
                      turntableSpeedScale={slot.card.modelTurntableSpeedScale}
                      showYawDebug={slot.card.modelShowYawDebug}
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
                  shiftUP={slot.card.YShiftParalellToTheScreen ?? slot.card.modelShiftUP}
                  cameraPitchLift={slot.card.cameraPitchLift}
                  rotationMode={slot.card.modelRotationMode}
                  pendulumAmplitudeDeg={slot.card.modelPendulumAmplitudeDeg}
                  pendulumPeriodMs={slot.card.modelPendulumPeriodMs}
                  pendulumOffsetDeg={slot.card.modelPendulumOffsetDeg}
                  faceYawDeg={slot.card.modelFaceYawDeg}
                  faceTriggerWindowDeg={slot.card.modelFaceTriggerWindowDeg}
                  flybyTravelScale={slot.card.modelFlybyTravelScale}
                  flybyDurationMs={slot.card.modelFlybyDurationMs}
                  flybyRepeatCount={slot.card.modelFlybyRepeatCount}
                  turntableSpeedScale={slot.card.modelTurntableSpeedScale}
                  showYawDebug={slot.card.modelShowYawDebug}
                />
              ) : slot.card.previewImageUrl ? (
                <img
                  className={`ideum05-nav-card__preview-image${
                    slot.card.previewImageFill ? ' ideum05-nav-card__preview-image--fill' : ''
                  }${
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
              ) : slot.card.navPlaceholderPreview ? (
                <span className="ideum05-nav-card__preview-text ideum05-nav-card__preview-text--placeholder">
                  Preview coming soon
                </span>
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
