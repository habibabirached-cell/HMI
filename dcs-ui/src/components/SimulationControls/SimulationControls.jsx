import React from 'react';
import './SimulationControls.css';
import EnsembleEditorDialog from '../EnsembleEditorDialog/EnsembleEditorDialog';
import QuickScenarioContextMenu from './QuickScenarioContextMenu';
import { isPerfDebugEnabled, logPerfLayout, logPerfAfterPaint } from '../../utils/perfDebug';
import { DEFAULT_QUICK_SCENARIOS, isQuickScenarioControlsShortcut } from '../../data/quickScenarioUi';
import { hasQuickScenarioCollapseControl } from '../../utils/designCollapseState';

function QuickScenarioCollapseSwitch({
  shortcut,
  quickScenarioBranchCollapsed,
  onQuickScenarioCollapseChange,
}) {
  if (!shortcut?.presetName || !hasQuickScenarioCollapseControl(shortcut.presetName)) {
    return null;
  }
  const isExpanded = quickScenarioBranchCollapsed[shortcut.presetName] === false;
  return (
    <button
      type="button"
      role="switch"
      className={`quick-scenario-collapse-switch${
        isExpanded ? ' quick-scenario-collapse-switch--expanded' : ''
      }`}
      aria-checked={isExpanded}
      aria-label={isExpanded ? 'Expanded view' : 'Compact view'}
      title={
        isExpanded ? 'Expanded — slide up to compact' : 'Compact — slide down to expand'
      }
      onClick={() => {
        onQuickScenarioCollapseChange?.(shortcut, isExpanded);
      }}
    >
      <span className="quick-scenario-collapse-switch__thumb" aria-hidden="true" />
    </button>
  );
}

function QuickScenarioShortcutRow({
  shortcut,
  quickScenarioBranchCollapsed,
  onQuickScenarioCollapseChange,
  onQuickScenarioShortcutClick,
  onSaveQuickScenarioPreset,
  onDeleteQuickScenarioButton,
  onQuickScenarioContextMenu,
  rightRailGridPeek,
}) {
  return (
    <div className="quick-scenario-row">
      <button
        type="button"
        className="control-btn quick-scenario-shortcut"
        style={{ background: shortcut.color }}
        onClick={() => onQuickScenarioShortcutClick?.(shortcut)}
        onContextMenu={(e) => onQuickScenarioContextMenu?.(e, shortcut)}
        title={`Load chart preset “${shortcut.presetName}”${
          shortcut.targetType === 'ensemble'
            ? ` (ensemble ${shortcut.ensembleId})`
            : ` (scenario ${shortcut.simulationId})`
        }`}
      >
        {shortcut.icon} {shortcut.label}
      </button>
      <QuickScenarioCollapseSwitch
        shortcut={shortcut}
        quickScenarioBranchCollapsed={quickScenarioBranchCollapsed}
        onQuickScenarioCollapseChange={onQuickScenarioCollapseChange}
      />
      {onSaveQuickScenarioPreset && !rightRailGridPeek && (
        <button
          type="button"
          className="quick-scenario-save"
          title={`Save current charts and panel settings as “${shortcut.presetName}”`}
          aria-label={`Save configuration for ${shortcut.label}`}
          onClick={() => onSaveQuickScenarioPreset(shortcut)}
        >
          💾
        </button>
      )}
      {onDeleteQuickScenarioButton && !rightRailGridPeek && (
        <button
          type="button"
          className="quick-scenario-trash"
          title="Delete this shortcut"
          aria-label={`Delete ${shortcut.label}`}
          onClick={() => onDeleteQuickScenarioButton(shortcut.id)}
        >
          🗑️
        </button>
      )}
    </div>
  );
}

/**
 * SIMULATION CONTROLS COMPONENT
 * 
 * This is the control panel that appears on the right side of the screen
 * when you're in Simulation Mode. It shows different buttons depending on
 * which component you've clicked on the canvas.
 * 
 * PURPOSE:
 * - Shows action buttons specific to the selected component type
 * - For example: turbines get "Trip" and "Restart" buttons
 * - For example: breakers get "Open", "Close", "Trip" buttons
 * - Shows dynamically generated simulation scenario buttons
 * 
 * PROPS IT RECEIVES (like function parameters):
 * - mode: string - either 'design' or 'simulation'
 * - selectedComponent: object - the component the user clicked on the canvas
 * - onTripComponent: function - a callback we can call to trip/fail a component
 * - onRestartComponent: function - a callback to bring component back online
 * - availableSimulations: array - unique simulation identifiers from CSV
 * - simConfig: object - simulation configuration JSON with display names and metadata
 * - onRunSimulation: function - callback when user clicks a simulation button
 * - onDeleteAllSimulations: function (optional) - delete every scenario in the design (design-dir flow)
 * - activeSimulationId: string | null - STEP 2: ID of the simulation currently loaded; the matching
 *   scenario button gets a bright "active" style so the user sees which sim they're in
 * - simulationLoadProgress: { simulationId, percent, status, loadSource?: 'pending'|'cache'|'server' } | null -
 *   When present, shows a linear
 *   progress bar and status under the scenario list, and disables scenario play buttons until the load ends.
 */
const SimulationControls = ({ 
  mode, 
  viewMode,
  simulationRunning,
  activeSimulationId,
  selectedComponent, 
  onTripComponent, 
  onRestartComponent,
  onOpenBreaker,
  onCloseBreaker,
  onTripBreaker,
  onTripRandomTurbine,
  onTripAllTurbines,
  onGridLoss,
  onOpenAllBreakers,
  simulationTime,
  simulationSpeed,
  onSetSimulationSpeed,
  availableSimulations,
  simConfig,
  onRunSimulation,
  /*
   * Ensemble support (phase 1): designEnsembles is the list returned from the server’s /ensembles route,
   * which reads {design_folder}.ensemble.json next to your .conf.json. activeEnsembleId tells us which
   * purple ensemble button is selected so we can outline its member scenarios. onSelectEnsemble is called
   * instead of onRunSimulation when you click an ensemble. Variable lists for charts live in the property
   * panel chart builder.
   */
  designEnsembles = [],
  activeEnsembleId = null,
  onSelectEnsemble,
  onDeleteEnsemble,
  /** When set, “Add / Edit ensemble” can persist to {leaf}.ensemble.json via the API. */
  designApiPath = null,
  onRefreshDesignEnsembles,
  useDesignDir,
  currentConfigName,
  onUploadSimData,
  onDeleteSimulation,
  /** Delete every scenario in the current design (design-dir flow). */
  onDeleteAllSimulations,
  /** Clear IndexedDB cache for this scenario’s CSV payload (browser only). */
  onClearSimulationCache,
  onViewSimData,
  onAddSimulation,
  onAddSimulationsFromXlsx,
  onAddSimulationsFromPkl,
  onAddSimulationFromPkl2,
  // Set by App while a scenario CSV is downloading or being processed. Used to render the linear meter,
  // show the current phase in plain language, and prevent double-clicks on another scenario mid-load.
  simulationLoadProgress = null,
  quickScenarioButtons = [],
  hiddenDefaultQuickScenarios = [],
  activeQuickScenarioPlaying = null,
  activeNamedSimulationConfig = null,
  onQuickScenarioShortcutClick,
  quickScenarioBranchCollapsed = {},
  onQuickScenarioCollapseChange,
  onSaveQuickScenarioPreset,
  onDeleteQuickScenarioButton,
  onHideDefaultQuickScenario,
  canSaveScenarioAs = false,
  onSaveScenarioAsReplace,
  rightRailGridPeek = false,
  onToggleRightRailGridPeek,
}) => {
  const [quickScenarioContextMenu, setQuickScenarioContextMenu] = React.useState(null);

  const handleQuickScenarioContextMenu = React.useCallback(
    (e, shortcut) => {
      if (!canSaveScenarioAs || !onSaveScenarioAsReplace) return;
      e.preventDefault();
      e.stopPropagation();
      setQuickScenarioContextMenu({
        x: e.clientX,
        y: e.clientY,
        shortcut,
      });
    },
    [canSaveScenarioAs, onSaveScenarioAsReplace],
  );

  const closeQuickScenarioContextMenu = React.useCallback(() => {
    setQuickScenarioContextMenu(null);
  }, []);

  const [showAddSimForm, setShowAddSimForm] = React.useState(false);
  const [newSimName, setNewSimName] = React.useState('');
  const [ensembleEditor, setEnsembleEditor] = React.useState(null);
  const [importSampleStep, setImportSampleStep] = React.useState(1);
  const [simScenariosCollapsed, setSimScenariosCollapsed] = React.useState(() => {
    try {
      return window.localStorage?.getItem('dcsSimScenariosCollapsed') === '1';
    } catch {
      return false;
    }
  });
  const xlsxInputRef = React.useRef(null);
  const pklInputRef = React.useRef(null);
  const pkl2InputRef = React.useRef(null);

  const activeQuickScenarioShortcut = React.useMemo(() => {
    if (activeQuickScenarioPlaying) return activeQuickScenarioPlaying;
    if (!activeNamedSimulationConfig) return null;
    return (
      quickScenarioButtons.find((b) => b.presetName === activeNamedSimulationConfig) ?? null
    );
  }, [activeQuickScenarioPlaying, activeNamedSimulationConfig, quickScenarioButtons]);

  const inactiveQuickScenarioShortcuts = React.useMemo(
    () =>
      quickScenarioButtons.filter((shortcut) => {
        const isActive =
          simulationRunning && activeQuickScenarioShortcut?.id === shortcut.id;
        return !isActive;
      }),
    [quickScenarioButtons, simulationRunning, activeQuickScenarioShortcut],
  );

  const quickScenarioShortcuts = React.useMemo(
    () => inactiveQuickScenarioShortcuts.filter((s) => !isQuickScenarioControlsShortcut(s)),
    [inactiveQuickScenarioShortcuts],
  );

  const controlShortcuts = React.useMemo(
    () => inactiveQuickScenarioShortcuts.filter((s) => isQuickScenarioControlsShortcut(s)),
    [inactiveQuickScenarioShortcuts],
  );

  const toggleSimScenariosCollapsed = () => {
    setSimScenariosCollapsed((collapsed) => {
      const next = !collapsed;
      try {
        window.localStorage?.setItem('dcsSimScenariosCollapsed', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  React.useLayoutEffect(() => {
    if (mode !== 'simulation' && viewMode !== 'customer') return;
    if (!isPerfDebugEnabled()) return;
    logPerfLayout('SimulationControls', {
      selectedId: selectedComponent?.id ?? null,
      activeEnsembleId: activeEnsembleId ?? null,
    });
    logPerfAfterPaint('SimulationControls');
  }, [mode, viewMode, selectedComponent?.id, activeEnsembleId]);

  // ========================================================================
  // VISIBILITY CHECK
  // ========================================================================
  // EARLY RETURN: Only show panel in simulation or customer view
  // ========================================================================
  // Show panel when:
  // 1. In simulation mode (for designer view)
  // 2. In customer view (always available for customers)
  if (mode !== 'simulation' && viewMode !== 'customer') {
    return null;
  }

  // ========================================================================
  // FUNCTION: renderComponentControls
  // ========================================================================
  // This function decides what to show inside the control panel.
  // It has two cases:
  //   Case 1: Nothing is selected → show placeholder text
  //   Case 2: Something is selected → show buttons for that component
  const renderComponentControls = () => {
    // CASE 1: No component selected yet
    // Show helpful text telling the user to select something
    if (!selectedComponent) {
      return (
        <p className="controls-placeholder">
          Control panel ready. Select a component to see available actions.
        </p>
      );
    }

    // CASE 2: A component is selected
    // Figure out what TYPE of component it is (turbine? breaker? battery?)
    // We look in the "type" field first, then "id" field as backup
    const componentType = selectedComponent.type || selectedComponent.id || '';
    
    // Get a human-readable name to display (e.g., "LM2500" or "HV Breaker")
    const componentName = selectedComponent.name || selectedComponent.id || 'Unknown';

    // Now build the control panel content:
    return (
      <div className="component-controls">
        {/* Show which component is selected */}
        <div className="selected-component-label">
          <strong>Selected:</strong> {componentName}
        </div>

        {/* Show the action buttons for this component type */}
        <div className="control-buttons">
          {renderButtonsForType(componentType)}
        </div>
      </div>
    );
  };

  // ========================================================================
  // FUNCTION: renderButtonsForType
  // ========================================================================
  // This function looks at the component type and returns the appropriate
  // set of buttons. Different equipment needs different controls.
  // 
  // HOW IT WORKS:
  // - Check if the type string contains certain keywords
  // - If it's a turbine → show turbine buttons
  // - If it's a breaker → show breaker buttons
  // - If it's a battery → show battery buttons
  // - Otherwise → show generic offline/online buttons
  const renderButtonsForType = (type) => {
    // -----------------------------------------------------------------------
    // GAS TURBINE CONTROLS
    // -----------------------------------------------------------------------
    // Turbines can trip (fail) or be restarted
    // We check if the type includes "gas-turbine" or just "turbine"
    if (type.includes('gas-turbine') || type.includes('turbine')) {
      return (
        <>
          {/* ===============================================================
              RED BUTTON: Trip Turbine
              ===============================================================
              This button simulates a turbine failure/trip.
              
              WHAT HAPPENS WHEN CLICKED:
              1. onClick event fires (user clicked the button)
              2. We call onTripComponent() with the selected component's ID
              3. This calls the handleTripComponent function in App.js
              4. App.js updates the component's status to 'offline'
              5. React re-renders the canvas with the turbine in red
              
              JAVASCRIPT CONCEPT - Arrow Function:
              onClick={() => onTripComponent(selectedComponent.id)}
                      ^^^^
              This creates a small anonymous function that runs when clicked.
              We need this because we want to CALL onTripComponent WITH
              an argument (the ID). If we wrote onClick={onTripComponent},
              it would call the function immediately without an ID.
              
              JAVASCRIPT CONCEPT - Optional Chaining:
              selectedComponent?.id means "if selectedComponent exists,
              get its id property, otherwise return undefined".
              The ? prevents errors if selectedComponent is null.
          =============================================================== */}
          <button 
            className="control-btn control-btn-danger"
            onClick={() => {
              console.log('🔴 Trip Turbine clicked for:', selectedComponent?.name, selectedComponent?.id);
              onTripComponent(selectedComponent.id);
            }}
          >
            Trip Turbine
          </button>
          
          {/* ===============================================================
              GREEN BUTTON: Restart Turbine
              ===============================================================
              This button brings a tripped turbine back online.
              
              WHAT HAPPENS WHEN CLICKED:
              1. onClick event fires (user clicked the button)
              2. We call onRestartComponent() with the selected component's ID
              3. This calls the handleRestartComponent function in App.js
              4. App.js updates the component's status to 'normal'
              5. React re-renders the canvas with the turbine in grey/normal
              
              OPPOSITE OF TRIP: This reverses what "Trip Turbine" did.
          =============================================================== */}
          <button 
            className="control-btn control-btn-success"
            onClick={() => {
              console.log('🟢 Restart Turbine clicked for:', selectedComponent?.name, selectedComponent?.id);
              onRestartComponent(selectedComponent.id);
            }}
          >
            Restart Turbine
          </button>
        </>
      );
    }

    // -----------------------------------------------------------------------
    // CIRCUIT BREAKER CONTROLS
    // -----------------------------------------------------------------------
    // Breakers can be opened (disconnect circuit), closed (connect circuit),
    // or tripped (protection fault). This gives us three actions.
    // Tie Breaker Network also gets these controls (connects both buses).
    if (type.includes('breaker') || type === 'tie-breaker-network') {
      return (
        <>
          {/* ===============================================================
              ORANGE BUTTON: Open Breaker
              ===============================================================
              Manually opens the breaker to disconnect the circuit.
              This is a NORMAL operation, not a failure.
              
              USE CASE: Operators open breakers to isolate sections of the
              power system for maintenance or reconfiguration.
          =============================================================== */}
          <button 
            className="control-btn control-btn-warning"
            onClick={() => {
              console.log('🟠 Open Breaker clicked for:', selectedComponent?.name, selectedComponent?.id);
              onOpenBreaker(selectedComponent.id);
            }}
          >
            Open Breaker
          </button>
          
          {/* ===============================================================
              GREEN BUTTON: Close Breaker
              ===============================================================
              Closes the breaker to reconnect the circuit.
              Restores normal operation after manual opening.
          =============================================================== */}
          <button 
            className="control-btn control-btn-success"
            onClick={() => {
              console.log('🟢 Close Breaker clicked for:', selectedComponent?.name, selectedComponent?.id);
              onCloseBreaker(selectedComponent.id);
            }}
          >
            Close Breaker
          </button>
          
          {/* ===============================================================
              RED BUTTON: Trip Breaker
              ===============================================================
              Simulates a protection fault (overcurrent, short circuit, etc.)
              The breaker automatically opens due to a fault condition.
              
              DIFFERENCE FROM "OPEN":
              - Open = Manual operation by operator
              - Trip = Automatic safety response to a fault
          =============================================================== */}
          <button 
            className="control-btn control-btn-danger"
            onClick={() => {
              console.log('🔴 Trip Breaker clicked for:', selectedComponent?.name, selectedComponent?.id);
              onTripBreaker(selectedComponent.id);
            }}
          >
            Trip Breaker
          </button>
        </>
      );
    }

    // -----------------------------------------------------------------------
    // BATTERY / BESS CONTROLS
    // -----------------------------------------------------------------------
    // Batteries can fail or be enabled/disabled
    // We check for "bess" (Battery Energy Storage System) or "battery"
    if (type.includes('bess') || type.includes('battery')) {
      return (
        <>
          {/* ===============================================================
              RED BUTTON: Battery Failure
              ===============================================================
              Simulates a battery failure or taking BESS offline.
              This could represent:
              - Battery cell failure
              - Thermal runaway protection
              - BMS (Battery Management System) fault
              - Inverter/converter failure
          =============================================================== */}
          <button 
            className="control-btn control-btn-danger"
            onClick={() => {
              console.log('🔴 Battery Failure clicked for:', selectedComponent?.name, selectedComponent?.id);
              onTripComponent(selectedComponent.id);
            }}
          >
            Battery Failure
          </button>
          
          {/* ===============================================================
              GREEN BUTTON: Enable Battery
              ===============================================================
              Brings the BESS back online after a failure.
              Restores normal battery operation.
          =============================================================== */}
          <button 
            className="control-btn control-btn-success"
            onClick={() => {
              console.log('🟢 Enable Battery clicked for:', selectedComponent?.name, selectedComponent?.id);
              onRestartComponent(selectedComponent.id);
            }}
          >
            Enable Battery
          </button>
        </>
      );
    }

    // -----------------------------------------------------------------------
    // GENERIC CONTROLS (DEFAULT)
    // -----------------------------------------------------------------------
    // For any other type of component (transformers, loads, etc.)
    // Give them simple offline/online controls
    return (
      <>
        {/* ===============================================================
            RED BUTTON: Take Offline (Generic)
            ===============================================================
            This button works the same as "Trip Turbine" but for any
            component type (transformers, loads, etc.)
            
            DEBUG: Added console.log to see when this is clicked
        =============================================================== */}
        <button 
          className="control-btn control-btn-danger"
          onClick={() => {
            console.log('🔴 Take Offline clicked for:', selectedComponent?.name, selectedComponent?.id);
            onTripComponent(selectedComponent.id);
          }}
        >
          Take Offline
        </button>
        
        {/* ===============================================================
            GREEN BUTTON: Bring Online (Generic)
            ===============================================================
            This button works the same as "Restart Turbine" but for any
            component type (transformers, loads, etc.)
            
            DEBUG: Added console.log to see when this is clicked
        =============================================================== */}
        <button 
          className="control-btn control-btn-success"
          onClick={() => {
            console.log('🟢 Bring Online clicked for:', selectedComponent?.name, selectedComponent?.id);
            onRestartComponent(selectedComponent.id);
          }}
        >
          Bring Online
        </button>
      </>
    );
  };

  // ========================================================================
  // RENDER THE PANEL
  // ========================================================================
  // This is the actual HTML structure that gets displayed on screen
  return (
    <div className={`simulation-controls${rightRailGridPeek ? ' simulation-controls--grid-peek' : ''}`}>
      {/* Header bar with title */}
      <div className="controls-header">
        {!rightRailGridPeek && <h3>Simulation Controls</h3>}
        {onToggleRightRailGridPeek && (
          <button
            type="button"
            className="controls-grid-peek-toggle"
            onClick={onToggleRightRailGridPeek}
            title={
              rightRailGridPeek
                ? 'Show property panel and full simulation controls'
                : 'Hide panels to view canvas grid (scenarios and simulation speed stay visible)'
            }
            aria-pressed={rightRailGridPeek}
          >
            {rightRailGridPeek ? 'Reveal' : 'Hide'}
          </button>
        )}
      </div>

      {/* Body area where buttons appear */}
      <div className="controls-body">
        {/* ================================================================
            CURRENT SCENARIO + QUICK SCENARIOS (top of panel)
            ================================================================ */}
        <div className="scenario-playing-now-section">
          <h4 className="scenarios-title">Current scenario:</h4>
          {activeQuickScenarioShortcut && simulationRunning ? (
            <div className="scenario-playing-now-display">
              <div className="quick-scenario-row quick-scenario-row--playing">
                <div
                  className="scenario-playing-now-btn quick-scenario-playing-btn"
                  style={{ '--scenario-play-color': activeQuickScenarioShortcut.color }}
                  role="status"
                  aria-label={`Playing: ${activeQuickScenarioShortcut.label}`}
                  onContextMenu={(e) =>
                    handleQuickScenarioContextMenu(e, activeQuickScenarioShortcut)
                  }
                >
                  <span className="quick-scenario-playing-shimmer" aria-hidden="true" />
                  <span className="quick-scenario-playing-label">
                    {activeQuickScenarioShortcut.icon} {activeQuickScenarioShortcut.label}
                  </span>
                </div>
                <QuickScenarioCollapseSwitch
                  shortcut={activeQuickScenarioShortcut}
                  quickScenarioBranchCollapsed={quickScenarioBranchCollapsed}
                  onQuickScenarioCollapseChange={onQuickScenarioCollapseChange}
                />
              </div>
            </div>
          ) : rightRailGridPeek ? null : (
            <p className="scenario-playing-now-empty">—</p>
          )}
        </div>

        <div className="quick-scenarios-section quick-scenarios-section--top">
          <h4 className="scenarios-title">Quick Scenarios</h4>

          <div className="control-buttons">
            {DEFAULT_QUICK_SCENARIOS.filter(
              (def) => !hiddenDefaultQuickScenarios.includes(def.id),
            ).map((def) => {
              const runDefault = () => {
                if (def.action === 'tripRandom') onTripRandomTurbine?.();
                else if (def.action === 'tripAll') onTripAllTurbines?.();
                else if (def.action === 'gridLoss') onGridLoss?.();
                else if (def.action === 'openAll') onOpenAllBreakers?.();
              };
              return (
                <div key={def.id} className="quick-scenario-row">
                  <button
                    type="button"
                    className={`control-btn control-btn-${def.variant}`}
                    onClick={runDefault}
                    title={def.label}
                  >
                    {def.icon} {def.label}
                  </button>
                  {onHideDefaultQuickScenario && !rightRailGridPeek && (
                    <button
                      type="button"
                      className="quick-scenario-trash"
                      title="Remove this button from Quick Scenarios (saved with design)"
                      aria-label={`Remove ${def.label}`}
                      onClick={() => onHideDefaultQuickScenario(def.id)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              );
            })}

            {quickScenarioShortcuts.map((shortcut) => (
              <QuickScenarioShortcutRow
                key={shortcut.id}
                shortcut={shortcut}
                quickScenarioBranchCollapsed={quickScenarioBranchCollapsed}
                onQuickScenarioCollapseChange={onQuickScenarioCollapseChange}
                onQuickScenarioShortcutClick={onQuickScenarioShortcutClick}
                onSaveQuickScenarioPreset={onSaveQuickScenarioPreset}
                onDeleteQuickScenarioButton={onDeleteQuickScenarioButton}
                onQuickScenarioContextMenu={handleQuickScenarioContextMenu}
                rightRailGridPeek={rightRailGridPeek}
              />
            ))}
          </div>
        </div>

        {controlShortcuts.length > 0 && (
          <div className="controls-shortcuts-section controls-shortcuts-section--top">
            <h4 className="scenarios-title">Controls</h4>
            <div className="control-buttons">
              {controlShortcuts.map((shortcut) => (
                <QuickScenarioShortcutRow
                  key={shortcut.id}
                  shortcut={shortcut}
                  quickScenarioBranchCollapsed={quickScenarioBranchCollapsed}
                  onQuickScenarioCollapseChange={onQuickScenarioCollapseChange}
                  onQuickScenarioShortcutClick={onQuickScenarioShortcutClick}
                  onSaveQuickScenarioPreset={onSaveQuickScenarioPreset}
                  onDeleteQuickScenarioButton={onDeleteQuickScenarioButton}
                  onQuickScenarioContextMenu={handleQuickScenarioContextMenu}
                  rightRailGridPeek={rightRailGridPeek}
                />
              ))}
            </div>
          </div>
        )}

        {/* Simulation time + speed — pinned below quick scenarios; always visible in grid peek */}
        {(simulationRunning || rightRailGridPeek) && (
          <div className="simulation-speed-section simulation-speed-section--after-quick-scenarios">
            <h4 className="scenarios-title">Simulation Speed</h4>

            <div className="simulation-time-display">
              <div className="time-label">Simulation Time:</div>
              <div className="time-value">{simulationTime?.toFixed(1) || '0.0'} seconds</div>
            </div>

            <div className="speed-buttons">
              <button
                className={`speed-btn ${Math.abs(simulationSpeed - 0.001) < 1e-9 ? 'active' : ''}`}
                onClick={() => onSetSimulationSpeed && onSetSimulationSpeed(0.001)}
                title="1000× slower (0.001× speed)"
              >
                0.001×
              </button>
              <button
                className={`speed-btn ${Math.abs(simulationSpeed - 0.01) < 1e-9 ? 'active' : ''}`}
                onClick={() => onSetSimulationSpeed && onSetSimulationSpeed(0.01)}
                title="100× slower (0.01× speed)"
              >
                0.01×
              </button>
              <button
                className={`speed-btn ${Math.abs(simulationSpeed - 0.1) < 1e-9 ? 'active' : ''}`}
                onClick={() => onSetSimulationSpeed && onSetSimulationSpeed(0.1)}
                title="10× slower (0.1× speed)"
              >
                0.1×
              </button>
              <button
                className={`speed-btn ${simulationSpeed === 1 ? 'active' : ''}`}
                onClick={() => onSetSimulationSpeed && onSetSimulationSpeed(1)}
                title="Real-time speed"
              >
                1×
              </button>
              <button
                className={`speed-btn ${simulationSpeed === 10 ? 'active' : ''}`}
                onClick={() => onSetSimulationSpeed && onSetSimulationSpeed(10)}
                title="10× speed"
              >
                10×
              </button>
              <button
                className={`speed-btn ${simulationSpeed === 100 ? 'active' : ''}`}
                onClick={() => onSetSimulationSpeed && onSetSimulationSpeed(100)}
                title="100× speed"
              >
                100×
              </button>
              <button
                className={`speed-btn ${simulationSpeed === 1000 ? 'active' : ''}`}
                onClick={() => onSetSimulationSpeed && onSetSimulationSpeed(1000)}
                title="1000× speed"
              >
                1000×
              </button>
              <button
                className={`speed-btn ${simulationSpeed === 10000 ? 'active' : ''}`}
                onClick={() => onSetSimulationSpeed && onSetSimulationSpeed(10000)}
                title="10000× speed"
              >
                10000×
              </button>
            </div>
          </div>
        )}

        {!rightRailGridPeek && (
        <>
        {/* ================================================================
            ADD SIMULATION SCENARIO
            ================================================================ */}
        {useDesignDir && currentConfigName && onAddSimulation && (
          <div className="add-sim-section">
            {!showAddSimForm ? (
              <>
                <button
                  type="button"
                  className="btn-add-sim"
                  onClick={() => setShowAddSimForm(true)}
                  title="Create a new simulation scenario"
                >
                  + Add simulation scenario
                </button>
                {(onAddSimulationsFromXlsx || onAddSimulationsFromPkl || onAddSimulationFromPkl2) && (
                  <label className="import-sample-label">
                    Import sample:
                    <select
                      className="import-sample-select"
                      value={importSampleStep}
                      onChange={(e) => setImportSampleStep(Number(e.target.value))}
                      title="Keep 1 in N rows when importing — reduces file size and load time"
                    >
                      {[1, 2, 4, 8, 16, 32, 64, 128].map((n) => (
                        <option key={n} value={n}>1 in {n}</option>
                      ))}
                    </select>
                  </label>
                )}
                {onAddSimulationsFromXlsx && (
                  <>
                    <input
                      ref={xlsxInputRef}
                      type="file"
                      accept=".xlsx"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onAddSimulationsFromXlsx(f, importSampleStep);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      className="btn-add-sim btn-add-sim-xlsx"
                      onClick={() => xlsxInputRef.current?.click()}
                      title="Import each sheet as a simulation scenario"
                    >
                      Add simulation scenarios from xlsx
                    </button>
                  </>
                )}
                {onAddSimulationsFromPkl && (
                  <>
                    <input
                      ref={pklInputRef}
                      type="file"
                      accept=".pkl,.pickle,application/octet-stream"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const raw = window.prompt(
                            `Prefix for simulation names from "${f.name}":\n(e.g. "run1_" → run1_LM2500_1, run1_LM2500_2 …)\nLeave blank for none.`,
                            '',
                          );
                          if (raw === null) { e.target.value = ''; return; } // cancelled
                          onAddSimulationsFromPkl(f, raw.trim(), importSampleStep);
                        }
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      className="btn-add-sim btn-add-sim-xlsx"
                      onClick={() => pklInputRef.current?.click()}
                      title="Import each MultiIndex tab group as a simulation scenario (pandas pickle)"
                    >
                      Add simulation scenarios from pkl
                    </button>
                  </>
                )}
                {onAddSimulationFromPkl2 && (
                  <>
                    <input
                      ref={pkl2InputRef}
                      type="file"
                      accept=".pkl,.pickle,application/octet-stream"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const raw = window.prompt(
                            `Simulation name for "${f.name}":\n(e.g. "NoBESS_21Hz")\nLeave blank to use the file name.`,
                            '',
                          );
                          if (raw === null) { e.target.value = ''; return; } // cancelled
                          onAddSimulationFromPkl2(f, raw.trim(), importSampleStep);
                        }
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      className="btn-add-sim btn-add-sim-xlsx"
                      onClick={() => pkl2InputRef.current?.click()}
                      title="Import a single simulation from a pkl2 file (dict of column→Series)"
                    >
                      Add simulation from pkl2
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="add-sim-form">
                <input
                  type="text"
                  className="add-sim-input"
                  placeholder="Scenario name"
                  value={newSimName}
                  onChange={(e) => setNewSimName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const name = newSimName.trim();
                      if (name) { onAddSimulation(name); setNewSimName(''); setShowAddSimForm(false); }
                    } else if (e.key === 'Escape') {
                      setShowAddSimForm(false); setNewSimName('');
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn-add-sim-submit"
                  onClick={() => {
                    const name = newSimName.trim();
                    if (name) { onAddSimulation(name); setNewSimName(''); setShowAddSimForm(false); }
                  }}
                  disabled={!newSimName.trim()}
                >
                  Add
                </button>
                <button
                  type="button"
                  className="btn-add-sim-cancel"
                  onClick={() => { setShowAddSimForm(false); setNewSimName(''); }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/*
          Ensembles are optional groups defined on disk (not extra .sim.json files). Each button calls
          onSelectEnsemble so App can load metadata for all listed member scenarios and drive the purple
          member outlines plus the variables pane. They are visually distinct from green scenario buttons.
        */}
        {useDesignDir && designApiPath && (
          <div className="simulation-ensembles-section">
            <h4 className="scenarios-title">Ensembles</h4>
            <div className="scenarios-info">
              {(designEnsembles?.length ?? 0) === 0
                ? 'Group scenarios for comparison — create an ensemble below'
                : `${designEnsembles.length} group(s) — member scenarios highlight when selected`}
            </div>
            {onRefreshDesignEnsembles && (
              <button
                type="button"
                className="btn-add-ensemble"
                disabled={!!simulationLoadProgress}
                onClick={() => setEnsembleEditor({ mode: 'create', ensemble: null })}
                title="Create a new ensemble in this design’s .ensemble.json file"
              >
                + Add ensemble
              </button>
            )}
            <div className="control-buttons">
              {(designEnsembles || []).map((ens) => {
                const isEnsActive = activeEnsembleId != null && ens.id === activeEnsembleId;
                return (
                  <div key={ens.id} className="ensemble-button-row">
                    <button
                      type="button"
                      className={`control-btn control-btn-ensemble${isEnsActive ? ' control-btn-ensemble-active' : ''}`}
                      disabled={!!simulationLoadProgress}
                      onClick={() => onSelectEnsemble && onSelectEnsemble(ens)}
                      title={`Members: ${(ens.member_simulations || []).join(', ')}`}
                    >
                      <span className="scenario-btn-stack">
                        <span className="scenario-btn-title">🔗 {ens.display_name || ens.id}</span>
                        <span className="scenario-btn-shape">
                          {(ens.member_simulations || []).length} scenario(s)
                        </span>
                      </span>
                    </button>
                    {onRefreshDesignEnsembles && (
                      <button
                        type="button"
                        className="control-btn control-btn-ensemble-edit"
                        disabled={!!simulationLoadProgress}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnsembleEditor({ mode: 'edit', ensemble: ens });
                        }}
                        title="Edit name and member scenarios"
                        aria-label={`Edit ensemble ${ens.display_name || ens.id}`}
                      >
                        ✎
                      </button>
                    )}
                    <button
                      type="button"
                      className="control-btn control-btn-ensemble-delete"
                      disabled={!!simulationLoadProgress}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEnsemble?.(ens);
                      }}
                      title="Remove this ensemble from the design (.ensemble.json only)"
                      aria-label={`Delete ensemble ${ens.display_name || ens.id}`}
                    >
                      🗑
                    </button>
                  </div>
                );
              })}
            </div>
            {ensembleEditor && onRefreshDesignEnsembles && (
              <EnsembleEditorDialog
                open
                mode={ensembleEditor.mode}
                ensemble={ensembleEditor.ensemble}
                designApiPath={designApiPath}
                availableSimulations={availableSimulations}
                simConfig={simConfig}
                onClose={() => setEnsembleEditor(null)}
                onSaved={onRefreshDesignEnsembles}
              />
            )}
          </div>
        )}

        {/* ================================================================
            SIMULATION SCENARIOS SECTION (at top)
            ================================================================ */}
        {availableSimulations && availableSimulations.length > 0 && (
          <div
            className={`simulation-scenarios-section${simScenariosCollapsed ? ' simulation-scenarios-section--collapsed' : ''}`}
          >
            <div className="scenarios-title-row">
              {useDesignDir && currentConfigName && onDeleteAllSimulations && (
                <button
                  type="button"
                  className="scenarios-bulk-delete"
                  disabled={!!simulationLoadProgress}
                  onClick={() => onDeleteAllSimulations()}
                  title="Delete all simulation scenarios in this design"
                  aria-label="Delete all simulation scenarios in this design"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="16"
                    height="16"
                    aria-hidden
                  >
                    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
                  </svg>
                </button>
              )}
              <h4 className="scenarios-title">Simulation Scenarios</h4>
              {simScenariosCollapsed && (
                <span className="scenarios-title-collapsed-count">
                  ({availableSimulations.length})
                </span>
              )}
              <button
                type="button"
                className="scenarios-section-collapse-toggle"
                onClick={toggleSimScenariosCollapsed}
                title={
                  simScenariosCollapsed
                    ? 'Expand simulation scenarios list'
                    : 'Collapse simulation scenarios list'
                }
                aria-expanded={!simScenariosCollapsed}
                aria-label={
                  simScenariosCollapsed
                    ? 'Expand simulation scenarios'
                    : 'Collapse simulation scenarios'
                }
              >
                <span className="scenarios-collapse-glyph" aria-hidden>
                  ↔
                </span>
              </button>
            </div>
            {!simScenariosCollapsed && (
              <>
            <div className="scenarios-info">
              {availableSimulations.length} scenario(s) detected
            </div>

            <div className="scenarios-split">
            <div className="scenarios-split-main">
            <div className="control-buttons">
              {availableSimulations.map((simId) => {
                let displayName = simId;
                if (simConfig && simConfig.simulations && simConfig.simulations[simId]) {
                  displayName = simConfig.simulations[simId].display_name || simId;
                }
                /* STEP 2: Compare this button's simId to the loaded simulation; if they match,
                   we add the 'active' class so it stands out with a brighter, glowing style. */
                const isActive = activeSimulationId != null && simId === activeSimulationId;
                /*
                 * If an ensemble is selected, look up its member id list and draw a purple frame around
                 * every matching scenario row so you can see “these tabs belong to this ensemble” at a glance.
                 */
                const ensDef = designEnsembles.find((e) => e.id === activeEnsembleId);
                const memberSet = ensDef?.member_simulations
                  ? new Set(ensDef.member_simulations)
                  : null;
                const isEnsembleMember = memberSet && memberSet.has(simId);
                // Subtle outline on the row that matches the scenario currently being fetched.
                const isLoadingThis =
                  simulationLoadProgress && simulationLoadProgress.simulationId === simId;
                const simEntry = simConfig?.simulations?.[simId];
                const colCount = simEntry?.data_column_count;
                const lineCount = simEntry?.data_row_count;
                const shapeLabel =
                  colCount != null && lineCount != null
                    ? `(${colCount}, ${lineCount})`
                    : null;
                return (
                  <div
                    key={simId}
                    className={`scenario-button-row${isLoadingThis ? ' scenario-button-row-loading' : ''}${isEnsembleMember ? ' scenario-button-row-ensemble-member' : ''}`}
                  >
                    {/* Disable all scenario play buttons during a load so we do not stack parallel fetches. */}
                    <button
                      className={`control-btn control-btn-scenario${isActive ? ' control-btn-scenario-active' : ''}`}
                      disabled={!!simulationLoadProgress}
                      onClick={() => {
                        console.log('🎬 Simulation scenario clicked:', simId);
                        if (onRunSimulation) {
                          onRunSimulation(simId);
                        }
                      }}
                      title={simEntry?.description || `Run ${simId} simulation scenario`}
                    >
                      <span className="scenario-btn-stack">
                        <span className="scenario-btn-title">▶️ {displayName}</span>
                        {shapeLabel && (
                          <span className="scenario-btn-shape" aria-label={`${colCount} columns, ${lineCount} rows`}>
                            {shapeLabel}
                          </span>
                        )}
                      </span>
                    </button>
                    {useDesignDir && currentConfigName && (
                      simConfig?.simulations?.[simId]?.has_data ? (
                        <>
                          {onViewSimData && (
                            <button
                              type="button"
                              className="control-btn control-btn-view"
                              onClick={() => onViewSimData(simId)}
                              title={`View data for ${displayName}`}
                            >
                              👁
                            </button>
                          )}
                          {onClearSimulationCache && (
                            <button
                              type="button"
                              className="control-btn control-btn-cache-clear"
                              onClick={() => onClearSimulationCache(simId)}
                              title={`Clear cached CSV / simulation data for “${displayName}” in this browser (next load fetches from server)`}
                            >
                              🧹
                            </button>
                          )}
                          {onDeleteSimulation && (
                            <button
                              type="button"
                              className="control-btn control-btn-delete"
                              onClick={() => onDeleteSimulation(simId)}
                              title={`Delete ${displayName} and its data`}
                            >
                              🗑️
                            </button>
                          )}
                        </>
                      ) : (
                        onUploadSimData && (
                          <>
                            <input
                              type="file"
                              accept=".csv"
                              style={{ display: 'none' }}
                              id={`upload-sim-${simId}`}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) onUploadSimData(simId, f);
                                e.target.value = '';
                              }}
                            />
                            <button
                              type="button"
                              className="control-btn control-btn-upload"
                              onClick={() => document.getElementById(`upload-sim-${simId}`)?.click()}
                              title={`Upload CSV data for ${displayName}`}
                            >
                              📤
                            </button>
                          </>
                        )
                      )
                    )}
                  </div>
                );
              })}
            </div>
            </div>
            </div>

            {/* Linear progress + labels: fed from App.handleRunSimulation. aria-live keeps screen readers
                informed as percent and status text change. */}
            {simulationLoadProgress && (
              <div
                className={`sim-load-progress sim-load-progress--${simulationLoadProgress.loadSource || 'pending'}`}
                aria-live="polite"
              >
                <div className="sim-load-progress-heading">
                  {simulationLoadProgress.loadSource === 'cache'
                    ? 'Loading data from cache'
                    : simulationLoadProgress.loadSource === 'server'
                      ? 'Loading data from server'
                      : 'Loading data'}
                </div>
                <div className="sim-load-progress-bar-track">
                  <div
                    className="sim-load-progress-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, simulationLoadProgress.percent))}%`,
                    }}
                  />
                </div>
                <div className="sim-load-progress-footer">
                  <span className="sim-load-progress-percent">
                    {Math.round(
                      Math.min(100, Math.max(0, simulationLoadProgress.percent)),
                    )}
                    %
                  </span>
                  <span className="sim-load-progress-status">
                    {simulationLoadProgress.status}
                  </span>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        )}

        {renderComponentControls()}
        </>
        )}

      </div>
      {quickScenarioContextMenu && (
        <QuickScenarioContextMenu
          position={{ x: quickScenarioContextMenu.x, y: quickScenarioContextMenu.y }}
          shortcut={quickScenarioContextMenu.shortcut}
          onSaveScenarioAs={onSaveScenarioAsReplace}
          onClose={closeQuickScenarioContextMenu}
        />
      )}
    </div>
  );
};

export default SimulationControls;
