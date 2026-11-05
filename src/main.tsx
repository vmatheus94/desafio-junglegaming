import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { setBackendReady } from './shared/api/backend-ready'
import { App } from './app/app'

if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  setBackendReady(import('./mocks/browser').then(({ startMocks }) => startMocks()))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
