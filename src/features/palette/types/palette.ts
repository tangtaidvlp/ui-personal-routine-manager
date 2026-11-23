/** Task colour palette served by the backend (specs/.done.F005-i-want-color-to-be-persisted/contracts/task-palette-api.md). */

export type PaletteShade = { accent: string; bg: string }

export type PaletteEntry = {
  /** Stored on tasks as their `color`; never renamed. */
  id: string
  label: string
  light: PaletteShade
  dark: PaletteShade
}

/** `colors` is in round-robin order. */
export type TaskPalette = { colors: PaletteEntry[] }
