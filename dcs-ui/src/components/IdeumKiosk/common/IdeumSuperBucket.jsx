import React from 'react';
import Ideum05BackButton from '../Ideum05BackButton';
import Ideum05LiveRtdsButton from '../Ideum05LiveRtdsButton';
import IdeumKioskHomeCluster from './IdeumKioskHomeCluster';

/** Super-bucket frame (teal title bar + ring) — shared by Ideum07 / Ideum08 kiosk menus. */
export default function IdeumSuperBucket({
  title,
  variant,
  bucketChrome,
  showBack = false,
  onBack,
  showHome = false,
  onHome,
  showMaingearTouchActions = false,
  onReset,
  onLiveRtds,
  className = '',
  style,
  contentClassName = '',
  contentStyle,
  children,
}) {
  if (!bucketChrome) return null;

  const variantClass =
    variant === 'applications' ? ' ideum07-root-bucket--applications' : '';
  const { bucketTitleH, bucketTitleFont, cssVars, subsetGapPx } = bucketChrome;
  const showTitleActions = Boolean(
    showMaingearTouchActions && ((showBack && onBack) || onLiveRtds),
  );
  const showHomeCluster = Boolean(showHome && onHome);
  const labelClassSuffix = [
    showTitleActions ? ' ideum07-root-bucket__label--with-title-actions' : '',
    !showTitleActions && showBack && onBack
      ? ' ideum07-root-bucket__label--with-back'
      : '',
    showHomeCluster ? ' ideum07-root-bucket__label--with-home' : '',
    showHomeCluster && onReset ? ' ideum07-root-bucket__label--with-home-reset' : '',
  ].join('');

  return (
    <div
      className={`ideum07-root-bucket${variantClass}${className ? ` ${className}` : ''}`}
      style={{ ...cssVars, ...style }}
    >
      <span className="ideum07-root-bucket__ring" aria-hidden />
      <span className="ideum07-root-bucket__well" aria-hidden />
      <h2
        className={`ideum07-root-bucket__label${labelClassSuffix}`}
        style={{ height: bucketTitleH, fontSize: bucketTitleFont }}
      >
        {showTitleActions ? (
          <div className="ideum07-root-bucket__title-actions">
            {showBack && onBack ? (
              <Ideum05BackButton
                onBack={onBack}
                className="ideum05-nav-back--bucket-chrome ideum07-root-bucket__title-action-btn"
              />
            ) : null}
            {onLiveRtds ? (
              <Ideum05LiveRtdsButton
                onLiveRtds={onLiveRtds}
                className="ideum07-root-bucket__title-action-btn"
              />
            ) : null}
          </div>
        ) : null}
        {!showTitleActions && showBack && onBack ? (
          <Ideum05BackButton onBack={onBack} className="ideum05-nav-back--bucket-chrome" />
        ) : null}
        <span className="ideum07-root-bucket__label-text">{title}</span>
        {showHomeCluster ? (
          <IdeumKioskHomeCluster
            onHome={onHome}
            onReset={onReset}
            className="ideum07-root-bucket__home-cluster"
          />
        ) : null}
      </h2>
      {children != null ? (
        <div
          className={`ideum07-super-bucket__content${contentClassName ? ` ${contentClassName}` : ''}`}
          style={{ padding: subsetGapPx, ...contentStyle }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated use IdeumSuperBucket */
export { IdeumSuperBucket as Ideum07SuperBucket };
