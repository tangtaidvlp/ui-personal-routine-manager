import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * FR-017 / SC-004: raw colour literals may only appear in src/styles/tokens.css.
 * Everything else must use var(--…) semantic tokens (contracts/style-tokens.md).
 */

const SRC = fileURLToPath(new URL('..', import.meta.url))
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/
const EXTENSIONS = /\.(css|ts|tsx|jsx)$/
const SKIP = new Set(['styles/tokens.css'])

/** Third-party brand marks keep their official colours (Google, Facebook, Apple logos). */
const ALLOWED: Record<string, (line: string) => boolean> = {
  'features/auth/pages/AuthPage.tsx': (line) =>
    /fill="#(4285F4|34A853|FBBC05|EA4335|1877F2)"/.test(line),
  // <input type="color"> only accepts a literal #rrggbb value; this is task data, not styling (specs/F005).
  'features/palette/components/PaletteSwatches.tsx': (line) => /const CUSTOM_DEFAULT = '#[0-9A-F]{6}'/.test(line),
}

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })
}

function findViolations(): string[] {
  const hits: string[] = []
  for (const file of listFiles(SRC)) {
    const rel = relative(SRC, file).split('\\').join('/')
    if (!EXTENSIONS.test(rel) || rel.endsWith('.test.ts') || SKIP.has(rel)) continue
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (!RAW_COLOR.test(line)) return
        if (ALLOWED[rel]?.(line)) return
        // Ignore comments that only mention a colour.
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
        hits.push(`src/${rel}:${index + 1}: ${trimmed}`)
      })
  }
  return hits
}

describe('no raw colours outside tokens.css', () => {
  it('uses design tokens everywhere', () => {
    expect(findViolations()).toEqual([])
  })
})
