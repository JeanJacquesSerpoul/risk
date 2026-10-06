import { AnimatePresence, motion } from 'motion/react'
import { Bot, Minus, Play, Plus, RotateCcw, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { GEO } from '../game/hexMap'
import { CONTINENTS, MAP_H, MAP_W, TERRITORIES } from '../game/mapData'
import { type Difficulty, PLAYER_COLORS, PLAYER_NAMES } from '../game/rules'
import { type PlayerConfig, useGame } from '../game/store'

const DIFF_LABEL: Record<Difficulty, string> = { easy: 'Recrue', normal: 'Général', hard: 'Maréchal' }
const DIFFS: Difficulty[] = ['easy', 'normal', 'hard']

function BackgroundMap() {
  const particles = useMemo(
    () => Array.from({ length: 40 }, (_, i) => ({ id: i, x: Math.random() * 100, y: Math.random() * 100, d: 6 + Math.random() * 10, s: 1 + Math.random() * 2 })),
    [],
  )
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ scale: 1.25, opacity: 0 }}
        animate={{ scale: [1.25, 1.4, 1.25], opacity: 1, x: ['0%', '-4%', '0%'] }}
        transition={{ duration: 40, repeat: Infinity, ease: 'easeInOut', opacity: { duration: 2 } }}
      >
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id="mglow">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>
          <rect width={MAP_W} height={MAP_H} fill="#040a16" />
          <path d={GEO.oceanGrid} fill="none" stroke="#38bdf8" strokeOpacity={0.06} strokeWidth={0.6} />
          <path d={GEO.coast} fill="none" stroke="#22d3ee" strokeOpacity={0.5} strokeWidth={8} filter="url(#mglow)" />
          {TERRITORIES.map((t, i) => (
            <motion.path
              key={t.id}
              d={GEO.territories[t.id].tiles}
              fill={CONTINENTS[t.continent].color}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.15, 0.4, 0.15] }}
              transition={{ duration: 4, delay: i * 0.12, repeat: Infinity }}
            />
          ))}
          <path d={GEO.coast} fill="none" stroke="#67e8f9" strokeOpacity={0.6} strokeWidth={0.8} />
          <g className="lane" fill="none" stroke="#9bdcff" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="4 4">
            {GEO.seaLanes.map((l) => (
              <path key={l.a + l.b} d={l.d} />
            ))}
          </g>
        </svg>
      </motion.div>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-cyan-300"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, boxShadow: '0 0 8px #22d3ee' }}
          animate={{ y: [0, -80, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: p.d, repeat: Infinity, delay: p.d / 3 }}
        />
      ))}
      <div className="scanlines absolute inset-0" />
      <div className="sweep" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(4,10,22,0.35) 0%, rgba(4,10,22,0.92) 75%)' }} />
    </div>
  )
}

function Title() {
  return (
    <div className="relative text-center">
      <div className="flex justify-center">
        {'RISK'.split('').map((ch, i) => (
          <motion.span
            key={i}
            className="font-display text-7xl font-black sm:text-9xl"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #67e8f9 45%, #2563eb 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 0 22px rgba(34,211,238,0.7))',
            }}
            initial={{ y: -80, opacity: 0, rotateX: 90 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            transition={{ delay: 0.2 + i * 0.12, type: 'spring', stiffness: 160, damping: 12 }}
          >
            {ch}
          </motion.span>
        ))}
      </div>
      <motion.div
        className="mt-1 font-display text-[10px] font-bold tracking-[0.6em] text-cyan-200/80 sm:text-sm"
        initial={{ opacity: 0, letterSpacing: '1.5em' }}
        animate={{ opacity: 1, letterSpacing: '0.6em' }}
        transition={{ delay: 0.8, duration: 1 }}
      >
        CONQUÊTE DU MONDE
      </motion.div>
    </div>
  )
}

export function MenuScreen() {
  const newGame = useGame((s) => s.newGame)
  const resume = useGame((s) => s.resume)
  const hasSave = useGame((s) => s.players.length > 0 && s.winner === null)
  const [manual, setManual] = useState(false)
  const [players, setPlayers] = useState<PlayerConfig[]>([
    { name: 'Vous', color: PLAYER_COLORS[1], ai: false, difficulty: 'normal' },
    { name: PLAYER_NAMES[0], color: PLAYER_COLORS[0], ai: true, difficulty: 'normal' },
    { name: PLAYER_NAMES[2], color: PLAYER_COLORS[2], ai: true, difficulty: 'normal' },
  ])

  const patch = (i: number, p: Partial<PlayerConfig>) => setPlayers((ps) => ps.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const cycleColor = (i: number) => {
    const used = new Set(players.map((p) => p.color))
    const start = PLAYER_COLORS.indexOf(players[i].color)
    for (let k = 1; k <= PLAYER_COLORS.length; k++) {
      const c = PLAYER_COLORS[(start + k) % PLAYER_COLORS.length]
      if (!used.has(c)) return patch(i, { color: c })
    }
  }
  const add = () => {
    if (players.length >= 6) return
    const color = PLAYER_COLORS.find((c) => !players.some((p) => p.color === c))!
    const name = PLAYER_NAMES.find((n) => !players.some((p) => p.name === n)) ?? `Joueur ${players.length + 1}`
    setPlayers([...players, { name, color, ai: true, difficulty: 'normal' }])
  }

  return (
    <div className="relative h-full w-full overflow-y-auto" style={{ height: '100dvh' }}>
      <BackgroundMap />
      <div className="relative flex min-h-full flex-col items-center justify-center gap-6 px-3 py-8">
        <Title />
        <motion.div
          className="glass w-full max-w-xl rounded-3xl p-4 sm:p-6"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, type: 'spring', stiffness: 120, damping: 18 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xs font-bold tracking-[0.3em] text-white/70">GÉNÉRAUX ({players.length})</h2>
            <div className="flex gap-1">
              <button className="btn btn-ghost !p-2" disabled={players.length <= 2} onClick={() => setPlayers(players.slice(0, -1))}>
                <Minus size={14} />
              </button>
              <button className="btn btn-ghost !p-2" disabled={players.length >= 6} onClick={add}>
                <Plus size={14} />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {players.map((p, i) => (
                <motion.div
                  key={i}
                  layout
                  initial={{ opacity: 0, x: -30, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 30, height: 0 }}
                  className="flex items-center gap-2 rounded-2xl p-1.5 pr-2"
                  style={{ background: `linear-gradient(90deg, ${p.color}26, rgba(255,255,255,0.03))`, border: `1px solid ${p.color}55` }}
                >
                  <button
                    onClick={() => cycleColor(i)}
                    className="h-9 w-9 shrink-0 rounded-xl transition active:scale-90"
                    style={{ background: p.color, boxShadow: `0 0 16px ${p.color}` }}
                    title="Changer de couleur"
                  />
                  <input
                    value={p.name}
                    maxLength={14}
                    onChange={(e) => patch(i, { name: e.target.value })}
                    className="min-w-0 flex-1 rounded-lg bg-black/30 px-2 py-1.5 text-base font-bold outline-none focus:ring-2 focus:ring-cyan-400/50"
                  />
                  <button className={`chip flex items-center gap-1`} data-on={!p.ai} onClick={() => patch(i, { ai: !p.ai })}>
                    {p.ai ? <Bot size={13} /> : <User size={13} />}
                    <span className="hidden sm:inline">{p.ai ? 'IA' : 'HUMAIN'}</span>
                  </button>
                  {p.ai && (
                    <button className="chip w-[74px]" onClick={() => patch(i, { difficulty: DIFFS[(DIFFS.indexOf(p.difficulty) + 1) % 3] })}>
                      {DIFF_LABEL[p.difficulty]}
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-white/60">Déploiement initial</span>
            <div className="flex gap-1">
              <button className="chip" data-on={!manual} onClick={() => setManual(false)}>
                AUTOMATIQUE
              </button>
              <button className="chip" data-on={manual} onClick={() => setManual(true)}>
                MANUEL
              </button>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {hasSave && (
              <button className="btn btn-ghost sm:flex-1" onClick={resume}>
                <RotateCcw size={15} /> Reprendre la partie
              </button>
            )}
            <motion.button
              className="btn btn-primary !py-3 !text-sm sm:flex-[2]"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => newGame(players.map((p, i) => ({ ...p, name: p.name.trim() || `Joueur ${i + 1}` })), manual)}
            >
              <Play size={16} fill="currentColor" /> Lancer la conquête
            </motion.button>
          </div>
        </motion.div>
        <motion.p className="max-w-md text-center text-xs text-white/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
          Plusieurs humains peuvent jouer à tour de rôle sur le même appareil. Partie sauvegardée automatiquement.
        </motion.p>
      </div>
    </div>
  )
}
