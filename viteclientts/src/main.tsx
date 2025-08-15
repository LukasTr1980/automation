import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// One-time Service Worker kill (remove PWA and avoid cached HTML)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(async (regs) => {
    if (regs.length > 0) {
      await Promise.all(regs.map((r) => r.unregister()));
      // If a controller was active, reload once to drop SW control
      if (navigator.serviceWorker.controller) {
        window.location.reload();
      }
    }
  }).catch(() => {
    // ignore errors
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
