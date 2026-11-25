import { useState } from 'react'
import { readDevicePreference, writeDevicePreference } from '../lib/devicePreference.ts'

/** A per-device choice saved in localStorage. Read once on mount; the setter updates state and saves. */
export function useDevicePreference<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => readDevicePreference(key, allowed, fallback))
  const update = (next: T) => {
    setValue(next)
    writeDevicePreference(key, next)
  }
  return [value, update]
}
