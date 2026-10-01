import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  IDEUM05_NAV_IMAGE_URLS,
  IDEUM05_NAV_MODEL_URLS,
} from '../../utils/ideum05Navigation';
import Ideum05BackButton from './Ideum05BackButton';
import Ideum05Nav3DViewer from './Ideum05Nav3DViewer';
import './Ideum05NavLayer.css';
import './Ideum07DataCentersHub.css';

const STACKED_MIN_MODEL_PX = 72;
/** Slightly less than Ideum05 card (0.72) so the hub 3D strip is a bit taller. */
const HUB_CONFIGURATOR_IMAGE_SHARE = 0.66;

function splitStackedPreviewHeight(totalHeight) {
  const h = Math.max(STACKED_MIN_MODEL_PX * 2, Math.round(totalHeight));
  const imageStripH = Math.max(
    48,
    Math.min(
      Math.round(h * HUB_CONFIGURATOR_IMAGE_SHARE),
      h - STACKED_MIN_MODEL_PX,
    ),
  );
  return {
    imageStripH,
    modelStripH: Math.max(STACKED_MIN_MODEL_PX, h - imageStripH),
  };
}

/**
 * Two-panel Data Centers hub (Technoeconomic Design | High-Fidelity Analysis).
 */
export default function Ideum07DataCentersHub({
  onBack,
  onOpenConfigurator,
  onOpenReferenceArchitectures,
}) {
  const configuratorPreview = IDEUM05_NAV_IMAGE_URLS.configurator;
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
      ? splitStackedPreviewHeight(tileSize.height)
      : null;

  return (
    <div className="ideum07-hub" role="region" aria-label="Data Centers">
      <Ideum05BackButton onBack={onBack} />
      <div className="ideum07-hub__panel ideum07-hub__panel--left">
        <h2 className="ideum07-hub__title">Technoeconomic Design</h2>
        <button
          ref={tileRef}
          type="button"
          className="ideum07-hub__tile ideum07-hub__tile--stacked"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenConfigurator?.();
          }}
          aria-label="Open Data Center Configurator"
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
                  : { flex: `0 0 ${Math.round(HUB_CONFIGURATOR_IMAGE_SHARE * 100)}%` }
              }
            >
              <img
                className="ideum05-nav-card__preview-image ideum05-nav-card__preview-image--stacked ideum05-nav-card__preview-image--fill-strip"
                src={configuratorPreview}
                alt="Data Center Configurator preview"
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
              {stacked ? (
                <Ideum05Nav3DViewer
                  width={tileSize.width}
                  height={stacked.modelStripH}
                  modelUrl={IDEUM05_NAV_MODEL_URLS.outdoorDataCenter}
                  fitScale={0.78}
                  modelYOffset={0.54}
                  cameraPitchLift={0.42}
                />
              ) : null}
            </div>
          </div>
        </button>
      </div>
      <div className="ideum07-hub__divider" aria-hidden />
      <div className="ideum07-hub__panel ideum07-hub__panel--right">
        <h2 className="ideum07-hub__title">High-Fidelity Analysis</h2>
        <button
          type="button"
          className="ideum07-hub__tile ideum07-hub__tile--placeholder"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenReferenceArchitectures?.();
          }}
          aria-label="Open Reference Architectures"
        >
          <span className="ideum07-hub__coming-soon">Coming soon</span>
        </button>
      </div>
    </div>
  );
}
