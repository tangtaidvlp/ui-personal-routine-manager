import { useRef, type ComponentType, type KeyboardEvent } from 'react'
import { MonitorIcon, MoonIcon, SunIcon, type IconProps } from './icons/index.ts'
import { useTheme } from '../theme/useTheme.ts'
import type { ThemePreference } from '../features/settings/types/settings.ts'

export type ThemeControlProps = {
  /**
   * `sidebar`: labelled, in the sidebar footer. `compact`: icons only (auth header, onboarding top bar).
   * `full`: labelled, Profile → Preferences.
   */
  variant?: 'sidebar' | 'compact' | 'full'
}

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string; icon: ComponentType<IconProps> }> = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
]

/** Light / Dark / System theme choice (specs/F006 FR-009, contracts/ui-profile-settings.md). */
function ThemeControl({ variant = 'compact' }: ThemeControlProps) {
  const { preference, setPreference } = useTheme()
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])
  const showLabels = variant !== 'compact'

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const current = OPTIONS.findIndex((option) => option.value === preference)
    const next = (current + step + OPTIONS.length) % OPTIONS.length
    setPreference(OPTIONS[next].value)
    buttonsRef.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={`ui-segmented theme-control theme-control--${variant}`}
      onKeyDown={handleKeyDown}
    >
      {OPTIONS.map(({ value, label, icon: Glyph }, index) => {
        const checked = preference === value
        return (
          <button
            key={value}
            ref={(element) => {
              buttonsRef.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={showLabels ? undefined : label}
            title={showLabels ? undefined : label}
            tabIndex={checked ? 0 : -1}
            data-value={value}
            className={`ui-segmented-btn theme-control-option${checked ? ' active' : ''}`}
            onClick={() => setPreference(value)}
          >
            <Glyph size={showLabels ? 14 : 16} />
            {showLabels ? <span className="theme-control-label">{label}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

export default ThemeControl
