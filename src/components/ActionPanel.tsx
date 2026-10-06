import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Bot, Crosshair, Flag, Shuffle, Swords, Zap } from 'lucide-react'
import { CONTINENTS, TERRITORY_BY_ID } from '../game/mapData'
import { findSet } from '../game/rules'
import { useGame } from '../game/store'
import { CardIcon } from './CardsPanel'

const STEPS = [
  { id: 'reinforce', label: 'Renforts' },
  { id: 'attack', label: 'Attaque' },
  { id: 'fortify', label: 'Manœuvre' },
] as const

function PhaseStepper() {
  const phase = useGame((s) => s.phase)
  const color = useGame((s) => s.players[s.current]?.color)
  if (phase === 'deploy')
    return (
      <div className="font-display text-[10px] font-bold tracking-[0.2em]" style={{ color }}>
        DÉPLOIEMENT INITIAL
      </div>
    )
  const idx = STEPS.findIndex((s) => s.id === phase)
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1">
          <div
            className="relative rounded-md px-2 py-0.5 font-display text-[9px] font-bold tracking-widest sm:text-[10px]"
            style={{ color: i === idx ? '#031021' : i < idx ? '#94a3b8' : '#475569' }}
          >
            {i === idx && <motion.div layoutId="phase-pill" className="absolute inset-0 rounded-md" style={{ background: color, boxShadow: `0 0 14px ${color}` }} />}
            <span className="relative">{s.label.toUpperCase()}</span>
          </div>
          {i < STEPS.length - 1 && <div className="h-px w-3 bg-fg/20 sm:w-5" />}
        </div>
      ))}
    </div>
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
  const hasSet = !!findSet(me.cards, board, me.id)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <motion.div key={pool} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="font-display text-3xl font-black leading-none" style={{ color: me.color, textShadow: `0 0 18px ${me.color}` }}>
          {pool}
        </motion.div>
        <div className="leading-tight">
          <div className="text-sm font-bold">armées à placer</div>
          {phase === 'reinforce' && breakdown && (
            <div className="text-[11px] text-fg/55">
              {breakdown.base} de base
              {breakdown.continents.map((c) => ` · ${CONTINENTS[c.id].name} +${c.bonus}`)}
            </div>
          )}
          {phase === 'deploy' && <div className="text-[11px] text-fg/55">Touchez vos territoires</div>}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {[1, 3, 5, 99].map((n) => (
          <button key={n} className="chip" data-on={step === n} onClick={() => setStep(n)}>
            {n === 99 ? 'MAX' : `+${n}`}
          </button>
        ))}
        <button className="btn btn-ghost !px-2.5" onClick={autoPlace} title="Répartition automatique">
          <Shuffle size={14} />
        </button>
        {phase === 'reinforce' && (
          <button className={`btn ${hasSet ? 'btn-primary' : 'btn-ghost'} !px-2.5`} onClick={() => setCardsOpen(true)}>
            <CardIcon kind="infantry" size={14} />
            {me.cards.length}
            {hasSet && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full bg-yellow-300" />}
          </button>
        )}
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
  const maxDice = selected ? Math.min(3, board[selected].armies - 1) : 0

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0 flex-1 text-sm">
        {!selected && (
          <span className="flex items-center gap-2 text-fg/80">
            <Crosshair size={16} style={{ color: me.color }} /> Choisissez un territoire d’attaque ou une cible
          </span>
        )}
        {selected && !target && (
          <span className="text-fg/80">
            Depuis <b style={{ color: me.color }}>{TERRITORY_BY_ID[selected].name}</b> — choisissez une cible
          </span>
        )}
        {selected && target && (
          <div className="flex items-center gap-2 truncate font-bold">
            <span style={{ color: me.color }}>{TERRITORY_BY_ID[selected].name}</span>
            <span className="text-fg/50">({board[selected].armies})</span>
            <Swords size={15} className="shrink-0 text-red-400" />
            <span>{TERRITORY_BY_ID[target].name}</span>
            <span className="text-fg/50">({board[target].armies})</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {selected && target && (
          <>
            {[1, 2, 3].map((n) => (
              <button key={n} disabled={busy || n > maxDice} className="btn btn-danger !px-3" onClick={() => attack(n)} title={`Attaquer avec ${n} dé(s)`}>
                {n}
                <span className="hidden sm:inline">{n > 1 ? ' dés' : ' dé'}</span>
              </button>
            ))}
            <button disabled={busy || maxDice < 1} className="btn btn-danger !px-3" onClick={() => blitz()} title="Attaque éclair jusqu'à la victoire">
              <Zap size={14} /> Blitz
            </button>
          </>
        )}
        <button disabled={busy} className="btn btn-ghost" onClick={endAttack}>
          Fin <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

function FortifyControls() {
  const selected = useGame((s) => s.selected)
  const endTurn = useGame((s) => s.endTurn)
  const me = useGame((s) => s.players[s.current])
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="text-sm text-fg/80">
        {selected ? (
          <>
            Déplacer depuis <b style={{ color: me.color }}>{TERRITORY_BY_ID[selected].name}</b> vers un territoire relié
          </>
        ) : (
          'Manœuvre : déplacez des troupes entre deux territoires reliés (optionnel)'
        )}
      </div>
      <button className="btn btn-primary" onClick={endTurn}>
        <Flag size={14} /> Terminer le tour
      </button>
    </div>
  )
}

export function ActionPanel() {
  const phase = useGame((s) => s.phase)
  const me = useGame((s) => s.players[s.current])
  const winner = useGame((s) => s.winner)
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
            {me.name}
          </div>
        </div>
        <div className="px-3 pb-2.5 pt-2">
          <AnimatePresence mode="wait">
            <motion.div key={me.ai ? 'ai' : phase} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              {me.ai ? (
                <div className="flex items-center gap-3 py-1 text-sm text-fg/80">
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
                  {me.name} {phase === 'attack' ? 'mène l’offensive…' : phase === 'fortify' ? 'regroupe ses troupes…' : 'déploie ses armées…'}
                </div>
              ) : phase === 'reinforce' || phase === 'deploy' ? (
                <ReinforceControls />
              ) : phase === 'attack' ? (
                <AttackControls />
              ) : (
                <FortifyControls />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
