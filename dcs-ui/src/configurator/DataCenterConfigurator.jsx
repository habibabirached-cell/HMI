import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ConfInputPanel from './components/conf_InputPanel';
import ConfIdeumInputPanel from './components/conf_IdeumInputPanel';
import ConfWallQuadrantDisplay from './components/conf_WallQuadrantDisplay';
import ConfIdeumPageTabs, { IDEUM_DATA_EXPLORATION_TAB_ID } from './components/conf_IdeumPageTabs';
import DataVisPanel from './dataVis/DataVisPanel';
import ConfTradeSpacePanel from './components/conf_TradeSpacePanel';
import ConfResultsPanel from './components/conf_ResultsPanel';
import {
  buildIdeumConfiguratorInputs,
  CONFIGURATOR_DEFAULT_INPUTS,
} from '../configuratorData/conf_scenarios';
import { UI_MODES } from '../configuratorData/conf_constants';
import {
  generateConfiguratorResult,
  generateMartinConfiguratorResult,
  GENERATION_STATUS_MESSAGES,
} from './utils/conf_configuratorApi';
import ConfIdeumPreviewSummary from './components/conf_IdeumPreviewSummary';
import {
  connectConfiguratorClusterUpdates,
  fetchConfiguratorClusterSession,
  isLocalClusterDev,
  resolveMaingearBackendUrl,
  sessionToWallState,
  submitConfiguratorMartinToMaingear,
  PENDING_OPTIMIZED_INPUTS_KEY,
  MARTIN_PREVIEW_URL_PARAM,
  martinPreviewDoneStorageKey,
  martinPreviewResultStorageKey,
  martinPreviewPendingStorageKey,
  martinPreviewStartedStorageKey,
  martinPreviewCrossTabStorage,
} from './utils/conf_configuratorCluster';
import { inputsEqual } from './utils/conf_configuratorEngine';
import { validateConfiguratorInputs } from './utils/conf_validateInputs';
import {
  createDefaultTechnologyPreferences,
  normalizeTechnologyPreferences,
  technologyIdsFromPreferences,
} from './utils/conf_technologyPreferences';
import { useWallDisplayKeepAlive } from './utils/conf_wallDisplayKeepAlive';
import { API_BASE_URL } from '../apiConfig';
import { fetchMachineRole, resolveMaingearPeerPostBase } from '../utils/clusterPeer';
import {
  configuratorInputsToDataVisRanges,
  publishConfiguratorExploreSync,
} from './dataVis/utils/dataVisConfiguratorSync';
import {
  logExploreSyncResult,
  postConfiguratorExploreSync,
  postConfiguratorExploreSyncToPeer,
} from './utils/conf_configuratorCluster';
import { preloadWacoWithDatasetQuality, WACO_DATASET_READY_EVENT } from './utils/conf_wacoPreload';
import {
  fetchRenewableMwBoundsFromDataVis,
  inputsWithRenewableDataSpan,
} from './utils/conf_renewableMwBounds';
import {
  effectiveDataVisLoadMwTier,
  hydrateMartinStudyFromUrl,
  hydrateWacoLoadTierFromUrl,
  inputsWithEffectiveWacoLoadTier,
  persistWacoLoadTierForDataVis,
  readPersistedWacoLoadTier,
  WACO_LOAD_MW_URL_PARAM,
  WACO_LOAD_TIER_CHANGED_EVENT,
} from './dataVis/api/dataVisLoadMw';
import { effectiveMartinStudy, readPersistedMartinStudy, stateIdForMartinStudy } from './utils/conf_martinStudy';
import { DEFAULT_WACO_LOAD_TIER } from './utils/conf_wacoLoadTier';
import {
  applyDataVisDatasetMode,
  DATA_QUALITY_CLEAN,
  persistDataQualityMode,
  readPersistedDataQualityMode,
  subscribeDataQualityMode,
} from './dataVis/utils/dataVisQualityMode';
import {
  IDEUM_EXPLORE_DATA_TAB_ID,
  openDataExplorationDevNewTab,
  openExploreDataDevNewTab,
  consumePendingIdeumTab,
  readIdeumTabFromUrl,
  requestDataExplorationOnMaingear,
  requestExploreDataOnMaingear,
  exploreNavigationActionForRole,
  resolveDataExplorationNavigationAction,
  resolveExploreDataNavigationAction,
  startIdeumDataExplorationMaingearTunnel,
} from './utils/conf_dataExplorationNavigation';
import Ideum05BackButton from '../components/IdeumKiosk/Ideum05BackButton';
import Conf3dToggleButton from './components/Conf3dToggleButton';
import { Conf3dProvider, useConf3d } from './utils/conf_3dContext';
import '../components/IdeumKiosk/Ideum05NavLayer.css';
import './conf_DataCenterConfigurator.css';

/** Set false to restore back, fullscreen, and close buttons in Ideum header. */
const IDEUM_HIDE_HEADER_CHROME = false;

const MODE_META = {
  full: {
    title: 'Data Center Configurator',
    subtitle:
      'Given your load, availability requirement, minimum carbon-free energy, grid connection, and technology options — GE Vernova recommends a least-cost onsite architecture.',
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
  'martin-dev-tab': {
    title: 'Optimized Configuration',
    subtitle: '',
    badge: '',
  },
};

function DataCenterConfiguratorInner({ mode = 'full', onClose, onBack }) {
  const { enable3d } = useConf3d();
  const meta = MODE_META[mode] || MODE_META.full;
  const isIdeumMode = mode === 'ideum';
  const isMartinDevTabMode = mode === 'martin-dev-tab';
  const isWallMode = mode === 'wall';
  /** Back arrow — defaults to onClose for legacy full-app overlay usage. */
  const handleBack = onBack ?? onClose;

  useWallDisplayKeepAlive(isWallMode);

  const [inputs, setInputs] = useState(() => {
    if (mode === 'ideum' || mode === 'martin-dev-tab') {
      let loadMW;
      if (typeof window !== 'undefined') {
        hydrateMartinStudyFromUrl();
        hydrateWacoLoadTierFromUrl();
        loadMW = readPersistedWacoLoadTier() ?? undefined;
      }
      const base = buildIdeumConfiguratorInputs(loadMW);
      const study = readPersistedMartinStudy();
      const stateId = stateIdForMartinStudy(study);
      if (stateId === 'wisconsin') {
        return { ...base, stateId, cityId: 'madison_wi', loadMW: 200 };
      }
      return base;
    }
    return { ...CONFIGURATOR_DEFAULT_INPUTS };
  });
  const [uiMode, setUiMode] = useState(UI_MODES.BASIC);
  const [result, setResult] = useState(null);
  const [lastRunInputs, setLastRunInputs] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isWallSubmitting, setIsWallSubmitting] = useState(false);
  const [isLocalMartinRunning, setIsLocalMartinRunning] = useState(false);
  const [ideumMartinPreviewOpen, setIdeumMartinPreviewOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState([]);
  const [resultsView, setResultsView] = useState(null);
  const [wallSession, setWallSession] = useState(null);
  const [wallListeningSince] = useState(() => new Date().toISOString());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ideumTab, setIdeumTab] = useState(() => {
    if (typeof window === 'undefined' || mode !== 'ideum') return 'configure';
    const fromUrl = readIdeumTabFromUrl();
    return fromUrl || 'configure';
  });
  const dataExplorationTunnelRef = useRef(null);
  const machineRoleRef = useRef(null);
  const lastExploreSyncFingerprintRef = useRef('');
  const [devAutoMartinPreviewBoot, setDevAutoMartinPreviewBoot] = useState(false);
  const [devConfiguratorDataVisSync, setDevConfiguratorDataVisSync] = useState(false);
  const [dataQualityMode, setDataQualityMode] = useState(() => readPersistedDataQualityMode());
  const [dataVisWacoTier, setDataVisWacoTier] = useState(() => (
    mode === 'ideum' ? effectiveDataVisLoadMwTier() : DEFAULT_WACO_LOAD_TIER
  ));
  const [renewableMwBounds, setRenewableMwBounds] = useState(null);

  const applyRenewableMwBounds = useCallback((bounds) => {
    if (!bounds) return;
    setRenewableMwBounds(bounds);
    setInputs((prev) => {
      const next = inputsWithRenewableDataSpan(prev, bounds);
      if (
        prev.minSolarMW === next.minSolarMW
        && prev.maxSolarMW === next.maxSolarMW
        && prev.minWindMW === next.minWindMW
        && prev.maxWindMW === next.maxWindMW
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const refreshRenewableMwBounds = useCallback(async (loadMW) => {
    try {
      const bounds = await fetchRenewableMwBoundsFromDataVis(loadMW ?? effectiveDataVisLoadMwTier());
      applyRenewableMwBounds(bounds);
    } catch (err) {
      console.warn('[configurator] renewable MW bounds failed:', err?.message || err);
    }
  }, [applyRenewableMwBounds]);

  const isStale = !isWallMode && result?.ok && lastRunInputs && !inputsEqual(inputs, lastRunInputs);

  const showIdeumLocalMartinWall =
    isIdeumMode
    && !isWallMode
    && ideumMartinPreviewOpen
    && ideumTab === 'configure'
    && result?.ok;

  useEffect(() => {
    if (!isIdeumMode || typeof window === 'undefined') return undefined;
    const pending = consumePendingIdeumTab();
    if (pending) setIdeumTab(pending);
    const onIdeumTabEvent = (event) => {
      const tab = event?.detail?.tab;
      if (tab) setIdeumTab(tab);
    };
    window.addEventListener('dcs:configurator-ideum-tab', onIdeumTabEvent);
    return () => window.removeEventListener('dcs:configurator-ideum-tab', onIdeumTabEvent);
  }, [isIdeumMode]);

  useEffect(() => {
    if (!isIdeumMode || typeof window === 'undefined') return undefined;
    const fromUrl = readIdeumTabFromUrl();
    if (!fromUrl) return undefined;
    setIdeumTab(fromUrl);
    return undefined;
  }, [isIdeumMode]);

  useEffect(
    () => () => {
      dataExplorationTunnelRef.current?.();
      dataExplorationTunnelRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!isIdeumMode) return undefined;
    let cancelled = false;
    fetchMachineRole()
      .then((role) => {
        if (cancelled) return;
        machineRoleRef.current = role;
        setDevConfiguratorDataVisSync(Boolean(role?.isDev) || isLocalClusterDev());
      })
      .catch(() => {
        if (!cancelled) setDevConfiguratorDataVisSync(isLocalClusterDev());
      });
    return () => {
      cancelled = true;
    };
  }, [isIdeumMode]);

  const pushExploreSyncToCluster = useCallback(async () => {
    const tiered = inputsWithEffectiveWacoLoadTier(inputs);
    publishConfiguratorExploreSync(tiered, uiMode);
    try {
      const role = await fetchMachineRole().catch(() => null);
      const peerBase = role?.isIdeum ? resolveMaingearPeerPostBase(role) : '';
      // Ideum → Maingear: browser POST direct to Ethernet (same as clean-data). Avoid Ideum
      // backend forward — it often 502s when the server cannot reach Maingear even if the browser can.
      if (peerBase) {
        const peer = await postConfiguratorExploreSyncToPeer(peerBase, tiered, uiMode);
        logExploreSyncResult('maingear-peer', peer);
        return;
      }
      const local = await postConfiguratorExploreSync(null, tiered, uiMode);
      logExploreSyncResult('local-backend', local);
    } catch (err) {
      console.warn('[configurator] explore-sync to Maingear failed:', err?.message || err);
    }
  }, [inputs, uiMode]);

  /** Inputs corridor bands → session + Maingear (even while Data Exploration tab is open). */
  useEffect(() => {
    if (!isIdeumMode) return undefined;
    const tiered = inputsWithEffectiveWacoLoadTier(inputs);
    const fingerprint = JSON.stringify({
      ranges: configuratorInputsToDataVisRanges(tiered),
      loadMW: tiered.loadMW,
      stateId: tiered.stateId,
      uiMode,
      technologyCapex: tiered.technologyCapex,
    });
    if (fingerprint === lastExploreSyncFingerprintRef.current) return undefined;
    lastExploreSyncFingerprintRef.current = fingerprint;
    publishConfiguratorExploreSync(tiered, uiMode);
    const timer = window.setTimeout(() => {
      void pushExploreSyncToCluster();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [inputs, isIdeumMode, pushExploreSyncToCluster, uiMode]);

  useEffect(() => {
    if (!isIdeumMode) return undefined;
    return subscribeDataQualityMode(setDataQualityMode);
  }, [isIdeumMode]);

  useEffect(() => {
    if (!isIdeumMode) return undefined;
    const stateId = inputs.stateId || stateIdForMartinStudy(readPersistedMartinStudy());
    const tier = stateId === 'wisconsin' ? 200 : effectiveDataVisLoadMwTier(stateId);
    persistWacoLoadTierForDataVis(tier);
    let cancelled = false;
    void preloadWacoWithDatasetQuality(tier, null, stateId).then((nextMode) => {
      if (cancelled) return;
      if (nextMode) setDataQualityMode(nextMode);
    });
    return () => {
      cancelled = true;
    };
    // Warm the study once for the location this page opened with.
    // Location and MW clicks preload again themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIdeumMode]);

  useEffect(() => {
    if (!isIdeumMode || typeof window === 'undefined') return undefined;
    const onTierChanged = () => setDataVisWacoTier(effectiveDataVisLoadMwTier());
    const onDatasetReady = (event) => {
      const tier = event?.detail?.loadMW ?? effectiveDataVisLoadMwTier();
      setDataVisWacoTier(tier);
      void refreshRenewableMwBounds(tier);
    };
    window.addEventListener(WACO_LOAD_TIER_CHANGED_EVENT, onTierChanged);
    window.addEventListener(WACO_DATASET_READY_EVENT, onDatasetReady);
    return () => {
      window.removeEventListener(WACO_LOAD_TIER_CHANGED_EVENT, onTierChanged);
      window.removeEventListener(WACO_DATASET_READY_EVENT, onDatasetReady);
    };
  }, [isIdeumMode, refreshRenewableMwBounds]);

  const handleDataQualityModeChange = useCallback(async (mode) => {
    try {
      const role = await fetchMachineRole().catch(() => null);
      const next = await applyDataVisDatasetMode(mode, role);
      setDataQualityMode(next);
      await refreshRenewableMwBounds();
    } catch (err) {
      console.error('[dataVis] dataset mode change failed', err);
    }
  }, [refreshRenewableMwBounds]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!isMartinDevTabMode && !isIdeumMode) return undefined;

    const params = new URLSearchParams(window.location.search);
    const tabKey = params.get(MARTIN_PREVIEW_URL_PARAM);
    if (!tabKey) return undefined;
    if (isIdeumMode && !isMartinDevTabMode && !tabKey) return undefined;

    const crossTabStore = martinPreviewCrossTabStorage();

    const readPendingHandoff = () => {
      if (!crossTabStore) return null;
      try {
        const dedicated = crossTabStore.getItem(martinPreviewPendingStorageKey(tabKey));
        if (dedicated) return JSON.parse(dedicated);
        const legacy = crossTabStore.getItem(PENDING_OPTIMIZED_INPUTS_KEY);
        if (!legacy) return null;
        const parsed = JSON.parse(legacy);
        if (parsed?.tabKey !== tabKey) return null;
        return parsed;
      } catch (_) {
        return null;
      }
    };

    const hydrateMartinPreviewFromCache = () => {
      if (!crossTabStore) return false;
      try {
        const cachedRaw = crossTabStore.getItem(martinPreviewResultStorageKey(tabKey));
        if (!cachedRaw) return false;
        const cached = JSON.parse(cachedRaw);
        if (cached.inputs) setInputs((prev) => ({ ...prev, ...cached.inputs }));
        if (cached.result) setResult(cached.result);
        setResultsView('architecture');
        setIdeumMartinPreviewOpen(true);
        setDevAutoMartinPreviewBoot(false);
        params.delete(MARTIN_PREVIEW_URL_PARAM);
        const qs = params.toString();
        const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash || ''}`;
        window.history.replaceState(null, '', nextUrl);
        return true;
      } catch (_) {
        return false;
      }
    };

    const clearMartinPreviewStarted = () => {
      if (!crossTabStore) return;
      try {
        crossTabStore.removeItem(martinPreviewStartedStorageKey(tabKey));
      } catch (_) {
        /* ignore */
      }
    };

    const runMartinPreviewForHandoff = (parsed) => {
      if (!crossTabStore) return false;
      try {
        if (crossTabStore.getItem(martinPreviewStartedStorageKey(tabKey))) {
          return false;
        }
        crossTabStore.setItem(martinPreviewStartedStorageKey(tabKey), '1');
      } catch (_) {
        /* continue without lock */
      }
      setDevAutoMartinPreviewBoot(true);
      if (parsed.inputs) {
        setInputs((prev) => ({ ...prev, ...parsed.inputs }));
      }
      if (parsed.uiMode) {
        setUiMode(parsed.uiMode);
      }

      (async () => {
        const payload = {
          ...CONFIGURATOR_DEFAULT_INPUTS,
          ...(parsed.inputs || {}),
          uiMode: parsed.uiMode ?? UI_MODES.BASIC,
        };
        const validation = validateConfiguratorInputs(payload);
        if (!validation.ok) {
          setDevAutoMartinPreviewBoot(false);
          setError(validation.error);
          setErrorDetails(validation.details || []);
          clearMartinPreviewStarted();
          return;
        }

        setIsLocalMartinRunning(true);
        setStatusMessage('Running Martin Waco study…');
        try {
          const next = await generateMartinConfiguratorResult(payload, { preferBackend: true });
          if (!next.ok) {
            setError(next.error || 'Martin configuration could not be generated.');
            setErrorDetails(next.details || []);
            setIdeumMartinPreviewOpen(false);
            setDevAutoMartinPreviewBoot(false);
            clearMartinPreviewStarted();
            return;
          }
          setResult(next);
          setLastRunInputs({
            ...payload,
            technologies: [...(payload.technologies || [])],
          });
          setResultsView('architecture');
          setIdeumMartinPreviewOpen(true);
          setDevAutoMartinPreviewBoot(false);

          params.delete(MARTIN_PREVIEW_URL_PARAM);
          const qs = params.toString();
          const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash || ''}`;
          window.history.replaceState(null, '', nextUrl);

          try {
            crossTabStore?.setItem(
              martinPreviewResultStorageKey(tabKey),
              JSON.stringify({ result: next, inputs: payload }),
            );
            crossTabStore?.setItem(martinPreviewDoneStorageKey(tabKey), '1');
            crossTabStore?.removeItem(martinPreviewPendingStorageKey(tabKey));
            crossTabStore?.removeItem(PENDING_OPTIMIZED_INPUTS_KEY);
            crossTabStore?.removeItem(martinPreviewStartedStorageKey(tabKey));
          } catch (_) {
            /* ignore */
          }
        } catch (e) {
          setError(e.message || 'Martin configuration failed.');
          setDevAutoMartinPreviewBoot(false);
          clearMartinPreviewStarted();
        } finally {
          setIsLocalMartinRunning(false);
          setStatusMessage('');
        }
      })();

      return true;
    };

    const attempt = () => {
      try {
        if (crossTabStore?.getItem(martinPreviewDoneStorageKey(tabKey))) {
          return hydrateMartinPreviewFromCache();
        }
      } catch (_) {
        /* ignore */
      }
      const parsed = readPendingHandoff();
      if (!parsed?.runMartinWallPreview && !parsed?.inputs) return false;
      return runMartinPreviewForHandoff(parsed);
    };

    if (attempt()) return undefined;

    const startedAt = Date.now();
    const retryId = window.setInterval(() => {
      if (attempt()) {
        window.clearInterval(retryId);
        return;
      }
      if (Date.now() - startedAt > 20000) {
        window.clearInterval(retryId);
        setDevAutoMartinPreviewBoot(false);
        setError(
          'Could not start optimized configuration in this tab. Close the tab and press Optimized Configuration again.',
        );
      }
    }, 200);

    return () => window.clearInterval(retryId);
  }, [isIdeumMode, isMartinDevTabMode]);

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

  const applyWallSession = useCallback((session, options = {}) => {
    setWallSession(session);
    const wall = sessionToWallState(session, {
      onlyAfter: wallListeningSince,
      ignoreStale: options.ignoreStale,
    });
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
        // Initial snapshot may already be "ready" before this tab mounts (Ideum auto-open race).
        if (!cancelled) applyWallSession(session, { ignoreStale: true });
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

  /** Preview + Maingear optimized — Martin study, wall layout on this screen. */
  const runMartinWallPreview = useCallback(async () => {
    setError(null);
    setErrorDetails([]);

    const validation = validateConfiguratorInputs({ ...inputs, uiMode });
    if (!validation.ok) {
      setError(validation.error);
      setErrorDetails(validation.details || []);
      return;
    }

    const payload = { ...inputs, uiMode };
    setIsLocalMartinRunning(true);
    setStatusMessage('Running Martin Waco study…');
    try {
      const next = await generateMartinConfiguratorResult(payload, { preferBackend: true });
      if (!next.ok) {
        setError(next.error || 'Martin configuration could not be generated.');
        setErrorDetails(next.details || []);
        setResult(null);
        setIdeumMartinPreviewOpen(false);
        return;
      }
      setResult(next);
      setLastRunInputs({ ...payload, technologies: [...(payload.technologies || [])] });
      setResultsView('architecture');
      setIdeumMartinPreviewOpen(true);
    } catch (e) {
      setError(e.message || 'Martin configuration failed.');
    } finally {
      setIsLocalMartinRunning(false);
      setStatusMessage('');
    }
  }, [inputs, uiMode]);

  /** Ideum → Maingear wall (Martin cluster — same payload as Preview). */
  const submitIdeumMartinToMaingearWall = useCallback(async () => {
    setError(null);
    setErrorDetails([]);

    const validation = validateConfiguratorInputs({ ...inputs, uiMode });
    if (!validation.ok) {
      setError(validation.error);
      setErrorDetails(validation.details || []);
      return;
    }

    setIsWallSubmitting(true);
    setStatusMessage('Sending Martin study to Maingear wall…');
    try {
      let role = null;
      try {
        role = await fetchMachineRole();
      } catch (_) {
        /* local dev may still submit via localhost / proxy */
      }

      if (!isLocalClusterDev()) {
        if (role?.isMaingear) {
          setError(
            'You are on the Maingear. Use Optimized Configuration on the Ideum touch table to drive this wall.',
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
      }
      const backendUrl =
        role?.isIdeum && role?.peerBackendUrl && !isLocalClusterDev()
          ? (API_BASE_URL || '')
          : resolveMaingearBackendUrl(role);
      const session = await submitConfiguratorMartinToMaingear(
        backendUrl,
        inputsWithEffectiveWacoLoadTier({ ...inputs, uiMode }),
      );
      if (session.status === 'error' || !session.result?.ok) {
        setError(session.error || session.result?.error || 'Configuration could not be generated on Maingear.');
        setErrorDetails(session.errorDetails || session.result?.details || []);
        return;
      }
      if (session.result?.ok) {
        const payload = { ...inputs, uiMode };
        setResult(session.result);
        setLastRunInputs({ ...payload, technologies: [...(payload.technologies || [])] });
        setResultsView('architecture');
      }
    } catch (e) {
      setError(e.message || 'Could not send configuration to wall display.');
    } finally {
      setIsWallSubmitting(false);
      setStatusMessage('');
    }
  }, [inputs, uiMode]);

  const handleOptimizedConfiguration = useCallback(async () => {
    setError(null);
    setErrorDetails([]);

    const validation = validateConfiguratorInputs({ ...inputs, uiMode });
    if (!validation.ok) {
      setError(validation.error);
      setErrorDetails(validation.details || []);
      return;
    }

    let role = null;
    try {
      role = await fetchMachineRole();
    } catch (_) {
      /* optional on dev */
    }

    if (role?.isIdeum) {
      void submitIdeumMartinToMaingearWall();
      return;
    }

    if (role?.isMaingear) {
      if (!isIdeumMode) {
        setError('Open the Ideum configurator inputs screen to run Optimized Configuration.');
        return;
      }
      void runMartinWallPreview();
      return;
    }

    const openDevTab =
      role?.isDev
      || (isLocalClusterDev() && !role?.isMaingear && !role?.isIdeum);
    if (openDevTab) {
      const tabKey = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const handoff = {
        inputs: inputsWithEffectiveWacoLoadTier({ ...inputs }),
        uiMode,
        runMartinWallPreview: true,
        tabKey,
      };
      try {
        const store = martinPreviewCrossTabStorage();
        store?.setItem(martinPreviewPendingStorageKey(tabKey), JSON.stringify(handoff));
        store?.setItem(PENDING_OPTIMIZED_INPUTS_KEY, JSON.stringify(handoff));
      } catch (_) {
        /* storage may be unavailable */
      }
      const url = new URL(`${window.location.origin}${window.location.pathname}`);
      url.searchParams.set('view', 'configurator-martin-preview');
      url.searchParams.set(MARTIN_PREVIEW_URL_PARAM, tabKey);
      url.searchParams.set(WACO_LOAD_MW_URL_PARAM, String(effectiveDataVisLoadMwTier()));
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
      return;
    }

    setError(`Unknown machine role (${role?.role || 'unknown'}). Check cluster.local.json on this PC.`);
  }, [inputs, uiMode, isIdeumMode, runMartinWallPreview, submitIdeumMartinToMaingearWall]);

  const handleIdeumTabSelect = useCallback(async (tabId) => {
    if (tabId !== IDEUM_DATA_EXPLORATION_TAB_ID && tabId !== IDEUM_EXPLORE_DATA_TAB_ID) {
      dataExplorationTunnelRef.current?.();
      dataExplorationTunnelRef.current = null;
      setIdeumTab(tabId);
      return;
    }

    const tiered = inputsWithEffectiveWacoLoadTier(inputs);
    publishConfiguratorExploreSync(tiered, uiMode);

    // Ideum serves this UI at localhost:3003. Do not treat that hostname as the
    // dev laptop — fetch the machine role first so Ideum opens Maingear.
    let role = null;
    try {
      role = await fetchMachineRole();
    } catch {
      /* dev fallback below */
    }

    const action = await resolveDataExplorationNavigationAction(role);
    if (action === 'new-tab') {
      if (tabId === IDEUM_EXPLORE_DATA_TAB_ID) openExploreDataDevNewTab(tiered, uiMode);
      else openDataExplorationDevNewTab(tiered, uiMode);
      return;
    }
    if (action === 'maingear-remote') {
      try {
        dataExplorationTunnelRef.current?.();
        await pushExploreSyncToCluster();
        await requestDataExplorationOnMaingear(role, tiered, uiMode);
        dataExplorationTunnelRef.current = startIdeumDataExplorationMaingearTunnel(role);
        setStatusMessage('Data Exploration opened on Maingear (touch table stays on current view).');
        setError(null);
      } catch (e) {
        setError(e.message || 'Could not open Data Exploration on Maingear.');
      }
      return;
    }

    try {
      await pushExploreSyncToCluster();
    } catch {
      /* explore-sync warnings already logged */
    }
    setDataVisWacoTier(effectiveDataVisLoadMwTier());
    setIdeumTab(tabId);
  }, [inputs, pushExploreSyncToCluster, uiMode]);

  const handleExploreData = useCallback(async (inputsOverride) => {
    const currentInputs = inputsOverride?.stateId ? { ...inputs, ...inputsOverride } : inputs;
    const tiered = inputsWithEffectiveWacoLoadTier(currentInputs);
    publishConfiguratorExploreSync(tiered, uiMode);
    // Open the dev tab inside the click, before any await, so the browser allows it.
    const knownRole = machineRoleRef.current;
    if (!knownRole?.isIdeum && (knownRole ? exploreNavigationActionForRole(knownRole) === 'new-tab' : isLocalClusterDev())) {
      openExploreDataDevNewTab(tiered, uiMode);
      return;
    }
    let role = knownRole;
    if (!role) {
      try {
        role = await fetchMachineRole();
        machineRoleRef.current = role;
      } catch {
        /* dev fallback */
      }
    }

    const action = await resolveExploreDataNavigationAction(role);
    if (action === 'new-tab') {
      openExploreDataDevNewTab(tiered, uiMode);
      return;
    }
    if (action === 'maingear-remote') {
      try {
        dataExplorationTunnelRef.current?.();
        await pushExploreSyncToCluster();
        await requestExploreDataOnMaingear(role, tiered, uiMode);
        dataExplorationTunnelRef.current = startIdeumDataExplorationMaingearTunnel(role);
        setStatusMessage('Explore Data opened on Maingear (touch table stays on Inputs).');
        setError(null);
      } catch (e) {
        setError(e.message || 'Could not open Explore Data on Maingear.');
      }
      return;
    }
    try {
      await pushExploreSyncToCluster();
    } catch {
      /* explore-sync warnings already logged */
    }
    setDataVisWacoTier(effectiveDataVisLoadMwTier());
    setIdeumTab(IDEUM_EXPLORE_DATA_TAB_ID);
  }, [inputs, pushExploreSyncToCluster, uiMode]);

  const handleExploreDataRef = useRef(handleExploreData);
  handleExploreDataRef.current = handleExploreData;
  const openLatestExploreData = useCallback((inputsOverride) => {
    handleExploreDataRef.current?.(inputsOverride);
  }, []);

  /** Header Preview — Martin on this machine (same as Maingear optimized). */
  const handleMartinLocalConfigure = useCallback(async () => {
    if (!isIdeumMode) return;
    await runMartinWallPreview();
  }, [isIdeumMode, runMartinWallPreview]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setErrorDetails([]);

    const validation = validateConfiguratorInputs({ ...inputs, uiMode });
    if (!validation.ok) {
      setError(validation.error);
      setErrorDetails(validation.details || []);
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
  }, [inputs, uiMode]);

  const handleReset = () => {
    if (isWallMode) return;
    const base = isIdeumMode
      ? buildIdeumConfiguratorInputs(DEFAULT_WACO_LOAD_TIER)
      : { ...CONFIGURATOR_DEFAULT_INPUTS };
    setInputs(
      isIdeumMode && renewableMwBounds
        ? inputsWithRenewableDataSpan(base, renewableMwBounds)
        : base,
    );
    if (isIdeumMode) {
      persistWacoLoadTierForDataVis(DEFAULT_WACO_LOAD_TIER);
      persistDataQualityMode(DATA_QUALITY_CLEAN);
      setDataQualityMode(DATA_QUALITY_CLEAN);
      setDataVisWacoTier(DEFAULT_WACO_LOAD_TIER);
      void preloadWacoWithDatasetQuality(DEFAULT_WACO_LOAD_TIER, null, 'texas').then((uiMode) => {
        if (uiMode) setDataQualityMode(uiMode);
      });
    }
    setUiMode(UI_MODES.BASIC);
    setResult(null);
    setLastRunInputs(null);
    setError(null);
    setErrorDetails([]);
    setResultsView(null);
    setIdeumMartinPreviewOpen(false);
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

  const devMartinPreviewTabKey =
    (isIdeumMode || isMartinDevTabMode) && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get(MARTIN_PREVIEW_URL_PARAM)
      : null;
  const devMartinPreviewScreen =
    !isMartinDevTabMode
    && Boolean(devMartinPreviewTabKey)
    && !showIdeumLocalMartinWall;

  if (isMartinDevTabMode) {
    return (
      <div className="conf-page conf-page--wall conf-page--martin-dev-tab">
        {error && (
          <div className="conf-error-banner" role="alert">
            <strong>{error}</strong>
          </div>
        )}
        {!result?.ok ? (
          <p className="conf-ideum-status-line conf-ideum-status-line--boot" role="status" aria-live="polite">
            {statusMessage || (isLocalMartinRunning ? 'Running Martin Waco study…' : 'Opening optimized configuration…')}
          </p>
        ) : (
          <div className="conf-layout conf-layout--wall">
            <ConfWallQuadrantDisplay
              result={result}
              inputs={inputs}
              isGenerating={isLocalMartinRunning}
              statusMessage={statusMessage}
              wallSessionStatus="ready"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`conf-page conf-page--${mode}${enable3d ? '' : ' conf-page--no3d'}`}>
      {isWallMode ? (
        onClose ? (
          <header className="conf-page-header conf-page-header--wall-chrome">
            <div className="conf-page-header__actions">
              <Conf3dToggleButton className="conf-3d-toggle--wall" />
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
        ) : (
          <header className="conf-page-header conf-page-header--wall-chrome">
            <div className="conf-page-header__actions">
              <Conf3dToggleButton className="conf-3d-toggle--wall" />
            </div>
          </header>
        )
      ) : (
      <header className={`conf-page-header${isIdeumMode ? ' conf-page-header--ideum' : ''}${isIdeumMode && IDEUM_HIDE_HEADER_CHROME ? ' conf-page-header--ideum-snapshot' : ''}`}>
        {isIdeumMode ? (
          <>
            <div className="conf-page-header__ideum-start">
              {!IDEUM_HIDE_HEADER_CHROME && handleBack && (
                <Ideum05BackButton onBack={handleBack} className="conf-ideum-header-back-btn" />
              )}
              <ConfIdeumPageTabs
                activeTab={ideumTab}
                onSelectTab={handleIdeumTabSelect}
                onLocalMartinConfigure={
                  ideumTab === 'configure' ? handleMartinLocalConfigure : undefined
                }
                localMartinBusy={isLocalMartinRunning}
                dataQualityMode={dataQualityMode}
                onDataQualityModeChange={handleDataQualityModeChange}
              />
            </div>
            <div className="conf-page-header__titles conf-page-header__titles--center">
              <h1>{meta.title}</h1>
            </div>
            {!IDEUM_HIDE_HEADER_CHROME && (onClose ? (
              <div className="conf-page-header__actions">
                <Conf3dToggleButton />
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
              <div className="conf-page-header__actions">
                <Conf3dToggleButton />
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="conf-page-header__titles">
              {onBack ? (
                <div className="conf-page-header__optimized-back">
                  <Ideum05BackButton onBack={onBack} className="conf-ideum-header-back-btn" />
                </div>
              ) : null}
              <span className="conf-page-eyebrow">Energy System Configuration</span>
              <h1>{meta.title}</h1>
              {meta.subtitle && <p>{meta.subtitle}</p>}
              <div className="conf-badges">
                <span className="conf-badge conf-badge--mode">{meta.badge}</span>
                <span className="conf-badge conf-badge--synthetic">Synthetic Demonstration Data</span>
              </div>
            </div>
            <div className="conf-page-header__actions">
              <Conf3dToggleButton />
              {onClose && (
                <>
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
                </>
              )}
            </div>
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

      {isIdeumMode && !isWallMode && (isLocalMartinRunning || statusMessage) && (
        <p className="conf-ideum-status-line" role="status" aria-live="polite">
          {statusMessage || 'Running Martin Waco study on this machine…'}
        </p>
      )}

      <div className={`conf-layout conf-layout--${mode}${isIdeumMode && ideumTab !== 'configure' ? ' conf-layout--ideum-trade' : ''}`}>
        {!isWallMode && isIdeumMode && ideumTab === 'configure' && !devMartinPreviewScreen && (
          <ConfIdeumInputPanel
            inputs={inputs}
            onChange={setInputs}
            onExploreData={openLatestExploreData}
            onOptimizedConfiguration={handleOptimizedConfiguration}
            onReset={handleReset}
            onLoadPreset={handleLoadPreset}
            isOptimizedBusy={isWallSubmitting || isLocalMartinRunning}
            renewableMwBounds={renewableMwBounds}
            previewSlot={
              !showIdeumLocalMartinWall ? <ConfIdeumPreviewSummary result={result} /> : null
            }
          />
        )}
        {devMartinPreviewScreen && (
          <p className="conf-ideum-status-line conf-ideum-status-line--boot" role="status" aria-live="polite">
            {statusMessage || (isLocalMartinRunning ? 'Running Martin Waco study…' : 'Opening optimized configuration…')}
          </p>
        )}
        {showIdeumLocalMartinWall
          && typeof document !== 'undefined'
          && createPortal(
            <div className="conf-ideum-local-wall" aria-label="Martin configuration result">
              <button
                type="button"
                className="conf-ideum-local-wall__close"
                onClick={() => setIdeumMartinPreviewOpen(false)}
              >
                Close preview
              </button>
              <div className="conf-page conf-page--wall conf-ideum-local-wall__page">
                <div className="conf-layout conf-layout--wall">
                  <ConfWallQuadrantDisplay
                    result={result}
                    inputs={inputs}
                    isGenerating={isLocalMartinRunning}
                    statusMessage={statusMessage}
                    wallSessionStatus="ready"
                  />
                </div>
              </div>
            </div>,
            document.body,
          )}
        {!isWallMode
          && isIdeumMode
          && ideumTab !== 'configure'
          && ideumTab !== IDEUM_DATA_EXPLORATION_TAB_ID
          && ideumTab !== IDEUM_EXPLORE_DATA_TAB_ID && (
          <ConfTradeSpacePanel vizId={ideumTab} inputs={inputs} />
        )}
        {!isWallMode && isIdeumMode && ideumTab === IDEUM_DATA_EXPLORATION_TAB_ID && (
          <DataVisPanel key={`datavis-${effectiveMartinStudy(inputs?.stateId)}-${dataVisWacoTier}`} showQualityToggle={false} />
        )}
        {!isWallMode && isIdeumMode && ideumTab === IDEUM_EXPLORE_DATA_TAB_ID && (
          <DataVisPanel
            key={`explore-${effectiveMartinStudy(inputs?.stateId)}-${dataVisWacoTier}`}
            variant="exploreWall"
            showQualityToggle={false}
          />
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

export default function DataCenterConfigurator(props) {
  return (
    <Conf3dProvider>
      <DataCenterConfiguratorInner {...props} />
    </Conf3dProvider>
  );
}

