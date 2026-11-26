import { useRef } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '../../../components/icons/index.ts'
import { parseDateInputValue } from '../utils/dateInput.ts'

const HEADING_DATE: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }
const SHORT_DATE: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }

type DateNavProps = {
  /** `yyyy-MM-dd` */
  date: string
  isToday: boolean
  onShift: (deltaDays: number) => void
  onPick: (date: string) => void
  onToday: () => void
}

/** Previous / date (click to pick) / next / Today. */
function DateNav({ date, isToday, onShift, onPick, onToday }: DateNavProps) {
  const dateInputRef = useRef<HTMLInputElement>(null)
  const day = parseDateInputValue(date)

  const openDatePicker = () => {
    const input = dateInputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker()
        return
      } catch {
        // Some browsers refuse showPicker outside a direct gesture; fall back to focus.
      }
    }
    input.focus()
  }

  return (
    <div className="dr-date-row">
      <button type="button" className="ui-icon-btn" onClick={() => onShift(-1)} aria-label="Previous day">
        <ChevronLeftIcon size={16} />
      </button>
      <div className="dr-date-heading">
        <h1>
          <button type="button" className="dr-date-trigger" onClick={openDatePicker} aria-label="Pick a date">
            <span className="dr-date-long">{day.toLocaleDateString('en-GB', HEADING_DATE)}</span>
            <span className="dr-date-short">{day.toLocaleDateString('en-GB', SHORT_DATE)}</span>
          </button>
        </h1>
        <input
          ref={dateInputRef}
          type="date"
          className="dr-date-input"
          value={date}
          onChange={(event) => event.target.value && onPick(event.target.value)}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      <button type="button" className="ui-icon-btn" onClick={() => onShift(1)} aria-label="Next day">
        <ChevronRightIcon size={16} />
      </button>
      <button type="button" className="ui-btn" onClick={onToday} disabled={isToday}>
        Today
      </button>
    </div>
  )
}

export default DateNav
