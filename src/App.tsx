import { AnimatePresence, motion } from 'motion/react'
import { GameScreen } from './components/GameScreen'
import { MenuScreen } from './components/MenuScreen'
import { useGame } from './game/store'
import { useApplyTheme } from './game/theme'

export default function App() {
  const screen = useGame((s) => s.screen)
  useApplyTheme()
  return (
    <AnimatePresence mode="wait">
      {screen === 'menu' ? (
        <motion.div key="menu" className="fixed inset-0" exit={{ opacity: 0, scale: 1.08, filter: 'blur(8px)' }} transition={{ duration: 0.5 }}>
          <MenuScreen />
        </motion.div>
      ) : (
        <motion.div key="game" className="fixed inset-0" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
          <GameScreen />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
