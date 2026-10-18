import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  getIdeum07NavCardLayout,
  getIdeum07NavCards,
  getIdeum07SuperBucketLayoutChrome,
  getIdeum07SuperBucketTitle,
  getIdeum07RootLayoutChrome,
  IDEUM07_ADVANCED_ANALYSIS,
  IDEUM07_ADVANCED_CONTROLS,
  IDEUM07_HIL_CONTROLLER_SUBMENU,
  IDEUM07_HIL_SUBMENU_PREVIEW_MATCH_GROUP,
  IDEUM07_ADVANCED_ANALYSIS_PREVIEW_ASPECT,
  IDEUM07_DATA_CENTERS_HUB,
  IDEUM07_ADVANCED_ANALYSIS_PREVIEW_MATCH_GROUP,
  IDEUM07_DATA_CENTERS_PREVIEW_ASPECT,
  IDEUM07_DATA_CENTERS_PREVIEW_MATCH_GROUP,
  IDEUM07_NAV_ROOT,
  getIdeum07RootBucketChrome,
  IDEUM07_REF_200MW_SUBMENU,
  IDEUM07_TEST_REF_ARCH_SUBMENU,
  IDEUM07_DISPATCHABLE_WIND_200MW_SUBMENU,
  IDEUM07_REFERENCE_ARCHITECTURES,
  isIdeum07AutoFitNavScreen,
  isIdeum07NavCardDisabled,
  isIdeum07NavCardFeatured,
} from '../../../utils/ideumKiosk/ideum07/navigation';
import '../Ideum05NavLayer.css';
import '../IdeumComponentLayer.css';
import './DataCentersHub.css';
import Ideum05BackButton from '../Ideum05BackButton';
import Ideum05Nav3DViewer from '../Ideum05Nav3DViewer';
import Ideum07DataCentersHub from './DataCentersHub';
import Ideum07Ref200MwSubmenu from './Ref200MwSubmenu';
import TestReferenceArchitectureSubmenu from '../common/TestReferenceArchitectureSubmenu';
import DispatchableWind200MwSubmenu from '../common/DispatchableWind200MwSubmenu';
import IdeumSuperBucket from '../common/IdeumSuperBucket';
import IdeumKioskHomeCluster from '../common/IdeumKioskHomeCluster';

const TITLE_BAR_PX = 44;
/** Ideum07 root subcard title strip — thin vs bucket chrome (~42px at zoom 1). */
const IDEUM07_SUBNAV_TITLE_BAR_SHARE = 0.48;
/** Reference-arch subcards: slightly taller type than root subnav, still below super-bucket title. */
const IDEUM07_REF_ARCH_SUBNAV_TITLE_BAR_SHARE = 0.58;
const IDEUM07_REF_ARCH_SUBNAV_FONT_PX = 13;
const INNER_PAD_PX = 12;
const STACKED_MIN_MODEL_PX = 72;
const NAV_PAN_ORIGIN = { x: 0, y: 0 };

function ideum07SubnavTitleHeight(zoom, refArch = false) {
  const share = refArch
    ? IDEUM07_REF_ARCH_SUBNAV_TITLE_BAR_SHARE
    : IDEUM07_SUBNAV_TITLE_BAR_SHARE;
  return Math.max(20, Math.round(TITLE_BAR_PX * share * zoom));
}

function ideum07SubnavTitleFontPx(zoom, refArch = false) {
  const base = refArch ? IDEUM07_REF_ARCH_SUBNAV_FONT_PX : 11;
  return Math.max(10, Math.round(base * zoom));
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
  if (card.previewImageMatchGroup === IDEUM07_HIL_SUBMENU_PREVIEW_MATCH_GROUP) {
    return IDEUM07_ADVANCED_ANALYSIS_PREVIEW_ASPECT;
  }
  if (card.previewImageMatchGroup === IDEUM07_ADVANCED_ANALYSIS_PREVIEW_MATCH_GROUP) {
    return IDEUM07_ADVANCED_ANALYSIS_PREVIEW_ASPECT;
  }
  if (card.previewImageMatchGroup === IDEUM07_DATA_CENTERS_PREVIEW_MATCH_GROUP) {
    return IDEUM07_DATA_CENTERS_PREVIEW_ASPECT;
  }
  return null;
}

function previewImageStripHeight(slot, zoom, area, matchedImageSizes) {
  if (!slot.card.previewImageUrl) return 0;
  const reservesModelStrip = Boolean(
    slot.card.modelUrl || slot.card.navModelComingSoon,
  );
  if (!reservesModelStrip) return area.height;

  const matched = matchedImageSizes?.get(slot.id);
  if (matched?.height) {
    const shareCap = slot.card.previewImageHeightShare ?? 0.72;
    const maxByShare = Math.round(area.height * shareCap);
    return Math.min(
      matched.height,
      maxByShare,
      area.height - STACKED_MIN_MODEL_PX,
    );
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

function hasStackedNavPreview(card) {
  if (!card?.previewImageUrl) return false;
  return Boolean(card.modelUrl || card.navModelComingSoon);
}

/** Same pixel width/height for stacked diagram images in a match group. */
function computeMatchedImageSizes(slots, zoom) {
  const byGroup = new Map();
  for (const slot of slots) {
    const group = slot.card.previewImageMatchGroup;
    if (!group || !slot.card.previewImageUrl || !hasStackedNavPreview(slot.card)) continue;
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

function nav3DViewerProps(card, width, height, modelOverrides = {}) {
  const url = modelOverrides.modelUrl ?? card.modelUrl;
  return {
    width,
    height,
    modelUrl: url,
    fitScale: modelOverrides.modelFitScale ?? card.modelFitScale,
    modelYOffset: modelOverrides.modelYOffset ?? card.modelYOffset,
    shiftUP: modelOverrides.shiftUP
      ?? card.YShiftParalellToTheScreen
      ?? card.modelShiftUP,
    cameraPitchLift: modelOverrides.cameraPitchLift ?? card.cameraPitchLift,
    rotationMode: modelOverrides.modelRotationMode ?? card.modelRotationMode,
    pendulumAmplitudeDeg:
      modelOverrides.modelPendulumAmplitudeDeg ?? card.modelPendulumAmplitudeDeg,
    pendulumPeriodMs: modelOverrides.modelPendulumPeriodMs ?? card.modelPendulumPeriodMs,
    pendulumOffsetDeg: modelOverrides.modelPendulumOffsetDeg ?? card.modelPendulumOffsetDeg,
    faceYawDeg: modelOverrides.modelFaceYawDeg ?? card.modelFaceYawDeg,
    faceTriggerWindowDeg:
      modelOverrides.modelFaceTriggerWindowDeg ?? card.modelFaceTriggerWindowDeg,
    flybyTravelScale: modelOverrides.modelFlybyTravelScale ?? card.modelFlybyTravelScale,
    flybyDurationMs: modelOverrides.modelFlybyDurationMs ?? card.modelFlybyDurationMs,
    flybyRepeatCount: modelOverrides.modelFlybyRepeatCount ?? card.modelFlybyRepeatCount,
    turntableSpeedScale:
      modelOverrides.modelTurntableSpeedScale ?? card.modelTurntableSpeedScale,
    showYawDebug: modelOverrides.modelShowYawDebug ?? card.modelShowYawDebug,
  };
}

function renderStackedNav3DStrip(card, previewW, modelStripH) {
  if (!card.modelUrl) {
    if (card.navModelComingSoon) {
      return (
        <span className="ideum07-nav-card__3d-coming-soon-label">3D coming soon</span>
      );
    }
    return null;
  }

  if (card.modelUrlSecondary) {
    const gap = 6;
    const halfW = Math.max(8, Math.floor((previewW - gap) / 2));
    return (
      <div className="ideum05-nav-card__preview-dual">
        <div className="ideum05-nav-card__preview-dual-cell">
          <Ideum05Nav3DViewer
            {...nav3DViewerProps(card, halfW, modelStripH)}
          />
        </div>
        <div className="ideum05-nav-card__preview-dual-cell">
          <Ideum05Nav3DViewer
            {...nav3DViewerProps(card, halfW, modelStripH, {
              modelUrl: card.modelUrlSecondary,
              modelFitScale: card.modelFitScaleSecondary,
              modelYOffset: card.modelYOffsetSecondary,
              cameraPitchLift: card.cameraPitchLiftSecondary,
            })}
          />
        </div>
      </div>
    );
  }

  return (
    <Ideum05Nav3DViewer {...nav3DViewerProps(card, previewW, modelStripH)} />
  );
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
  onHome,
  showBack = false,
  onHubOpenConfigurator,
  onHubOpenReferenceArchitectures,
  onIdeumRef200MwCommand,
  onIdeumTestRefArchCommand,
  onIdeum05Reset,
  onIdeum05LiveRtds,
  ideumExpansionMirror,
  onIdeumExpansionToggle,
  onIdeumToggleSimulation,
}) {
  const [slots, setSlots] = useState([]);
  const [rootChrome, setRootChrome] = useState(null);
  const [superBucketChrome, setSuperBucketChrome] = useState(null);
  const cards = useMemo(() => getIdeum07NavCards(screenId), [screenId]);
  const isHub = screenId === IDEUM07_DATA_CENTERS_HUB;
  const isRef200Submenu = screenId === IDEUM07_REF_200MW_SUBMENU;
  const isTestRefArchSubmenu = screenId === IDEUM07_TEST_REF_ARCH_SUBMENU;
  const isDispatchableWindSubmenu = screenId === IDEUM07_DISPATCHABLE_WIND_200MW_SUBMENU;
  const isRoot = screenId === IDEUM07_NAV_ROOT;
  const isAdvancedAnalysis = screenId === IDEUM07_ADVANCED_ANALYSIS;
  const isAdvancedControls = screenId === IDEUM07_ADVANCED_CONTROLS;
  const isHilSubmenu = screenId === IDEUM07_HIL_CONTROLLER_SUBMENU;
  const isRefArch = screenId === IDEUM07_REFERENCE_ARCHITECTURES;
  const isSuperBucketMenu = isAdvancedAnalysis || isAdvancedControls || isHilSubmenu || isRefArch;
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
      setSuperBucketChrome(
        isSuperBucketMenu ? getIdeum07SuperBucketLayoutChrome(screenId, viewport) : null,
      );
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
  }, [cards, navPan, zoom, canvasRef, viewportRef, screenId, isHub, isRoot, isSuperBucketMenu]);

  if (isHub) {
    return (
      <Ideum07DataCentersHub
        zoom={zoom}
        onBack={onBack}
        onHome={onHome}
        onReset={onIdeum05Reset}
        onOpenConfigurator={onHubOpenConfigurator}
        onOpenReferenceArchitectures={onHubOpenReferenceArchitectures}
      />
    );
  }

  if (isRef200Submenu) {
    return (
      <Ideum07Ref200MwSubmenu
        zoom={zoom}
        onBack={onBack}
        onHome={onHome}
        onIdeumCommand={onIdeumRef200MwCommand}
        onReset={onIdeum05Reset}
        onLiveRtds={onIdeum05LiveRtds}
      />
    );
  }

  if (isTestRefArchSubmenu) {
    return (
      <TestReferenceArchitectureSubmenu
        zoom={zoom}
        onBack={onBack}
        onHome={onHome}
        onIdeumCommand={onIdeumTestRefArchCommand ?? onIdeumRef200MwCommand}
        onReset={onIdeum05Reset}
        ideumExpansionMirror={ideumExpansionMirror}
        onIdeumExpansionToggle={onIdeumExpansionToggle}
        onIdeumToggleSimulation={onIdeumToggleSimulation}
      />
    );
  }

  if (isDispatchableWindSubmenu) {
    return (
      <DispatchableWind200MwSubmenu
        zoom={zoom}
        onBack={onBack}
        onHome={onHome}
        onIdeumCommand={onIdeumRef200MwCommand}
        onReset={onIdeum05Reset}
        onIdeumToggleSimulation={onIdeumToggleSimulation}
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
  const superBucketTitle = getIdeum07SuperBucketTitle(screenId);
  const refArchBucketChrome = getIdeum07RootBucketChrome(zoom);
  const backInSuperBucketTitle = isSuperBucketMenu && Boolean(superBucketChrome);

  return (
    <div className="ideum05-nav-layer" aria-hidden={false}>
      {showBack && !backInSuperBucketTitle ? <Ideum05BackButton onBack={onBack} /> : null}
      {isSuperBucketMenu && superBucketChrome && superBucketTitle ? (
        <IdeumSuperBucket
          className="ideum07-nav-screen-bucket"
          title={superBucketTitle}
          variant="applications"
          bucketChrome={refArchBucketChrome}
          showBack={showBack}
          onBack={onBack}
          showHome={Boolean(onHome)}
          onHome={onHome}
          onReset={onIdeum05Reset}
          style={{
            left: navPan.x + superBucketChrome.x * zoom,
            top: navPan.y + superBucketChrome.y * zoom,
            width: superBucketChrome.width * zoom,
            height: superBucketChrome.height * zoom,
          }}
        />
      ) : null}
      {isRoot && rootChrome ? (() => {
        const {
          bucketTitleH,
          bucketTitleFont,
          cssVars: bucketWallStyle,
        } = getIdeum07RootBucketChrome(zoom);
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
              className={`ideum07-root-bucket__label${
                onHome ? ' ideum07-root-bucket__label--with-home' : ''
              }${onHome && onIdeum05Reset ? ' ideum07-root-bucket__label--with-home-reset' : ''}`}
              style={{
                height: bucketTitleH,
                fontSize: bucketTitleFont,
              }}
            >
              <span className="ideum07-root-bucket__label-text">Stability Solutions</span>
              {onHome ? (
                <IdeumKioskHomeCluster onHome={onHome} onReset={onIdeum05Reset} />
              ) : null}
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
              className={`ideum07-root-bucket__label${
                onHome ? ' ideum07-root-bucket__label--with-home' : ''
              }${onHome && onIdeum05Reset ? ' ideum07-root-bucket__label--with-home-reset' : ''}`}
              style={{
                height: bucketTitleH,
                fontSize: bucketTitleFont,
              }}
            >
              <span className="ideum07-root-bucket__label-text">Applications</span>
              {onHome ? (
                <IdeumKioskHomeCluster onHome={onHome} onReset={onIdeum05Reset} />
              ) : null}
            </span>
          </div>
        </>
        );
      })() : null}
      {slots.map((slot) => {
        const inSuperBucketWell = isRoot || isSuperBucketMenu;
        const paneSubnav = isRefArch || isAdvancedAnalysis || isAdvancedControls || isHilSubmenu;
        const subtitleTitleExtra = slot.card.navSubtitle
          ? Math.max(12, Math.round(14 * zoom))
          : 0;
        const titleBarPx = inSuperBucketWell
          ? ideum07SubnavTitleHeight(zoom, paneSubnav) + subtitleTitleExtra
          : Math.round(TITLE_BAR_PX * zoom);
        const stacked = hasStackedNavPreview(slot.card);
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
        const subnavTitlePx = inSuperBucketWell
          ? ideum07SubnavTitleFontPx(zoom, paneSubnav)
          : slot.titleFontPx;
        const subnavTitleH = titleBarPx;
        return (
          <button
            key={slot.id}
            type="button"
            disabled={disabled}
            className={`ideum-component-btn ideum-component-btn--nav-card${
              inSuperBucketWell ? ' ideum07-root-subcard' : ''
            }${
              isRoot
                ? ` ideum07-root-subcard--${ideum07RootSubcardBucket(slot.id)}`
                : ''
            }${paneSubnav ? ' ideum07-root-subcard--applications ideum07-ref-arch-subcard' : ''}${
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
                inSuperBucketWell ? ' ideum07-subnav-title' : ''
              }${
                featured ? ' ideum-component-btn__title--featured' : ''
              }${slot.card.navTitleActive ? ' ideum-component-btn__title--active' : ''}${
                disabled ? ' ideum-component-btn__title--disabled' : ''
              }`}
              style={{ fontSize: subnavTitlePx, height: subnavTitleH }}
            >
              {inSuperBucketWell ? (
                <>
                  <span className="ideum07-subnav-title__text">{slot.card.label}</span>
                  {slot.card.navSubtitle ? (
                    <span className="ideum07-subnav-title__subtitle">{slot.card.navSubtitle}</span>
                  ) : null}
                </>
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
                      style={{
                        ...(!slot.card.previewImageFill && matchedImageSizes.has(slot.id)
                          ? matchedImageSizes.get(slot.id)
                          : undefined),
                        ...(slot.card.previewImageObjectFit
                          ? { objectFit: slot.card.previewImageObjectFit }
                          : undefined),
                        ...(slot.card.previewImageObjectPosition
                          ? { objectPosition: slot.card.previewImageObjectPosition }
                          : undefined),
                      }}
                    />
                  </div>
                  <div
                    className={`ideum05-nav-card__preview-3d-strip${
                      slot.card.navModelComingSoon ? ' ideum07-nav-card__3d-coming-soon' : ''
                    }`}
                    style={{ height: modelStripH, minHeight: modelStripH }}
                  >
                    {renderStackedNav3DStrip(slot.card, previewW, modelStripH)}
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
