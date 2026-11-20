import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { contrastRatio, parseHex, readTokens } from './contrast.ts'

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

// Pairs from specs/F002-ui-refactoring/contracts/style-tokens.md "Contrast pairs" (FR-019).
const tokens = readTokens(readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8'))

const AA_PAIRS: [string, string][] = [
  ['--color-text-primary', '--color-bg-surface'],
  ['--color-text-secondary', '--color-bg-surface'],
  ['--color-text-on-accent', '--color-accent'],
  ['--color-accent-text', '--color-accent-soft'],
  ['--color-danger', '--color-bg-surface'],
  ...Array.from({ length: 8 }, (_, i) => ['--color-text-primary', `--color-task-${i + 1}-bg`] as [string, string]),
]

describe('design token contrast', () => {
  it.each(AA_PAIRS)('%s on %s reaches 4.5:1', (fg, bg) => {
    expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5)
  })

  it('--color-text-muted on --color-bg-surface reaches 3:1', () => {
    expect(contrastRatio(tokens['--color-text-muted'], tokens['--color-bg-surface'])).toBeGreaterThanOrEqual(3)
  })
})
