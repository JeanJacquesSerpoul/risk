import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Bot, Crosshair, Flag, Lightbulb, Shuffle, Swords, Wifi, WifiOff, Zap } from 'lucide-react'
import { advise } from '../game/advisor'
import { conquestOdds, pct } from '../game/odds'
import { findSet } from '../game/rules'
import { useGame } from '../game/store'
import { useCanAct, useUi } from '../game/ui'
import { rich, useT } from '../i18n/useT'
import { useNet } from '../net/netStore'
import { CardIcon } from './CardsPanel'

const STEPS = ['reinforce', 'attack', 'fortify'] as const

function PhaseStepper() {
  const phase = useGame((s) => s.phase)
  const color = useGame((s) => s.players[s.current]?.color)
  const { t } = useT()
  if (phase === 'deploy')
    return (
      <div className="font-display text-[10px] font-bold tracking-[0.2em]" style={{ color }}>
        {t('phase.deploy')}
      </div>
    )
  const idx = STEPS.indexOf(phase)
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className="relative rounded-md px-2 py-0.5 font-display text-[9px] font-bold tracking-widest sm:text-[10px]"
            style={{ color: i === idx ? '#031021' : i < idx ? '#94a3b8' : '#475569' }}
          >
            {i === idx && <motion.div layoutId="phase-pill" className="absolute inset-0 rounded-md" style={{ background: color, boxShadow: `0 0 14px ${color}` }} />}
            <span className="relative">{t(`phase.${s}`).toUpperCase()}</span>
          </div>
          {i < STEPS.length - 1 && <div className="h-px w-3 bg-fg/20 sm:w-5" />}
        </div>
      ))}
    </div>
  )
}

/** Opens the military advisor for the current situation. */
function AdvisorButton() {
  const on = useGame((s) => s.settings.advisor !== false)
  const pending = useGame((s) => !!s.pendingMove || s.busy)
  const { t } = useT()
  if (!on) return null
  return (
    <button
      className="btn btn-ghost !px-2.5"
      disabled={pending}
      title={t('advisor.title')}
      onClick={() => {
        const s = useGame.getState()
        useUi.setState({ advice: advise(s), adviceOpen: true })
      }}
    >
      <Lightbulb size={14} className="text-amber-500 dark:text-yellow-300" />
      <span className="hidden sm:inline">{t('advisor.button')}</span>
    </button>
  )
}

function ReinforceControls() {
  const pool = useGame((s) => s.pool)
  const step = useGame((s) => s.placeStep)
  const setStep = useGame((s) => s.setPlaceStep)
  const autoPlace = useGame((s) => s.autoPlace)
  const phase = useGame((s) => s.phase)
  const me = useGame((s) => s.players[s.current])
  const breakdown = useGame((s) => s.breakdown)
  const setCardsOpen = useGame((s) => s.setCardsOpen)
  const board = useGame((s) => s.board)
  const { t, cont } = useT()
  const hasSet = !!findSet(me.cards, board, me.id)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <motion.div key={pool} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="font-display text-3xl font-black leading-none" style={{ color: me.color, textShadow: `0 0 18px ${me.color}` }}>
          {pool}
        </motion.div>
        <div className="leading-tight">
          <div className="text-sm font-bold">{t('reinforce.toPlace', { n: pool })}</div>
          {phase === 'reinforce' && breakdown && (
            <div className="text-[11px] text-fg/55">
              {t('reinforce.base', { n: breakdown.base })}
              {breakdown.continents.map((c) => ` · ${cont(c.id)} +${c.bonus}`)}
            </div>
          )}
          {phase === 'deploy' && <div className="text-[11px] text-fg/55">{t('reinforce.tap')}</div>}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {[1, 3, 5, 99].map((n) => (
          <button key={n} className="chip" data-on={step === n} onClick={() => setStep(n)}>
            {n === 99 ? t('reinforce.max') : `+${n}`}
          </button>
        ))}
        <button className="btn btn-ghost !px-2.5" onClick={autoPlace} title={t('reinforce.auto')}>
          <Shuffle size={14} />
        </button>
        {phase === 'reinforce' && (
          <button className={`btn ${hasSet ? 'btn-primary' : 'btn-ghost'} !px-2.5`} onClick={() => setCardsOpen(true)}>
            <CardIcon kind="infantry" size={14} />
            {me.cards.length}
            {hasSet && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full bg-yellow-300" />}
          </button>
        )}
        <AdvisorButton />
      </div>
    </div>
  )
}

function AttackControls() {
  const selected = useGame((s) => s.selected)
  const target = useGame((s) => s.target)
  const board = useGame((s) => s.board)
  const busy = useGame((s) => s.busy)
  const attack = useGame((s) => s.attack)
  const blitz = useGame((s) => s.blitz)
  const endAttack = useGame((s) => s.endAttack)
  const me = useGame((s) => s.players[s.current])
  const showOdds = useGame((s) => s.settings.advisor !== false)
  const { t, terr } = useT()
  const maxDice = selected ? Math.min(3, board[selected].armies - 1) : 0
  const odds = selected && target ? conquestOdds(board[selected].armies, board[target].armies) : null

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0 flex-1 text-sm">
        {!selected && (
          <span className="flex items-center gap-2 text-fg/80">
            <Crosshair size={16} style={{ color: me.color }} /> {t('attack.choose')}
          </span>
        )}
        {selected && !target && <span className="text-fg/80">{rich(t('attack.from'), { from: <b style={{ color: me.color }}>{terr(selected)}</b> })}</span>}
        {selected && target && (
          <div className="flex items-center gap-2 truncate font-bold">
            <span style={{ color: me.color }}>{terr(selected)}</span>
            <span className="text-fg/50">({board[selected].armies})</span>
            <Swords size={15} className="shrink-0 text-red-400" />
            <span>{terr(target)}</span>
            <span className="text-fg/50">({board[target].armies})</span>
            {showOdds && odds !== null && (
              <span
                className="shrink-0 rounded-md px-1.5 py-0.5 font-display text-[10px]"
                title={t('attack.oddsTitle')}
                style={{
                  color: odds >= 0.65 ? '#10b981' : odds >= 0.45 ? '#f59e0b' : '#f43f5e',
                  background: 'var(--ghost-bg)',
                  border: '1px solid currentColor',
                }}
              >
                {t('attack.odds', { p: pct(odds) })}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {selected && target && (
          <>
            {[1, 2, 3].map((n) => (
              <button key={n} disabled={busy || n > maxDice} className="btn btn-danger !px-3" onClick={() => attack(n)} title={t('attack.diceTitle', { n })}>
                {n}
                <span className="hidden sm:inline">{t('attack.dice', { n })}</span>
              </button>
            ))}
            <button disabled={busy || maxDice < 1} className="btn btn-danger !px-3" onClick={() => blitz()} title={t('attack.blitzTitle')}>
              <Zap size={14} /> {t('attack.blitz')}
            </button>
          </>
        )}
        <AdvisorButton />
        <button disabled={busy} className="btn btn-ghost" onClick={endAttack}>
          {t('attack.end')} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

function FortifyControls() {
  const selected = useGame((s) => s.selected)
  const endTurn = useGame((s) => s.endTurn)
  const me = useGame((s) => s.players[s.current])
  const { t, terr } = useT()
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="text-sm text-fg/80">
        {selected ? rich(t('fortify.from'), { from: <b style={{ color: me.color }}>{terr(selected)}</b> }) : t('fortify.hint')}
      </div>
      <div className="flex items-center gap-1.5">
        <AdvisorButton />
        <button className="btn btn-primary" onClick={endTurn}>
          <Flag size={14} /> {t('fortify.endTurn')}
        </button>
      </div>
    </div>
  )
}

/** Someone else is playing: a computer, or a human on another device. */
function Waiting() {
  const me = useGame((s) => s.players[s.current])
  const phase = useGame((s) => s.phase)
  const setAi = useGame((s) => s.setAi)
  const role = useNet((s) => s.role)
  const seat = useNet((s) => s.seats[me.id])
  const { t } = useT()
  const away = !me.ai && seat && !seat.connected
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1 text-sm text-fg/80">
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full"
              style={{ background: me.color }}
              animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
        {me.ai
          ? t(phase === 'attack' ? 'ai.attack' : phase === 'fortify' ? 'ai.fortify' : 'ai.reinforce', { name: me.name })
          : t(away ? 'remote.away' : 'remote.waiting', { name: me.name })}
      </div>
      {away && role === 'host' && (
        <button className="btn btn-ghost" onClick={() => setAi(me.id)}>
          <Bot size={14} /> {t('remote.toAi')}
        </button>
      )}
    </div>
  )
}

export function ActionPanel() {
  const phase = useGame((s) => s.phase)
  const me = useGame((s) => s.players[s.current])
  const winner = useGame((s) => s.winner)
  const canAct = useCanAct()
  const online = useNet((s) => s.role !== 'off')
  const seat = useNet((s) => (me ? s.seats[me.id] : undefined))
  if (!me || winner !== null) return null

  return (
    <div className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-2 sm:px-3">
      <motion.div
        layout
        className="glass pointer-events-auto w-full max-w-3xl overflow-hidden rounded-2xl"
        style={{ borderColor: `${me.color}66`, boxShadow: `0 0 30px ${me.color}33, 0 12px 40px rgba(0,0,0,0.5)` }}
      >
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${me.color}, transparent)` }} />
        <div className="flex items-center justify-between px-3 pt-2">
          <PhaseStepper />
          <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: me.color }}>
            {me.ai && <Bot size={13} />}
            {online && !me.ai && seat && (seat.connected ? <Wifi size={13} /> : <WifiOff size={13} className="text-rose-400" />)}
            {me.name}
          </div>
        </div>
        <div className="px-3 pb-2.5 pt-2">
          <AnimatePresence mode="wait">
            <motion.div key={canAct ? phase : 'wait'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              {!canAct ? <Waiting /> : phase === 'reinforce' || phase === 'deploy' ? <ReinforceControls /> : phase === 'attack' ? <AttackControls /> : <FortifyControls />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
