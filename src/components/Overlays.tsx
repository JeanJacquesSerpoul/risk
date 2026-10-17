import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Crown, Home, RotateCcw, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useCanAct } from '../game/ui'
import { useGame } from '../game/store'
import { useT } from '../i18n/useT'
import { useNet } from '../net/netStore'
import { leaveRoom } from '../net/session'

export function MoveDialog() {
  const pm = useGame((s) => s.pendingMove)
  const me = useGame((s) => s.players[s.current])
  const board = useGame((s) => s.board)
  const confirm = useGame((s) => s.confirmMove)
  const cancel = useGame((s) => s.cancelMove)
  const speed = useGame((s) => s.settings.speed)
  const canAct = useCanAct()
  const { t, terr } = useT()
  const [n, setN] = useState(0)
  // Compared by value: online guests receive a new object with every update.
  const pmKey = pm ? `${pm.kind}:${pm.from}:${pm.to}:${pm.max}` : null
  const [ready, setReady] = useState<string | null>(null)

  useEffect(() => {
    const p = useGame.getState().pendingMove
    if (p) setN(p.kind === 'conquest' ? p.max : Math.ceil(p.max / 2))
    // Let the conquest explosion play before covering the map.
    const t = setTimeout(() => setReady(pmKey), p?.kind === 'conquest' ? 1100 / speed : 0)
    return () => clearTimeout(t)
  }, [pmKey, speed])

  const show = pm && ready === pmKey && me && canAct
  const min = pm?.kind === 'fortify' ? 1 : 0
  const pct = pm ? ((n - min) / Math.max(1, pm.max - min)) * 100 : 0

  return (
    <AnimatePresence>
      {show && pm && (
        <motion.div className="fixed inset-0 z-40 flex items-end justify-center bg-gradient-to-t from-[var(--scrim)] via-transparent to-transparent p-2 pb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="glass w-full max-w-md rounded-3xl p-5"
            style={{ borderColor: `${me.color}88`, boxShadow: `0 0 40px ${me.color}44` }}
            initial={{ y: 60, scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <div className="mb-3 font-display text-sm font-black tracking-[0.2em]" style={{ color: me.color }}>
              {t(pm.kind === 'conquest' ? 'move.conquest' : 'move.fortify')}
            </div>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 text-center">
                <div className="truncate text-sm text-fg/70">{terr(pm.from)}</div>
                <div className="font-display text-3xl font-black">{board[pm.from].armies - n}</div>
              </div>
              <motion.div animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
                <ArrowRight style={{ color: me.color }} />
              </motion.div>
              <div className="min-w-0 flex-1 text-center">
                <div className="truncate text-sm text-fg/70">{terr(pm.to)}</div>
                <div className="font-display text-3xl font-black" style={{ color: me.color, textShadow: `0 0 14px ${me.color}` }}>
                  {board[pm.to].armies + n}
                </div>
              </div>
            </div>
            <input
              type="range"
              className="slider w-full"
              min={min}
              max={pm.max}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              style={{ ['--c' as string]: me.color, ['--p' as string]: `${pct}%` }}
            />
            <div className="mt-3 flex justify-between gap-2">
              <button className="chip" onClick={() => setN(min)}>
                {t('move.min')}
              </button>
              <button className="chip" onClick={() => setN(Math.max(min, Math.round(pm.max / 2)))}>
                ½
              </button>
              <button className="chip" onClick={() => setN(pm.max)}>
                {t('move.max')}
              </button>
            </div>
            <div className="mt-5 flex gap-2">
              {pm.kind === 'fortify' && (
                <button className="btn btn-ghost flex-1" onClick={cancel}>
                  {t('common.cancel')}
                </button>
              )}
              <button className="btn btn-primary flex-1" onClick={() => confirm(n)}>
                {t(pm.kind === 'conquest' ? 'move.advance' : 'move.move', { n })}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function TurnBanner() {
  const banner = useGame((s) => s.banner)
  const speed = useGame((s) => s.settings.speed)
  const { m } = useT()
  const [visible, setVisible] = useState<number | null>(null)
  const key = banner?.key
  useEffect(() => {
    if (key === undefined) return
    setVisible(key)
    const t = setTimeout(() => setVisible(null), 1500 / Math.sqrt(speed))
    return () => clearTimeout(t)
  }, [key, speed])

  return (
    <AnimatePresence>
      {banner && visible === banner.key && (
        <motion.div key={banner.key} className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center overflow-hidden">
          <motion.div
            className="absolute h-28 w-[160%] sm:h-36"
            style={{ background: `linear-gradient(90deg, transparent, ${banner.color}cc 20%, ${banner.color}ee 50%, ${banner.color}cc 80%, transparent)`, rotate: -4 }}
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: '0%', opacity: 0.9 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.7, 0, 0.3, 1] }}
          />
          <motion.div
            className="absolute h-28 w-[160%] sm:h-36"
            style={{ background: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 10px)', rotate: -4 }}
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.5, ease: [0.7, 0, 0.3, 1] }}
          />
          <motion.div
            className="relative text-center"
            initial={{ scale: 2, opacity: 0, letterSpacing: '0.6em' }}
            animate={{ scale: 1, opacity: 1, letterSpacing: '0.12em' }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            <div className="font-display text-3xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] sm:text-6xl">{m(banner.title).toUpperCase()}</div>
            {banner.subtitle && <div className="mt-1 font-display text-xs font-bold tracking-[0.3em] text-white/90 sm:text-sm">{m(banner.subtitle).toUpperCase()}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function LogTicker() {
  const log = useGame((s) => s.log)
  const { m } = useT()
  const items = log.slice(-4)
  return (
    <div className="pointer-events-none absolute left-2 top-[4.2rem] z-10 flex max-w-[70vw] flex-col gap-1 sm:left-3 sm:top-[4.6rem] sm:max-w-sm">
      <AnimatePresence initial={false}>
        {items.map((e, i) => (
          <motion.div
            key={e.id}
            layout
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 0.35 + (i / items.length) * 0.65, x: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className={`truncate rounded-lg bg-surface px-2 py-0.5 text-[11px] font-semibold backdrop-blur-sm sm:text-xs ${i < items.length - 2 ? 'hidden sm:block' : ''}`}
            style={{ borderLeft: `3px solid ${e.color ?? '#22d3ee'}` }}
          >
            {m(e.msg)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function VictoryScreen() {
  const winner = useGame((s) => s.winner)
  const players = useGame((s) => s.players)
  const stats = useGame((s) => s.stats)
  const turn = useGame((s) => s.turn)
  const toMenu = useGame((s) => s.toMenu)
  const newGame = useGame((s) => s.newGame)
  const room = useGame((s) => s.room)
  const role = useNet((s) => s.role)
  const { t } = useT()

  useEffect(() => {
    if (winner === null) return
    const color = players[winner].color
    const end = Date.now() + 4000
    let raf = 0
    const frame = () => {
      void confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: [color, '#fff', '#ffd166'] })
      void confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: [color, '#fff', '#ffd166'] })
      if (Date.now() < end) raf = requestAnimationFrame(frame)
    }
    const t = setTimeout(frame, 700)
    return () => {
      clearTimeout(t)
      cancelAnimationFrame(raf)
    }
  }, [winner, players])

  if (winner === null) return null
  const w = players[winner]
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)] p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
      <motion.div
        className="glass relative w-full max-w-lg overflow-hidden rounded-3xl p-6 text-center"
        style={{ borderColor: w.color, boxShadow: `0 0 80px ${w.color}66` }}
        initial={{ scale: 0.6, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 200, damping: 18 }}
      >
        <motion.div
          className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: w.color, opacity: 0.35 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 3 }}
        />
        <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 1.1, type: 'spring' }} className="relative mx-auto mb-2 w-fit">
          <Trophy size={64} style={{ color: '#ffd166', filter: 'drop-shadow(0 0 20px #ffd166)' }} />
        </motion.div>
        <div className="relative font-display text-4xl font-black tracking-widest sm:text-5xl" style={{ color: w.color, textShadow: `0 0 30px ${w.color}` }}>
          {t('victory.title')}
        </div>
        <div className="relative mt-2 text-lg font-bold">
          <Crown size={16} className="mr-1 inline text-amber-500 dark:text-yellow-300" />
          {t('victory.text', { name: w.name, n: turn })}
        </div>
        <div className="relative mt-5 overflow-hidden rounded-xl border border-fg/10">
          <table className="w-full text-sm">
            <thead className="bg-fg/5 font-display text-[10px] tracking-widest text-fg/50">
              <tr>
                <th className="p-2 text-left">{t('victory.general')}</th>
                <th className="p-2">{t('victory.conquests')}</th>
                <th className="p-2">{t('victory.kills')}</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id} className="border-t border-fg/5">
                  <td className="p-2 text-left font-bold" style={{ color: p.color }}>
                    {p.name}
                  </td>
                  <td className="p-2 font-display">{stats[i]?.conquered ?? 0}</td>
                  <td className="p-2 font-display">{stats[i]?.kills ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="relative mt-6 flex gap-2">
          <button
            className="btn btn-ghost flex-1"
            onClick={() => {
              if (role !== 'off') leaveRoom()
              toMenu()
            }}
          >
            <Home size={14} /> {t('victory.menu')}
          </button>
          {role !== 'guest' && (
            <button
              className="btn btn-primary flex-1"
              onClick={() => newGame(players.map((p) => ({ name: p.name, color: p.color, ai: p.ai, difficulty: p.difficulty })), false, room)}
            >
              <RotateCcw size={14} /> {t('victory.rematch')}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export function PauseMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toMenu = useGame((s) => s.toMenu)
  const role = useNet((s) => s.role)
  const { t } = useT()
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)] p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="glass w-full max-w-sm rounded-3xl p-6" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-center font-display text-xl font-black tracking-[0.3em] text-neon text-glow">{t('pause.title')}</h2>
            <p className="mb-5 text-center text-sm text-fg/50">{t(role === 'host' ? 'pause.online' : role === 'guest' ? 'pause.guest' : 'pause.saved')}</p>
            <div className="flex flex-col gap-2">
              <button className="btn btn-primary" onClick={onClose}>
                {t('pause.resume')}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  onClose()
                  if (role !== 'off') leaveRoom()
                  toMenu()
                }}
              >
                <Home size={14} /> {role === 'guest' ? t('lobby.leave') : t('pause.menu')}
              </button>
            </div>
            <div className="mt-5 space-y-1 text-xs text-fg/50">
              <p>{t('pause.tip1')}</p>
              <p>{t('pause.tip2')}</p>
              <p>{t('pause.tip3')}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
