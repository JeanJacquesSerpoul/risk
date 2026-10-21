import { AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { runAI } from '../game/ai'
import { useGame } from '../game/store'
import { canActNow, useUi } from '../game/ui'
import { ActionPanel } from './ActionPanel'
import { AdvisorSheet } from './AdvisorSheet'
import { CardsPanel, NewCardToast } from './CardsPanel'
import { DiceTray } from './DiceTray'
import { MapView } from './MapView'
import { LogTicker, MoveDialog, PauseMenu, TurnBanner, VictoryScreen } from './Overlays'
import { PassDevice } from './PassDevice'
import { StatsDialog } from './StatsDialog'
import { TerritoryTooltip } from './TerritoryTooltip'
import { TopBar } from './TopBar'

export function GameScreen() {
  const [paused, setPaused] = useState(false)
  const gameId = useGame((s) => s.gameId)
  const current = useGame((s) => s.current)
  const phase = useGame((s) => s.phase)
  const turn = useGame((s) => s.turn)
  const busy = useGame((s) => s.busy)
  const ai = useGame((s) => s.players[s.current]?.ai)
  const stats = useUi((s) => s.dialog === 'stats')

  // Drive AI players.
  useEffect(() => {
    void runAI()
  }, [gameId, current, phase, turn, busy, ai])

  // An advice is only valid for the situation it was given in.
  useEffect(() => useUi.setState({ advice: null, adviceOpen: false }), [current, phase, turn])

  // Keyboard shortcuts (desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useGame.getState()
      if (!canActNow(s) || useUi.getState().dialog) return
      if (e.key === 'Escape') {
        if (s.pendingMove?.kind === 'fortify') s.cancelMove()
        else s.select(null)
      } else if (e.key === ' ' && s.phase === 'attack' && s.target) {
        e.preventDefault()
        void s.attack(3)
      } else if (e.key.toLowerCase() === 'b' && s.phase === 'attack' && s.target) void s.blitz()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink" style={{ height: '100dvh' }}>
      <MapView />
      <TerritoryTooltip />
      <TopBar onMenu={() => setPaused(true)} />
      <LogTicker />
      <DiceTray />
      <ActionPanel />
      <TurnBanner />
      <MoveDialog />
      <CardsPanel />
      <NewCardToast />
      <AdvisorSheet />
      <PassDevice />
      <VictoryScreen />
      <PauseMenu open={paused} onClose={() => setPaused(false)} />
      <AnimatePresence>{stats && <StatsDialog key="stats" />}</AnimatePresence>
    </div>
  )
}
