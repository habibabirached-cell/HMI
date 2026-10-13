/**
 * Data exploration (dataVis) — configurator backend client.
 */

import { API_BASE_URL } from '../../../apiConfig';

const DATAVIS_BASE = API_BASE_URL
  ? `${API_BASE_URL}/api/configurator/dataVis`
  : '/api/configurator/dataVis';

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : detail?.error || res.statusText || 'dataVis request failed';
    throw new Error(message);
  }
  return data;
}

export async function fetchDataVisHealth() {
  const res = await fetch(`${DATAVIS_BASE}/health`);
  return parseJson(res);
}

export async function fetchDataVisMeta() {
  const res = await fetch(`${DATAVIS_BASE}/meta`);
  return parseJson(res);
}

export async function postDataVisOverview(filters = []) {
  const res = await fetch(`${DATAVIS_BASE}/overview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters }),
  });
  return parseJson(res);
}

export async function postDataVisRowIds(filters = []) {
  const res = await fetch(`${DATAVIS_BASE}/filter-row-ids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters }),
  });
  return parseJson(res);
}

export async function postDataVisDoeSummary(filters = []) {
  const res = await fetch(`${DATAVIS_BASE}/doe-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters }),
  });
  return parseJson(res);
}

export async function postDataVisRows(payload) {
  const res = await fetch(`${DATAVIS_BASE}/rows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function postDataVisScatter(payload) {
  const res = await fetch(`${DATAVIS_BASE}/chart/scatter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function postDataVisHeatmap(payload) {
  const res = await fetch(`${DATAVIS_BASE}/chart/heatmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function postDataVisParallel(payload) {
  const res = await fetch(`${DATAVIS_BASE}/chart/parallel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function postDataVisHistogram(payload) {
  const res = await fetch(`${DATAVIS_BASE}/chart/histogram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function postDataVisQuality(filters = []) {
  const res = await fetch(`${DATAVIS_BASE}/quality`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters }),
  });
  return parseJson(res);
}

export async function postDataVisCompare(rowIds) {
  const res = await fetch(`${DATAVIS_BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ row_ids: rowIds }),
  });
  return parseJson(res);
}
