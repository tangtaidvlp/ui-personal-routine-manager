import { useState } from 'react'
import { isFutureDate } from '../../reflection/utils/reflectionAvailability.ts'
import { parseDateInputValue, toDateInputValue } from '../utils/dateInput.ts'

/** The day the Today page shows (`yyyy-MM-dd`), and how it relates to today. */
export function useSelectedDate() {
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()))
  const todayValue = toDateInputValue(new Date())

  const shift = (deltaDays: number) => {
    const date = parseDateInputValue(selectedDate)
    date.setDate(date.getDate() + deltaDays)
    setSelectedDate(toDateInputValue(date))
  }

  return {
    selectedDate,
    todayValue,
    isToday: selectedDate === todayValue,
    // ISO dates compare as strings. Past days can't be reset (F012 FR-005).
    isPast: selectedDate < todayValue,
    isFuture: isFutureDate(selectedDate, todayValue),
    setDate: setSelectedDate,
    shift,
    goToday: () => setSelectedDate(todayValue),
  }
}
