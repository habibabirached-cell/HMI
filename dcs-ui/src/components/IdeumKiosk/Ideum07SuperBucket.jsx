import React from 'react';
import Ideum05BackButton from './Ideum05BackButton';
import Ideum05ResetButton from './Ideum05ResetButton';
import Ideum05LiveRtdsButton from './Ideum05LiveRtdsButton';

/**
 * Ideum07 super-bucket frame (teal title bar + ring). Optional back control in the title bar.
 */
export default function Ideum07SuperBucket({
  title,
  variant,
  bucketChrome,
  showBack = false,
  onBack,
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
    showMaingearTouchActions && onReset && onLiveRtds,
  );
  const labelClassSuffix = showTitleActions
    ? ' ideum07-root-bucket__label--with-title-actions'
    : showBack && onBack
      ? ' ideum07-root-bucket__label--with-back'
      : '';

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
            <Ideum05ResetButton
              onReset={onReset}
              className="ideum07-root-bucket__title-action-btn"
            />
            <Ideum05LiveRtdsButton
              onLiveRtds={onLiveRtds}
              className="ideum07-root-bucket__title-action-btn"
            />
          </div>
        ) : null}
        {!showTitleActions && showBack && onBack ? (
          <Ideum05BackButton onBack={onBack} className="ideum05-nav-back--bucket-chrome" />
        ) : null}
        <span className="ideum07-root-bucket__label-text">{title}</span>
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
