import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/kladde.css';
import './styles/app.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);

// Installierbare Web-App: Service Worker nur bei echtem Hosting (nicht in eingebetteten Vorschauen).
if (typeof __PWA__ === 'undefined' || __PWA__) {
  try {
    if ('serviceWorker' in navigator && window.isSecureContext && window.top === window.self) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  } catch { /* nicht verfügbar */ }
}
