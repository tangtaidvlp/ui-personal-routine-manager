import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://tangtaidvlp.github.io/milos.github.io/, so asset URLs
  // must be prefixed with the repo name rather than the domain root.
  base: '/milos.github.io/',
  plugins: [react()],
  server: {
    proxy: {
      // Forward API calls to the backend running on localhost:8080.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        configure: (proxy) => {
          // Strip Basic-auth challenges so the browser doesn't pop its
          // native "Sign in to access this site" dialog on a 401. The app
          // handles 401s itself (falls back to the login form).
          proxy.on('proxyRes', (proxyRes) => {
            delete proxyRes.headers['www-authenticate']
          })
        },
      },
    },
  },
})
