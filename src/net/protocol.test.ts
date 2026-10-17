import { describe, expect, it } from 'vitest'
import { freeSeatsToBots, isRoomCode, joinSeat, makeRoomCode, newRoom, seatInfos, seatOfToken } from './protocol'

const players = [{ ai: false }, { ai: false }, { ai: true }, { ai: false }]

describe('rooms', () => {
  it('makes readable room codes', () => {
    for (let i = 0; i < 50; i++) expect(isRoomCode(makeRoomCode())).toBe(true)
    expect(isRoomCode('ABCDE1')).toBe(false)
    expect(isRoomCode('abc234')).toBe(false)
  })

  it('gives the first seat to the host and the other humans to guests', () => {
    const meta = newRoom(players)
    expect(meta.seats.map((s) => s.kind)).toEqual(['host', 'remote', 'bot', 'remote'])
    expect(seatOfToken(meta, meta.seats[0].token)).toBe(0)
    expect(meta.seats[1].token).toBeNull()
  })

  it('lets a guest take a free seat, come back with its token, and change seat', () => {
    const meta = newRoom(players)
    const a = joinSeat(meta, 1)
    expect(seatOfToken(a.meta, a.token)).toBe(1)
    expect(() => joinSeat(a.meta, 1)).toThrow('seatTaken')
    expect(joinSeat(a.meta, 1, a.token).token).toBe(a.token)
    const moved = joinSeat(a.meta, 3, a.token)
    expect(seatOfToken(moved.meta, a.token)).toBe(3)
    expect(moved.meta.seats[1].token).toBeNull()
    expect(() => joinSeat(meta, 0)).toThrow('seatTaken')
    expect(() => joinSeat(meta, 2)).toThrow('seatTaken')
  })

  it('gives the seats nobody took to the computer', () => {
    const a = joinSeat(newRoom(players), 1)
    const { meta, bots } = freeSeatsToBots(a.meta)
    expect(bots).toEqual([3])
    expect(meta.seats[3]).toEqual({ kind: 'bot', token: null })
    expect(meta.seats[1].token).toBe(a.token)
  })

  it('describes the seats for the lobby', () => {
    const a = joinSeat(newRoom(players), 1)
    const names = players.map((_, i) => ({ name: `P${i}`, color: '#fff' }))
    const seats = seatInfos(a.meta, names, new Set([0]))
    expect(seats.map((s) => [s.claimed, s.connected])).toEqual([
      [true, true],
      [true, false],
      [true, true],
      [false, false],
    ])
  })
})
