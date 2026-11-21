import { useEffect, useState } from 'react'

export type BoardClock = {
  /** Minutes since midnight shown by the now-line and the clock readout. */
  currentTime: number
  /** True while the clock follows real time; false after Pause or a slider drag. */
  isLive: boolean
  setIsLive: (next: boolean | ((current: boolean) => boolean)) => void
  setCurrentTime: (minutes: number) => void
}

export function getCurrentMinutes(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes()
}

/**
 * The timeline's live clock (F007 R12). One clock can drive several boards so their
 * now-lines, Pause and slider stay in step. `enabled` false = no ticking (setup board).
 */
export function useBoardClock(enabled = true): BoardClock {
  const [currentTime, setCurrentTime] = useState(getCurrentMinutes)
  const [isLive, setIsLive] = useState(true)

  useEffect(() => {
    if (!enabled || !isLive) {
      return
    }
    setCurrentTime(getCurrentMinutes())
    const intervalId = setInterval(() => setCurrentTime(getCurrentMinutes()), 60000)
    return () => clearInterval(intervalId)
  }, [enabled, isLive])

  return { currentTime, isLive, setIsLive, setCurrentTime }
}
