import React, { useEffect, useState } from 'react';
import { postDataVisQuality } from '../api/conf_dataVisApi';

export default function DataVisQualityTab({ filters }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    postDataVisQuality(filters)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  if (error) return <p className="dataVis-error">{error}</p>;
  if (!data) return <p className="dataVis-muted">Running quality checks…</p>;

  return (
    <div className="dataVis-tabPanel">
      <ul className="dataVis-qualityList">
        {(data.checks || []).map((check) => (
          <li key={check.id} className={`dataVis-qualityItem dataVis-qualityItem--${check.severity}`}>
            <strong>{check.title}</strong>
            <span>{check.message}</span>
            {check.details?.length > 0 && (
              <ul className="dataVis-qualityDetails">
                {check.details.map((d) => (
                  <li key={d.column}>
                    {d.column}: {d.null_pct}% null
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
