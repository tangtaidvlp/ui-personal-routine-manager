import { MoonIcon, SunIcon } from './icons/index.ts'
import { useTheme } from '../theme/useTheme.ts'

export type ThemeToggleProps = {
  /** `sidebar`: nav-row with label (label hides in the collapsed rail). `compact`: icon-only button. */
  variant?: 'sidebar' | 'compact'
}

/** Light/dark switch (specs/F005 FR-019). Pressed = dark mode on. */
function ThemeToggle({ variant = 'compact' }: ThemeToggleProps) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  const Glyph = isDark ? SunIcon : MoonIcon

  if (variant === 'sidebar') {
    return (
      <button type="button" className="app-nav-link app-theme-toggle" aria-pressed={isDark} onClick={toggle}>
        <Glyph size={16} />
        <span className="app-nav-label">Dark mode</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      className="ui-icon-btn app-theme-toggle-compact"
      aria-pressed={isDark}
      aria-label="Dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
    >
      <Glyph size={18} />
    </button>
  )
}

export default ThemeToggle
