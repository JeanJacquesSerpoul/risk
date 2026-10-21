import { useEffect, useLayoutEffect, useRef } from 'react'
import { ADJ, CONTINENTS, TERRITORIES } from '../game/mapData'
import { conquestOdds, pct } from '../game/odds'
import { continentOwner } from '../game/rules'
import { useGame } from '../game/store'
import { useCanAct, useUi } from '../game/ui'
import { useT } from '../i18n/useT'
import { InsigniaIcon } from './Insignia'

const CONTINENT_OF = Object.fromEntries(TERRITORIES.map((t) => [t.id, t.continent]))

/** Last mouse position, kept outside React so following the pointer never re-renders. */
const pointer = { x: 0, y: 0, dragging: false }

/** Desktop tooltip for the territory under the mouse: owner, armies, continent and, when attacking it, the odds. */
export function TerritoryTooltip() {
  const hover = useUi((s) => s.hover)
  const dialog = useUi((s) => s.dialog)
  const board = useGame((s) => s.board)
  const players = useGame((s) => s.players)
  const phase = useGame((s) => s.phase)
  const selected = useGame((s) => s.selected)
  const showOdds = useGame((s) => s.settings.advisor !== false)
  const canAct = useCanAct()
  const { t, terr, cont } = useT()
  const ref = useRef<HTMLDivElement>(null)

  const place = () => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const x = pointer.x + 16 + w > window.innerWidth - 8 ? pointer.x - 16 - w : pointer.x + 16
    const y = Math.min(pointer.y + 18, window.innerHeight - h - 8)
    el.style.transform = `translate(${x}px, ${y}px)`
    el.style.opacity = pointer.dragging ? '0' : '1'
  }

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.dragging = e.buttons !== 0
      place()
    }
    // `pointerover` also fires when the pointer enters a territory, before any move.
    const events = ['pointermove', 'pointerover', 'pointerdown'] as const
    for (const ev of events) window.addEventListener(ev, onMove)
    return () => {
      for (const ev of events) window.removeEventListener(ev, onMove)
    }
  }, [])

  useLayoutEffect(place)

  const state = hover ? board[hover] : undefined
  const owner = state ? players[state.owner] : undefined
  if (!hover || !state || !owner || dialog) return null

  const c = CONTINENT_OF[hover]
  const holder = continentOwner(board, c)
  const attackable =
    canAct && showOdds && phase === 'attack' && selected && selected !== hover && ADJ[selected].includes(hover) && board[selected].owner !== state.owner && board[selected].armies > 1
  const odds = attackable ? conquestOdds(board[selected].armies, state.armies) : null

  return (
    <div ref={ref} className="glass pointer-events-none fixed left-0 top-0 z-40 hidden min-w-40 rounded-xl px-3 py-2 text-sm [@media(pointer:fine)]:block" style={{ opacity: 0 }}>
      <div className="font-display text-[11px] font-bold tracking-widest">{terr(hover).toUpperCase()}</div>
      <div className="mt-1 flex items-center gap-1.5 font-bold">
        <InsigniaIcon seat={owner.id} color={owner.color} size={11} />
        {owner.name}
        <span className="font-semibold text-fg/70">· {t('tip.armies', { n: state.armies })}</span>
      </div>
      <div className="text-xs text-fg/60">
        {cont(c)} +{CONTINENTS[c].bonus}
        {holder !== null && (
          <>
            {' · '}
            <span className="inline-flex items-center gap-1 font-semibold text-fg/80">
              <InsigniaIcon seat={holder} color={players[holder].color} size={9} />
              {t('tip.held', { name: players[holder].name })}
            </span>
          </>
        )}
      </div>
      {odds !== null && (
        <div className="mt-1 font-display text-[11px] font-bold" style={{ color: odds >= 0.65 ? '#10b981' : odds >= 0.45 ? '#f59e0b' : '#f43f5e' }}>
          {t('tip.odds', { p: pct(odds) })}
        </div>
      )}
    </div>
  )
}
