/**
 * Vitest setup (F006). Component tests opt into jsdom per file with `// @vitest-environment jsdom`;
 * logic tests stay in Node. DOM helpers are only loaded when a document exists.
 */
import { afterEach } from 'vitest'

if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest')
  const { cleanup } = await import('@testing-library/react')
  afterEach(() => {
    cleanup()
    try {
      window.localStorage.clear()
    } catch {
      // storage unavailable: nothing to clear
    }
  })
}
