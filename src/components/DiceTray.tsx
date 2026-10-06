import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { TERRITORY_BY_ID } from '../game/mapData'
import { useGame } from '../game/store'

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

// Cube rotation that brings face `v` to the front.
const FRONT: Record<number, [number, number]> = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 5: [-90, 0], 2: [90, 0] }

const FACES: [number, string][] = [
  [1, 'rotateY(0deg)'],
  [6, 'rotateY(180deg)'],
  [3, 'rotateY(90deg)'],
  [4, 'rotateY(-90deg)'],
  [5, 'rotateX(90deg)'],
  [2, 'rotateX(-90deg)'],
]

function Face({ value, bg, pip, size }: { value: number; bg: string; pip: string; size: number }) {
  return (
    <div
      className="absolute inset-0 grid grid-cols-3 grid-rows-3 rounded-[22%]"
      style={{
        padding: size * 0.14,
        background: bg,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35), inset 0 -6px 12px rgba(0,0,0,0.3)',
        backfaceVisibility: 'hidden',
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="flex items-center justify-center">
          {PIPS[value].includes(i) && (
            <div className="rounded-full" style={{ width: size * 0.17, height: size * 0.17, background: pip, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)' }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Die({ value, attacker, color, duration, delay, result }: { value: number; attacker: boolean; color: string; duration: number; delay: number; result: 'win' | 'lose' | null }) {
  const size = typeof window !== 'undefined' && window.innerWidth < 640 ? 34 : 44
  const [fx, fy] = FRONT[value]
  const spinX = 360 * (2 + Math.floor(Math.random() * 2))
  const spinY = 360 * (2 + Math.floor(Math.random() * 2))
  const bg = attacker
    ? `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 55%, #000))`
    : 'linear-gradient(145deg, #ffffff, #c9d6e8)'
  const pip = attacker ? '#fff' : color
  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size, perspective: 500 }}
      animate={result === 'lose' ? { opacity: 0.3, scale: 0.85, filter: 'grayscale(1)' } : result === 'win' ? { scale: [1, 1.25, 1.1] } : {}}
      transition={{ duration: 0.3 }}
    >
      {result === 'win' && (
        <div className="absolute -inset-2 rounded-2xl blur-md" style={{ background: attacker ? color : '#fff', opacity: 0.55 }} />
      )}
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        initial={{ rotateX: fx + spinX + 40, rotateY: fy - spinY - 60, y: -40, scale: 0.6 }}
        animate={{ rotateX: fx, rotateY: fy, y: [-40, 6, 0], scale: 1 }}
        transition={{ duration: (duration * 0.85) / 1000, delay: delay / 1000, ease: [0.15, 0.85, 0.3, 1] }}
      >
        {FACES.map(([v, rot]) => (
          <div key={v} className="absolute inset-0" style={{ transform: `${rot} translateZ(${size / 2}px)`, transformStyle: 'preserve-3d' }}>
            <Face value={v} bg={bg} pip={pip} size={size} />
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}

export function DiceTray() {
  const battle = useGame((s) => s.battle)
  const players = useGame((s) => s.players)
  const speed = useGame((s) => s.settings.speed)
  const [hidden, setHidden] = useState<number | null>(null)

  useEffect(() => {
    if (!battle || battle.rolling) return
    const t = setTimeout(() => setHidden(battle.key), (battle.conquered ? 2200 : 1700) / speed)
    return () => clearTimeout(t)
  }, [battle, speed])

  const show = battle && hidden !== battle.key
  const att = battle ? players[battle.attacker] : null
  const def = battle ? players[battle.defender] : null
  const pairs = battle ? Math.min(battle.att.length, battle.def.length) : 0
  const resultFor = (side: 'att' | 'def', i: number): 'win' | 'lose' | null => {
    if (!battle || battle.rolling || i >= pairs) return null
    const attWins = battle.att[i] > battle.def[i]
    return (side === 'att') === attWins ? 'win' : 'lose'
  }

  return (
    <AnimatePresence>
      {show && battle && att && def && (
        <motion.div
          key="tray"
          initial={{ y: -30, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.95 }}
          className="glass pointer-events-none absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-2xl px-3 py-2.5 sm:top-20 sm:px-5 sm:py-3"
        >
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex flex-col items-center gap-1.5">
              <div className="max-w-[110px] truncate text-[11px] font-bold uppercase tracking-wide sm:max-w-none sm:text-xs" style={{ color: att.color }}>
                ⚔ {TERRITORY_BY_ID[battle.from].name}
              </div>
              <div className="flex gap-1.5 sm:gap-2.5">
                {battle.att.map((v, i) => (
                  <Die key={`${battle.key}a${i}`} value={v} attacker color={att.color} duration={battle.duration} delay={i * 40} result={resultFor('att', i)} />
                ))}
              </div>
            </div>
            <div className="relative flex flex-col items-center">
              <motion.div
                key={battle.key}
                initial={{ scale: 0.5, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                className="font-display text-sm font-black text-white/70 sm:text-lg"
              >
                VS
              </motion.div>
              {!battle.rolling && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 flex gap-2 font-display text-[10px] font-bold sm:text-xs">
                  <span style={{ color: battle.attLoss ? '#ff5d73' : '#64748b' }}>-{battle.attLoss}</span>
                  <span className="text-white/30">|</span>
                  <span style={{ color: battle.defLoss ? '#ff5d73' : '#64748b' }}>-{battle.defLoss}</span>
                </motion.div>
              )}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="max-w-[110px] truncate text-[11px] font-bold uppercase tracking-wide sm:max-w-none sm:text-xs" style={{ color: def.color }}>
                🛡 {TERRITORY_BY_ID[battle.to].name}
              </div>
              <div className="flex gap-1.5 sm:gap-2.5">
                {battle.def.map((v, i) => (
                  <Die key={`${battle.key}d${i}`} value={v} attacker={false} color={def.color} duration={battle.duration} delay={60 + i * 40} result={resultFor('def', i)} />
                ))}
              </div>
            </div>
          </div>
          <AnimatePresence>
            {battle.conquered && (
              <motion.div
                initial={{ scale: 2.6, opacity: 0, rotate: -12 }}
                animate={{ scale: 1, opacity: 1, rotate: -8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div
                  className="rounded-lg border-4 px-4 py-1 font-display text-xl font-black tracking-widest sm:text-3xl"
                  style={{ color: att.color, borderColor: att.color, background: 'rgba(2,6,23,0.85)', textShadow: `0 0 18px ${att.color}`, boxShadow: `0 0 30px ${att.color}` }}
                >
                  CONQUIS !
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
