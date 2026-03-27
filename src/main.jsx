import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { initBrowserMock } from './office2d/browserMock'

initBrowserMock()
  .then(() => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    )
  })
  .catch((err) => {
    console.error("Initialization failed:", err);
    createRoot(document.getElementById('root')).render(
      <div style={{ color: 'red', padding: '20px', fontFamily: 'monospace' }}>
        <h1>Initialization Error</h1>
        <pre>{err.stack || String(err)}</pre>
      </div>
    );
  });
