import React from 'react';
import { formatEnsembleMemberTabLabel } from '../../utils/connectionReadoutSampling';
import { sanitizeRenameSimId } from '../../utils/ensembleSimRename';
import './EnsembleMemberEditorDialog.css';

/**
 * Edit one ensemble member scenario: rename id and/or replace all Parquet columns from CSV.
 */
function EnsembleMemberEditorDialog({
  open,
  simId,
  columns = [],
  onClose,
  onRename,
  onReplaceCsv,
}) {
  const [newSimId, setNewSimId] = React.useState('');
  const [csvFile, setCsvFile] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [replacing, setReplacing] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (ev) => {
      if (ev.key === 'Escape' && !saving && !replacing) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, saving, replacing]);

  React.useEffect(() => {
    if (!open || !simId) return;
    setNewSimId(simId);
    setCsvFile(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [open, simId]);

  if (!open || !simId) return null;

  const label = formatEnsembleMemberTabLabel(simId);
  const trimmedId = sanitizeRenameSimId(newSimId);
  const canRename = trimmedId && trimmedId !== simId;
  const sortedColumns = [...(columns || [])].sort();

  const handleRename = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!canRename) {
      setError('Enter a new id that differs from the current one.');
      return;
    }
    setSaving(true);
    try {
      await onRename?.(simId, trimmedId);
      onClose?.();
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReplace = async () => {
    setError(null);
    setSuccess(null);
    if (!csvFile) {
      setError('Choose a CSV file first.');
      return;
    }
    setReplacing(true);
    try {
      const result = await onReplaceCsv?.(simId, csvFile);
      setSuccess(
        result?.message ||
          `Replaced ${result?.row_count ?? ''} rows. Parquet data on disk was overwritten.`,
      );
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setReplacing(false);
    }
  };

  const busy = saving || replacing;

  return (
    <div
      className="ensemble-editor-overlay"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget && !busy) onClose?.();
      }}
    >
      <div
        className="ensemble-editor-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ensemble-member-editor-title"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <h3 id="ensemble-member-editor-title" className="ensemble-editor-title">
          Edit scenario — {label}
        </h3>
        <p className="ensemble-editor-hint">
          Rename this member id, or upload a CSV to replace all variables. The CSV must contain
          exactly the same column names listed below (same count).
        </p>

        <form onSubmit={handleRename}>
          <label className="ensemble-editor-field">
            <span>Scenario id</span>
            <input
              type="text"
              className="ensemble-editor-input"
              value={newSimId}
              onChange={(e) => setNewSimId(e.target.value)}
              autoComplete="off"
              disabled={busy}
            />
          </label>

          <div className="ensemble-editor-actions" style={{ marginBottom: 4 }}>
            <button type="button" className="ensemble-editor-cancel" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="ensemble-editor-save" disabled={busy || !canRename}>
              {saving ? 'Renaming…' : 'Save name'}
            </button>
          </div>
        </form>

        <hr className="ensemble-member-editor-divider" />

        <div className="ensemble-member-editor-columns">
          <div className="ensemble-member-editor-columns-title">
            Required columns ({sortedColumns.length})
          </div>
          <ul>
            {sortedColumns.map((col) => (
              <li key={col}>{col}</li>
            ))}
          </ul>
        </div>

        <div className="ensemble-member-editor-file-row">
          <label className="ensemble-editor-field" style={{ marginBottom: 0 }}>
            <span>Replace data from CSV</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="ensemble-member-editor-file-input"
              disabled={busy}
              onChange={(e) => {
                setCsvFile(e.target.files?.[0] || null);
                setError(null);
                setSuccess(null);
              }}
            />
          </label>
          {csvFile && (
            <span className="ensemble-member-editor-file-name">{csvFile.name}</span>
          )}
          <button
            type="button"
            className="ensemble-member-editor-replace"
            disabled={busy || !csvFile}
            onClick={handleReplace}
          >
            {replacing ? 'Replacing…' : 'Replace Parquet data'}
          </button>
        </div>

        {success && <div className="ensemble-member-editor-success">{success}</div>}
        {error && <div className="ensemble-editor-error">{error}</div>}
      </div>
    </div>
  );
}

export default EnsembleMemberEditorDialog;
