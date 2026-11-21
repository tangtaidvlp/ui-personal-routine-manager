import { useEffect, useState } from 'react'

function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false
}

/** True while the CSS media query matches; updates when the viewport changes. False without `matchMedia`. */
export function useMediaQuery(query: string): boolean {
  const [isMatch, setIsMatch] = useState(() => matches(query))

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const list = window.matchMedia(query)
    const onChange = () => setIsMatch(list.matches)
    onChange()
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return isMatch
}
