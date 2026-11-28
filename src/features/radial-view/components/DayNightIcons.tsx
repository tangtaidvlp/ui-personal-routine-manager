import type { SVGProps } from 'react'

type IconProps = { x: number; y: number; size: number } & Omit<SVGProps<SVGGElement>, 'x' | 'y'>

// Paths from specs/T004 resources/icon-sun.svg and icon-moon.svg (24 x 24 grid), drawn inside the chart's SVG.
const place = ({ x, y, size }: Pick<IconProps, 'x' | 'y' | 'size'>) => `translate(${x - size / 2} ${y - size / 2}) scale(${size / 24})`

export function SunIcon({ x, y, size, ...rest }: IconProps) {
  return (
    <g transform={place({ x, y, size })} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" {...rest}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 1.5v3.5M12 19v3.5M1.5 12h3.5M19 12h3.5M4.6 4.6l2.5 2.5M16.9 16.9l2.5 2.5M4.6 19.4l2.5-2.5M16.9 7.1l2.5-2.5" />
    </g>
  )
}

export function MoonIcon({ x, y, size, ...rest }: IconProps) {
  return (
    <g transform={place({ x, y, size })} fill="none" stroke="currentColor" strokeWidth={2} strokeMiterlimit={10} aria-hidden="true" {...rest}>
      <path d="M12 3a6 6 0 0 0 9 9a9 9 0 1 1-9-9z" />
      <path d="M19 3v4M17 5h4" />
    </g>
  )
}
