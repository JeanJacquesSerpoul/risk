import { motion } from 'motion/react'
import { Bot, Gauge, Layers, Menu, Moon, Sun, SunMoon, Volume2, VolumeX } from 'lucide-react'
import { CONTINENTS, type ContinentId, TERRITORY_IDS } from '../game/mapData'
import { continentOwner } from '../game/rules'
import { useGame } from '../game/store'
import { nextTheme, THEME_LABEL } from '../game/theme'

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const players = useGame((s) => s.players)
  const board = useGame((s) => s.board)
  const current = useGame((s) => s.current)
  const turn = useGame((s) => s.turn)
  const settings = useGame((s) => s.settings)
  const update = useGame((s) => s.updateSettings)

  const stats = players.map((p) => {
    const ids = TERRITORY_IDS.filter((id) => board[id]?.owner === p.id)
    return { territories: ids.length, armies: ids.reduce((s, id) => s + board[id].armies, 0) }
  })

  return (
    <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-20 px-2 sm:px-3">
      <div className="glass pointer-events-auto flex items-center gap-2 rounded-2xl px-2 py-1.5 sm:gap-3 sm:px-3">
        <div className="hidden shrink-0 flex-col leading-none sm:flex">
          <span className="font-display text-lg font-black tracking-[0.25em] text-neon text-glow">RISK</span>
          <span className="font-display text-[9px] tracking-widest text-fg/50">TOUR {turn}</span>
        </div>
        <div className="flex shrink-0 flex-col items-center leading-none sm:hidden">
          <span className="font-display text-[8px] text-fg/50">TOUR</span>
          <span className="font-display text-sm font-bold text-neon">{turn}</span>
        </div>

        <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
          {players.map((p, i) => {
            const active = i === current
            return (
              <motion.div
                key={p.id}
                layout
                className="relative flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-1"
                style={{ opacity: p.alive ? 1 : 0.35 }}
              >
                {active && (
                  <motion.div
                    layoutId="active-player"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: `${p.color}2e`, border: `1px solid ${p.color}`, boxShadow: `0 0 18px ${p.color}66` }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <div className="relative h-3 w-3 rounded-full" style={{ background: p.color, boxShadow: `0 0 10px ${p.color}` }} />
                <div className="relative flex flex-col leading-none">
                  <span className={`flex items-center gap-1 text-xs font-bold ${p.alive ? '' : 'line-through'} ${active ? '' : 'hidden md:flex'}`}>
                    {p.name}
                    {p.ai && <Bot size={11} className="opacity-60" />}
                  </span>
                  <span className="font-display text-[9px] text-fg/60">
                    {stats[i].territories}
                    <span className="opacity-50">T</span> · {stats[i].armies}
                    <span className="opacity-50">A</span>
                    {p.cards.length > 0 && (
                      <>
                        {' '}
                        · {p.cards.length}
                        <span className="opacity-50">C</span>
                      </>
                    )}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            className="btn btn-ghost !px-2 !py-1.5"
            title="Vitesse"
            onClick={() => update({ speed: settings.speed === 1 ? 2 : settings.speed === 2 ? 4 : 1 })}
          >
            <Gauge size={15} />
            <span className="text-[10px]">×{settings.speed}</span>
          </button>
          <button
            className="btn btn-ghost !px-2 !py-1.5"
            title={`Thème : ${THEME_LABEL[settings.theme ?? 'system']}`}
            onClick={() => update({ theme: nextTheme(settings.theme ?? 'system') })}
          >
            {settings.theme === 'light' ? <Sun size={15} /> : settings.theme === 'dark' ? <Moon size={15} /> : <SunMoon size={15} />}
          </button>
          <button className="btn btn-ghost !px-2 !py-1.5" title="Son" onClick={() => update({ sound: !settings.sound })}>
            {settings.sound ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <button className="btn btn-ghost !px-2 !py-1.5" title="Menu" onClick={onMenu}>
            <Menu size={15} />
          </button>
        </div>
      </div>
      <ContinentLegend />
    </div>
  )
}

function ContinentLegend() {
  return (
    <div className="pointer-events-none mt-1.5 hidden justify-end gap-1 lg:flex">
      <Layers size={12} className="mt-0.5 text-fg/40" />
      <ContinentChips />
    </div>
  )
}

function ContinentChips() {
  const board = useGame((s) => s.board)
  const players = useGame((s) => s.players)
  return (
    <>
      {(Object.keys(CONTINENTS) as ContinentId[]).map((c) => {
        const owner = board.alaska ? continentOwner(board, c) : null
        const col = owner !== null ? players[owner].color : undefined
        return (
          <span
            key={c}
            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
            style={{
              background: col ? `${col}33` : 'var(--surface)',
              border: `1px solid ${col ?? 'var(--ghost-border)'}`,
              color: col ?? 'color-mix(in srgb, var(--fg) 60%, transparent)',
            }}
          >
            {CONTINENTS[c].name} +{CONTINENTS[c].bonus}
          </span>
        )
      })}
    </>
  )
}
