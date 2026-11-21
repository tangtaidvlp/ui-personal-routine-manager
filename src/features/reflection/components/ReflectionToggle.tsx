import { FUTURE_REFLECTION_HINT } from '../utils/reflectionAvailability.ts'

type Props = {
  on: boolean
  disabled?: boolean
  onToggle: () => void
}

/** F007 FR-001: the compact on/off "Reflection" button that lives in the board toolbar. */
function ReflectionToggle({ on, disabled = false, onToggle }: Props) {
  return (
    <button
      type="button"
      className="ui-btn ui-btn-ghost rf-toggle"
      aria-pressed={on}
      disabled={disabled}
      onClick={onToggle}
      title={disabled ? FUTURE_REFLECTION_HINT : on ? 'Back to your plan' : 'Record what really happened'}
    >
      <span className="rf-toggle-dot" aria-hidden="true" />
      Reflection
    </button>
  )
}

export default ReflectionToggle
