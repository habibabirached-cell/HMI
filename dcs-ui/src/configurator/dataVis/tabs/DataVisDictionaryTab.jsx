import React, { useMemo, useState } from 'react';

export default function DataVisDictionaryTab({ columns }) {
  const [group, setGroup] = useState('all');
  const groups = useMemo(() => {
    const set = new Set((columns || []).map((c) => c.group).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [columns]);

  const filtered = useMemo(() => {
    const list = columns || [];
    if (group === 'all') return list;
    return list.filter((c) => c.group === group);
  }, [columns, group]);

  return (
    <div className="dataVis-tabPanel">
      <div className="dataVis-toolbar">
        <label className="dataVis-field">
          <span className="dataVis-field__label">Group</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g === 'all' ? 'All groups' : g}
              </option>
            ))}
          </select>
        </label>
        <span className="dataVis-muted">
          {filtered.length} column{filtered.length === 1 ? '' : 's'}
          {group === 'all' ? ' in dictionary' : ` (${group})`}
        </span>
      </div>
      <div className="dataVis-tableWrap">
        <table className="dataVis-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Column</th>
              <th>Role</th>
              <th>Unit</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, index) => (
              <tr key={c.key}>
                <td>{index + 1}</td>
                <td>{c.label || c.key}</td>
                <td>{c.role}</td>
                <td>{c.unit || '—'}</td>
                <td>{c.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
