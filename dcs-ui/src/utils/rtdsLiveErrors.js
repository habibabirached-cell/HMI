import './rtdsLiveErrors.css';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatDebugBlock(debug) {
  if (!debug || typeof debug !== 'object') return '';
  const lines = [
    `timestamp: ${new Date().toISOString()}`,
    `page: ${typeof window !== 'undefined' ? window.location.href : '(n/a)'}`,
    `hostname: ${typeof window !== 'undefined' ? window.location.hostname : '(n/a)'}`,
    `userAgent: ${typeof navigator !== 'undefined' ? navigator.userAgent : '(n/a)'}`,
  ];
  for (const [key, value] of Object.entries(debug)) {
    if (value == null) {
      lines.push(`${key}: (null)`);
    } else if (typeof value === 'object') {
      lines.push(`${key}: ${JSON.stringify(value, null, 2)}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

/** Tall scrollable dialog (~2.5× a normal alert) with message + debug block. */
export function showRtdsLiveError(message, debug = {}) {
  const text =
    message ||
    'Unknown RTDS live stream error.\n\nSee the bridge terminal on Maingear.';

  console.error('[RTDS live]', text, debug);

  const prev = document.getElementById('rtds-live-error-root');
  if (prev) prev.remove();

  const root = document.createElement('div');
  root.id = 'rtds-live-error-root';
  root.className = 'rtds-live-error-root';
  root.innerHTML = `
    <div class="rtds-live-error-panel" role="alertdialog" aria-labelledby="rtds-live-error-title">
      <div class="rtds-live-error-header">
        <h2 id="rtds-live-error-title">Live RTDS — error</h2>
        <button type="button" class="rtds-live-error-copy" title="Copy message and debug to clipboard">Copy</button>
      </div>
      <pre class="rtds-live-error-message">${escapeHtml(text)}</pre>
      <h3 class="rtds-live-error-debug-title">Debug info (for troubleshooting)</h3>
      <pre class="rtds-live-error-debug">${escapeHtml(formatDebugBlock(debug))}</pre>
      <div class="rtds-live-error-actions">
        <button type="button" class="rtds-live-error-ok">OK</button>
      </div>
    </div>
  `;

  const close = () => root.remove();

  root.querySelector('.rtds-live-error-ok')?.addEventListener('click', close);
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });

  root.querySelector('.rtds-live-error-copy')?.addEventListener('click', async () => {
    const blob = `${text}\n\n--- DEBUG ---\n${formatDebugBlock(debug)}`;
    try {
      await navigator.clipboard.writeText(blob);
    } catch (_) {
      /* ignore */
    }
  });

  document.body.appendChild(root);
}
