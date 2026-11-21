import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { contrastRatio, parseHex, readThemeTokens, readTokens } from './contrast.ts'

describe('contrast maths', () => {
  it('parses short and long hex', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255])
    expect(parseHex('#1A6FD4')).toEqual([26, 111, 212])
  })

  it('computes WCAG ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#777777', '#777777')).toBe(1)
  })

  it('resolves var() chains', () => {
    const tokens = readTokens(':root { --a: #123456; --b: var(--a); --c: var(--b); }')
    expect(tokens['--c']).toBe('#123456')
  })
})

// Pairs from specs/.done.F002-ui-refactoring/contracts/style-tokens.md "Contrast pairs" (FR-019).
const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8')
const THEMES = { light: readThemeTokens(css, 'light'), dark: readThemeTokens(css, 'dark') }

const AA_PAIRS: [string, string][] = [
  ['--color-text-primary', '--color-bg-surface'],
  ['--color-text-secondary', '--color-bg-surface'],
  ['--color-text-on-accent', '--color-accent'],
  ['--color-accent-text', '--color-accent-soft'],
  ['--color-danger', '--color-bg-surface'],
  ['--color-text-on-highlight', '--color-highlight'],
  // Task-card backgrounds come from the backend palette (specs/F005); their contrast is checked by
  // TaskPaletteContrastTest in ms-personal-routine-manager.
]

// Both themes must pass the same pairs (specs/F005 FR-022).
describe.each(Object.entries(THEMES))('design token contrast (%s theme)', (_theme, tokens) => {
  it.each(AA_PAIRS)('%s on %s reaches 4.5:1', (fg, bg) => {
    expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5)
  })

  it('--color-text-muted on --color-bg-surface reaches 3:1', () => {
    expect(contrastRatio(tokens['--color-text-muted'], tokens['--color-bg-surface'])).toBeGreaterThanOrEqual(3)
  })
})

describe('readThemeTokens', () => {
  it('keeps light values out of the dark overrides and vice versa', () => {
    const sample = ':root { --a: #111111; --b: var(--a); } :root[data-theme="dark"] { --a: #EEEEEE; }'
    expect(readThemeTokens(sample, 'light')['--b']).toBe('#111111')
    expect(readThemeTokens(sample, 'dark')['--b']).toBe('#EEEEEE')
  })
})
