import React, { useCallback, useMemo, useState } from 'react';
import ConfInputPanel from './components/conf_InputPanel';
import ConfResultsPanel from './components/conf_ResultsPanel';
import { CONFIGURATOR_DEFAULT_INPUTS } from '../configuratorData/conf_scenarios';
import { UI_MODES } from '../configuratorData/conf_constants';
import {
  generateConfiguratorResult,
  GENERATION_STATUS_MESSAGES,
} from './utils/conf_configuratorApi';
import { inputsEqual } from './utils/conf_configuratorEngine';
import './conf_DataCenterConfigurator.css';

export default function DataCenterConfigurator({ onClose }) {
  const [inputs, setInputs] = useState({ ...CONFIGURATOR_DEFAULT_INPUTS });
  const [uiMode, setUiMode] = useState(UI_MODES.BASIC);
  const [result, setResult] = useState(null);
  const [lastRunInputs, setLastRunInputs] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState([]);
  const [resultsView, setResultsView] = useState(null);

  const isStale = result?.ok && lastRunInputs && !inputsEqual(inputs, lastRunInputs);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setErrorDetails([]);
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
  }, [inputs, uiMode]);

  const handleReset = () => {
    setInputs({ ...CONFIGURATOR_DEFAULT_INPUTS });
    setUiMode(UI_MODES.BASIC);
    setResult(null);
    setLastRunInputs(null);
    setError(null);
    setErrorDetails([]);
    setResultsView(null);
  };

  const handleSelectTradeViz = (vizId) => {
    setResultsView(vizId);
  };

  const handleLoadPreset = (presetInputs) => {
    setInputs({
      ...CONFIGURATOR_DEFAULT_INPUTS,
      ...presetInputs,
      technologies: [...(presetInputs.technologies || CONFIGURATOR_DEFAULT_INPUTS.technologies)],
    });
  };

  return (
    <div className="conf-page">
      <header className="conf-page-header">
        <div className="conf-page-header__titles">
          <span className="conf-page-eyebrow">Energy System Configuration</span>
          <h1>Data Center Configurator</h1>
          <p>
            Given your load, reliability requirement, minimum carbon-free energy, grid connection,
            and technology options — GE Vernova recommends a least-cost onsite architecture.
          </p>
          <div className="conf-badges">
            <span className="conf-badge conf-badge--mode">Basic Mode · Least Cost</span>
            <span className="conf-badge conf-badge--synthetic">Synthetic Demonstration Data</span>
          </div>
        </div>
        {onClose && (
          <button type="button" className="conf-close-btn" onClick={onClose} aria-label="Close configurator">
            ✕
          </button>
        )}
      </header>

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

      <div className="conf-layout">
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
          onSelectTradeViz={handleSelectTradeViz}
        />
        <ConfResultsPanel
          result={result}
          inputs={inputs}
          isGenerating={isGenerating}
          statusMessage={statusMessage}
          resultsView={resultsView}
        />
      </div>
    </div>
  );
}
