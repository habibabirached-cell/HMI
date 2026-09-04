/** Collapsed-view stub breakers that toggle open/closed on click. */
export const INTERACTIVE_STUB_BREAKER_TYPE = 'breaker-interactive-stub';

const OPEN_BREAKER_AMBER_STOPS = [
  { offset: '0%', color: '#ffb74d', opacity: 1 },
  { offset: '100%', color: '#f9a825', opacity: 1 },
];

export function isInteractiveStubBreaker(type) {
  return type === INTERACTIVE_STUB_BREAKER_TYPE;
}

/** Whether the breaker is electrically open (idle design hint or runtime open). */
export function isInteractiveBreakerOpen(component) {
  if (!component) return false;
  if (component.status === 'open') return true;
  return component.status === 'idle' && component.initialSimStatus === 'open';
}

/** Connection ids touching an open interactive stub breaker. */
export function collectOpenBreakerConnectionIds(components, connections) {
  const openIds = new Set(
    (components || [])
      .filter((c) => isInteractiveStubBreaker(c.type) && isInteractiveBreakerOpen(c))
      .map((c) => c.id),
  );
  if (!openIds.size) return new Set();

  const connIds = new Set();
  for (const conn of connections || []) {
    if (openIds.has(conn.from) || openIds.has(conn.to)) {
      connIds.add(conn.id);
    }
  }
  return connIds;
}

export function openBreakerAmberStops() {
  return OPEN_BREAKER_AMBER_STOPS;
}

/** Toggle payload for onUpdateComponent. */
export function toggleInteractiveStubBreakerUpdate(component, mode) {
  const open = isInteractiveBreakerOpen(component);
  if (open) {
    const closedStatus = mode === 'simulation' ? 'normal' : 'idle';
    return { status: closedStatus, initialSimStatus: null };
  }
  return { status: 'open', initialSimStatus: 'open' };
}
