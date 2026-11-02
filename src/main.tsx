import './styles/layers.css'
import './styles/tokens.css'
import './styles/base.css'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { installAudioUnlock } from './audio/audio.ts'
import { App } from './ui/App.tsx'

installAudioUnlock()

// The asset gallery exists in dev builds only; production drops this branch and its chunk.
const Gallery =
  import.meta.env.DEV && location.pathname.endsWith('/dev/assets')
    ? lazy(() => import('./ui/dev/AssetGallery.tsx').then(m => ({ default: m.AssetGallery })))
    : null

const root = document.getElementById('root')
if (!root) throw new Error('#root missing')
createRoot(root).render(
  <StrictMode>
    {Gallery ? (
      <Suspense>
        <Gallery />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
