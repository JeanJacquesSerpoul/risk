import { motion } from 'motion/react'
import { Bot, Copy, Crown, Globe, LogIn, Play, Share2, User, Wifi, WifiOff, X } from 'lucide-react'
import { useState } from 'react'
import type { PlayerConfig } from '../game/store'
import { openDialog } from '../game/ui'
import { useT } from '../i18n/useT'
import { type SeatInfo, useNet } from '../net/netStore'
import { isRoomCode } from '../net/protocol'
import { createRoom, joinRoom, leaveRoom, roomLink, startOnlineGame, takeSeat } from '../net/session'
import { BackgroundMap } from './MenuScreen'
import { Modal } from './Modal'

/** Create a room with the players set up in the menu, or join a friend's room. */
export function OnlineDialog({ players, manual }: { players: PlayerConfig[]; manual: boolean }) {
  const { t } = useT()
  const [code, setCode] = useState('')
  const hasGuest = players.slice(1).some((p) => !p.ai)
  const close = () => openDialog(null)
  return (
    <Modal title={t('online.title').toUpperCase()} subtitle={t('online.subtitle')} onClose={close}>
      <section className="rounded-2xl bg-surface p-4">
        <h3 className="font-bold">{t('online.createTitle')}</h3>
        <p className="mt-1 text-sm text-fg/60">{t('online.createHint')}</p>
        {!hasGuest && <p className="mt-2 text-sm font-bold text-amber-600 dark:text-yellow-300">{t('online.needGuest')}</p>}
        <button
          className="btn btn-primary mt-3 w-full"
          disabled={!hasGuest}
          onClick={() => {
            close()
            void createRoom(players, manual)
          }}
        >
          <Globe size={14} /> {t('online.create')}
        </button>
      </section>
      <form
        className="mt-3 rounded-2xl bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!isRoomCode(code)) return
          close()
          void joinRoom(code)
        }}
      >
        <label htmlFor="room-code" className="font-bold">
          {t('online.joinTitle')}
        </label>
        <p className="mt-1 text-sm text-fg/60">{t('online.joinHint')}</p>
        <div className="mt-3 flex gap-2">
          <input
            id="room-code"
            value={code}
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="ABC234"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-2 text-center font-display text-lg tracking-[0.3em] outline-none focus:ring-2 focus:ring-neon/50"
          />
          <button type="submit" className="btn btn-primary" disabled={!isRoomCode(code)}>
            <LogIn size={14} /> {t('online.join')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function SeatRow({ seat, mine, selectable, selected, onSelect }: { seat: SeatInfo; mine: boolean; selectable: boolean; selected: boolean; onSelect: () => void }) {
  const { t } = useT()
  const free = seat.kind === 'remote' && !seat.claimed
  return (
    <button
      disabled={!selectable}
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-2xl p-2 pr-3 text-left transition disabled:cursor-default"
      style={{
        background: `linear-gradient(90deg, ${seat.color}26, var(--ghost-bg))`,
        border: `1px solid ${selected ? seat.color : `${seat.color}55`}`,
        boxShadow: selected ? `0 0 16px ${seat.color}66` : undefined,
      }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: seat.color, boxShadow: `0 0 12px ${seat.color}` }}>
        {seat.kind === 'bot' ? <Bot size={15} /> : seat.kind === 'host' ? <Crown size={15} /> : <User size={15} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">
          {free ? t('seat.free') : seat.name} {mine && <span className="text-fg/50">{t('seat.you')}</span>}
        </span>
        <span className="block text-xs text-fg/50">{t(seat.kind === 'bot' ? 'seat.bot' : seat.kind === 'host' ? 'seat.host' : 'seat.guest')}</span>
      </span>
      {seat.kind === 'remote' && seat.claimed && (
        <span className="flex items-center gap-1 text-xs font-bold" style={{ color: seat.connected ? '#10b981' : '#f59e0b' }}>
          {seat.connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {t(seat.connected ? 'seat.connected' : 'seat.away')}
        </span>
      )}
    </button>
  )
}

/** Waiting room: share the code, take a seat, then the host starts the game. */
export function Lobby() {
  const net = useNet()
  const { t } = useT()
  const [copied, setCopied] = useState(false)
  const [pick, setPick] = useState<number | null>(null)
  const [name, setName] = useState('')
  const code = net.code ?? ''
  const link = roomLink(code)
  const connecting = net.role === 'guest' && net.seats.length === 0 && !net.error

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt(t('lobby.link'), link)
    }
  }
  const share = () => void navigator.share?.({ title: 'RISK', text: t('lobby.shareText', { code }), url: link }).catch(() => {})

  const chooseSeat = net.role === 'guest' && net.mySeat === null && !net.started
  const freeSeats = net.seats.filter((s) => s.kind === 'remote' && !s.claimed)

  return (
    <div className="relative h-full w-full overflow-y-auto" style={{ height: '100dvh' }}>
      <BackgroundMap />
      <div className="relative flex min-h-full flex-col items-center justify-center px-3 py-8">
        <motion.div className="glass w-full max-w-lg rounded-3xl p-5" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-black tracking-widest text-neon text-glow">{t('lobby.title', { code })}</h2>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs font-bold" style={{ color: net.link === 'online' ? '#10b981' : '#f59e0b' }}>
                {net.link === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />} {t(`link.${net.link}`)}
              </div>
            </div>
            <button className="btn btn-ghost !p-2" onClick={() => leaveRoom(net.role === 'host')} title={t(net.role === 'host' ? 'lobby.close' : 'lobby.leave')}>
              <X size={16} />
            </button>
          </div>

          {net.error && (
            <div className="mt-4 rounded-2xl bg-rose-500/15 p-3 text-sm font-bold text-rose-700 dark:text-rose-200">
              {t(`error.${net.error}` as 'error.network')}
              {net.role === 'guest' && (
                <div className="mt-2 flex gap-2">
                  <button className="btn btn-ghost" onClick={() => void joinRoom(code)}>
                    {t('online.retry')}
                  </button>
                  <button className="btn btn-ghost" onClick={() => leaveRoom()}>
                    {t('common.back')}
                  </button>
                </div>
              )}
            </div>
          )}

          {connecting && (
            <div className="mt-6 flex flex-col items-center gap-3 py-6 text-fg/70">
              <motion.div className="h-10 w-10 rounded-full border-4 border-neon/30 border-t-neon" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
              {t('online.connecting', { code })}
            </div>
          )}

          {!connecting && (
            <>
              <div className="mt-4 grid gap-2 sm:grid-cols-[auto_1fr]">
                <div className="rounded-2xl bg-surface px-4 py-2 text-center">
                  <div className="text-[10px] font-bold tracking-widest text-fg/50">{t('lobby.code').toUpperCase()}</div>
                  <div className="font-display text-2xl font-black tracking-[0.25em]">{code}</div>
                </div>
                <div className="flex min-w-0 flex-col justify-center gap-2 rounded-2xl bg-surface px-3 py-2">
                  <div className="truncate text-xs text-fg/60">{link}</div>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost flex-1 !px-2" onClick={() => void copy()}>
                      <Copy size={13} /> {copied ? t('lobby.copied') : t('lobby.copy')}
                    </button>
                    {'share' in navigator && (
                      <button className="btn btn-ghost flex-1 !px-2" onClick={share}>
                        <Share2 size={13} /> {t('lobby.share')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {net.role === 'host' && <p className="mt-2 text-xs text-fg/50">{t('lobby.hint')}</p>}

              <h3 className="mb-2 mt-4 font-display text-[10px] font-bold tracking-[0.25em] text-fg/50">
                {(chooseSeat ? t('seat.choose') : t('lobby.players')).toUpperCase()}
              </h3>
              <div className="flex flex-col gap-1.5">
                {net.seats.map((s) => (
                  <SeatRow
                    key={s.seat}
                    seat={s}
                    mine={s.seat === net.mySeat}
                    selectable={chooseSeat && s.kind === 'remote' && !s.claimed}
                    selected={pick === s.seat}
                    onSelect={() => setPick(s.seat)}
                  />
                ))}
              </div>

              {chooseSeat && (
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const seat = pick ?? freeSeats[0]?.seat
                    if (seat !== undefined) void takeSeat(seat, name)
                  }}
                >
                  <input
                    value={name}
                    maxLength={14}
                    placeholder={t('seat.yourName')}
                    onChange={(e) => setName(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-2 font-bold outline-none focus:ring-2 focus:ring-neon/50"
                  />
                  <button type="submit" className="btn btn-primary" disabled={!freeSeats.length || !name.trim()}>
                    {t('seat.take')}
                  </button>
                </form>
              )}

              {net.role === 'host' && (
                <>
                  <button className="btn btn-primary mt-4 w-full !py-3" onClick={startOnlineGame}>
                    <Play size={15} fill="currentColor" /> {t('lobby.start')}
                  </button>
                  {net.seats.some((s) => s.kind === 'remote' && !s.claimed) && <p className="mt-2 text-center text-xs text-fg/50">{t('lobby.startHint')}</p>}
                </>
              )}
              {net.role === 'guest' && net.mySeat !== null && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-fg/70">
                  <motion.span className="h-2 w-2 rounded-full bg-neon" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2 }} />
                  {t('lobby.waitHost')}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
