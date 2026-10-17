import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react'
import { Pause, Play, Volume2, VolumeX, X } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GEO } from '../game/hexMap'
import { CONTINENTS, MAP_H, MAP_W, TERRITORIES } from '../game/mapData'
import type { Card } from '../game/rules'
import { useGame } from '../game/store'
import { openDialog } from '../game/ui'
import type { Lang, MessageKey } from '../i18n'
import { useT } from '../i18n/useT'
import { GameCard } from './CardsPanel'
import { Die } from './DiceTray'
import { arrowPath } from './MapBoard'

/**
 * Motion-design presentation of the game, played like a video: animated chapters,
 * captions, voice-over (the browser's speech synthesis) and playback controls.
 */

const SEEN_KEY = 'risk-intro-seen'

/** Has the presentation already been seen on this device? */
export function introSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return true // storage unavailable: do not force the video at every visit
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* storage unavailable */
  }
}

const BLUE = '#2fa8ff'
const RED = '#ff3b5c'
const GREEN = '#2ee59d'
const GOLD = '#ffc531'

// ── Small building blocks ──

/** Viewbox framing a few territories. */
function frame(ids: string[], margin = 14) {
  const b = ids.map((id) => GEO.territories[id].bbox)
  const x0 = Math.min(...b.map((r) => r.x0)) - margin
  const y0 = Math.min(...b.map((r) => r.y0)) - margin
  const x1 = Math.max(...b.map((r) => r.x1)) + margin
  const y1 = Math.max(...b.map((r) => r.y1)) + margin
  return `${x0} ${y0} ${x1 - x0} ${y1 - y0}`
}

/** Animated number (counts from `from` to `to`). */
function Counter({ from, to, delay = 0, duration = 1 }: { from: number; to: number; delay?: number; duration?: number }) {
  const v = useMotionValue(from)
  const shown = useTransform(v, (x) => Math.round(x))
  useEffect(() => {
    const ctrl = animate(v, to, { duration, delay, ease: 'easeInOut' })
    return () => ctrl.stop()
  }, [v, to, delay, duration])
  return <motion.span>{shown}</motion.span>
}

/** Army badge drawn on the map, with a counter. */
function Badge({ id, color, from, to, delay = 0, r = 9 }: { id: string; color: string; from: number; to: number; delay?: number; r?: number }) {
  const [x, y] = GEO.territories[id].center
  const v = useMotionValue(from)
  const shown = useTransform(v, (n) => String(Math.round(n)))
  useEffect(() => {
    const ctrl = animate(v, to, { duration: 0.9, delay, ease: 'easeInOut' })
    return () => ctrl.stop()
  }, [v, to, delay])
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.circle r={r} style={{ fill: 'var(--badge-bg)' }} strokeWidth={2.4} initial={{ stroke: color }} animate={{ stroke: color }} />
      <motion.text textAnchor="middle" dominantBaseline="middle" y={0.5} fontFamily="Orbitron, sans-serif" fontWeight={700} fontSize={r * 0.95} style={{ fill: 'var(--badge-fg)' }}>
        {shown}
      </motion.text>
    </g>
  )
}

function Step({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      className="font-display text-sm font-black tracking-widest text-neon sm:text-lg"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}

// ── Scenes ──

function SceneTitle() {
  const { t } = useT()
  return (
    <div className="relative flex h-full items-center justify-center">
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <motion.path d={GEO.coast} fill="none" style={{ stroke: 'var(--neon)' }} strokeWidth={1.2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.4 }} />
        {TERRITORIES.map((tr) => (
          <motion.path
            key={tr.id}
            d={GEO.territories[tr.id].tiles}
            fill={CONTINENTS[tr.continent].color}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            transition={{ delay: 0.3 + (GEO.territories[tr.id].center[0] / MAP_W) * 1.6, duration: 0.6 }}
          />
        ))}
      </svg>
      <div className="relative text-center">
        <div className="flex justify-center">
          {'RISK'.split('').map((ch, i) => (
            <motion.span
              key={i}
              className="font-display text-6xl font-black sm:text-8xl"
              style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #67e8f9 45%, #2563eb 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 0 18px rgba(34,211,238,0.7))',
              }}
              initial={{ y: -70, opacity: 0, rotateX: 90 }}
              animate={{ y: 0, opacity: 1, rotateX: 0 }}
              transition={{ delay: 1.2 + i * 0.12, type: 'spring', stiffness: 160, damping: 12 }}
            >
              {ch}
            </motion.span>
          ))}
        </div>
        <motion.div
          className="mt-2 rounded-full bg-[var(--scrim)] px-4 py-1 font-display text-[10px] font-bold tracking-[0.3em] text-white sm:text-xs"
          initial={{ opacity: 0, letterSpacing: '1em' }}
          animate={{ opacity: 1, letterSpacing: '0.3em' }}
          transition={{ delay: 2.2, duration: 0.8 }}
        >
          {t('intro.kicker').toUpperCase()}
        </motion.div>
      </div>
    </div>
  )
}

const RIVALS = [RED, BLUE, GREEN, GOLD]

function SceneGoal() {
  const { t } = useT()
  const [ox, oy] = GEO.territories.weurope.center
  return (
    <div className="grid h-full grid-rows-[1fr_auto] items-center gap-2 sm:grid-cols-[3fr_2fr] sm:grid-rows-1">
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="h-full max-h-full w-full" aria-hidden>
        {TERRITORIES.map((tr, i) => {
          const [x, y] = GEO.territories[tr.id].center
          const d = Math.hypot(x - ox, y - oy)
          const start = RIVALS[(i * 7) % 4]
          return (
            <motion.path
              key={tr.id}
              d={GEO.territories[tr.id].tiles}
              initial={{ fill: start, opacity: 0 }}
              animate={{ fill: [start, start, BLUE], opacity: 0.9 }}
              transition={{ fill: { delay: 1.4 + d / 260, duration: 0.5, times: [0, 0.5, 1] }, opacity: { duration: 0.5, delay: i * 0.02 } }}
            />
          )
        })}
        <path d={GEO.coast} fill="none" style={{ stroke: 'var(--tile-outline)' }} strokeWidth={1} />
      </svg>
      <div className="px-3 text-center sm:text-left">
        <motion.div className="font-display text-xl font-black text-neon sm:text-2xl" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
          {t('intro.goal')}
        </motion.div>
        <motion.p className="mt-1 text-lg sm:text-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          {t('intro.goalText')} <b style={{ color: BLUE }}>{t('intro.goalBold')}</b>
        </motion.p>
      </div>
    </div>
  )
}

function SceneReinforce() {
  const { t, cont } = useT()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Step>{t('intro.t2').toUpperCase()}</Step>
      <div className="flex flex-wrap items-center justify-center gap-3 font-display text-2xl font-black sm:text-4xl">
        <motion.div className="flex flex-col items-center" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring' }}>
          <span style={{ color: BLUE }}>
            <Counter from={0} to={14} delay={0.5} />
          </span>
          <span className="font-sans text-xs font-bold text-fg/60">{t('intro.territories')}</span>
        </motion.div>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
          ÷ 3 =
        </motion.span>
        <motion.div className="flex flex-col items-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 }}>
          <span>4</span>
          <span className="font-sans text-xs font-bold text-fg/60">{t('intro.min3')}</span>
        </motion.div>
        {(['eu', 'au'] as const).map((c, i) => (
          <motion.span
            key={c}
            className="rounded-xl px-3 py-1 text-base sm:text-xl"
            style={{ background: `${CONTINENTS[c].color}33`, border: `2px solid ${CONTINENTS[c].color}`, color: CONTINENTS[c].color }}
            initial={{ x: 120, opacity: 0, rotate: 10 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            transition={{ delay: 3.2 + i * 0.7, type: 'spring', stiffness: 200, damping: 14 }}
          >
            +{CONTINENTS[c].bonus} {cont(c)}
          </motion.span>
        ))}
      </div>
      <motion.div
        className="rounded-2xl px-6 py-2 font-display text-3xl font-black sm:text-5xl"
        style={{ color: '#031021', background: 'linear-gradient(135deg, #22d3ee, #3b82f6)', boxShadow: '0 0 40px rgba(34,211,238,0.6)' }}
        initial={{ scale: 0, rotate: -6 }}
        animate={{ scale: 1, rotate: -2 }}
        transition={{ delay: 5, type: 'spring', stiffness: 220, damping: 12 }}
      >
        = <Counter from={0} to={11} delay={5.2} duration={0.8} /> {t('intro.armies')}
      </motion.div>
    </div>
  )
}

function SceneAttack() {
  const { t } = useT()
  const [done, setDone] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 2200)
    return () => clearTimeout(timer)
  }, [])
  const att = [6, 3, 1]
  const def = [5, 3]
  const res = (side: 'a' | 'd', i: number): 'win' | 'lose' | null => {
    if (!done || i >= 2) return null
    const attWins = att[i] > def[i]
    return (side === 'a') === attWins ? 'win' : 'lose'
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5">
      <Step>{t('intro.t3').toUpperCase()}</Step>
      <div className="flex items-start gap-6 sm:gap-12">
        <div className="flex flex-col items-center gap-2">
          <span className="h-5 font-display text-xs font-bold tracking-widest" style={{ color: RED }}>
            ⚔ {t('intro.attacker').toUpperCase()}
          </span>
          <div className="flex flex-col gap-2">
            {att.map((v, i) => (
              <Die key={i} value={v} attacker color={RED} duration={1600} delay={300 + i * 80} result={res('a', i)} />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-7">
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              className="flex h-[34px] items-center font-display text-lg font-black sm:h-[44px]"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={done ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.3 + i * 0.5 }}
              style={{ color: att[i] > def[i] ? RED : 'var(--fg)' }}
            >
              {att[i] > def[i] ? '>' : '='}
            </motion.div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="h-5 font-display text-xs font-bold tracking-widest text-fg/80">🛡 {t('intro.defender').toUpperCase()}</span>
          <div className="flex flex-col gap-2">
            {def.map((v, i) => (
              <Die key={i} value={v} attacker={false} color={BLUE} duration={1600} delay={400 + i * 80} result={res('d', i)} />
            ))}
          </div>
        </div>
      </div>
      <motion.div
        className="rounded-xl border-2 border-current bg-slate-900/85 px-4 py-1 font-display text-sm font-black tracking-wider text-yellow-300"
        initial={{ opacity: 0, scale: 2, rotate: -8 }}
        animate={done ? { opacity: 1, scale: 1, rotate: -3 } : {}}
        transition={{ delay: 1.4, type: 'spring', stiffness: 300, damping: 14 }}
      >
        {t('intro.tie').toUpperCase()}
      </motion.div>
    </div>
  )
}

const CONQUEST = ['brazil', 'argentina', 'peru', 'venezuela']
const DEMO_CARD: Card = { id: 0, territory: 'argentina', kind: 'cavalry' }

function SceneConquest() {
  const { t, terr } = useT()
  const [x, y] = GEO.territories.argentina.center
  return (
    <div className="grid h-full grid-cols-[3fr_2fr] items-center gap-2">
      <svg viewBox={frame(CONQUEST)} className="h-full max-h-full w-full" aria-hidden>
        {CONQUEST.map((id) => (
          <motion.path
            key={id}
            d={GEO.territories[id].tiles}
            initial={{ fill: id === 'argentina' ? RED : BLUE }}
            animate={{ fill: BLUE }}
            transition={{ delay: id === 'argentina' ? 1.8 : 0, duration: 0.4 }}
            opacity={0.9}
          />
        ))}
        {CONQUEST.map((id) => (
          <path key={id} d={GEO.territories[id].outline} fill="none" style={{ stroke: 'var(--tile-outline)' }} strokeWidth={1.4} />
        ))}
        <motion.path
          d={arrowPath('brazil', 'argentina')}
          fill="none"
          stroke="#fff"
          strokeWidth={3}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        />
        {[0, 0.15, 0.3].map((d) => (
          <motion.circle
            key={d}
            cx={x}
            cy={y}
            r={40}
            fill="none"
            stroke={BLUE}
            initial={{ scale: 0.05, opacity: 0, strokeWidth: 6 }}
            animate={{ scale: 1, opacity: [0, 1, 0], strokeWidth: 0.5 }}
            transition={{ delay: 1.8 + d, duration: 1 }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        ))}
        <Badge id="brazil" color={BLUE} from={8} to={5} delay={2.4} />
        <Badge id="argentina" color={BLUE} from={1} to={3} delay={2.4} />
        <Badge id="peru" color={BLUE} from={2} to={2} />
        <Badge id="venezuela" color={BLUE} from={3} to={3} />
      </svg>
      <div className="flex flex-col items-center gap-3">
        <motion.div className="text-center font-display text-sm font-black tracking-widest" style={{ color: BLUE }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
          {terr('argentina').toUpperCase()} ✓
        </motion.div>
        <motion.div initial={{ x: 200, rotate: 25, opacity: 0 }} animate={{ x: 0, rotate: -4, opacity: 1 }} transition={{ delay: 3.4, type: 'spring', stiffness: 200, damping: 16 }}>
          <GameCard card={DEMO_CARD} small />
        </motion.div>
        <motion.div className="font-display text-sm font-black text-amber-500 dark:text-yellow-300" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 4 }}>
          {t('intro.card').toUpperCase()}
        </motion.div>
      </div>
    </div>
  )
}

const FAN: Card[] = [
  { id: 1, territory: 'japan', kind: 'infantry' },
  { id: 2, territory: 'egypt', kind: 'cavalry' },
  { id: 3, territory: 'iceland', kind: 'artillery' },
]
const VALUES = [4, 6, 8, 10, 12, 15, 20]

function SceneCards() {
  const { t } = useT()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <Step>{t('intro.sets').toUpperCase()}</Step>
      <div className="flex items-end justify-center">
        {FAN.map((c, i) => (
          <motion.div
            key={c.id}
            className="-mx-3"
            initial={{ y: 160, rotate: 0, opacity: 0 }}
            animate={{ y: i === 1 ? -10 : 0, rotate: (i - 1) * 12, opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.3, type: 'spring', stiffness: 200, damping: 16 }}
          >
            <GameCard card={c} small />
          </motion.div>
        ))}
      </div>
      <div className="flex h-20 items-end gap-1.5 sm:h-24 sm:gap-2">
        {VALUES.map((v, i) => (
          <div key={v} className="flex flex-col items-center gap-1">
            <motion.span className="font-display text-[10px] font-bold sm:text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 + i * 0.25 }}>
              +{v}
            </motion.span>
            <motion.div
              className="w-5 rounded-t-md sm:w-7"
              style={{ background: 'linear-gradient(180deg, #22d3ee, #3b82f6)' }}
              initial={{ height: 0 }}
              animate={{ height: (v / 20) * 64 }}
              transition={{ delay: 2.3 + i * 0.25, type: 'spring', stiffness: 140, damping: 16 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const FORTIFY = ['alberta', 'ontario', 'eastus', 'westus', 'quebec', 'nwt', 'greenland', 'centralam']
const ENEMY = new Set(['greenland', 'centralam', 'quebec'])

function SceneFortify() {
  const { t } = useT()
  return (
    <div className="grid h-full grid-rows-[auto_1fr] items-center justify-items-center gap-1">
      <Step>{t('intro.connected').toUpperCase()}</Step>
      <svg viewBox={frame(FORTIFY, 8)} className="h-full max-h-full w-full" aria-hidden>
        {FORTIFY.map((id) => (
          <path key={id} d={GEO.territories[id].tiles} fill={ENEMY.has(id) ? RED : BLUE} opacity={0.88} />
        ))}
        {FORTIFY.map((id) => (
          <path key={id} d={GEO.territories[id].outline} fill="none" style={{ stroke: 'var(--tile-outline)' }} strokeWidth={1.4} />
        ))}
        {(['alberta', 'ontario', 'eastus'] as const).map((id, i) => (
          <motion.path
            key={id}
            d={GEO.territories[id].outline}
            fill="none"
            stroke="#7dffb2"
            strokeWidth={2.4}
            strokeDasharray="5 4"
            className="march"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.3 }}
          />
        ))}
        <motion.path
          d={`${arrowPath('alberta', 'ontario')} ${arrowPath('ontario', 'eastus')}`}
          fill="none"
          stroke="#031021"
          strokeOpacity={0.45}
          strokeWidth={7}
          strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
        />
        <motion.path
          d={`${arrowPath('alberta', 'ontario')} ${arrowPath('ontario', 'eastus')}`}
          fill="none"
          stroke="#fff"
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeDasharray="6 7"
          className="arrow-flow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
        />
        <Badge id="alberta" color={BLUE} from={9} to={1} delay={2.6} />
        <Badge id="ontario" color={BLUE} from={2} to={2} />
        <Badge id="eastus" color={BLUE} from={2} to={10} delay={2.6} />
        <Badge id="westus" color={BLUE} from={3} to={3} />
        <Badge id="nwt" color={BLUE} from={1} to={1} />
        {[...ENEMY].map((id) => (
          <Badge key={id} id={id} color={RED} from={6} to={6} />
        ))}
      </svg>
    </div>
  )
}

function SceneOutro({ onFinish }: { onFinish: () => void }) {
  const { t } = useT()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5">
      <motion.div className="text-5xl" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 10 }}>
        🌍
      </motion.div>
      <motion.h2 className="font-display text-3xl font-black tracking-widest text-neon text-glow sm:text-5xl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        {t('intro.yourTurn').toUpperCase()}
      </motion.h2>
      <motion.button className="btn btn-primary !py-3" onClick={onFinish} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.1, type: 'spring' }}>
        <Play size={15} fill="currentColor" /> {t('intro.start')}
      </motion.button>
    </div>
  )
}

/** Eight chapters: titles and captions in the dictionary (`intro.t0`…, `intro.c0`…). */
const CHAPTERS: ((finish: () => void) => ReactNode)[] = [
  () => <SceneTitle />,
  () => <SceneGoal />,
  () => <SceneReinforce />,
  () => <SceneAttack />,
  () => <SceneConquest />,
  () => <SceneCards />,
  () => <SceneFortify />,
  (finish) => <SceneOutro onFinish={finish} />,
]

/** Length of a chapter: time to read (or hear) its caption, with a minimum. */
const durationOf = (caption: string) => Math.max(6, caption.length / 14 + 2)

// ── Voice-over ──

function useVoice(enabled: boolean, lang: Lang) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  useEffect(() => {
    if (!supported) return
    const pick = () => {
      const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang))
      voiceRef.current = voices.find((v) => /natural|google|amélie|thomas|denise|henri|sonia|libby|ryan/i.test(v.name)) ?? voices[0] ?? null
    }
    pick()
    speechSynthesis.addEventListener('voiceschanged', pick)
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', pick)
      speechSynthesis.cancel()
    }
  }, [supported, lang])

  const say = useCallback(
    (text: string) => {
      if (!supported) return
      speechSynthesis.cancel()
      if (!enabled) return
      const u = new SpeechSynthesisUtterance(text)
      u.lang = lang === 'fr' ? 'fr-FR' : 'en-GB'
      u.rate = 1.05
      if (voiceRef.current) u.voice = voiceRef.current
      speechSynthesis.speak(u)
    },
    [enabled, supported, lang],
  )
  const pause = useCallback(() => supported && speechSynthesis.pause(), [supported])
  const resume = useCallback(() => supported && speechSynthesis.resume(), [supported])
  const stop = useCallback(() => supported && speechSynthesis.cancel(), [supported])
  return { supported, say, pause, resume, stop }
}

// ── Player ──

export function IntroVideo() {
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [chapter, setChapter] = useState(0)
  const [elapsed, setElapsed] = useState(0) // seconds elapsed in the chapter
  const voiceOn = useGame((s) => s.settings.voice !== false)
  const update = useGame((s) => s.updateSettings)
  const { t, lang } = useT()
  const voice = useVoice(voiceOn, lang)
  const captions = useMemo(() => CHAPTERS.map((_, i) => t(`intro.c${i}` as MessageKey)), [t])
  const titles = useMemo(() => CHAPTERS.map((_, i) => t(`intro.t${i}` as MessageKey)), [t])
  const durations = useMemo(() => captions.map(durationOf), [captions])
  const total = durations.reduce((a, b) => a + b, 0)

  const close = useCallback(() => {
    voice.stop()
    markSeen()
    openDialog(null)
  }, [voice])

  const goTo = useCallback(
    (i: number) => {
      setChapter(i)
      setElapsed(0)
      voice.say(captions[i])
    },
    [voice, captions],
  )

  // Player clock (setInterval rather than requestAnimationFrame: keeps going if the tab slows down).
  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => setElapsed((e) => e + 0.1), 100)
    return () => clearInterval(timer)
  }, [playing])

  useEffect(() => {
    if (elapsed < durations[chapter]) return
    if (chapter < CHAPTERS.length - 1) goTo(chapter + 1)
    else setPlaying(false) // last chapter: stay on "Your turn"
  }, [elapsed, chapter, goTo, durations])

  const start = () => {
    setStarted(true)
    setPlaying(true)
    goTo(0)
  }

  const togglePlay = () => {
    if (!started) return start()
    if (chapter === CHAPTERS.length - 1 && elapsed >= durations[chapter] - 0.1) {
      setPlaying(true)
      goTo(0)
      return
    }
    if (playing) voice.pause()
    else voice.resume()
    setPlaying((p) => !p)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const toggleVoice = () => {
    const next = !voiceOn
    update({ voice: next })
    if (!next) voice.stop()
  }
  // Repeat the current sentence when the voice is turned back on.
  const prevVoice = useRef(voiceOn)
  useEffect(() => {
    if (voiceOn && !prevVoice.current && playing) voice.say(captions[chapter])
    prevVoice.current = voiceOn
  }, [voiceOn, playing, chapter, voice, captions])

  const before = durations.slice(0, chapter).reduce((a, b) => a + b, 0)
  const remaining = Math.max(0, Math.ceil(total - before - elapsed))

  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--scrim)] p-2 backdrop-blur-md sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t('intro.label')}
        className="glass flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl"
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="font-display text-xs font-bold tracking-widest text-fg/80">{t('intro.header')}</span>
          <button className="btn btn-ghost !px-2.5 !py-1.5" onClick={close}>
            {chapter === CHAPTERS.length - 1 ? t('common.close') : t('common.skip')} <X size={13} />
          </button>
        </div>

        <div className="relative aspect-video w-full overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, var(--ocean-0), var(--ocean-2))' }}>
          {started ? (
            <AnimatePresence mode="wait">
              <motion.div key={chapter} className="absolute inset-0 p-3 sm:p-6" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.35 }}>
                {CHAPTERS[chapter](close)}
              </motion.div>
            </AnimatePresence>
          ) : (
            <button className="absolute inset-0 flex flex-col items-center justify-center gap-3" onClick={start}>
              <span className="font-display text-5xl font-black tracking-widest text-neon text-glow sm:text-7xl">RISK</span>
              <motion.span
                className="flex h-16 w-16 items-center justify-center rounded-full text-[#031021]"
                style={{ background: 'linear-gradient(135deg, #22d3ee, #3b82f6)', boxShadow: '0 0 40px rgba(34,211,238,0.7)' }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
              >
                <Play size={28} fill="currentColor" />
              </motion.span>
              <span className="text-sm text-fg/70">{t('intro.hint', { n: Math.max(1, Math.round(total / 60)) })}</span>
            </button>
          )}
          <div className="scanlines pointer-events-none absolute inset-0" />
        </div>

        <p className="min-h-[3.5rem] px-4 pt-3 text-center text-sm font-semibold sm:text-base" aria-live="polite">
          {started ? captions[chapter] : t('intro.poster')}
        </p>

        <div className="flex items-center gap-2 px-4 pb-4 pt-2">
          <button className="btn btn-ghost !p-2" onClick={togglePlay} aria-label={playing ? t('intro.pause') : t('intro.play')} title={playing ? t('intro.pause') : t('intro.play')}>
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <div className="flex flex-1 gap-1">
            {CHAPTERS.map((_, i) => (
              <button
                key={i}
                className="relative h-2 overflow-hidden rounded-full bg-fg/15"
                style={{ flexGrow: durations[i] }}
                onClick={() => {
                  if (!started) setStarted(true)
                  setPlaying(true)
                  goTo(i)
                }}
                aria-label={t('intro.chapter', { n: i + 1, title: titles[i] })}
                title={titles[i]}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-neon"
                  style={{ width: `${!started || i > chapter ? 0 : i < chapter ? 100 : Math.min(100, (elapsed / durations[i]) * 100)}%` }}
                />
              </button>
            ))}
          </div>
          <span className="w-10 text-right font-display text-[10px] text-fg/60">{started ? `-${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : ''}</span>
          {voice.supported && (
            <button
              className="btn btn-ghost !p-2"
              onClick={toggleVoice}
              aria-pressed={voiceOn}
              aria-label={voiceOn ? t('intro.voiceOff') : t('intro.voiceOn')}
              title={voiceOn ? t('intro.voiceOff') : t('intro.voiceOn')}
            >
              {voiceOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
