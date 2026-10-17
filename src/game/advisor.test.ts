import { beforeEach, describe, expect, it } from 'vitest'
import { setForwarder, snapshot, useGame } from './store'
import { type AdvisorInput, advise } from './advisor'
import { ADJ, TERRITORY_IDS, territoriesOf } from './mapData'
import type { Board, Player } from './rules'

const player = (id: number, ai = false): Player => ({ id, name: `P${id}`, color: '#fff', ai, difficulty: 'normal', alive: true, cards: [] })

/** Player 1 holds the world except South America (player 0), with `armies` everywhere. */
function world(armies = 3): Board {
  const sa = new Set(territoriesOf('sa'))
  return Object.fromEntries(TERRITORY_IDS.map((id) => [id, { owner: sa.has(id) ? 0 : 1, armies }]))
}

const input = (patch: Partial<AdvisorInput>): AdvisorInput => ({
  board: world(),
  players: [player(0), player(1, true)],
  current: 0,
  phase: 'reinforce',
  pool: 5,
  conquered: false,
  trades: 0,
  ...patch,
})

describe('advisor', () => {
  it('reinforces one of the player’s borders', () => {
    const a = advise(input({}))
    expect(a.action.type).toBe('place')
    if (a.action.type !== 'place') return
    const b = world()
    expect(b[a.action.terr].owner).toBe(0)
    expect(ADJ[a.action.terr].some((n) => b[n].owner === 1)).toBe(true)
    expect(a.action.n).toBe(5)
    expect(a.reasons.length).toBeGreaterThan(0)
  })

  it('suggests trading a valid set first', () => {
    const players = [
      {
        ...player(0),
        cards: [
          { id: 1, territory: 'peru', kind: 'infantry' as const },
          { id: 2, territory: 'egypt', kind: 'cavalry' as const },
          { id: 3, territory: 'japan', kind: 'artillery' as const },
        ],
      },
      player(1, true),
    ]
    const a = advise(input({ players }))
    expect(a.action).toEqual({ type: 'trade', cards: [1, 2, 3] })
    expect(a.to).toBe('peru')
  })

  it('attacks with good odds and explains them', () => {
    const board = world(2)
    board.brazil.armies = 12
    const a = advise(input({ board, phase: 'attack' }))
    expect(a.action.type).toBe('attack')
    if (a.action.type !== 'attack') return
    expect(a.action.from).toBe('brazil')
    expect(ADJ.brazil).toContain(a.action.to)
    expect(a.odds).toBeGreaterThan(0.45)
  })

  it('stops attacking when the odds are poor', () => {
    const board = world(10)
    const a = advise(input({ board, phase: 'attack', conquered: true }))
    expect(a.action.type).toBe('endAttack')
  })

  it('moves idle troops to a border', () => {
    const board = world(1)
    board.peru.armies = 8 // Peru only touches South American territories
    const a = advise(input({ board, phase: 'fortify' }))
    expect(a.action).toMatchObject({ type: 'fortify', from: 'peru', n: 7 })
  })

  it('warns about rival continents', () => {
    const a = advise(input({}))
    expect(a.warnings.some((w) => w.k === 'warn.continent')).toBe(true)
  })
})

describe('store', () => {
  beforeEach(() => {
    setForwarder(null)
    useGame.getState().updateSettings({ sound: false, passDevice: true })
  })

  it('hides the game between two humans sharing the device', () => {
    const g = useGame.getState()
    g.newGame(
      [
        { name: 'A', color: '#f00', ai: false, difficulty: 'normal' },
        { name: 'B', color: '#00f', ai: false, difficulty: 'normal' },
      ],
      false,
    )
    expect(useGame.getState().handoff).toBe(0)
    useGame.getState().revealTurn()
    expect(useGame.getState().handoff).toBeNull()
  })

  it('does not hide the game for a single human', () => {
    useGame.getState().newGame(
      [
        { name: 'A', color: '#f00', ai: false, difficulty: 'normal' },
        { name: 'B', color: '#00f', ai: true, difficulty: 'normal' },
      ],
      false,
    )
    expect(useGame.getState().handoff).toBeNull()
  })

  it('forwards moves to the host on a guest’s device', () => {
    useGame.getState().newGame(
      [
        { name: 'A', color: '#f00', ai: false, difficulty: 'normal' },
        { name: 'B', color: '#00f', ai: true, difficulty: 'normal' },
      ],
      false,
    )
    const sent: [string, unknown[]][] = []
    setForwarder((name, args) => sent.push([name, args]))
    const before = useGame.getState().pool
    useGame.getState().setPlaceStep(5)
    useGame.getState().endTurn()
    expect(sent).toEqual([
      ['setPlaceStep', [5]],
      ['endTurn', []],
    ])
    expect(useGame.getState().pool).toBe(before)
    expect(useGame.getState().placeStep).not.toBe(5)
  })

  it('shares the game but not the device settings', () => {
    const snap = snapshot(useGame.getState()) as unknown as Record<string, unknown>
    expect(snap.board).toBeDefined()
    expect(snap.settings).toBeUndefined()
    expect(snap.room).toBeUndefined()
    expect(Object.values(snap).some((v) => typeof v === 'function')).toBe(false)
  })

  it('hands an absent player over to the computer', () => {
    useGame.getState().newGame(
      [
        { name: 'A', color: '#f00', ai: false, difficulty: 'normal' },
        { name: 'B', color: '#00f', ai: false, difficulty: 'normal' },
      ],
      false,
    )
    useGame.getState().setAi(1)
    expect(useGame.getState().players[1].ai).toBe(true)
    expect(useGame.getState().log.at(-1)?.msg.k).toBe('log.toAi')
  })
})
