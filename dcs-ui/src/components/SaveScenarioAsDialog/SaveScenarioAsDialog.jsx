import React, { useState, useEffect, useMemo } from 'react';
import {
  QUICK_SCENARIO_COLOR_OPTIONS,
  QUICK_SCENARIO_ICON_OPTIONS,
  normalizeButtonColor,
} from '../../data/quickScenarioUi';
import './SaveScenarioAsDialog.css';

/**
 * Saves the current chart configuration as a named preset (same as “Save configuration as”)
 * and creates a Quick Scenarios shortcut button with custom label, color, and icon.
 */
function SaveScenarioAsDialog({
  open,
  existingPresetNames,
  onClose,
  onSave,
}) {
  const defaultColor = QUICK_SCENARIO_COLOR_OPTIONS[1].value;
  const [label, setLabel] = useState('');
  const [presetName, setPresetName] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [color, setColor] = useState(defaultColor);
  const [icon, setIcon] = useState(QUICK_SCENARIO_ICON_OPTIONS[0]);

  useEffect(() => {
    if (open) {
      setLabel('');
      setPresetName('');
      setOverwrite(false);
      setColor(defaultColor);
      setIcon(QUICK_SCENARIO_ICON_OPTIONS[0]);
    }
  }, [open, defaultColor]);

  const colorNormalized = useMemo(() => normalizeButtonColor(color, defaultColor), [color, defaultColor]);

  const swatchMatch = useMemo(
    () =>
      QUICK_SCENARIO_COLOR_OPTIONS.find(
        (c) => c.value.toLowerCase() === colorNormalized.toLowerCase(),
      ),
    [colorNormalized],
  );

  if (!open) return null;

  const buttonLabel = label.trim();
  const configName = (presetName.trim() || buttonLabel).trim();
  const presetTaken = existingPresetNames.includes(configName);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!buttonLabel || !configName) return;
    if (presetTaken && !overwrite) return;
    onSave({
      label: buttonLabel,
      presetName: configName,
      overwrite: presetTaken ? overwrite : false,
      color: colorNormalized,
      icon,
    });
  };

  const handleColorPickerChange = (e) => {
    setColor(normalizeButtonColor(e.target.value, defaultColor));
  };

  const handleColorHexChange = (e) => {
    const next = e.target.value;
    setColor(next.startsWith('#') ? next : `#${next}`);
  };

  const handleColorHexBlur = () => {
    setColor((c) => normalizeButtonColor(c, defaultColor));
  };

  return (
    <div
      className="save-scenario-as-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-scenario-as-title"
    >
      <div className="save-scenario-as-dialog">
        <h2 id="save-scenario-as-title">Save scenario as</h2>
        <p className="save-scenario-as-help">
          Saves the current charts and panel settings as a preset (same as{' '}
          <strong>Save configuration as</strong>), then adds a button under{' '}
          <strong>Quick Scenarios</strong> that loads that preset when clicked.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="save-scenario-as-label">
            Button label
            <input
              className="save-scenario-as-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. BESS ramp view"
              autoFocus
              autoComplete="off"
            />
          </label>
          <label className="save-scenario-as-label">
            Configuration name (in .sim.json)
            <input
              className="save-scenario-as-input"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={buttonLabel ? buttonLabel : 'Same as button label if empty'}
              autoComplete="off"
            />
          </label>

          <p className="save-scenario-as-palette-title">Button color</p>
          <div className="save-scenario-as-colors" role="listbox" aria-label="Preset button colors">
            {QUICK_SCENARIO_COLOR_OPTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`save-scenario-as-color-swatch ${swatchMatch?.id === c.id ? 'selected' : ''}`}
                style={{ background: c.value }}
                title={c.label}
                aria-label={c.label}
                aria-selected={swatchMatch?.id === c.id}
                onClick={() => setColor(c.value)}
              />
            ))}
          </div>
          <div className="save-scenario-as-color-custom">
            <label className="save-scenario-as-color-picker-label">
              Custom color
              <input
                type="color"
                className="save-scenario-as-color-picker"
                value={colorNormalized}
                onChange={handleColorPickerChange}
                title="Pick any color"
              />
            </label>
            <label className="save-scenario-as-color-hex-label">
              Hex
              <input
                type="text"
                className="save-scenario-as-color-hex"
                value={color}
                onChange={handleColorHexChange}
                onBlur={handleColorHexBlur}
                placeholder="#e65100"
                spellCheck={false}
                maxLength={7}
              />
            </label>
          </div>

          <p className="save-scenario-as-palette-title">
            Icon ({QUICK_SCENARIO_ICON_OPTIONS.length} options)
          </p>
          <div
            className="save-scenario-as-icons"
            role="listbox"
            aria-label="Button icon"
          >
            {QUICK_SCENARIO_ICON_OPTIONS.map((sym, idx) => (
              <button
                key={`${sym}-${idx}`}
                type="button"
                className={`save-scenario-as-icon-btn ${icon === sym ? 'selected' : ''}`}
                aria-label={`Icon ${sym}`}
                aria-selected={icon === sym}
                onClick={() => setIcon(sym)}
              >
                {sym}
              </button>
            ))}
          </div>

          <div className="save-scenario-as-preview">
            <span>Preview:</span>
            <button
              type="button"
              className="save-scenario-as-preview-btn"
              style={{ background: colorNormalized }}
              tabIndex={-1}
            >
              {icon} {buttonLabel || '…'}
            </button>
          </div>

          {presetTaken && (
            <label className="save-scenario-as-overwrite">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
              />
              Overwrite existing preset &quot;{configName}&quot;
            </label>
          )}

          <div className="save-scenario-as-actions">
            <button type="button" className="save-scenario-as-btn cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="save-scenario-as-btn submit"
              disabled={!buttonLabel || !configName || (presetTaken && !overwrite)}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SaveScenarioAsDialog;
