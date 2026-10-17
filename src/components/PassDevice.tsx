import { AnimatePresence, motion } from 'motion/react'
import { Hand } from 'lucide-react'
import { useGame } from '../game/store'
import { useT } from '../i18n/useT'

/** Several humans on one device: hides the game until the next player is ready. */
export function PassDevice() {
  const handoff = useGame((s) => s.handoff)
  const player = useGame((s) => (s.handoff !== null ? s.players[s.handoff] : null))
  const reveal = useGame((s) => s.revealTurn)
  const { t } = useT()
  return (
    <AnimatePresence>
      {handoff !== null && player && (
        <motion.button
          key={handoff}
          className="fixed inset-0 z-[45] flex flex-col items-center justify-center gap-5 bg-ink p-6 text-center"
          style={{ backgroundColor: 'var(--bg)', backgroundImage: `radial-gradient(circle at center, ${player.color}33, transparent 70%)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          onClick={reveal}
        >
          <motion.div
            className="flex h-24 w-24 items-center justify-center rounded-full"
            style={{ background: player.color, boxShadow: `0 0 60px ${player.color}` }}
            animate={{ rotate: [0, -12, 12, -6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1 }}
          >
            <Hand size={44} color="#fff" />
          </motion.div>
          <div className="font-display text-3xl font-black tracking-widest sm:text-5xl" style={{ color: player.color, textShadow: `0 0 24px ${player.color}` }}>
            {t('pass.title', { name: player.name }).toUpperCase()}
          </div>
          <p className="max-w-sm text-fg/70">{t('pass.hint')}</p>
          <span className="btn btn-primary !py-3">{t('pass.go')}</span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
