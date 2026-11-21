import { describe, expect, it } from 'vitest'
import type { PaletteEntry } from '../types/palette.ts'
import { isCustomColor, isPaletteId, resolveTaskColor } from './taskColor.ts'

const palette: PaletteEntry[] = [
  { id: 'green', label: 'Green', light: { accent: '#10A36B', bg: '#E3F5EE' }, dark: { accent: '#34C98E', bg: '#1B3836' } },
  { id: 'blue', label: 'Blue', light: { accent: '#1A6FD4', bg: '#E8F1FC' }, dark: { accent: '#5B9DF0', bg: '#213145' } },
]

describe('resolveTaskColor', () => {
  it('maps a palette id to both theme pairs', () => {
    expect(resolveTaskColor('blue', palette)).toEqual({
      '--task-accent-light': '#1A6FD4',
      '--task-bg-light': '#E8F1FC',
      '--task-accent-dark': '#5B9DF0',
      '--task-bg-dark': '#213145',
    })
  })

  it('keeps an exact colour the same in both themes', () => {
    expect(resolveTaskColor('#FF0000', palette)).toEqual({
      '--task-accent-light': '#FF0000',
      '--task-accent-dark': '#FF0000',
    })
  })

  it.each([['gold'], ['red'], [null], [undefined], ['#FFF']])('leaves %s unresolved', (color) => {
    expect(resolveTaskColor(color, palette)).toEqual({})
  })

  it('leaves palette ids unresolved until the palette loads', () => {
    expect(resolveTaskColor('green', null)).toEqual({})
  })
})

describe('colour kinds', () => {
  it('tells palette ids from exact colours', () => {
    expect(isPaletteId('green', palette)).toBe(true)
    expect(isPaletteId('#10A36B', palette)).toBe(false)
    expect(isCustomColor('#10a36b')).toBe(true)
    expect(isCustomColor('green')).toBe(false)
  })
})
