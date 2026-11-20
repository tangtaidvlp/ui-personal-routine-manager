import type { ReactNode, SVGProps } from 'react'

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  /** Width and height in px. Defaults to 20. */
  size?: number | string
  /** Accessible label. When omitted the icon is decorative (aria-hidden). */
  title?: string
}

type BaseIconProps = IconProps & {
  children: ReactNode
  /** `stroke` icons draw lines with currentColor; `fill` icons are solid shapes. */
  variant?: 'stroke' | 'fill'
}

/**
 * Shared 24×24 SVG wrapper for the Milos icon set (exported from the Figma design).
 * Icons inherit the text color via `currentColor`, so style them with CSS `color`.
 */
function Icon({ size = 20, title, variant = 'stroke', strokeWidth = 2, children, ...rest }: BaseIconProps) {
  const paint =
    variant === 'stroke'
      ? { fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
      : { fill: 'currentColor' }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...paint}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

export default Icon
