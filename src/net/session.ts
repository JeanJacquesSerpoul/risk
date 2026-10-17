import type { DataConnection, Peer } from 'peerjs'
import { type GameState, type PlayerConfig, setForwarder, snapshot, useGame } from '../game/store'
import { onSfx, playSfx } from '../game/sound'
import { NET_OFF, useNet } from './netStore'
import {
  cleanName,
  freeSeatsToBots,
  joinSeat,
  NetError,
  newRoom,
  type PeerReply,
  type PeerRequest,
  REMOTE_ACTIONS,
  type RemoteAction,
  type RoomMeta,
  seatInfos,
  seatOfToken,
} from './protocol'

/**
 * Online rooms, peer-to-peer (WebRTC through PeerJS): the game runs in the host's
 * browser, which validates the guests' moves, plays the computers and broadcasts
 * the game state. Works on a static site (GitHub Pages), with no server of our own.
 */

const peerId = (code: string) => `jjs-risk-conquete-${code}`
const PEER_OPTIONS = { debug: 0 } as const

async function loadPeer(): Promise<typeof Peer> {
  // Only loaded when playing online.
  return (await import('peerjs')).Peer
}

export const roomLink = (code: string) => `${location.origin}${location.pathname}#/room/${code}`

// ── Guest identities kept in the browser (to come back to one's seat) ──

const IDS_KEY = 'risk-rooms-v1'
interface Identity {
  token: string
  seat: number
}

function loadIds(): Record<string, Identity> {
  try {
    return JSON.parse(localStorage.getItem(IDS_KEY) ?? '{}') as Record<string, Identity>
  } catch {
    return {}
  }
}

function saveIdentity(code: string, id: Identity | null) {
  try {
    const ids = loadIds()
    if (id) ids[code] = id
    else delete ids[code]
    localStorage.setItem(IDS_KEY, JSON.stringify(ids))
  } catch {
    /* private browsing: the identity lasts as long as the page */
  }
}

const errorCode = (e: unknown) => (e as { code?: string })?.code ?? 'network'

// ── Host ──

class HostSession {
  private peer: Peer | null = null
  private conns = new Map<DataConnection, { seat: number }>()
  private closed = false
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private unsubs: (() => void)[] = []
  private sendTimer: ReturnType<typeof setTimeout> | null = null
  private lastSeats = ''

  constructor(
    /** Room while in the lobby (afterwards it lives in the saved game). */
    private lobbyMeta: RoomMeta | null,
    private lobby: { players: PlayerConfig[]; manual: boolean } | null,
  ) {}

  get started() {
    return this.lobby === null
  }

  get meta(): RoomMeta {
    return this.started ? useGame.getState().room! : this.lobbyMeta!
  }

  set meta(meta: RoomMeta) {
    if (this.started) useGame.setState({ room: meta })
    else this.lobbyMeta = meta
  }

  private players(): { name: string; color: string }[] {
    return this.lobby ? this.lobby.players : useGame.getState().players
  }

  async open() {
    useNet.setState({ ...NET_OFF, role: 'host', code: this.meta.code, mySeat: 0, started: this.started, link: 'connecting' })
    this.publishSeats()
    this.unsubs.push(
      useGame.subscribe(() => this.scheduleState()),
      onSfx((name) => this.started && this.broadcast({ t: 'sfx', name })),
    )
    await this.listen()
  }

  private async listen() {
    const PeerClass = await loadPeer()
    if (this.closed) return
    const peer = new PeerClass(peerId(this.meta.code), PEER_OPTIONS)
    this.peer = peer
    peer.on('open', () => useNet.setState({ link: 'online', error: null }))
    peer.on('disconnected', () => {
      // Lost the signalling server: guests already connected keep playing.
      useNet.setState({ link: 'offline' })
      if (!this.closed && !peer.destroyed) this.retryTimer = setTimeout(() => peer.reconnect(), 3000)
    })
    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') return
      useNet.setState({ link: 'offline' })
      // Id still held by an old tab, or network down: try again later.
      if (!this.closed && ['unavailable-id', 'network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) {
        peer.destroy()
        this.retryTimer = setTimeout(() => void this.listen(), 4000)
      }
    })
    peer.on('connection', (conn) => {
      this.conns.set(conn, { seat: -1 })
      conn.on('data', (data) => this.onRequest(conn, data as PeerRequest))
      conn.on('close', () => {
        this.conns.delete(conn)
        this.publishSeats()
      })
      conn.on('error', () => conn.close())
    })
  }

  private send(conn: DataConnection, msg: PeerReply) {
    if (conn.open) void conn.send(msg)
  }

  private broadcast(msg: PeerReply) {
    for (const conn of this.conns.keys()) this.send(conn, msg)
  }

  private publishSeats(force = false) {
    const connected = new Set([0, ...[...this.conns.values()].map((c) => c.seat)])
    const seats = seatInfos(this.meta, this.players(), connected)
    const key = JSON.stringify([seats, this.started])
    if (!force && key === this.lastSeats) return
    this.lastSeats = key
    useNet.setState({ seats, started: this.started })
    this.broadcast({ t: 'seats', seats, started: this.started })
  }

  /** Game state broadcast, at most every 50 ms. */
  private scheduleState() {
    if (!this.started || this.sendTimer) return
    this.sendTimer = setTimeout(() => {
      this.sendTimer = null
      if (this.closed) return
      this.publishSeats()
      this.broadcast({ t: 'state', snap: snapshot(useGame.getState()) as unknown as Record<string, unknown> })
    }, 50)
  }

  private onRequest(conn: DataConnection, req: PeerRequest) {
    const info = this.conns.get(conn)
    if (!info) return
    try {
      if (req.t === 'hello') {
        const seat = seatOfToken(this.meta, req.token)
        info.seat = seat > 0 ? seat : -1
        this.send(conn, { t: 'ok', id: req.id, seat: info.seat })
        this.publishSeats(true)
        if (this.started) this.send(conn, { t: 'state', snap: snapshot(useGame.getState()) as unknown as Record<string, unknown> })
      } else if (req.t === 'join') {
        if (this.started && seatOfToken(this.meta, req.token) !== req.seat) throw new NetError('started')
        const joined = joinSeat(this.meta, req.seat, req.token)
        this.meta = joined.meta
        if (this.lobby) {
          const players = this.lobby.players.map((p, i) => (i === req.seat ? { ...p, name: cleanName(req.name, p.name) } : p))
          this.lobby = { ...this.lobby, players }
        }
        info.seat = req.seat
        this.send(conn, { t: 'ok', id: req.id, seat: req.seat, token: joined.token })
        this.publishSeats(true)
      } else if (req.t === 'act') {
        this.act(req.token, req.name, req.args)
        this.send(conn, { t: 'ok', id: req.id })
      }
    } catch (e) {
      this.send(conn, { t: 'fail', id: req.id, code: errorCode(e) })
    }
  }

  /** Plays a guest's move, if it is that guest's turn. */
  private act(token: string, name: RemoteAction, args: unknown[]) {
    const s = useGame.getState()
    const seat = seatOfToken(this.meta, token)
    if (!this.started || seat <= 0 || seat !== s.current || s.players[seat]?.ai || !REMOTE_ACTIONS.includes(name)) throw new NetError('badToken')
    ;(s[name] as (...a: unknown[]) => unknown)(...args)
  }

  /** Lobby: everybody is there, the game begins (free seats go to the computer). */
  start() {
    if (!this.lobby || !this.lobbyMeta) return
    const { meta, bots } = freeSeatsToBots(this.lobbyMeta)
    const players = this.lobby.players.map((p, i) => (bots.includes(i) ? { ...p, ai: true } : p))
    const manual = this.lobby.manual
    this.lobby = null
    this.lobbyMeta = null
    useGame.getState().newGame(players, manual, meta)
    useNet.setState({ started: true })
    this.publishSeats(true)
    this.scheduleState()
  }

  close(notify: boolean) {
    this.closed = true
    if (notify) this.broadcast({ t: 'closed' })
    for (const u of this.unsubs) u()
    if (this.retryTimer) clearTimeout(this.retryTimer)
    if (this.sendTimer) clearTimeout(this.sendTimer)
    // Let the last message leave before cutting the connections.
    const peer = this.peer
    setTimeout(() => peer?.destroy(), notify ? 300 : 0)
  }
}

// ── Guest ──

class GuestSession {
  private peer: Peer | null = null
  private conn: DataConnection | null = null
  private nextId = 1
  private pending = new Map<number, { resolve: (r: PeerReply & { t: 'ok' }) => void; reject: (e: Error) => void }>()
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private closed = false
  private me: Identity | null
  /** Effects already played and removed here (the host may still list them for a moment). */
  private removedFx = new Set<number>()
  private unsub: (() => void) | null = null

  constructor(readonly code: string) {
    this.me = loadIds()[code] ?? null
  }

  /** Connects to the host; fails if the host cannot be reached. */
  async connect(): Promise<void> {
    const PeerClass = await loadPeer()
    if (this.closed) return
    useNet.setState({ link: 'connecting' })
    this.peer?.destroy()
    const peer = new PeerClass(PEER_OPTIONS)
    this.peer = peer
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new NetError('hostOffline')), 15_000)
      const fail = (code: string) => {
        clearTimeout(timeout)
        reject(new NetError(code))
      }
      peer.on('error', (err) => fail(err.type === 'peer-unavailable' ? 'hostOffline' : 'network'))
      peer.on('open', () => {
        const conn = peer.connect(peerId(this.code), { reliable: true, serialization: 'json' })
        this.conn = conn
        conn.on('data', (data) => this.onReply(data as PeerReply))
        conn.on('close', () => this.lost(conn))
        conn.on('open', () => {
          this.request({ t: 'hello', id: 0, token: this.me?.token })
            .then((r) => {
              clearTimeout(timeout)
              // An identity that no longer matches anything (room recreated) is forgotten.
              if (this.me && r.seat !== this.me.seat) {
                this.me = null
                saveIdentity(this.code, null)
              }
              setForwarder((name, args) => this.act(name, args))
              useNet.setState({ link: 'online', error: null, mySeat: this.me?.seat ?? null })
              resolve()
            })
            .catch((e) => fail(errorCode(e)))
        })
      })
    })
  }

  private lost(conn: DataConnection) {
    if (this.conn !== conn || this.closed) return
    for (const p of this.pending.values()) p.reject(new NetError('hostOffline'))
    this.pending.clear()
    useNet.setState({ link: 'offline' })
    // The host may have reloaded its page: keep trying.
    const again = () => {
      if (this.closed) return
      this.connect().catch(() => {
        useNet.setState({ link: 'offline' })
        this.retryTimer = setTimeout(again, 4000)
      })
    }
    this.retryTimer = setTimeout(again, 2000)
  }

  private onReply(msg: PeerReply) {
    if (msg.t === 'ok' || msg.t === 'fail') {
      const p = this.pending.get(msg.id)
      if (!p) return
      this.pending.delete(msg.id)
      if (msg.t === 'ok') p.resolve(msg)
      else p.reject(new NetError(msg.code))
    } else if (msg.t === 'seats') useNet.setState({ seats: msg.seats, started: msg.started })
    else if (msg.t === 'state') this.applyState(msg.snap as Partial<GameState>)
    else if (msg.t === 'sfx') {
      if (useGame.getState().settings.sound) playSfx(msg.name)
    } else if (msg.t === 'closed') {
      this.close()
      useNet.setState({ error: 'closed', link: 'offline' })
    }
  }

  private applyState(snap: Partial<GameState>) {
    const fx = (snap.fx ?? []).filter((f) => !this.removedFx.has(f.id))
    useGame.setState({ ...snap, fx, screen: 'game' })
    if (!this.unsub) {
      // Effects removed here once played must not come back with the next update.
      let known = new Set(fx.map((f) => f.id))
      this.unsub = useGame.subscribe((s) => {
        const now = new Set(s.fx.map((f) => f.id))
        for (const id of known) if (!now.has(id)) this.removedFx.add(id)
        known = now
      })
    }
  }

  private request(req: PeerRequest): Promise<PeerReply & { t: 'ok' }> {
    const conn = this.conn
    if (!conn?.open) return Promise.reject(new NetError('hostOffline'))
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      void conn.send({ ...req, id })
    })
  }

  async join(seat: number, name: string) {
    const r = await this.request({ t: 'join', id: 0, seat, name, token: this.me?.token })
    this.me = { token: r.token!, seat }
    saveIdentity(this.code, this.me)
    useNet.setState({ mySeat: seat })
  }

  act(name: RemoteAction, args: unknown[]) {
    if (!this.me) return
    this.request({ t: 'act', id: 0, token: this.me.token, name, args }).catch(() => {
      /* refused move (not our turn anymore, connection lost…): the next state tells the truth */
    })
  }

  close() {
    this.closed = true
    setForwarder(null)
    this.unsub?.()
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.peer?.destroy()
  }
}

// ── Public API ──

let host: HostSession | null = null
let guest: GuestSession | null = null

/** Creates a room with the players set up in the menu; this device is the host (seat 0). */
export async function createRoom(players: PlayerConfig[], manual: boolean) {
  leaveRoom()
  host = new HostSession(newRoom(players), { players, manual })
  await host.open()
}

/** Reopens the room of the saved online game (after a reload). */
export async function reopenRoom() {
  if (!useGame.getState().room) return
  leaveRoom()
  host = new HostSession(null, null)
  useGame.getState().resume()
  await host.open()
}

export const startOnlineGame = () => host?.start()

export async function joinRoom(code: string) {
  leaveRoom()
  guest = new GuestSession(code)
  useNet.setState({ ...NET_OFF, role: 'guest', code, link: 'connecting' })
  try {
    await guest.connect()
  } catch (e) {
    guest?.close()
    useNet.setState({ error: errorCode(e), link: 'offline' })
  }
}

export async function takeSeat(seat: number, name: string) {
  if (!guest) return
  try {
    await guest.join(seat, name)
  } catch (e) {
    useNet.setState({ error: errorCode(e) })
  }
}

/** Leaves (guest) or closes (host) the current room and goes back to the local game. */
export function leaveRoom(closeForGuests = false) {
  const wasGuest = !!guest
  host?.close(closeForGuests)
  guest?.close()
  host = null
  guest = null
  useNet.setState(NET_OFF)
  if (wasGuest) {
    // The game shown belonged to the host: get the local save back (or nothing).
    const { settings } = useGame.getState()
    useGame.setState({ ...useGame.getInitialState(), settings, screen: 'menu' })
    void Promise.resolve(useGame.persist.rehydrate()).then(() => useGame.setState({ screen: 'menu' }))
  }
}

/** Room code in the address (`#/room/ABC234`), for invitation links. */
export function roomFromHash(): string | null {
  const m = /^#\/room\/([A-Z0-9]{6})$/i.exec(location.hash)
  return m ? m[1].toUpperCase() : null
}
