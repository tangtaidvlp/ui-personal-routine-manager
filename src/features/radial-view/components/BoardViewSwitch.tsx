import type { BoardView } from '../../../lib/devicePreference.ts'

type BoardViewSwitchProps = { value: BoardView; onChange: (view: BoardView) => void }

const OPTIONS: { view: BoardView; label: string }[] = [
  { view: 'vertical', label: 'Timeline' },
  { view: 'radial', label: 'Circle' },
]

/** Timeline | Circle switch for the day board (specs/F016). */
function BoardViewSwitch({ value, onChange }: BoardViewSwitchProps) {
  return (
    <div className="ui-segmented" role="group" aria-label="Board view">
      {OPTIONS.map((option) => (
        <button
          key={option.view}
          type="button"
          aria-pressed={value === option.view}
          className={`ui-segmented-btn ${value === option.view ? 'active' : ''}`}
          onClick={() => onChange(option.view)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default BoardViewSwitch
