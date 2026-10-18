/**
 * Data exploration (dataVis) — configurator backend client.
 */

import { API_BASE_URL } from '../../../apiConfig';
import { normalizeWacoLoadTier } from '../../utils/conf_wacoLoadTier';
import { effectiveMartinStudy, readMartinStudyEpoch } from '../../utils/conf_martinStudy';
import {
  dataVisLoadMwQueryString,
  effectiveDataVisLoadMwTier,
  readDataVisLoadMwTier,
  withDataVisLoadMw,
} from './dataVisLoadMw';

const DATAVIS_BASE = API_BASE_URL
  ? `${API_BASE_URL}/api/configurator/dataVis`
  : '/api/configurator/dataVis';

function resolveMetaLoadMw(loadMW, stateId) {
  return normalizeWacoLoadTier(loadMW) ?? effectiveDataVisLoadMwTier(stateId);
}

function metaUrl(loadMW, stateId) {
  const tier = resolveMetaLoadMw(loadMW, stateId);
  const study = effectiveMartinStudy(stateId);
  const epoch = readMartinStudyEpoch();
  return `${DATAVIS_BASE}/meta?loadMW=${encodeURIComponent(String(tier))}&martinStudy=${encodeURIComponent(study)}&martinStudyEpoch=${encodeURIComponent(String(epoch))}`;
}

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

export { readDataVisLoadMwTier };

export async function fetchDataVisHealth() {
  const qs = dataVisLoadMwQueryString();
  const url = qs ? `${DATAVIS_BASE}/health?${qs}` : `${DATAVIS_BASE}/health`;
  const res = await fetch(url);
  return parseJson(res);
}

export async function fetchDataVisMeta(loadMW, stateId) {
  const res = await fetch(metaUrl(loadMW, stateId));
  return parseJson(res);
}

/** Server swaps in-memory Waco df: raw (reload Excel) vs clean (>=97% load compliance). */
export async function postDataVisDatasetMode(mode) {
  const res = await fetch(`${DATAVIS_BASE}/dataset-mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataVisLoadMw({ mode })),
  });
  return parseJson(res);
}

export async function postDataVisOverview(filters = []) {
  const res = await fetch(`${DATAVIS_BASE}/overview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataVisLoadMw({ filters })),
  });
  return parseJson(res);
}

export async function postDataVisColumnStats(filters = []) {
  const res = await fetch(`${DATAVIS_BASE}/column-stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataVisLoadMw({ filters })),
  });
  return parseJson(res);
}

export async function postDataVisRowIds(filters = []) {
  const res = await fetch(`${DATAVIS_BASE}/filter-row-ids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataVisLoadMw({ filters })),
  });
  return parseJson(res);
}

export async function postDataVisDoeSummary(filters = []) {
  const res = await fetch(`${DATAVIS_BASE}/doe-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataVisLoadMw({ filters })),
  });
  return parseJson(res);
}

export async function postDataVisRows(payload) {
  const res = await fetch(`${DATAVIS_BASE}/rows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataVisLoadMw(payload)),
  });
  return parseJson(res);
}

export async function postDataVisScatter(payload) {
  const res = await fetch(`${DATAVIS_BASE}/chart/scatter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataVisLoadMw(payload)),
  });
  return parseJson(res);
}

export async function postDataVisHeatmap(payload) {
  const res = await fetch(`${DATAVIS_BASE}/chart/heatmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataVisLoadMw(payload)),
  });
  return parseJson(res);
}

export async function postDataVisParallel(payload) {
  const res = await fetch(`${DATAVIS_BASE}/chart/parallel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataVisLoadMw(payload)),
  });
  return parseJson(res);
}

export async function postDataVisHistogram(payload) {
  const res = await fetch(`${DATAVIS_BASE}/chart/histogram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataVisLoadMw(payload)),
  });
  return parseJson(res);
}

export async function postDataVisQuality(filters = []) {
  const res = await fetch(`${DATAVIS_BASE}/quality`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataVisLoadMw({ filters })),
  });
  return parseJson(res);
}

export async function postDataVisCompare(rowIds) {
  const res = await fetch(`${DATAVIS_BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDataVisLoadMw({ row_ids: rowIds })),
  });
  return parseJson(res);
}
