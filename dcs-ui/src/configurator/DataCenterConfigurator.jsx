import React, { useCallback, useEffect, useState } from 'react';
import ConfInputPanel from './components/conf_InputPanel';
import ConfIdeumInputPanel from './components/conf_IdeumInputPanel';
import ConfWallQuadrantDisplay from './components/conf_WallQuadrantDisplay';
import ConfIdeumPageTabs from './components/conf_IdeumPageTabs';
import ConfTradeSpacePanel from './components/conf_TradeSpacePanel';
import ConfResultsPanel from './components/conf_ResultsPanel';
import { CONFIGURATOR_DEFAULT_INPUTS } from '../configuratorData/conf_scenarios';
import { UI_MODES } from '../configuratorData/conf_constants';
import {
  generateConfiguratorResult,
  GENERATION_STATUS_MESSAGES,
} from './utils/conf_configuratorApi';
import {
  connectConfiguratorClusterUpdates,
  fetchConfiguratorClusterSession,
  isLocalClusterDev,
  resolveMaingearBackendUrl,
  sessionToWallState,
  submitConfiguratorToMaingear,
} from './utils/conf_configuratorCluster';
import { inputsEqual } from './utils/conf_configuratorEngine';
import { validateConfiguratorInputs } from './utils/conf_validateInputs';
import {
  createDefaultTechnologyPreferences,
  normalizeTechnologyPreferences,
  technologyIdsFromPreferences,
} from './utils/conf_technologyPreferences';
import { useWallDisplayKeepAlive } from './utils/conf_wallDisplayKeepAlive';
import { fetchMachineRole } from '../utils/clusterPeer';
import Ideum05BackButton from '../components/IdeumKiosk/Ideum05BackButton';
import '../components/IdeumKiosk/Ideum05NavLayer.css';
import './conf_DataCenterConfigurator.css';

/** Set false to restore back, fullscreen, and close buttons in Ideum header. */
const IDEUM_HIDE_HEADER_CHROME = false;

const MODE_META = {
  full: {
    title: 'Data Center Configurator',
    subtitle:
      'Given your load, reliability requirement, minimum carbon-free energy, grid connection, and technology options — GE Vernova recommends a least-cost onsite architecture.',
    badge: 'Basic Mode · Least Cost',
  },
  ideum: {
    title: 'Data Center Configurator',
    subtitle: '',
    badge: '',
  },
  wall: {
    title: 'Data Center Configurator · Wall Display',
    subtitle:
      'Recommended architecture and metrics driven by the Ideum touch table (Maingear 4-screen wall).',
    badge: 'Wall Output · Cluster',
  },
};

export default function DataCenterConfigurator({ mode = 'full', onClose }) {
  const meta = MODE_META[mode] || MODE_META.full;
  const isIdeumMode = mode === 'ideum';
  const isWallMode = mode === 'wall';

  useWallDisplayKeepAlive(isWallMode);

  const [inputs, setInputs] = useState({ ...CONFIGURATOR_DEFAULT_INPUTS });
  const [uiMode, setUiMode] = useState(UI_MODES.BASIC);
  const [result, setResult] = useState(null);
  const [lastRunInputs, setLastRunInputs] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState([]);
  const [resultsView, setResultsView] = useState(null);
  const [wallSession, setWallSession] = useState(null);
  const [wallListeningSince] = useState(() => new Date().toISOString());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ideumTab, setIdeumTab] = useState('configure');

  const isStale = !isWallMode && result?.ok && lastRunInputs && !inputsEqual(inputs, lastRunInputs);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
    };
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }, []);

  const applyWallSession = useCallback((session) => {
    setWallSession(session);
    const wall = sessionToWallState(session, { onlyAfter: wallListeningSince });
    setError(wall.error);
    setErrorDetails(wall.errorDetails || []);
    if (wall.result) {
      setResult(wall.result);
      setLastRunInputs(wall.inputs ? { ...wall.inputs, technologies: [...(wall.inputs.technologies || [])] } : null);
      setResultsView('architecture');
    } else {
      setResult(null);
      if (!wall.isGenerating) {
        setResultsView(null);
      }
    }
  }, [wallListeningSince]);

  useEffect(() => {
    if (!isWallMode) return undefined;

    let cancelled = false;
    fetchConfiguratorClusterSession()
      .then((session) => {
        if (!cancelled) applyWallSession(session);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });

    const disconnect = connectConfiguratorClusterUpdates((session) => {
      applyWallSession(session);
    });

    return () => {
      cancelled = true;
      disconnect();
    };
  }, [isWallMode, applyWallSession]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setErrorDetails([]);

    const validation = validateConfiguratorInputs({ ...inputs, uiMode });
    if (!validation.ok) {
      setError(validation.error);
      setErrorDetails(validation.details || []);
      return;
    }

    if (isIdeumMode) {
      setIsGenerating(true);
      setStatusMessage('Sending to Maingear wall display…');
      try {
        let role = null;
        try {
          role = await fetchMachineRole();
        } catch (_) {
          /* local dev may still submit via localhost / proxy */
        }

        if (isLocalClusterDev()) {
          const backendUrl = resolveMaingearBackendUrl(role);
          const session = await submitConfiguratorToMaingear(backendUrl, { ...inputs, uiMode });
          if (session.status === 'error' || !session.result?.ok) {
            setError(session.error || session.result?.error || 'Configuration could not be generated on Maingear.');
            setErrorDetails(session.errorDetails || session.result?.details || []);
          }
          return;
        }

        if (role?.isMaingear) {
          setError(
            'You are on the Maingear. Configure sends inputs from the Ideum touch table to the Maingear wall display.',
          );
          return;
        }
        if (!role?.isIdeum) {
          setError(`Unknown machine role (${role?.role || 'unknown'}). Check cluster.local.json on this PC.`);
          return;
        }
        if (!role.peerBackendUrl) {
          setError('peerBackendUrl is not configured in cluster.local.json.');
          return;
        }
        const session = await submitConfiguratorToMaingear(role.peerBackendUrl, { ...inputs, uiMode });
        if (session.status === 'error' || !session.result?.ok) {
          setError(session.error || session.result?.error || 'Configuration could not be generated on Maingear.');
          setErrorDetails(session.errorDetails || session.result?.details || []);
          return;
        }
      } catch (e) {
        setError(e.message || 'Could not send configuration to wall display.');
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    setIsGenerating(true);
    let step = 0;
    const interval = window.setInterval(() => {
      setStatusMessage(GENERATION_STATUS_MESSAGES[step % GENERATION_STATUS_MESSAGES.length]);
      step += 1;
    }, 420);

    await new Promise((r) => setTimeout(r, 1400));

    try {
      const payload = { ...inputs, uiMode };
      const next = await generateConfiguratorResult(payload);
      if (!next.ok) {
        setError(next.error || 'Configuration could not be generated.');
        setErrorDetails(next.details || []);
        setResult(null);
      } else {
        setResult(next);
        setLastRunInputs({ ...payload, technologies: [...payload.technologies] });
        setResultsView('architecture');
      }
    } catch (e) {
      setError(e.message || 'Unexpected error.');
    } finally {
      window.clearInterval(interval);
      setIsGenerating(false);
      setStatusMessage('');
    }
  }, [inputs, uiMode, isIdeumMode]);

  const handleReset = () => {
    if (isWallMode) return;
    setInputs({ ...CONFIGURATOR_DEFAULT_INPUTS });
    setUiMode(UI_MODES.BASIC);
    setResult(null);
    setLastRunInputs(null);
    setError(null);
    setErrorDetails([]);
    setResultsView(null);
  };

  const handleSelectOutputView = (view) => {
    setResultsView(view);
  };

  const handleLoadPreset = (presetInputs) => {
    const technologyPreferences = normalizeTechnologyPreferences(
      presetInputs.technologyPreferences || createDefaultTechnologyPreferences(),
    );
    setInputs({
      ...CONFIGURATOR_DEFAULT_INPUTS,
      ...presetInputs,
      technologyPreferences,
      technologies: technologyIdsFromPreferences(technologyPreferences),
    });
  };

  const wall = sessionToWallState(wallSession, { onlyAfter: wallListeningSince });
  const wallGenerating = isWallMode && wall.isGenerating;
  const wallStatusMessage = wallGenerating ? 'Generating architecture on Maingear…' : statusMessage;

  return (
    <div className={`conf-page conf-page--${mode}`}>
      {isWallMode ? (
        onClose ? (
          <header className="conf-page-header conf-page-header--wall-chrome">
            <div className="conf-page-header__actions">
              <button
                type="button"
                className="conf-close-btn conf-close-btn--wall"
                onClick={onClose}
                aria-label="Close wall display"
              >
                ✕
              </button>
            </div>
          </header>
        ) : null
      ) : (
      <header className={`conf-page-header${isIdeumMode ? ' conf-page-header--ideum' : ''}${isIdeumMode && IDEUM_HIDE_HEADER_CHROME ? ' conf-page-header--ideum-snapshot' : ''}`}>
        {isIdeumMode ? (
          <>
            <div className="conf-page-header__ideum-start">
              {!IDEUM_HIDE_HEADER_CHROME && onClose && <Ideum05BackButton onBack={onClose} />}
              <ConfIdeumPageTabs activeTab={ideumTab} onSelectTab={setIdeumTab} />
            </div>
            <div className="conf-page-header__titles conf-page-header__titles--center">
              <h1>{meta.title}</h1>
            </div>
            {!IDEUM_HIDE_HEADER_CHROME && (onClose ? (
              <div className="conf-page-header__actions">
                <button
                  type="button"
                  className="conf-fullscreen-btn"
                  onClick={handleToggleFullscreen}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
                >
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    {isFullscreen ? (
                      <path d="M14 1a1 1 0 0 1 1 1v4.5a.5.5 0 0 1-1 0V2.707l-4.146 4.147a.5.5 0 0 1-.708-.708L13.293 2H10.5a.5.5 0 0 1 0-1H14zm-3 0a.5.5 0 0 1 .5-.5h4.5a1 1 0 0 1 1 1v4.5a.5.5 0 0 1-1 0V2.707L10.854 6.854a.5.5 0 1 1-.708-.708L13.293 2H11.5a.5.5 0 0 1-.5-.5zM2 14a1 1 0 0 1-1-1v-4.5a.5.5 0 0 1 1 0V13.293l4.146-4.147a.5.5 0 0 1 .708.708L2.707 14H5.5a.5.5 0 0 1 0 1H2zm3 0a.5.5 0 0 1-.5.5H.5a1 1 0 0 1-1-1V9.5a.5.5 0 0 1 1 0v2.793l4.146-4.147a.5.5 0 1 1 .708.708L2.707 14H5.5a.5.5 0 0 1-.5.5z" />
                    ) : (
                      <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z" />
                    )}
                  </svg>
                </button>
                <button type="button" className="conf-close-btn" onClick={onClose} aria-label="Close configurator">
                  ✕
                </button>
              </div>
            ) : (
              <div className="conf-page-header__actions" aria-hidden="true" />
            ))}
          </>
        ) : (
          <>
            <div className="conf-page-header__titles">
              <span className="conf-page-eyebrow">Energy System Configuration</span>
              <h1>{meta.title}</h1>
              {meta.subtitle && <p>{meta.subtitle}</p>}
              <div className="conf-badges">
                <span className="conf-badge conf-badge--mode">{meta.badge}</span>
                <span className="conf-badge conf-badge--synthetic">Synthetic Demonstration Data</span>
              </div>
            </div>
            {onClose && (
              <div className="conf-page-header__actions">
                <button
                  type="button"
                  className="conf-fullscreen-btn"
                  onClick={handleToggleFullscreen}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
                >
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    {isFullscreen ? (
                      <path d="M14 1a1 1 0 0 1 1 1v4.5a.5.5 0 0 1-1 0V2.707l-4.146 4.147a.5.5 0 0 1-.708-.708L13.293 2H10.5a.5.5 0 0 1 0-1H14zm-3 0a.5.5 0 0 1 .5-.5h4.5a1 1 0 0 1 1 1v4.5a.5.5 0 0 1-1 0V2.707L10.854 6.854a.5.5 0 1 1-.708-.708L13.293 2H11.5a.5.5 0 0 1-.5-.5zM2 14a1 1 0 0 1-1-1v-4.5a.5.5 0 0 1 1 0V13.293l4.146-4.147a.5.5 0 0 1 .708.708L2.707 14H5.5a.5.5 0 0 1 0 1H2zm3 0a.5.5 0 0 1-.5.5H.5a1 1 0 0 1-1-1V9.5a.5.5 0 0 1 1 0v2.793l4.146-4.147a.5.5 0 1 1 .708.708L2.707 14H5.5a.5.5 0 0 1-.5.5z" />
                    ) : (
                      <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z" />
                    )}
                  </svg>
                </button>
                <button type="button" className="conf-close-btn" onClick={onClose} aria-label="Close configurator">
                  ✕
                </button>
              </div>
            )}
          </>
        )}
      </header>
      )}

      {error && (
        <div className="conf-error-banner" role="alert">
          <strong>{error}</strong>
          {errorDetails.length > 0 && (
            <ul className="conf-error-details">
              {errorDetails.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className={`conf-layout conf-layout--${mode}${isIdeumMode && ideumTab !== 'configure' ? ' conf-layout--ideum-trade' : ''}`}>
        {!isWallMode && isIdeumMode && ideumTab === 'configure' && (
          <ConfIdeumInputPanel
            inputs={inputs}
            onChange={setInputs}
            onGenerate={handleGenerate}
            onReset={handleReset}
            onLoadPreset={handleLoadPreset}
            isGenerating={isGenerating}
            generateLabel="CONFIGURE"
          />
        )}
        {!isWallMode && isIdeumMode && ideumTab !== 'configure' && (
          <ConfTradeSpacePanel vizId={ideumTab} inputs={inputs} />
        )}
        {!isIdeumMode && !isWallMode && (
          <ConfInputPanel
            inputs={inputs}
            onChange={setInputs}
            onGenerate={handleGenerate}
            onReset={handleReset}
            onLoadPreset={handleLoadPreset}
            isGenerating={isGenerating}
            isStale={isStale}
            uiMode={uiMode}
            onUiModeChange={setUiMode}
            activeTradeVizId={resultsView !== 'architecture' ? resultsView : null}
            onSelectTradeViz={handleSelectOutputView}
          />
        )}
        {isWallMode && (
          <ConfWallQuadrantDisplay
            result={result}
            inputs={wall.inputs || inputs}
            isGenerating={wallGenerating}
            statusMessage={wallStatusMessage}
            wallSessionStatus={wall.status}
          />
        )}
        {!isIdeumMode && !isWallMode && (
          <ConfResultsPanel
            result={result}
            inputs={inputs}
            isGenerating={isGenerating}
            statusMessage={statusMessage}
            resultsView={resultsView}
            showOutputNav={false}
            onSelectOutputView={handleSelectOutputView}
          />
        )}
      </div>
    </div>
  );
}
