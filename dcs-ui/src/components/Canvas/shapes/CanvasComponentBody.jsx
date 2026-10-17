import React from 'react';
import SchematicBreaker from '../Schematics/SchematicBreaker';
import SchematicEarthBreaker from '../Schematics/SchematicEarthBreaker';
import SchematicCT from '../Schematics/SchematicCT';
import SchematicCTVertical from '../Schematics/SchematicCTVertical';
import SchematicGSU from '../Schematics/SchematicGSU';
import SchematicBessXfmr from '../Schematics/SchematicBessXfmr';
import SchematicLm2500Andritz from '../Schematics/SchematicLm2500Andritz';
import SchematicHd7H from '../Schematics/SchematicHd7H';
import SchematicGasTurbine3D from '../Schematics/SchematicGasTurbine3D';
import SchematicWindTurbine3D from '../Schematics/SchematicWindTurbine3D';
import SchematicGFMe3D from '../Schematics/SchematicGFMe3D';
import SchematicBess3D from '../Schematics/SchematicBess3D';
import SchematicManualLineSwitch from '../Schematics/SchematicManualLineSwitch';
import SchematicInteractiveBreaker from '../Schematics/SchematicInteractiveBreaker';
import ShapeRoundedRect from './shape-rounded-rect';
import ShapeRect from './shape-rect';
import ShapeCircle from './shape-circle';
import ShapeHexagon from './shape-hexagon';
import ShapeBusBar from './shape-bus-bar';
import ShapeDashedRect from './shape-dashed-rect';
import {
  primaryLabelText,
  secondaryLabelText,
  inlinePropertyCaption,
  getTextureOpacity,
} from './canvasBlockUtils';

const passthrough = (component, visualConfig, width, height, strokeColor, strokeWidthVal) => ({
  component,
  visualConfig,
  width,
  height,
  strokeColor,
  strokeWidthVal,
});

/**
 * One explicit branch per visualConfig.shape (see componentVisuals.js).
 * Primitive modules: ./shape-*.jsx match the shape-* prefix. Schematics: ../Schematics/ (PascalCase).
 */
export default function CanvasComponentBody({
  component,
  visualConfig,
  width,
  height,
  strokeColor,
  strokeWidthVal,
  presentationOffline = false,
  labelFontPxDelta = null,
  collapseAggregateArt = false,
  interactiveBreakerPorts = null,
}) {
  const p = {
    ...passthrough(component, visualConfig, width, height, strokeColor, strokeWidthVal),
    labelFontPxDelta,
    collapseAggregateArt,
  };

  const shape = visualConfig.shape;
  if (shape == null || shape === '') {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(
        '[CanvasComponentBody] Missing visualConfig.shape; using shape-rounded-rect.',
        component?.type,
      );
    }
    return React.createElement(ShapeRoundedRect, p);
  }

  const canvasPrimaryText = primaryLabelText(component, visualConfig);
  const forceInlinePropertyLabel = Boolean(visualConfig.forceInlinePropertyLabel);
  const canvasSecondaryText =
    secondaryLabelText(component, visualConfig) ||
    (forceInlinePropertyLabel ? inlinePropertyCaption(component, visualConfig) : '');
  const textureOpacity = getTextureOpacity(visualConfig);
  const hidePrimaryLabel = Boolean(visualConfig.suppressInlinePrimaryLabel);

  switch (shape) {
    case 'schematic-breaker':
      return (
        <SchematicBreaker
          width={width}
          height={height}
          strokeColor={strokeColor}
          strokeWidthVal={strokeWidthVal}
          primaryLabel={canvasPrimaryText}
          secondaryLabel={canvasSecondaryText}
          hidePrimaryLabel={hidePrimaryLabel}
          forceInlinePropertyLabel={forceInlinePropertyLabel}
        />
      );

    case 'schematic-earth-breaker':
      return (
        <SchematicEarthBreaker
          width={width}
          height={height}
          strokeColor={strokeColor}
          strokeWidthVal={strokeWidthVal}
          primaryLabel={canvasPrimaryText}
          secondaryLabel={canvasSecondaryText}
          hidePrimaryLabel={hidePrimaryLabel}
          forceInlinePropertyLabel={forceInlinePropertyLabel}
        />
      );

    case 'schematic-earth-breaker-framed':
      return (
        <SchematicEarthBreaker
          width={width}
          height={height}
          strokeColor={strokeColor}
          strokeWidthVal={strokeWidthVal}
          primaryLabel={canvasPrimaryText}
          secondaryLabel={canvasSecondaryText}
          hidePrimaryLabel={hidePrimaryLabel}
          forceInlinePropertyLabel={forceInlinePropertyLabel}
          showFrame
        />
      );

    case 'schematic-interactive-breaker':
      return (
        <SchematicInteractiveBreaker
          component={component}
          width={width}
          height={height}
          strokeColor={strokeColor}
          strokeWidthVal={strokeWidthVal}
          primaryLabel={canvasPrimaryText}
          secondaryLabel={canvasSecondaryText}
          hidePrimaryLabel={hidePrimaryLabel}
          forceInlinePropertyLabel={forceInlinePropertyLabel}
          breakerPorts={interactiveBreakerPorts}
        />
      );

    case 'schematic-manual-line-switch':
      return (
        <SchematicManualLineSwitch
          width={width}
          height={height}
          strokeColor={strokeColor}
          strokeWidthVal={strokeWidthVal}
          primaryLabel={canvasPrimaryText}
          secondaryLabel={canvasSecondaryText}
          hidePrimaryLabel={hidePrimaryLabel}
          forceInlinePropertyLabel={forceInlinePropertyLabel}
        />
      );

    case 'schematic-ct':
      return (
        <SchematicCT
          width={width}
          height={height}
          strokeColor={strokeColor}
          zigzagColor={visualConfig.color}
          strokeWidthVal={strokeWidthVal}
          presentationOffline={presentationOffline}
          primaryLabel={canvasPrimaryText}
          secondaryLabel={canvasSecondaryText}
          hidePrimaryLabel={hidePrimaryLabel}
          forceInlinePropertyLabel={forceInlinePropertyLabel}
        />
      );

    case 'schematic-ct-vertical':
      return (
        <SchematicCTVertical
          width={width}
          height={height}
          strokeColor={strokeColor}
          zigzagColor={visualConfig.color}
          strokeWidthVal={strokeWidthVal}
          presentationOffline={presentationOffline}
          primaryLabel={canvasPrimaryText}
          secondaryLabel={canvasSecondaryText}
          hidePrimaryLabel={hidePrimaryLabel}
          forceInlinePropertyLabel={forceInlinePropertyLabel}
        />
      );

    case 'schematic-gsu':
      return (
        <SchematicGSU
          component={component}
          width={width}
          height={height}
          primaryLabel={canvasPrimaryText}
          mvaLabel={canvasSecondaryText}
          hidePrimaryLabel={hidePrimaryLabel}
          forceInlinePropertyLabel={forceInlinePropertyLabel}
          strokeColor={strokeColor}
          strokeWidthVal={strokeWidthVal}
          presentationOffline={presentationOffline}
          lineColor={visualConfig.color}
          textureHref={visualConfig.backgroundTexture}
          textureOpacity={textureOpacity}
        />
      );

    case 'schematic-bess-xfmr':
      return (
        <SchematicBessXfmr
          component={component}
          width={width}
          height={height}
          primaryLabel={canvasPrimaryText}
          mvaLabel={canvasSecondaryText}
          hidePrimaryLabel={hidePrimaryLabel}
          forceInlinePropertyLabel={forceInlinePropertyLabel}
          lineColor={visualConfig.color}
          textureHref={visualConfig.backgroundTexture}
          textureOpacity={textureOpacity}
        />
      );

    case 'schematic-lm2500-andritz':
      return (
        <SchematicLm2500Andritz
          width={width}
          height={height}
          primaryLabel={canvasPrimaryText}
          mwLabel={canvasSecondaryText}
          textureHref={visualConfig.backgroundTexture}
          textureOpacity={textureOpacity}
          strokeColor={strokeColor}
          strokeWidthVal={strokeWidthVal}
        />
      );

    case 'schematic-hd-7h':
      return (
        <SchematicHd7H
          width={width}
          height={height}
          primaryLabel={canvasPrimaryText}
          mwLabel={canvasSecondaryText}
          textureHref={visualConfig.backgroundTexture}
          textureOpacity={textureOpacity}
          strokeColor={strokeColor}
          strokeWidthVal={strokeWidthVal}
          glowFilterId={`hd7h-glow-${String(component.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`}
        />
      );

    case 'schematic-gas-turbine-3d':
      return (
        <SchematicGasTurbine3D
          width={width}
          height={height}
          strokeColor={strokeColor}
          strokeWidthVal={strokeWidthVal}
          placeholderOnly={component.properties?.collapsePlaceholderOnly === true}
          glowFilterId={`gt3d-glow-${String(component.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`}
        />
      );

    case 'schematic-wind-turbine-3d':
      return (
        <SchematicWindTurbine3D
          width={width}
          height={height}
          strokeColor={strokeColor}
          strokeWidthVal={strokeWidthVal}
          placeholderOnly={component.properties?.collapsePlaceholderOnly === true}
          glowFilterId={`wt3d-glow-${String(component.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`}
        />
      );

    case 'schematic-gfme-3d':
      return (
        <SchematicGFMe3D
          width={width}
          height={height}
          strokeColor={strokeColor}
          strokeWidthVal={strokeWidthVal}
          glowFilterId={`gfme3d-glow-${String(component.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`}
        />
      );

    case 'schematic-bess-3d':
      return (
        <SchematicBess3D
          width={width}
          height={height}
          strokeColor={strokeColor}
          strokeWidthVal={strokeWidthVal}
          glowFilterId={`bess3d-glow-${String(component.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`}
        />
      );

    case 'shape-rounded-rect':
      return React.createElement(ShapeRoundedRect, p);

    case 'shape-rect':
      return React.createElement(ShapeRect, p);

    case 'shape-circle':
      return React.createElement(ShapeCircle, p);

    case 'shape-hexagon':
      return React.createElement(ShapeHexagon, p);

    case 'shape-bus-bar':
      return React.createElement(ShapeBusBar, p);

    case 'shape-dashed-rect':
      return React.createElement(ShapeDashedRect, p);

    default:
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn(
          '[CanvasComponentBody] Unknown shape:',
          shape,
          'component:',
          component?.type,
        );
      }
      return React.createElement(ShapeRoundedRect, p);
  }
}
