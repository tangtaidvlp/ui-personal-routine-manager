import { useEffect, useState } from 'react'
import { fetchTaskPalette } from '../api/taskPalette.ts'
import type { PaletteEntry } from '../types/palette.ts'

// One request per page session, shared by every board and dialog.
let cached: PaletteEntry[] | null = null
let pending: Promise<PaletteEntry[]> | null = null

function loadPalette(): Promise<PaletteEntry[]> {
  if (!pending) {
    pending = fetchTaskPalette()
      .then((palette) => {
        cached = palette.colors
        return cached
      })
      .catch((error: unknown) => {
        pending = null // let a later mount retry
        throw error
      })
  }
  return pending
}

/** The backend task palette. While loading or after a failure `palette` is null and task cards use the neutral style. */
export function usePalette(): { palette: PaletteEntry[] | null; error: boolean } {
  const [palette, setPalette] = useState<PaletteEntry[] | null>(cached)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (cached) return
    let active = true
    loadPalette()
      .then((colors) => {
        if (active) setPalette(colors)
      })
      .catch((err: unknown) => {
        console.error('Failed to load task palette:', err)
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [])

  return { palette, error }
}
