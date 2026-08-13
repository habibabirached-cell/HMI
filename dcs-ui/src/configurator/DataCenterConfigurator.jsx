import React, { useCallback, useMemo, useState } from 'react';
import ConfInputPanel from './components/conf_InputPanel';
import ConfResultsPanel from './components/conf_ResultsPanel';
import { CONFIGURATOR_DEFAULT_INPUTS } from '../configuratorData/conf_scenarios';
import { getResourceProfile, getStateById } from '../configuratorData/conf_locations';
import {
  generateConfiguratorResult,
  GENERATION_STATUS_MESSAGES,
} from './utils/conf_configuratorApi';
import { inputsEqual } from './utils/conf_configuratorEngine';
import './conf_DataCenterConfigurator.css';

export default function DataCenterConfigurator({ onClose }) {
  const [inputs, setInputs] = useState({ ...CONFIGURATOR_DEFAULT_INPUTS });
  const [result, setResult] = useState(null);
  const [lastRunInputs, setLastRunInputs] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);

  const resourceIndicators = useMemo(
    () => getResourceProfile(inputs.stateId),
    [inputs.stateId],
  );
  const stateLabel = getStateById(inputs.stateId)?.label;
  const isStale = result?.ok && lastRunInputs && !inputsEqual(inputs, lastRunInputs);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setIsGenerating(true);
    let step = 0;
    const interval = window.setInterval(() => {
      setStatusMessage(GENERATION_STATUS_MESSAGES[step % GENERATION_STATUS_MESSAGES.length]);
      step += 1;
    }, 420);

    await new Promise((r) => setTimeout(r, 1400));

    try {
      const next = await generateConfiguratorResult(inputs);
      if (!next.ok) {
        setError(next.error || 'Configuration could not be generated.');
        setResult(null);
      } else {
        setResult(next);
        setLastRunInputs({ ...inputs, technologies: [...inputs.technologies] });
      }
    } catch (e) {
      setError(e.message || 'Unexpected error.');
    } finally {
      window.clearInterval(interval);
      setIsGenerating(false);
      setStatusMessage('');
    }
  }, [inputs]);

  const handleReset = () => {
    setInputs({ ...CONFIGURATOR_DEFAULT_INPUTS });
    setResult(null);
    setLastRunInputs(null);
    setError(null);
  };

  const handleLoadPreset = (presetInputs) => {
    setInputs({
      ...presetInputs,
      technologies: [...presetInputs.technologies],
    });
  };

  return (
    <div className="conf-page">
      <header className="conf-page-header">
        <div className="conf-page-header__titles">
          <span className="conf-page-eyebrow">Energy System Configuration</span>
          <h1>Data Center Configurator</h1>
          <p>
            Explore a potential generation architecture based on reliability, carbon-free energy,
            geography, and data-center demand.
          </p>
          <div className="conf-badges">
            <span className="conf-badge conf-badge--mode">Simulation Mode</span>
            <span className="conf-badge conf-badge--synthetic">Synthetic Demonstration Data</span>
          </div>
        </div>
        {onClose && (
          <button type="button" className="conf-close-btn" onClick={onClose} aria-label="Close configurator">
            ✕
          </button>
        )}
      </header>

      {error && <div className="conf-error-banner" role="alert">{error}</div>}

      <div className="conf-layout">
        <ConfInputPanel
          inputs={inputs}
          onChange={setInputs}
          onGenerate={handleGenerate}
          onReset={handleReset}
          onLoadPreset={handleLoadPreset}
          isGenerating={isGenerating}
          isStale={isStale}
          resourceIndicators={resourceIndicators}
          stateLabel={stateLabel}
        />
        <ConfResultsPanel
          result={result}
          inputs={inputs}
          isGenerating={isGenerating}
          statusMessage={statusMessage}
        />
      </div>
    </div>
  );
}
