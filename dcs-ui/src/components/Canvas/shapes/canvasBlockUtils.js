/**
 * Shared label + stroke helpers for canvas equipment blocks.
 */

export function secondaryLabelText(component, visualConfig) {
  const secMode = visualConfig.canvasSecondaryLabel;
  if (
    secMode === 'voltageKv' &&
    component.properties?.voltage != null &&
    String(component.properties.voltage) !== ''
  ) {
    return `${component.properties.voltage}kV`;
  }
  if (secMode === 'ctRatio') {
    const u = component.properties?.unit;
    if (u != null && String(u).includes(':')) {
      return String(u).trim();
    }
    if (component.properties?.rating > 0) {
      return `${component.properties.rating}:1`;
    }
    return '';
  }
  if (component.properties?.rating > 0) {
    return `${component.properties.rating} ${component.properties.unit}`;
  }
  return '';
}

export function primaryLabelText(component, visualConfig) {
  let text =
    visualConfig.canvasPrimaryLabel != null
      ? visualConfig.canvasPrimaryLabel
      : component.name;
  if (component?.type === 'breaker-bess' && typeof text === 'string') {
    text = text.replace(/\s+(?:Left|Right|[LR])$/i, '').trim();
  }
  return text;
}

export function strokeForStatus(component, isSelected, presentationOffline = false) {
  // In design mode (idle), if the component is configured to start open,
  // show a dim orange dashed outline as a preview hint.
  const startsOpen = component.status === 'idle' && component.initialSimStatus === 'open';
  const showAsOffline =
    presentationOffline || component.status === 'offline' || component.status === 'tripped';
  const strokeColor =
    startsOpen
      ? '#c06010'
      : showAsOffline
        ? '#ff0000'
        : component.status === 'idle'
          ? '#666'
          : component.status === 'open'
            ? '#ff9800'
            : isSelected
              ? '#005E60'
              : '#444';
  const strokeWidthVal =
    showAsOffline
      ? 4
      : component.status === 'open'
        ? 3
        : startsOpen
          ? 2
          : isSelected
            ? 3
            : 2;
  // Signal to callers that this component has a "starts open" design-time hint
  return { strokeColor, strokeWidthVal };
}

export function resolveTextureUrl(visualConfig) {
  const href = visualConfig.backgroundTexture;
  if (href == null || href === '') return null;
  return `${process.env.PUBLIC_URL || ''}${href}`;
}

/**
 * Per-component-**type** scale for design mode: multiplies saved/default width × height for
 * every instance of that type. Font sizes stay fixed so larger boxes add internal padding.
 */
export function getCanvasBlockTypeScale(scaleMap, componentType) {
  if (scaleMap == null || componentType == null) return 1;
  const v = scaleMap[componentType];
  if (v == null || !Number.isFinite(v) || v <= 0) return 1;
  return v;
}

/**
 * Raw dimensions from `visualOverrides` or catalog, multiplied by the type scale map.
 */
export function getScaledCanvasBlockDimensions(component, visualConfig, scaleMap = {}) {
  const rawW = component.visualOverrides?.width ?? visualConfig.width;
  const rawH = component.visualOverrides?.height ?? visualConfig.height;
  const s = getCanvasBlockTypeScale(scaleMap, component.type);
  return {
    width: rawW * s,
    height: rawH * s,
    scale: s,
  };
}

export function getTextureOpacity(visualConfig) {
  return visualConfig.backgroundTextureOpacity != null
    ? visualConfig.backgroundTextureOpacity
    : 0.88;
}
