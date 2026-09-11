import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './app/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Hash routing keeps the route after the '#', which browsers never send
        to the server, so GitHub Pages only ever serves the real index.html. */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
