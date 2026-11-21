import type { CSSProperties, KeyboardEvent } from 'react'
import type { PaletteEntry } from '../types/palette.ts'
import { isCustomColor, resolveTaskColor } from '../utils/taskColor.ts'

export type PaletteSwatchesProps = {
  /** Palette id, `#RRGGBB`, or null for "let the server choose". */
  value: string | null
  onChange: (value: string) => void
  palette: PaletteEntry[] | null
}

// <input type="color"> needs a literal #rrggbb starting value; this is task data, not styling.
const CUSTOM_DEFAULT = '#2563EB'

/**
 * Task colour picker (specs/F005): one swatch per backend palette entry, plus "Custom"
 * for an exact colour. Swatches use the same light/dark CSS variables as task cards.
 */
function PaletteSwatches({ value, onChange, palette }: PaletteSwatchesProps) {
  const customValue = isCustomColor(value) ? value : null
  const entries = palette ?? []

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!step || entries.length === 0) return
    event.preventDefault()
    const next = entries[(index + step + entries.length) % entries.length]
    onChange(next.id)
    const group = event.currentTarget.parentElement
    group?.querySelectorAll<HTMLButtonElement>('.ob-swatch')[(index + step + entries.length) % entries.length]?.focus()
  }

  return (
    <div className="ob-swatches" role="radiogroup" aria-label="Task color">
      {entries.map((entry, index) => {
        const selected = value === entry.id
        return (
          <button
            key={entry.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={entry.label}
            title={entry.label}
            tabIndex={selected || (value === null && index === 0) || (customValue && index === 0) ? 0 : -1}
            className={selected ? 'ob-swatch is-selected' : 'ob-swatch'}
            style={resolveTaskColor(entry.id, palette) as CSSProperties}
            onClick={() => onChange(entry.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          />
        )
      })}
      <label
        className={customValue ? 'ob-swatch ob-swatch-custom is-selected' : 'ob-swatch ob-swatch-custom'}
        title="Custom color"
        style={resolveTaskColor(customValue, palette) as CSSProperties}
      >
        <input
          type="color"
          className="ob-swatch-input"
          aria-label="Custom color"
          value={customValue ?? CUSTOM_DEFAULT}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <span aria-hidden="true">+</span>
      </label>
    </div>
  )
}

export default PaletteSwatches
