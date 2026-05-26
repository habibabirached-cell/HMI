const FLIGHT_MS = 420;

export function prefersReducedChartMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Animate a chart card flying into the target drawer column, then run onComplete (commit uiDrawer).
 */
export function flyChartToDrawer({
  sourceEl,
  targetDrawerContentEl,
  chartTitle = 'Chart',
  onComplete,
}) {
  if (!sourceEl) {
    onComplete?.();
    return;
  }

  if (prefersReducedChartMotion() || !targetDrawerContentEl) {
    onComplete?.();
    return;
  }

  const src = sourceEl.getBoundingClientRect();
  const tgt = targetDrawerContentEl.getBoundingClientRect();

  const endLeft = tgt.left + 12;
  const endTop = Math.min(
    tgt.top + 8,
    tgt.top + Math.max(0, (tgt.height - src.height) / 2),
  );
  const dx = endLeft - src.left;
  const dy = endTop - src.top;

  const ghost = document.createElement('div');
  ghost.className = 'chart-drawer-fly-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.innerHTML = `<span class="chart-drawer-fly-ghost__title">${escapeHtml(chartTitle)}</span>`;

  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${src.left}px`,
    top: `${src.top}px`,
    width: `${src.width}px`,
    height: `${src.height}px`,
    boxSizing: 'border-box',
    zIndex: '10050',
    pointerEvents: 'none',
    transform: 'translate(0, 0)',
    transition: `transform ${FLIGHT_MS}ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow ${FLIGHT_MS}ms ease`,
  });

  sourceEl.classList.add('chart-panel-chart--drawer-fly-source');
  document.body.appendChild(ghost);

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    ghost.remove();
    sourceEl.classList.remove('chart-panel-chart--drawer-fly-source');
    onComplete?.();
  };

  const onEnd = (ev) => {
    if (ev.propertyName === 'transform') finish();
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ghost.style.transform = `translate(${dx}px, ${dy}px)`;
      ghost.style.boxShadow = '0 12px 32px rgba(0, 212, 168, 0.35)';
    });
  });

  ghost.addEventListener('transitionend', onEnd);
  window.setTimeout(finish, FLIGHT_MS + 100);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
