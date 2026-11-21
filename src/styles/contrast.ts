/** WCAG 2.x contrast helpers used to check the design tokens (specs/.done.F002-ui-refactoring, R3). */

export type Rgb = [number, number, number]

export function parseHex(hex: string): Rgb {
  const value = hex.trim().replace(/^#/, '')
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value.slice(0, 6)
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a hex colour: ${hex}`)
  }
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb
}

export function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(parseHex(hexA))
  const b = relativeLuminance(parseHex(hexB))
  const [light, dark] = a > b ? [a, b] : [b, a]
  return (light + 0.05) / (dark + 0.05)
}

/**
 * Parse `--name: value;` declarations from a stylesheet and resolve `var(--x)` chains,
 * returning each custom property's final value (e.g. `--color-accent` → `#1A6FD4`).
 */
export function readTokens(cssText: string): Record<string, string> {
  const raw: Record<string, string> = {}
  const declaration = /(--[\w-]+)\s*:\s*([^;]+);/g
  const withoutComments = cssText.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const match of withoutComments.matchAll(declaration)) {
    raw[match[1]] = match[2].trim()
  }

  const resolve = (name: string, seen: Set<string>): string => {
    const value = raw[name]
    if (value === undefined) throw new Error(`Unknown token ${name}`)
    const ref = /^var\((--[\w-]+)\)$/.exec(value)
    if (!ref) return value
    if (seen.has(ref[1])) throw new Error(`Token cycle at ${name}`)
    seen.add(ref[1])
    return resolve(ref[1], seen)
  }

  return Object.fromEntries(Object.keys(raw).map((name) => [name, resolve(name, new Set([name]))]))
}

const DARK_BLOCK = /:root\[data-theme="dark"\]\s*\{([^}]*)\}/

/**
 * Tokens as a theme sees them (specs/F005): 'light' is everything outside the
 * `:root[data-theme="dark"]` block; 'dark' is the same with that block's overrides
 * on top, so `var()` chains resolve the way the browser does on <html>.
 */
export function readThemeTokens(cssText: string, theme: 'light' | 'dark'): Record<string, string> {
  const withoutComments = cssText.replace(/\/\*[\s\S]*?\*\//g, '')
  const dark = DARK_BLOCK.exec(withoutComments)
  const base = withoutComments.replace(DARK_BLOCK, '')
  if (theme === 'light' || !dark) return readTokens(base)
  return readTokens(`${base}\n:root {${dark[1]}}`)
}
