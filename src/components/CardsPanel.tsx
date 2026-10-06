import { AnimatePresence, motion } from 'motion/react'
import { Bomb, PersonStanding, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CONTINENTS, TERRITORY_BY_ID } from '../game/mapData'
import { type Card, type CardKind, isValidSet, tradeValue } from '../game/rules'
import { useGame } from '../game/store'

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

const KIND_LABEL: Record<CardKind, string> = { infantry: 'Infanterie', cavalry: 'Cavalerie', artillery: 'Artillerie', wild: 'Joker' }
const KIND_COLOR: Record<CardKind, string> = { infantry: '#38bdf8', cavalry: '#f59e0b', artillery: '#f43f5e', wild: '#c084fc' }

export function GameCard({ card, selected, owned, onClick, small }: { card: Card; selected?: boolean; owned?: boolean; onClick?: () => void; small?: boolean }) {
  const t = card.territory ? TERRITORY_BY_ID[card.territory] : null
  const cont = t ? CONTINENTS[t.continent] : null
  const accent = KIND_COLOR[card.kind]
  return (
    <motion.button
      layout
      onClick={onClick}
      whileHover={{ y: -6, rotate: -1 }}
      animate={{ y: selected ? -14 : 0, scale: selected ? 1.05 : 1 }}
      className={`relative flex shrink-0 flex-col overflow-hidden rounded-xl text-left ${small ? 'h-32 w-24' : 'h-40 w-28 sm:h-44 sm:w-32'}`}
      style={{
        background: `linear-gradient(160deg, #13284a, #070f1f 70%)`,
        border: `2px solid ${selected ? '#fff' : accent + '88'}`,
        boxShadow: selected ? `0 0 26px ${accent}, 0 0 0 2px ${accent}` : `0 8px 24px rgba(0,0,0,0.5)`,
      }}
    >
      <div className="h-1.5 w-full" style={{ background: cont?.color ?? accent }} />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full sm:h-14 sm:w-14" style={{ background: `${accent}22`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}66, 0 0 20px ${accent}44` }}>
          <CardIcon kind={card.kind} size={26} />
        </div>
        <div className="font-display text-[9px] font-bold tracking-widest" style={{ color: accent }}>
          {KIND_LABEL[card.kind].toUpperCase()}
        </div>
      </div>
      <div className="bg-black/40 px-2 py-1.5 text-center">
        <div className="truncate text-xs font-bold leading-tight">{t ? t.name : 'Joker'}</div>
        <div className="truncate text-[10px] text-white/50">{cont ? cont.name : 'remplace tout'}</div>
      </div>
      {owned && <div className="absolute right-1 top-3 rounded bg-yellow-400 px-1 font-display text-[8px] font-black text-black">+2</div>}
    </motion.button>
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
  const [sel, setSel] = useState<number[]>([])

  useEffect(() => setSel([]), [open, me?.cards.length])

  if (!me) return null
  const cards = me.cards
  const chosen = cards.filter((c) => sel.includes(c.id))
  const valid = isValidSet(chosen)
  const mustTrade = cards.length >= 5
  const canTrade = phase === 'reinforce' || (phase === 'attack' && mustTrade)

  return (
    <AnimatePresence>
      {open && !me.ai && (
        <motion.div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-2 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div
            className="glass w-full max-w-2xl rounded-3xl p-4 sm:p-6"
            initial={{ y: 80, scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 80, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-lg font-black tracking-widest text-neon">CARTES DE TERRITOIRE</h2>
              {!mustTrade && (
                <button className="btn btn-ghost !p-2" onClick={() => setOpen(false)}>
                  <X size={16} />
                </button>
              )}
            </div>
            <p className="mb-4 text-sm text-white/60">
              {mustTrade ? (
                <span className="font-bold text-yellow-300">Vous avez {cards.length} cartes : échange obligatoire !</span>
              ) : (
                'Échangez 3 cartes identiques, 3 différentes, ou avec un joker.'
              )}{' '}
              Prochain échange : <b className="text-white">+{tradeValue(trades)} armées</b>
            </p>
            <div className="no-scrollbar -mx-2 flex min-h-48 items-end gap-3 overflow-x-auto px-2 pb-2 pt-4">
              {cards.length === 0 && <div className="w-full text-center text-white/40">Conquérez un territoire pendant votre tour pour gagner une carte.</div>}
              {cards.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 30, rotateY: 90 }} animate={{ opacity: 1, y: 0, rotateY: 0 }} transition={{ delay: i * 0.06 }}>
                  <GameCard
                    card={c}
                    selected={sel.includes(c.id)}
                    owned={!!c.territory && board[c.territory]?.owner === me.id}
                    onClick={() => setSel((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : s.length < 3 ? [...s, c.id] : s))}
                  />
                </motion.div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-sm text-white/50">{sel.length}/3 sélectionnées</div>
              <button
                disabled={!valid || !canTrade}
                className="btn btn-primary"
                onClick={() => {
                  if (trade(sel)) setSel([])
                }}
              >
                <Sparkles size={14} /> Échanger +{tradeValue(trades)}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function NewCardToast() {
  const last = useGame((s) => s.lastCard)
  const [shown, setShown] = useState<number | null>(null)
  useEffect(() => {
    if (!last) return
    setShown(last.key)
    const t = setTimeout(() => setShown(null), 2200)
    return () => clearTimeout(t)
  }, [last])
  return (
    <AnimatePresence>
      {last && shown === last.key && (
        <motion.div
          className="pointer-events-none fixed right-3 top-20 z-40 flex flex-col items-center gap-2"
          initial={{ x: 200, rotate: 25, opacity: 0 }}
          animate={{ x: 0, rotate: -4, opacity: 1 }}
          exit={{ y: -60, opacity: 0, scale: 0.6 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <div className="font-display text-xs font-black tracking-widest text-yellow-300 text-glow">NOUVELLE CARTE</div>
          <GameCard card={last.card} small />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
