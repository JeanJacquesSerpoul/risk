import type { SeatInfo, SeatKind } from './netStore'

/**
 * Online games: a "room" links a host and guests. The game runs in the host's
 * browser, which validates the guests' moves and broadcasts the game state
 * (peer-to-peer WebRTC, no server of our own).
 */

/** What the host keeps about a room, besides the game itself. */
export interface RoomMeta {
  code: string
  /** For each seat: who controls it and its secret token (null while free, and for computers). */
  seats: { kind: SeatKind; token: string | null }[]
}

/** Game actions a guest may ask the host to perform for its seat. */
export const REMOTE_ACTIONS = [
  'clickTerritory',
  'setPlaceStep',
  'place',
  'autoPlace',
  'attack',
  'blitz',
  'confirmMove',
  'cancelMove',
  'endAttack',
  'endTurn',
  'trade',
  'setCardsOpen',
  'select',
  'fortify',
] as const
export type RemoteAction = (typeof REMOTE_ACTIONS)[number]

/** Requests from a guest to the host (each request expects a reply with the same `id`). */
export type PeerRequest =
  | { t: 'hello'; id: number; token?: string }
  | { t: 'join'; id: number; seat: number; name: string; token?: string }
  | { t: 'act'; id: number; token: string; name: RemoteAction; args: unknown[] }

/** Messages from the host: replies, and events broadcast to every guest. */
export type PeerReply =
  | { t: 'ok'; id: number; seat?: number; token?: string }
  | { t: 'fail'; id: number; code: string }
  | { t: 'seats'; seats: SeatInfo[]; started: boolean }
  | { t: 'state'; snap: Record<string, unknown> }
  | { t: 'sfx'; name: string }
  | { t: 'closed' }

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function randomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n)
  // getRandomValues also works outside HTTPS (local network), unlike randomUUID.
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

/** Short, readable room code (no 0/O nor 1/I/L). */
export function makeRoomCode(): string {
  return [...randomBytes(6)].map((b) => ALPHABET[b % ALPHABET.length]).join('')
}

export const isRoomCode = (code: string) => /^[A-HJKMNP-Z2-9]{6}$/.test(code)

/** Secret token of a seat (proof that one may play it). */
export function makeToken(): string {
  return [...randomBytes(16)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Online: the first player is the host, the other humans are guests. */
export function seatKinds(players: { ai: boolean }[]): SeatKind[] {
  return players.map((p, i) => (i === 0 ? 'host' : p.ai ? 'bot' : 'remote'))
}

export function newRoom(players: { ai: boolean }[]): RoomMeta {
  return { code: makeRoomCode(), seats: seatKinds(players).map((kind) => ({ kind, token: kind === 'host' ? makeToken() : null })) }
}

/** Seat controlled by this token (-1 if none). */
export function seatOfToken(meta: RoomMeta, token: string | null | undefined): number {
  return token ? meta.seats.findIndex((s) => s.token === token) : -1
}

export class NetError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

/**
 * A guest takes (or takes back, with its token) a seat. Returns the updated room
 * and the guest's token, without modifying the room received.
 */
export function joinSeat(meta: RoomMeta, seat: number, token?: string): { meta: RoomMeta; token: string } {
  const s = meta.seats[seat]
  if (s?.kind !== 'remote') throw new NetError('seatTaken')
  if (s.token && s.token !== token) throw new NetError('seatTaken')
  // A device keeps a single seat: it leaves the previous one when it changes.
  const mine = token ?? makeToken()
  const seats = meta.seats.map((x, i) => (i === seat ? { ...x, token: mine } : x.token === mine ? { ...x, token: null } : x))
  return { meta: { ...meta, seats }, token: mine }
}

/** When the game starts, seats nobody took are given to the computer. */
export function freeSeatsToBots(meta: RoomMeta): { meta: RoomMeta; bots: number[] } {
  const bots = meta.seats.flatMap((s, i) => (s.kind === 'remote' && !s.token ? [i] : []))
  return { meta: { ...meta, seats: meta.seats.map((s, i) => (bots.includes(i) ? { kind: 'bot', token: null } : s)) }, bots }
}

export function seatInfos(meta: RoomMeta, players: { name: string; color: string }[], connected: Set<number>): SeatInfo[] {
  return meta.seats.map((s, seat) => ({
    seat,
    name: players[seat]?.name ?? '',
    color: players[seat]?.color ?? '#888',
    kind: s.kind,
    claimed: s.kind !== 'remote' || s.token !== null,
    connected: s.kind !== 'remote' || connected.has(seat),
  }))
}

export const cleanName = (name: unknown, fallback: string) => String(name ?? '').trim().slice(0, 14) || fallback
