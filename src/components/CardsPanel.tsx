import { AnimatePresence, motion } from 'motion/react'
import { Bomb, CircleCheck, CircleX, PersonStanding, Sparkles, WandSparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CONTINENTS, TERRITORY_BY_ID } from '../game/mapData'
import { type Card, type CardKind, findSet, isValidSet, tradeValue } from '../game/rules'
import { useGame } from '../game/store'
import { isLocalHuman, useCanAct } from '../game/ui'
import { useT } from '../i18n/useT'
import { useNet } from '../net/netStore'

function HorseIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21h12M7 21c0-3 1-5 3-6l-3-3c0-3 2-6 6-7l1-2 1 3c3 1 5 4 5 8v7" />
      <path d="M11 9h.01" />
    </svg>
  )
}

export function CardIcon({ kind, size = 18 }: { kind: CardKind; size?: number }) {
  if (kind === 'infantry') return <PersonStanding size={size} />
  if (kind === 'cavalry') return <HorseIcon size={size} />
  if (kind === 'artillery') return <Bomb size={size} />
  return <Sparkles size={size} />
}

const KIND_COLOR: Record<CardKind, string> = { infantry: '#38bdf8', cavalry: '#f59e0b', artillery: '#f43f5e', wild: '#c084fc' }

export function GameCard({ card, selected, owned, onClick, small }: { card: Card; selected?: boolean; owned?: boolean; onClick?: () => void; small?: boolean }) {
  const { t, terr, cont: contName } = useT()
  const def = card.territory ? TERRITORY_BY_ID[card.territory] : null
  const cont = def ? CONTINENTS[def.continent] : null
  const accent = KIND_COLOR[card.kind]
  return (
    // No CSS transform on the card: a transformed card with a glow renders a dark rectangle in Chrome.
    <button
      onClick={onClick}
      className={`relative flex shrink-0 flex-col overflow-hidden rounded-xl text-left hover:brightness-125 ${small ? 'h-32 w-24' : 'h-40 w-28 sm:h-44 sm:w-32'}`}
      style={{
        top: selected ? -12 : 0,
        transition: 'top 0.2s ease-out, box-shadow 0.2s, border-color 0.2s, filter 0.2s',
        background: `linear-gradient(160deg, #13284a, #070f1f 70%)`,
        border: `2px solid ${selected ? '#fff' : accent + '88'}`,
        boxShadow: selected ? `0 0 18px ${accent}, 0 0 0 2px ${accent}` : `0 8px 20px rgba(0,0,0,0.45)`,
      }}
    >
      <div className="h-1.5 w-full" style={{ background: cont?.color ?? accent }} />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full sm:h-14 sm:w-14" style={{ background: `${accent}22`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}66, 0 0 20px ${accent}44` }}>
          <CardIcon kind={card.kind} size={26} />
        </div>
        <div className="font-display text-[9px] font-bold tracking-widest" style={{ color: accent }}>
          {t(`kind.${card.kind}`).toUpperCase()}
        </div>
      </div>
      <div className="bg-black/40 px-2 py-1.5 text-center">
        <div className="truncate text-xs font-bold leading-tight">{def ? terr(def.id) : t('kind.wild')}</div>
        <div className="truncate text-[10px] text-white/50">{cont ? contName(cont.id) : t('cards.wildSub')}</div>
      </div>
      {owned && <div className="absolute right-1 top-3 rounded bg-yellow-400 px-1 font-display text-[8px] font-black text-black">+2</div>}
    </button>
  )
}

export function CardsPanel() {
  const open = useGame((s) => s.cardsOpen)
  const setOpen = useGame((s) => s.setCardsOpen)
  const me = useGame((s) => s.players[s.current])
  const board = useGame((s) => s.board)
  const trades = useGame((s) => s.trades)
  const phase = useGame((s) => s.phase)
  const trade = useGame((s) => s.trade)
  const canAct = useCanAct()
  const { t } = useT()
  const [sel, setSel] = useState<number[]>([])

  useEffect(() => setSel([]), [open, me?.cards.length])

  if (!me) return null
  const cards = me.cards
  const chosen = cards.filter((c) => sel.includes(c.id))
  const valid = isValidSet(chosen)
  const best = findSet(cards, board, me.id)
  const mustTrade = cards.length >= 5
  const canTrade = phase === 'reinforce' || (phase === 'attack' && mustTrade)

  return (
    <AnimatePresence>
      {open && canAct && (
        <motion.div className="fixed inset-0 z-40 flex items-end justify-center bg-[var(--scrim)] p-2 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div
            className="glass flex max-h-[92dvh] w-full max-w-3xl flex-col rounded-3xl p-4 sm:p-6"
            initial={{ y: 80, scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 80, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-lg font-black tracking-widest text-neon">{t('cards.title')}</h2>
              {!mustTrade && (
                <button className="btn btn-ghost !p-2" onClick={() => setOpen(false)}>
                  <X size={16} />
                </button>
              )}
            </div>
            <p className="mb-4 text-sm text-fg/60">
              {mustTrade ? (
                <span className="font-bold text-amber-600 dark:text-yellow-300">{t('cards.mustTrade', { n: cards.length })}</span>
              ) : (
                t('cards.rules')
              )}{' '}
              {t('cards.next')} <b className="text-fg">{t('cards.nextValue', { n: tradeValue(trades) })}</b>
            </p>
            <div className="no-scrollbar -mx-4 flex min-h-48 flex-wrap content-start justify-center gap-3 overflow-y-auto px-4 pb-4 pt-6 sm:-mx-6 sm:px-6">
              {cards.length === 0 && <div className="w-full text-center text-fg/40">{t('cards.empty')}</div>}
              {cards.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 30, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.06 }}>
                  <GameCard
                    card={c}
                    selected={sel.includes(c.id)}
                    owned={!!c.territory && board[c.territory]?.owner === me.id}
                    onClick={() => setSel((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : s.length < 3 ? [...s, c.id] : s))}
                  />
                </motion.div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex-1 text-sm">
                {sel.length < 3 ? (
                  <span className="text-fg/50">
                    {t('cards.selected', { n: sel.length })}
                    {cards.length >= 3 && !best && t('cards.noSet')}
                  </span>
                ) : valid ? (
                  <span className="flex items-center gap-1.5 font-bold text-emerald-300">
                    <CircleCheck size={15} /> {t('cards.valid')}
                  </span>
                ) : (
                  <span className="flex items-start gap-1.5 font-bold text-rose-300">
                    <CircleX size={15} className="mt-0.5 shrink-0" /> {t('cards.invalid')}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button disabled={!best} className="btn btn-ghost" onClick={() => best && setSel(best.map((c) => c.id))} title={t('cards.bestTitle')}>
                  <WandSparkles size={14} /> <span className="hidden sm:inline">{t('cards.bestPrefix')}</span> {t('cards.bestWord')}
                </button>
                <button
                  disabled={!valid || !canTrade}
                  className="btn btn-primary"
                  onClick={() => {
                    if (trade(sel)) setSel([])
                  }}
                >
                  <Sparkles size={14} /> {t('cards.trade', { n: tradeValue(trades) })}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function NewCardToast() {
  const last = useGame((s) => s.lastCard)
  const mine = useGame((s) => !!s.lastCard && isLocalHuman(s, s.lastCard.seat, useNet.getState()))
  const { t } = useT()
  const [shown, setShown] = useState<number | null>(null)
  const key = last?.key
  useEffect(() => {
    if (key === undefined) return
    setShown(key)
    const t = setTimeout(() => setShown(null), 2200)
    return () => clearTimeout(t)
  }, [key])
  return (
    <AnimatePresence>
      {last && mine && shown === last.key && (
        <motion.div
          className="pointer-events-none fixed right-3 top-20 z-40 flex flex-col items-center gap-2"
          initial={{ x: 200, rotate: 25, opacity: 0 }}
          animate={{ x: 0, rotate: -4, opacity: 1 }}
          exit={{ y: -60, opacity: 0, scale: 0.6 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <div className="font-display text-xs font-black tracking-widest text-amber-500 dark:text-yellow-300 text-glow">{t('cards.new')}</div>
          <GameCard card={last.card} small />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
