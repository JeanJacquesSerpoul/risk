import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Bot, GalleryVerticalEnd, Gauge, Globe, Hexagon, Layers, Menu, Moon, Settings, Shield, Sun, SunMoon, Volume2, VolumeX } from 'lucide-react'
import { CONTINENTS, type ContinentId, TERRITORY_IDS } from '../game/mapData'
import { continentOwner } from '../game/rules'
import { useGame } from '../game/store'
import { nextTheme } from '../game/theme'
import { openDialog } from '../game/ui'
import { useT } from '../i18n/useT'
import { useNet } from '../net/netStore'
import { InsigniaIcon } from './Insignia'

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const players = useGame((s) => s.players)
  const board = useGame((s) => s.board)
  const current = useGame((s) => s.current)
  const turn = useGame((s) => s.turn)
  const net = useNet()
  const { t } = useT()

  const stats = players.map((p) => {
    const ids = TERRITORY_IDS.filter((id) => board[id]?.owner === p.id)
    return { territories: ids.length, armies: ids.reduce((s, id) => s + board[id].armies, 0) }
  })

  return (
    <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-20 px-2 sm:px-3">
      <div className="glass pointer-events-auto relative flex items-center gap-2 rounded-2xl px-2 pb-2.5 pt-1.5 sm:gap-3 sm:px-3">
        <div className="hidden shrink-0 flex-col leading-none sm:flex">
          <span className="font-display text-lg font-black tracking-[0.25em] text-neon text-glow">RISK</span>
          <span className="font-display text-[9px] tracking-widest text-fg/50">
            {t('top.turn')} {turn}
          </span>
          {net.role !== 'off' && net.code && (
            <span
              className="mt-0.5 flex items-center gap-1 font-display text-[8px] tracking-widest"
              style={{ color: net.link === 'online' ? '#10b981' : '#f59e0b' }}
              title={t(`link.${net.link}`)}
            >
              <Globe size={9} /> {net.code}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-center leading-none sm:hidden">
          <span className="font-display text-[8px] text-fg/50">{t('top.turn')}</span>
          <span className="font-display text-sm font-bold text-neon">{turn}</span>
        </div>

        <div className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto sm:gap-1.5">
          {players.map((p, i) => {
            const active = i === current
            return (
              <motion.div
                key={p.id}
                layout
                className="relative flex shrink-0 items-center gap-1.5 rounded-xl px-1.5 py-1 sm:px-2"
                style={{ opacity: p.alive ? 1 : 0.35 }}
                title={p.name}
              >
                {active && (
                  <motion.div
                    layoutId="active-player"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: `${p.color}2e`, border: `1px solid ${p.color}`, boxShadow: `0 0 18px ${p.color}66` }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <InsigniaIcon seat={i} color={p.color} size={13} glow />
                <div className="relative flex flex-col leading-none">
                  <span className={`items-center gap-1 text-xs font-bold ${p.alive ? '' : 'line-through'} ${active ? 'flex' : 'hidden md:flex'}`}>
                    {p.name}
                    {p.ai && <Bot size={11} className="opacity-60" />}
                  </span>
                  <span className={`flex items-center gap-1.5 font-display text-[10px] text-fg/75 ${active ? 'mt-0.5' : 'md:mt-0.5'}`}>
                    <Stat icon={<Hexagon size={9} />} n={stats[i].territories} title={t('top.territories', { n: stats[i].territories })} />
                    <Stat icon={<Shield size={9} />} n={stats[i].armies} title={t('tip.armies', { n: stats[i].armies })} className={active ? '' : 'hidden sm:flex'} />
                    {p.cards.length > 0 && (
                      <Stat icon={<GalleryVerticalEnd size={9} />} n={p.cards.length} title={t('top.cards', { n: p.cards.length })} className={active ? '' : 'hidden sm:flex'} />
                    )}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div className="hidden items-center gap-1 sm:flex">
            <QuickSettings />
          </div>
          <button className="btn btn-ghost !px-2 !py-1.5" title={t('top.menu')} aria-label={t('top.menu')} onClick={onMenu}>
            <Menu size={15} />
          </button>
        </div>
        <DominationBar />
      </div>
      <ContinentLegend />
    </div>
  )
}

function Stat({ icon, n, title, className = '' }: { icon: ReactNode; n: number; title: string; className?: string }) {
  return (
    <span className={`flex items-center gap-0.5 ${className}`} title={title} aria-label={title}>
      <span className="opacity-60">{icon}</span>
      {n}
    </span>
  )
}

/** Share of the 42 territories held by each player: the balance of power at a glance. */
function DominationBar() {
  const board = useGame((s) => s.board)
  const players = useGame((s) => s.players)
  const { t } = useT()
  const total = TERRITORY_IDS.length
  return (
    <div className="absolute inset-x-3 bottom-1 flex h-[3px] gap-px overflow-hidden rounded-full bg-fg/10">
      {players.map((p) => {
        const n = TERRITORY_IDS.filter((id) => board[id]?.owner === p.id).length
        if (!n) return null
        return (
          <motion.div
            key={p.id}
            className="h-full"
            style={{ background: p.color }}
            initial={false}
            animate={{ width: `${(n / total) * 100}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            title={t('top.share', { name: p.name, p: Math.round((n / total) * 100) })}
          />
        )
      })}
    </div>
  )
}

/** Speed, theme, sound and settings: in the top bar on wide screens, in the pause menu everywhere. */
export function QuickSettings({ large = false, onSettings }: { large?: boolean; onSettings?: () => void }) {
  const settings = useGame((s) => s.settings)
  const update = useGame((s) => s.updateSettings)
  const { t } = useT()
  const cls = large ? 'btn btn-ghost flex-1 !py-2.5' : 'btn btn-ghost !px-2 !py-1.5'
  const size = large ? 17 : 15
  const themeTitle = t('top.theme', { mode: t(`theme.${settings.theme ?? 'system'}`) })
  return (
    <>
      <button className={cls} title={t('top.speed')} aria-label={t('top.speed')} onClick={() => update({ speed: settings.speed === 1 ? 2 : settings.speed === 2 ? 4 : 1 })}>
        <Gauge size={size} />
        <span className="text-[10px]">×{settings.speed}</span>
      </button>
      <button className={cls} title={themeTitle} aria-label={themeTitle} onClick={() => update({ theme: nextTheme(settings.theme ?? 'system') })}>
        {settings.theme === 'light' ? <Sun size={size} /> : settings.theme === 'dark' ? <Moon size={size} /> : <SunMoon size={size} />}
      </button>
      <button className={cls} title={t('top.sound')} aria-label={t('top.sound')} onClick={() => update({ sound: !settings.sound })}>
        {settings.sound ? <Volume2 size={size} /> : <VolumeX size={size} />}
      </button>
      <button
        className={cls}
        title={t('top.settings')}
        aria-label={t('top.settings')}
        onClick={() => {
          onSettings?.()
          openDialog('settings')
        }}
      >
        <Settings size={size} />
      </button>
    </>
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
  const { cont } = useT()
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
            {cont(c)} +{CONTINENTS[c].bonus}
          </span>
        )
      })}
    </>
  )
}
