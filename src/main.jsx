import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { initBrowserMock } from './office2d/browserMock'

// Start React immediately - don't wait for assets
const root = createRoot(document.getElementById('root'));

root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Load assets in background (non-blocking)
initBrowserMock()
  .then(() => {
    console.log('[Main] Assets loaded successfully in background');
  })
  .catch((err) => {
    console.error('[Main] Asset loading failed:', err);
  });
