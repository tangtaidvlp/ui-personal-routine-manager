import type { PaletteEntry } from '../types/palette.ts'

const CUSTOM_COLOR = /^#[0-9A-Fa-f]{6}$/

export function isCustomColor(color: string | null | undefined): color is string {
  return typeof color === 'string' && CUSTOM_COLOR.test(color)
}

export function findPaletteEntry(color: string | null | undefined, palette: PaletteEntry[] | null): PaletteEntry | undefined {
  if (!color || !palette) return undefined
  return palette.find((entry) => entry.id === color)
}

export function isPaletteId(color: string | null | undefined, palette: PaletteEntry[] | null): boolean {
  return findPaletteEntry(color, palette) !== undefined
}

/**
 * Inline CSS variables for a task card (contracts/theme-ui.md "Task card variables").
 * The stylesheet picks the light or dark pair from `data-theme`; an empty result
 * leaves the card on its default neutral style.
 */
export function resolveTaskColor(color: string | null | undefined, palette: PaletteEntry[] | null): Record<string, string> {
  const entry = findPaletteEntry(color, palette)
  if (entry) {
    return {
      '--task-accent-light': entry.light.accent,
      '--task-bg-light': entry.light.bg,
      '--task-accent-dark': entry.dark.accent,
      '--task-bg-dark': entry.dark.bg,
    }
  }
  if (isCustomColor(color)) {
    return { '--task-accent-light': color, '--task-accent-dark': color }
  }
  return {}
}
