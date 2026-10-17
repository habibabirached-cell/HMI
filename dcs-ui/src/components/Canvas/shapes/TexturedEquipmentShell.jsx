import React from 'react';
import FramedTextureCard from './FramedTextureCard';
import StandardEquipmentLabels from './StandardEquipmentLabels';
import SchematicAuxLoadsAggregate from '../Schematics/SchematicAuxLoadsAggregate';
import {
  primaryLabelText,
  secondaryLabelText,
  inlinePropertyCaption,
  resolveTextureUrl,
  getTextureOpacity,
} from './canvasBlockUtils';

/**
 * For primitive equipment shapes: either full-cell textured card + labels,
 * or custom solid outline (childrenNoTexture) + standard labels.
 */
export default function TexturedEquipmentShell({
  component,
  visualConfig,
  width,
  height,
  strokeColor,
  strokeWidthVal,
  childrenNoTexture,
  labelFontPxDelta = null,
  collapseAggregateArt = false,
}) {
  const textureUrl = resolveTextureUrl(visualConfig);
  const textureOpacity = getTextureOpacity(visualConfig);
  const centerX = width / 2;
  const labelAnchorXRatio = Number(component.visualOverrides?.labelAnchorXRatio);
  const primaryLabelX = Number.isFinite(labelAnchorXRatio)
    ? width * Math.min(1, Math.max(0, labelAnchorXRatio))
    : centerX;
  const hideIconForShiftedLabel =
    Number.isFinite(labelAnchorXRatio) && Math.abs(primaryLabelX - centerX) > 1;
  const canvasPrimaryText = primaryLabelText(component, visualConfig);
  const forceInlinePropertyLabel = Boolean(visualConfig.forceInlinePropertyLabel);
  const canvasSecondaryText =
    secondaryLabelText(component, visualConfig) ||
    (forceInlinePropertyLabel ? inlinePropertyCaption(component, visualConfig) : '');

  if (textureUrl) {
    const labelAlongVerticalSlot = Boolean(visualConfig.canvasPrimaryLabelVertical);
    const glowFilterId = `tex-glow-${String(component.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    return (
      <>
        {collapseAggregateArt ? (
          <SchematicAuxLoadsAggregate
            width={width}
            height={height}
            strokeColor={strokeColor}
            strokeWidthVal={strokeWidthVal}
            glowFilterId={glowFilterId}
          />
        ) : (
          <FramedTextureCard
            width={width}
            height={height}
            textureUrl={textureUrl}
            textureOpacity={textureOpacity}
            strokeColor={strokeColor}
            strokeWidthVal={strokeWidthVal}
            glowAccent={Boolean(visualConfig.textureGlowAccent)}
            glowFilterId={glowFilterId}
          />
        )}
        <StandardEquipmentLabels
          width={width}
          height={height}
          centerX={centerX}
          primaryLabelX={primaryLabelX}
          hideEquipmentIcon={hideIconForShiftedLabel}
          visualConfig={visualConfig}
          canvasPrimaryText={canvasPrimaryText}
          canvasSecondaryText={canvasSecondaryText}
          framedTextureLayout={!labelAlongVerticalSlot}
          labelFontPxDelta={labelFontPxDelta}
        />
      </>
    );
  }

  return (
    <>
      {childrenNoTexture}
      <StandardEquipmentLabels
        width={width}
        height={height}
        centerX={centerX}
        primaryLabelX={primaryLabelX}
        hideEquipmentIcon={hideIconForShiftedLabel}
        visualConfig={visualConfig}
        canvasPrimaryText={canvasPrimaryText}
        canvasSecondaryText={canvasSecondaryText}
        framedTextureLayout={false}
        labelFontPxDelta={labelFontPxDelta}
      />
    </>
  );
}
