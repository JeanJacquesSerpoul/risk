import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect } from 'react'
import { GameScreen } from './components/GameScreen'
import { introSeen, IntroVideo } from './components/IntroVideo'
import { MenuScreen } from './components/MenuScreen'
import { Lobby } from './components/Online'
import { SettingsDialog } from './components/SettingsDialog'
import { useGame } from './game/store'
import { useApplyTheme } from './game/theme'
import { openDialog, useUi } from './game/ui'
import { useApplyLang } from './i18n/useT'
import { useNet } from './net/netStore'
import { joinRoom, roomFromHash } from './net/session'

export default function App() {
  const screen = useGame((s) => s.screen)
  const lobby = useNet((s) => s.role !== 'off' && !s.started)
  const dialog = useUi((s) => s.dialog)
  useApplyTheme()
  useApplyLang()

  // Invitation link (#/room/CODE), or the presentation on a first visit.
  useEffect(() => {
    const join = () => {
      const code = roomFromHash()
      if (!code) return
      history.replaceState(null, '', location.pathname + location.search)
      void joinRoom(code)
    }
    if (roomFromHash()) join()
    else if (!introSeen() && useGame.getState().screen === 'menu') openDialog('intro')
    window.addEventListener('hashchange', join)
    return () => window.removeEventListener('hashchange', join)
  }, [])

  const view = lobby ? 'lobby' : screen
  return (
    // reducedMotion="user": transforms and layout animations are skipped when the OS asks for less motion.
    <MotionConfig reducedMotion="user">
      {/* No "wait" mode: the menu and the game cross-fade instead of passing through an empty screen. */}
      <AnimatePresence>
        {view === 'lobby' ? (
          <motion.div key="lobby" className="fixed inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Lobby />
          </motion.div>
        ) : view === 'menu' ? (
          <motion.div key="menu" className="fixed inset-0 z-10" exit={{ opacity: 0, scale: 1.08, filter: 'blur(8px)' }} transition={{ duration: 0.5 }}>
            <MenuScreen />
          </motion.div>
        ) : (
          <motion.div key="game" className="fixed inset-0" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <GameScreen />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {dialog === 'settings' && <SettingsDialog key="settings" />}
        {dialog === 'intro' && <IntroVideo key="intro" />}
      </AnimatePresence>
    </MotionConfig>
  )
}
