import { AnimatePresence, motion } from 'motion/react'
import { Bot, Clapperboard, Globe, Minus, Play, Plus, RotateCcw, Settings, User } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { GEO } from '../game/hexMap'
import { CONTINENTS, MAP_H, MAP_W, TERRITORIES } from '../game/mapData'
import { type Difficulty, PLAYER_COLORS } from '../game/rules'
import { type PlayerConfig, useGame } from '../game/store'
import { useResolvedTheme } from '../game/theme'
import { openDialog, useUi } from '../game/ui'
import { type Lang, LANG_LABEL, LANGS, PLAYER_NAMES } from '../i18n'
import { langOf, useT } from '../i18n/useT'
import { reopenRoom } from '../net/session'
import { OnlineDialog } from './Online'

const DIFFS: Difficulty[] = ['easy', 'normal', 'hard']

/** Default names follow the language, as long as the player did not rename them. */
function localizeName(name: string, from: Lang, to: Lang) {
  const i = PLAYER_NAMES[from].indexOf(name)
  if (i >= 0) return PLAYER_NAMES[to][i]
  return name === (from === 'fr' ? 'Vous' : 'You') ? (to === 'fr' ? 'Vous' : 'You') : name
}

export function BackgroundMap() {
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
          <rect x={-500} y={-500} width={MAP_W + 1000} height={MAP_H + 1000} style={{ fill: 'var(--bg)' }} />
          <path d={GEO.oceanGrid} fill="none" style={{ stroke: 'var(--map-grid)' }} strokeWidth={0.6} />
          <path d={GEO.coast} fill="none" style={{ stroke: 'var(--coast-glow)' }} strokeWidth={8} filter="url(#mglow)" />
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
          <path d={GEO.coast} fill="none" style={{ stroke: 'var(--neon)' }} strokeOpacity={0.6} strokeWidth={0.8} />
          <g className="lane" fill="none" style={{ stroke: 'var(--lane)' }} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="4 4">
            {GEO.seaLanes.map((l) => (
              <path key={l.a + l.b} d={l.d} />
            ))}
          </g>
        </svg>
      </motion.div>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-neon"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, boxShadow: '0 0 8px #22d3ee' }}
          animate={{ y: [0, -80, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: p.d, repeat: Infinity, delay: p.d / 3 }}
        />
      ))}
      <div className="scanlines absolute inset-0" />
      <div className="sweep" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, var(--menu-veil-0) 0%, var(--menu-veil-1) 75%)' }} />
    </div>
  )
}

function Title() {
  const dark = useResolvedTheme() === 'dark'
  const { t } = useT()
  return (
    <div className="relative text-center">
      <div className="flex justify-center">
        {'RISK'.split('').map((ch, i) => (
          <motion.span
            key={i}
            className="font-display text-7xl font-black sm:text-9xl"
            style={{
              background: dark ? 'linear-gradient(180deg, #ffffff 0%, #67e8f9 45%, #2563eb 100%)' : 'linear-gradient(180deg, #0ea5e9 0%, #2563eb 55%, #1e3a8a 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: dark ? 'drop-shadow(0 0 22px rgba(34,211,238,0.7))' : 'drop-shadow(0 4px 10px rgba(30,64,175,0.35))',
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
        className="mt-1 font-display text-[10px] font-bold tracking-[0.6em] text-neon/80 sm:text-sm"
        initial={{ opacity: 0, letterSpacing: '1.5em' }}
        animate={{ opacity: 1, letterSpacing: '0.6em' }}
        transition={{ delay: 0.8, duration: 1 }}
      >
        {t('brand.subtitle')}
      </motion.div>
    </div>
  )
}

export function MenuScreen() {
  const newGame = useGame((s) => s.newGame)
  const resume = useGame((s) => s.resume)
  const hasSave = useGame((s) => s.players.length > 0 && s.winner === null)
  const savedRoom = useGame((s) => s.room?.code)
  const theme = useGame((s) => s.settings.theme ?? 'system')
  const updateSettings = useGame((s) => s.updateSettings)
  const dialog = useUi((s) => s.dialog)
  const { t, lang } = useT()
  const [manual, setManual] = useState(false)
  const [players, setPlayers] = useState<PlayerConfig[]>(() => {
    const names = PLAYER_NAMES[langOf(useGame.getState())]
    return [
      { name: t('menu.you'), color: PLAYER_COLORS[1], ai: false, difficulty: 'normal' },
      { name: names[0], color: PLAYER_COLORS[0], ai: true, difficulty: 'normal' },
      { name: names[2], color: PLAYER_COLORS[2], ai: true, difficulty: 'normal' },
    ]
  })
  const [nameLang, setNameLang] = useState(lang)
  useEffect(() => {
    if (lang === nameLang) return
    setPlayers((ps) => ps.map((p) => ({ ...p, name: localizeName(p.name, nameLang, lang) })))
    setNameLang(lang)
  }, [lang, nameLang])

  const patch = (i: number, p: Partial<PlayerConfig>) => setPlayers((ps) => ps.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const cycleColor = (i: number) => {
    const used = new Set(players.map((p) => p.color))
    const start = PLAYER_COLORS.indexOf(players[i].color)
    for (let k = 1; k <= PLAYER_COLORS.length; k++) {
      const c = PLAYER_COLORS[(start + k) % PLAYER_COLORS.length]
      if (!used.has(c)) return patch(i, { color: c })
    }
  }
  const named = players.map((p, i) => ({ ...p, name: p.name.trim() || t('menu.player', { n: i + 1 }) }))
  const add = () => {
    if (players.length >= 6) return
    const color = PLAYER_COLORS.find((c) => !players.some((p) => p.color === c))!
    const name = PLAYER_NAMES[lang].find((n) => !players.some((p) => p.name === n)) ?? t('menu.player', { n: players.length + 1 })
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
            <h2 className="font-display text-xs font-bold tracking-[0.3em] text-fg/70">{t('menu.generals', { n: players.length })}</h2>
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
                  style={{ background: `linear-gradient(90deg, ${p.color}26, var(--ghost-bg))`, border: `1px solid ${p.color}55` }}
                >
                  <button
                    onClick={() => cycleColor(i)}
                    className="h-9 w-9 shrink-0 rounded-xl transition active:scale-90"
                    style={{ background: p.color, boxShadow: `0 0 16px ${p.color}` }}
                    title={t('menu.changeColor')}
                  />
                  <input
                    value={p.name}
                    maxLength={14}
                    onChange={(e) => patch(i, { name: e.target.value })}
                    className="min-w-0 flex-1 rounded-lg bg-surface px-2 py-1.5 text-base font-bold outline-none focus:ring-2 focus:ring-neon/50"
                  />
                  <button className={`chip flex items-center gap-1`} data-on={!p.ai} onClick={() => patch(i, { ai: !p.ai })}>
                    {p.ai ? <Bot size={13} /> : <User size={13} />}
                    <span className="hidden sm:inline">{p.ai ? t('menu.ai') : t('menu.human')}</span>
                  </button>
                  {p.ai && (
                    <button className="chip w-[74px]" onClick={() => patch(i, { difficulty: DIFFS[(DIFFS.indexOf(p.difficulty) + 1) % 3] })}>
                      {t(`diff.${p.difficulty}`)}
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-fg/60">{t('menu.deploy')}</span>
            <div className="flex gap-1">
              <button className="chip" data-on={!manual} onClick={() => setManual(false)}>
                {t('menu.deployAuto')}
              </button>
              <button className="chip" data-on={manual} onClick={() => setManual(true)}>
                {t('menu.deployManual')}
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-fg/60">{t('settings.theme')}</span>
            <div className="flex gap-1">
              {(['system', 'light', 'dark'] as const).map((m) => (
                <button key={m} className="chip" data-on={theme === m} onClick={() => updateSettings({ theme: m })}>
                  {t(`theme.${m}`).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-fg/60">{t('settings.language')}</span>
            <div className="flex gap-1">
              {LANGS.map((l) => (
                <button key={l} className="chip" data-on={lang === l} onClick={() => updateSettings({ lang: l })}>
                  {LANG_LABEL[l].toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {hasSave && (
              <button className="btn btn-ghost sm:flex-1" onClick={() => (savedRoom ? void reopenRoom() : resume())}>
                <RotateCcw size={15} /> {savedRoom ? t('menu.resumeOnline', { code: savedRoom }) : t('menu.resume')}
              </button>
            )}
            <motion.button
              className="btn btn-primary !py-3 !text-sm sm:flex-[2]"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => newGame(named, manual)}
            >
              <Play size={16} fill="currentColor" /> {t('menu.start')}
            </motion.button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button className="btn btn-ghost !px-2" onClick={() => openDialog('intro')}>
              <Clapperboard size={14} /> {t('menu.video')}
            </button>
            <button className="btn btn-ghost !px-2" onClick={() => openDialog('online')}>
              <Globe size={14} /> {t('menu.online')}
            </button>
            <button className="btn btn-ghost !px-2" onClick={() => openDialog('settings')}>
              <Settings size={14} /> {t('menu.settings')}
            </button>
          </div>
        </motion.div>
        <motion.p className="max-w-md text-center text-xs text-fg/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
          {t('menu.footer')}
        </motion.p>
      </div>
      <AnimatePresence>{dialog === 'online' && <OnlineDialog players={named} manual={manual} />}</AnimatePresence>
    </div>
  )
}
