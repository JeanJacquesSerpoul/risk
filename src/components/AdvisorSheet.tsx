import { AnimatePresence, motion } from 'motion/react'
import { Lightbulb, TriangleAlert } from 'lucide-react'
import type { AdviceAction } from '../game/advisor'
import { pct } from '../game/odds'
import { useGame } from '../game/store'
import { useCanAct, useUi } from '../game/ui'
import { useT } from '../i18n/useT'
import { Modal } from './Modal'

/** Plays the advised move (on a guest's device, the store forwards it to the host). */
function follow(a: AdviceAction) {
  const g = useGame.getState()
  switch (a.type) {
    case 'trade':
      g.trade(a.cards)
      break
    case 'place':
      g.place(a.terr, a.n)
      break
    case 'attack':
      g.select(a.from, a.to)
      void g.blitz()
      break
    case 'endAttack':
      g.endAttack()
      break
    case 'fortify':
      g.fortify(a.from, a.to, a.n)
      break
    case 'endTurn':
      g.endTurn()
      break
  }
}

/** The military advisor's window: the advice, its reasons and some intelligence. */
export function AdvisorSheet() {
  const advice = useUi((s) => s.advice)
  const open = useUi((s) => s.adviceOpen)
  const canAct = useCanAct()
  const busy = useGame((s) => s.busy)
  const { t, m } = useT()
  const close = () => useUi.setState({ adviceOpen: false })
  const show = open && !!advice && canAct

  return (
    <AnimatePresence>
      {show && advice && (
        <Modal title={t('advisor.title').toUpperCase()} onClose={close} z="z-40">
          <div className="flex items-start gap-3">
            <motion.div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
              style={{ background: 'rgba(255,209,102,0.18)', boxShadow: 'inset 0 0 0 1px rgba(255,209,102,0.5)' }}
              initial={{ rotate: -12, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12 }}
              aria-hidden
            >
              🎖️
            </motion.div>
            <motion.div className="min-w-0 flex-1 rounded-2xl bg-surface p-3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <p className="flex items-center gap-2 font-bold">
                <Lightbulb size={16} className="shrink-0 text-amber-500 dark:text-yellow-300" />
                {m(advice.headline)}
              </p>
              {advice.odds !== undefined && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-fg/10">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: advice.odds >= 0.65 ? '#10b981' : '#f59e0b' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct(advice.odds)}%` }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  />
                </div>
              )}
              <ul className="mt-2 space-y-1 text-sm text-fg/75">
                {advice.reasons.map((r, i) => (
                  <motion.li key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}>
                    • {m(r)}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>

          {advice.warnings.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-1.5 font-display text-[10px] font-bold tracking-[0.25em] text-fg/50">{t('advisor.warnings').toUpperCase()}</h3>
              <ul className="space-y-1 text-sm">
                {advice.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-200">
                    <TriangleAlert size={14} className="mt-0.5 shrink-0" /> {m(w)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-xs text-fg/45">{t('advisor.note')}</p>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-ghost flex-1" onClick={close}>
              {t('advisor.decide')}
            </button>
            <button
              className="btn btn-primary flex-1"
              disabled={busy}
              onClick={() => {
                useUi.setState({ advice: null, adviceOpen: false })
                follow(advice.action)
              }}
            >
              {t('advisor.follow')}
            </button>
          </div>
        </Modal>
      )}
    </AnimatePresence>
  )
}
