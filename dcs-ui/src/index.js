import './disableReactDevTools';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/** Chrome --app on Windows 11: title bar color follows theme-color (not DWM). */
const KIOSK_THEME_COLOR = '#1a1a1a';
function applyKioskThemeColor() {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = KIOSK_THEME_COLOR;
  document.documentElement.style.colorScheme = 'dark';
}
applyKioskThemeColor();
const kioskThemeTimer = window.setInterval(applyKioskThemeColor, 1000);
window.setTimeout(() => window.clearInterval(kioskThemeTimer), 20000);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
