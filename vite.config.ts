/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://tangtaidvlp.github.io/milos.github.io/, so asset URLs
  // must be prefixed with the repo name rather than the domain root.
  base: '/',
  plugins: [react()],
  server: {
    // Allow all hosts for tunneling/ngrok access
    allowedHosts: true,
    host: '0.0.0.0',
    // Disable HMR entirely for tunnels - it never works reliably
    hmr: false
  },
  test: {
    // Logic tests (*.test.ts) run in Node; component tests (*.test.tsx) opt into jsdom
    // per file with `// @vitest-environment jsdom`. Playwright specs live in e2e/ (pnpm test:e2e).
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['src/test/setupDom.ts'],
  },
})
