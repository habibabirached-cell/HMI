import React, { useState, useRef, useEffect } from 'react';
import { useFontScaleToolbar } from '../../contexts/FontScaleContext';
import './Toolbar.css';

function SimPlayIcon() {
  return (
    <svg className="btn-sim-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z" fill="currentColor" />
    </svg>
  );
}

function SimStopIcon() {
  return (
    <svg className="btn-sim-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" />
    </svg>
  );
}

/** Play triangle with a circular loop arrow (start simulate with loop). */
function SimPlayLoopIcon() {
  return (
    <svg className="btn-sim-icon btn-sim-icon--loop" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4a8 8 0 1 1-7.75 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 10V4h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 8.5v7l6-3.5L9 8.5z" fill="currentColor" />
    </svg>
  );
}

const Toolbar = ({
  workspaceLayoutPreset = 'conf1',
  onWorkspaceLayoutPresetChange,
  mode,
  onToggleMode,
  viewMode,
  simulationRunning,
  simulationLoopMode = false,
  onStartSimulation,
  onStartSimulationWithLoop,
  onStopSimulation,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  onSave,
  onSaveAs,
  onSaveToIdeum,
  canSaveToIdeum = false,
  onSaveSimulationConfig,
  onSaveScenarioAs,
  onCopyScenarioLink,
  onLoad,
  onCloneGraphs,
  canCloneGraphs,
  hasComponents,
  canSave, // Whether we can do a quick save (config name exists)
  canSaveSimulationConfig, // Design-dir scenario loaded: open “Save configuration as” for .sim.json presets
  canSaveScenarioAs, // Same as above + creates a Quick Scenarios shortcut button
  canCopyScenarioLink, // Scenario running from design dir: copy ?design=&sim=&config= link
}) => {
  const {
    increaseUiFont,
    decreaseUiFont,
    increaseCanvasFont,
    decreaseCanvasFont,
    increaseCollapsedComponentFont,
    decreaseCollapsedComponentFont,
    canDecreaseUi: canDecreaseUiFont,
    canIncreaseUi: canIncreaseUiFont,
    canDecreaseCanvas: canDecreaseCanvasFont,
    canIncreaseCanvas: canIncreaseCanvasFont,
    canDecreaseCollapsedComponent: canDecreaseCollapsedComponentFont,
    canIncreaseCollapsedComponent: canIncreaseCollapsedComponentFont,
    uiDelta: uiFontPxShift,
    canvasDelta: canvasFontPxShift,
    collapsedComponentDelta: collapsedComponentFontPxShift,
  } = useFontScaleToolbar();
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const saveDropdownRef = useRef(null);
  const layoutDropdownRef = useRef(null);

  const workspaceLayouts = [
    {
      id: 'conf1',
      label: '#1',
      title: 'Conf 1: charts bottom, Controls full-height on the right',
    },
    {
      id: 'conf2',
      label: '#2',
      title: 'Conf 2: charts on the right, Controls bottom-left',
    },
    {
      id: 'conf3',
      label: '#3',
      title: 'Conf 3: 2×2 chart grid in right drawer, Controls bottom-left',
    },
    {
      id: 'conf4',
      label: '#4',
      title: 'Conf 4: like conf 2, chart2 under chart1',
    },
  ];

  useEffect(() => {
    if (!saveMenuOpen) return;
    const onDocMouseDown = (e) => {
      if (saveDropdownRef.current && !saveDropdownRef.current.contains(e.target)) {
        setSaveMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setSaveMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [saveMenuOpen]);

  useEffect(() => {
    if (!layoutMenuOpen) return;
    const onDocMouseDown = (e) => {
      if (layoutDropdownRef.current && !layoutDropdownRef.current.contains(e.target)) {
        setLayoutMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setLayoutMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [layoutMenuOpen]);

  const closeSaveMenu = () => setSaveMenuOpen(false);
  const closeLayoutMenu = () => setLayoutMenuOpen(false);

  /**
   * Toggle fullscreen for the entire page
   */
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen(); // Safari
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen(); // IE11
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen(); // Safari
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen(); // IE11
      }
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-section toolbar-workspace-layout" role="group" aria-label="Chart and panel layout">
        <div className="toolbar-layout-dropdown" ref={layoutDropdownRef}>
          <button
            type="button"
            className={`btn-layout-trigger${layoutMenuOpen ? ' btn-layout-trigger--open' : ''}`}
            onClick={() => setLayoutMenuOpen((o) => !o)}
            title="Layout configuration"
            aria-label="Layout configuration"
            aria-expanded={layoutMenuOpen}
            aria-haspopup="menu"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="8" cy="8" r="6.75" fill="none" stroke="currentColor" strokeWidth="1.25" />
              <circle cx="8" cy="8" r="1.75" />
            </svg>
          </button>
          {layoutMenuOpen && (
            <div className="toolbar-layout-menu" role="menu">
              {workspaceLayouts.map((layout) => (
                <button
                  key={layout.id}
                  type="button"
                  className={`toolbar-layout-menu-item${
                    workspaceLayoutPreset === layout.id ? ' toolbar-layout-menu-item--active' : ''
                  }`}
                  role="menuitemradio"
                  aria-checked={workspaceLayoutPreset === layout.id}
                  title={layout.title}
                  onClick={() => {
                    closeLayoutMenu();
                    onWorkspaceLayoutPresetChange?.(layout.id);
                  }}
                >
                  {layout.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* In Customer view, show Start/Stop Simulation buttons */}
      {viewMode === 'customer' && (
        <div className="toolbar-section toolbar-sim-buttons">
          <button
            type="button"
            className={`btn-sim btn-sim--icon ${
              simulationRunning && !simulationLoopMode ? 'stop' : 'start'
            }`}
            onClick={
              simulationRunning && !simulationLoopMode
                ? onStopSimulation
                : onStartSimulation
            }
            disabled={!hasComponents && !simulationRunning}
            title={
              !hasComponents
                ? 'Load a configuration first'
                : simulationRunning && !simulationLoopMode
                  ? 'Stop simulation'
                  : simulationLoopMode && simulationRunning
                    ? 'Start plain simulation'
                    : 'Start simulation'
            }
            aria-label={
              simulationRunning && !simulationLoopMode
                ? 'Stop simulation'
                : 'Start simulation'
            }
          >
            {simulationRunning && !simulationLoopMode ? <SimStopIcon /> : <SimPlayIcon />}
          </button>
          <button
            type="button"
            className={`btn-sim btn-sim--icon ${
              simulationRunning && simulationLoopMode ? 'stop' : 'start'
            }`}
            onClick={
              simulationRunning && simulationLoopMode
                ? onStopSimulation
                : onStartSimulationWithLoop
            }
            disabled={!hasComponents && !simulationRunning}
            title={
              !hasComponents
                ? 'Load a configuration first'
                : simulationRunning && simulationLoopMode
                  ? 'Stop loop simulation'
                  : 'Start simulation with loop'
            }
            aria-label={
              simulationRunning && simulationLoopMode
                ? 'Stop loop simulation'
                : 'Start simulation with loop'
            }
          >
            {simulationRunning && simulationLoopMode ? <SimStopIcon /> : <SimPlayLoopIcon />}
          </button>
        </div>
      )}

      {/* Save/Load Section: save actions in dropdown; Load stays on the bar */}
      <div className="toolbar-section">
        <div className="toolbar-save-dropdown" ref={saveDropdownRef}>
          <button
            type="button"
            className="btn-save-trigger"
            onClick={() => setSaveMenuOpen((o) => !o)}
            title="Save"
            aria-expanded={saveMenuOpen}
            aria-haspopup="menu"
          >
            💾
          </button>
          {saveMenuOpen && (
            <div className="toolbar-save-menu" role="menu">
              <button
                type="button"
                className="toolbar-save-menu-item"
                role="menuitem"
                disabled={!hasComponents}
                title={canSave ? 'Save Design (overwrite current config)' : 'Save Design As (first time save)'}
                onClick={() => {
                  closeSaveMenu();
                  onSave();
                }}
              >
                {canSave ? 'Save Design' : 'Save Design As'}
              </button>
              {canSave && (
                <button
                  type="button"
                  className="toolbar-save-menu-item"
                  role="menuitem"
                  title="Save Design As (create new config)"
                  onClick={() => {
                    closeSaveMenu();
                    onSaveAs();
                  }}
                >
                  Save Design As
                </button>
              )}
              {canSaveToIdeum && (
                <button
                  type="button"
                  className="toolbar-save-menu-item toolbar-save-menu-item--ideum"
                  role="menuitem"
                  title="Save the current Ideum reference view (pan/zoom and layout) to its Ideum-only design file — not Ideum05"
                  onClick={() => {
                    closeSaveMenu();
                    onSaveToIdeum?.();
                  }}
                >
                  Save to Ideum
                </button>
              )}
              {canSaveSimulationConfig && (
                <button
                  type="button"
                  className="toolbar-save-menu-item"
                  role="menuitem"
                  title="Save configuration as: snapshot current charts and panel settings into this scenario’s .sim.json under a name"
                  onClick={() => {
                    closeSaveMenu();
                    onSaveSimulationConfig();
                  }}
                >
                  Save configuration as
                </button>
              )}
              {canSaveScenarioAs && (
                <button
                  type="button"
                  className="toolbar-save-menu-item"
                  role="menuitem"
                  title="Save scenario as: same chart preset as above, plus a Quick Scenarios button with custom name, color, and icon"
                  onClick={() => {
                    closeSaveMenu();
                    onSaveScenarioAs();
                  }}
                >
                  Save scenario as
                </button>
              )}
              {canCopyScenarioLink && (
                <button
                  type="button"
                  className="toolbar-save-menu-item toolbar-save-menu-item--link"
                  role="menuitem"
                  title="Copy a link that opens this design, loads this scenario, and optionally the highlighted chart preset"
                  onClick={() => {
                    closeSaveMenu();
                    onCopyScenarioLink();
                  }}
                >
                  Copy scenario link
                </button>
              )}
            </div>
          )}
        </div>
        <button className="btn-load" onClick={onLoad} title="Load configuration">
          📂 Load
        </button>
        {canCloneGraphs && (
          <button
            className="btn-clone-graphs"
            onClick={onCloneGraphs}
            title="Clone graph layout from another design (quick-scenario presets only)"
          >
            📋
          </button>
        )}
      </div>

      <div className="toolbar-section">
        <span className="zoom-label">Zoom: {(zoom * 100).toFixed(0)}%</span>
        <button className="btn-zoom" onClick={onZoomOut} title="Zoom Out">
          −
        </button>
        <button className="btn-zoom" onClick={onZoomIn} title="Zoom In">
          +
        </button>
        <button className="btn-zoom" onClick={onResetView} title="Reset View">
          ⊙
        </button>
        <span className="toolbar-font-shift-label toolbar-font-shift-label--ui">
          UI: {uiFontPxShift >= 0 ? '+' : ''}
          {uiFontPxShift}
        </span>
        <button
          className="btn-zoom"
          type="button"
          onClick={decreaseUiFont}
          disabled={!canDecreaseUiFont}
          title="Smaller font for menus, dialogs, charts, libraries"
          aria-label="Decrease UI font size"
        >
          −
        </button>
        <button
          className="btn-zoom"
          type="button"
          onClick={increaseUiFont}
          disabled={!canIncreaseUiFont}
          title="Larger font for menus, dialogs, charts, libraries"
          aria-label="Increase UI font size"
        >
          +
        </button>
        <span
          className="toolbar-font-shift-label toolbar-font-shift-label--canvas"
          title="Diagram (schematic SVG) font — saved with design"
        >
          Diagram: {canvasFontPxShift >= 0 ? '+' : ''}
          {canvasFontPxShift}
        </span>
        <button
          className="btn-zoom"
          type="button"
          onClick={decreaseCanvasFont}
          disabled={!canDecreaseCanvasFont}
          title="Smaller schematic labels on the diagram (saved with design)"
          aria-label="Decrease diagram font size"
        >
          −
        </button>
        <button
          className="btn-zoom"
          type="button"
          onClick={increaseCanvasFont}
          disabled={!canIncreaseCanvasFont}
          title="Larger schematic labels on the diagram (saved with design)"
          aria-label="Increase diagram font size"
        >
          +
        </button>
        <span
          className="toolbar-font-shift-label toolbar-font-shift-label--collapsed"
          title="Collapsed aggregate titles — 3D gas turbine, Aux Loads, Tie Breaker Network (saved with design)"
        >
          Collapsed: {collapsedComponentFontPxShift >= 0 ? '+' : ''}
          {collapsedComponentFontPxShift}
        </span>
        <button
          className="btn-zoom"
          type="button"
          onClick={decreaseCollapsedComponentFont}
          disabled={!canDecreaseCollapsedComponentFont}
          title="Smaller titles on collapsed aggregate cards (saved with design)"
          aria-label="Decrease collapsed component font size"
        >
          −
        </button>
        <button
          className="btn-zoom"
          type="button"
          onClick={increaseCollapsedComponentFont}
          disabled={!canIncreaseCollapsedComponentFont}
          title="Larger titles on collapsed aggregate cards (saved with design)"
          aria-label="Increase collapsed component font size"
        >
          +
        </button>
      </div>

      {/* Fullscreen Button - Far Right */}
      <div className="toolbar-section toolbar-section-right">
        <button className="btn-fullscreen" onClick={handleFullscreen} title="Toggle Fullscreen (F11)">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
