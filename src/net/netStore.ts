import { create } from 'zustand'

/** Who controls a seat in an online game: the host (seat 0), a remote guest, or the computer. */
export type SeatKind = 'host' | 'remote' | 'bot'

export interface SeatInfo {
  seat: number
  name: string
  color: string
  kind: SeatKind
  /** A guest took this seat (always true for the host and computers). */
  claimed: boolean
  /** The person controlling this seat is connected right now. */
  connected: boolean
}

export type LinkStatus = 'online' | 'connecting' | 'offline'

export interface NetState {
  role: 'off' | 'host' | 'guest'
  code: string | null
  /** Seat played on this device (host: 0; guest: null until a seat is taken). */
  mySeat: number | null
  seats: SeatInfo[]
  /** The game has started (otherwise everybody is in the lobby). */
  started: boolean
  link: LinkStatus
  /** Error code (see `error.*` messages). */
  error: string | null
}

export const NET_OFF: NetState = { role: 'off', code: null, mySeat: null, seats: [], started: false, link: 'online', error: null }

/** Online session state, shared by the interface; never saved. */
export const useNet = create<NetState>(() => NET_OFF)

export const netRole = () => useNet.getState().role
