import { useEffect, useState } from 'react'

export type BoardClock = {
  /** Minutes since midnight shown by the now-line and the clock readout. Always real time (F010). */
  currentTime: number
}

export function getCurrentMinutes(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes()
}

/**
 * The timeline's live clock (F007 R12). One clock can drive several boards so their
 * now-lines stay in step. It always follows real time: there is no pause or time slider (F010).
 * `enabled` false = no ticking (setup board).
 */
export function useBoardClock(enabled = true): BoardClock {
  const [currentTime, setCurrentTime] = useState(getCurrentMinutes)

  useEffect(() => {
    if (!enabled) {
      return
    }
    const refresh = () => setCurrentTime(getCurrentMinutes())
    // Coming back to the tab (or waking the computer) shows the real time at once.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }
    refresh()
    const intervalId = setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled])

  return { currentTime }
}
