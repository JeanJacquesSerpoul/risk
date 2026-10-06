import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useGame } from './game/store'

if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
