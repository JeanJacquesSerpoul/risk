import { useEffect, useState } from 'react'
import { runAI } from '../game/ai'
import { useGame } from '../game/store'
import { ActionPanel } from './ActionPanel'
import { CardsPanel, NewCardToast } from './CardsPanel'
import { DiceTray } from './DiceTray'
import { MapView } from './MapView'
import { LogTicker, MoveDialog, PauseMenu, TurnBanner, VictoryScreen } from './Overlays'
import { TopBar } from './TopBar'

export function GameScreen() {
  const [paused, setPaused] = useState(false)
  const gameId = useGame((s) => s.gameId)
  const current = useGame((s) => s.current)
  const phase = useGame((s) => s.phase)
  const turn = useGame((s) => s.turn)
  const busy = useGame((s) => s.busy)

  // Drive AI players.
  useEffect(() => {
    void runAI()
  }, [gameId, current, phase, turn, busy])

  // Keyboard shortcuts (desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useGame.getState()
      if (s.players[s.current]?.ai) return
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
      <TopBar onMenu={() => setPaused(true)} />
      <LogTicker />
      <DiceTray />
      <ActionPanel />
      <TurnBanner />
      <MoveDialog />
      <CardsPanel />
      <NewCardToast />
      <VictoryScreen />
      <PauseMenu open={paused} onClose={() => setPaused(false)} />
    </div>
  )
}
