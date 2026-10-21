import { insigniaOf, insigniaPath } from '../game/insignia'

/** A player's shape, filled with their colour (or `fill` when given). */
export function InsigniaIcon({ seat, color, size = 12, fill, glow = false }: { seat: number; color: string; size?: number; fill?: string; glow?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-12 -12 24 24"
      className="relative shrink-0"
      style={{ overflow: 'visible', filter: glow ? `drop-shadow(0 0 4px ${color})` : undefined }}
      aria-hidden
    >
      <path d={insigniaPath(insigniaOf(seat), 8)} fill={fill ?? color} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  )
}
