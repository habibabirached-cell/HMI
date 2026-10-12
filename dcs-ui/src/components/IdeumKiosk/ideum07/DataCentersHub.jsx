import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  IDEUM05_NAV_IMAGE_URLS,
  IDEUM05_NAV_MODEL_URLS,
} from '../../../utils/ideum05Navigation';
import {
  getIdeum07RootBucketChrome,
  IDEUM07_NAV_IMAGE_URLS,
} from '../../../utils/ideumKiosk/ideum07/navigation';
import Ideum05Nav3DViewer from '../Ideum05Nav3DViewer';
import IdeumSuperBucket from '../common/IdeumSuperBucket';
import '../Ideum05NavLayer.css';
import './DataCentersHub.css';

const STACKED_MIN_MODEL_PX = 72;
/** Slightly less than Ideum05 card (0.72) so the hub 3D strip is a bit taller. */
const HUB_STACKED_IMAGE_SHARE = 0.66;

function splitStackedPreviewHeight(totalHeight, imageShare) {
  const h = Math.max(STACKED_MIN_MODEL_PX * 2, Math.round(totalHeight));
  const imageStripH = Math.max(
    48,
    Math.min(Math.round(h * imageShare), h - STACKED_MIN_MODEL_PX),
  );
  return {
    imageStripH,
    modelStripH: Math.max(STACKED_MIN_MODEL_PX, h - imageStripH),
  };
}

function HubStackedTile({
  ariaLabel,
  imageUrl,
  imageAlt,
  imageShare = HUB_STACKED_IMAGE_SHARE,
  modelUrl,
  modelFitScale,
  modelYOffset,
  cameraPitchLift,
  onClick,
}) {
  const tileRef = useRef(null);
  const [tileSize, setTileSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = tileRef.current;
    if (!el) return undefined;

    const measure = () => {
      setTileSize({
        width: Math.max(0, el.clientWidth),
        height: Math.max(0, el.clientHeight),
      });
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }

    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const stacked =
    tileSize.width > 0 && tileSize.height > 0
      ? splitStackedPreviewHeight(tileSize.height, imageShare)
      : null;

  return (
    <button
      ref={tileRef}
      type="button"
      className="ideum07-hub__tile ideum07-hub__tile--stacked"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      aria-label={ariaLabel}
    >
      <div className="ideum05-nav-card__preview ideum05-nav-card__preview--stacked ideum07-hub__stacked-preview">
        <div
          className="ideum05-nav-card__preview-image-strip ideum05-nav-card__preview-image-strip--fill"
          style={
            stacked
              ? {
                  height: stacked.imageStripH,
                  minHeight: stacked.imageStripH,
                  maxHeight: stacked.imageStripH,
                }
              : { flex: `0 0 ${Math.round(imageShare * 100)}%` }
          }
        >
          <img
            className="ideum05-nav-card__preview-image ideum05-nav-card__preview-image--stacked ideum05-nav-card__preview-image--fill-strip"
            src={imageUrl}
            alt={imageAlt}
            draggable={false}
          />
        </div>
        <div
          className="ideum05-nav-card__preview-3d-strip ideum07-hub__model-strip"
          style={
            stacked
              ? {
                  height: stacked.modelStripH,
                  minHeight: stacked.modelStripH,
                }
              : { flex: 1, minHeight: STACKED_MIN_MODEL_PX }
          }
        >
          {stacked && modelUrl ? (
            <Ideum05Nav3DViewer
              width={tileSize.width}
              height={stacked.modelStripH}
              modelUrl={modelUrl}
              fitScale={modelFitScale}
              modelYOffset={modelYOffset}
              cameraPitchLift={cameraPitchLift}
            />
          ) : null}
        </div>
      </div>
    </button>
  );
}

function HubSuperBucket({ title, variant, children, bucketChrome, onHome, onReset }) {
  return (
    <IdeumSuperBucket
      className="ideum07-hub-bucket"
      contentClassName="ideum07-hub-bucket__content"
      title={title}
      variant={variant}
      bucketChrome={bucketChrome}
      showHome={Boolean(onHome)}
      onHome={onHome}
      onReset={onReset}
    >
      {children}
    </IdeumSuperBucket>
  );
}

/**
 * Two-panel Data Centers hub (Techno-Economics | Advanced Analysis).
 */
export default function Ideum07DataCentersHub({
  zoom = 1,
  onBack,
  onHome,
  onReset,
  onOpenConfigurator,
  onOpenReferenceArchitectures,
}) {
  const bucketChrome = getIdeum07RootBucketChrome(zoom);
  const hubInsetPx = Math.max(8, Math.round(8 * zoom));

  return (
    <div
      className="ideum07-hub ideum05-nav-layer"
      role="region"
      aria-label="Data Centers"
      style={{ padding: hubInsetPx }}
    >
      <IdeumSuperBucket
        className="ideum07-hub-screen"
        contentClassName="ideum07-hub-screen__content"
        title="Data Centers"
        bucketChrome={bucketChrome}
        showBack
        onBack={onBack}
        showHome={Boolean(onHome)}
        onHome={onHome}
        onReset={onReset}
      >
        <div
          className="ideum07-hub__row"
          style={{ gap: bucketChrome.bucketGapPx }}
        >
        <HubSuperBucket
          title="Techno-Economics"
          bucketChrome={bucketChrome}
          onHome={onHome}
          onReset={onReset}
        >
          <HubStackedTile
            ariaLabel="Open Data Center Configurator"
            imageUrl={IDEUM05_NAV_IMAGE_URLS.configurator}
            imageAlt="Data Center Configurator preview"
            modelUrl={IDEUM05_NAV_MODEL_URLS.outdoorDataCenter}
            modelFitScale={0.78}
            modelYOffset={0.54}
            cameraPitchLift={0.42}
            onClick={onOpenConfigurator}
          />
        </HubSuperBucket>
        <HubSuperBucket
          title="Advanced Analysis"
          variant="applications"
          bucketChrome={bucketChrome}
          onHome={onHome}
          onReset={onReset}
        >
          <HubStackedTile
            ariaLabel="Open Reference Architectures"
            imageUrl={IDEUM07_NAV_IMAGE_URLS.highFidelityHub}
            imageAlt="Reference architectures site diagram"
            modelUrl={IDEUM05_NAV_MODEL_URLS.ref200Mw}
            modelFitScale={0.92}
            modelYOffset={0.1}
            cameraPitchLift={0.5}
            onClick={onOpenReferenceArchitectures}
          />
        </HubSuperBucket>
        </div>
      </IdeumSuperBucket>
    </div>
  );
}
