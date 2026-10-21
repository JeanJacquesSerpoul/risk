import { create } from 'zustand'
import { useNet } from '../net/netStore'
import type { Advice } from './advisor'
import { type GameState, useGame } from './store'

export type Dialog = 'settings' | 'online' | 'intro' | 'stats' | null

/** Interface state of this device only (never saved nor shared). */
interface UiState {
  dialog: Dialog
  /** Latest advice, highlighted on the map until the player moves on. */
  advice: Advice | null
  /** The advisor's window is open. */
  adviceOpen: boolean
  /** Territory under the mouse pointer, for the tooltip. */
  hover: string | null
}

export const useUi = create<UiState>(() => ({ dialog: null, advice: null, adviceOpen: false, hover: null }))

export const openDialog = (dialog: Dialog) => useUi.setState({ dialog })

/** Is this seat played by a human on this device? */
export function isLocalHuman(s: Pick<GameState, 'players'>, seat: number, net = useNet.getState()): boolean {
  const p = s.players[seat]
  if (!p || p.ai) return false
  return net.role === 'off' || net.mySeat === seat
}

/** Can the person holding this device play right now? */
export function canActNow(s: GameState, net = useNet.getState()): boolean {
  return s.screen === 'game' && s.winner === null && s.handoff === null && isLocalHuman(s, s.current, net)
}

/** Reactive version of `canActNow`. */
export function useCanAct(): boolean {
  const net = useNet()
  return useGame((s) => canActNow(s, net))
}
