import { CONTINENTS, type ContinentId, TERRITORIES, TERRITORY_BY_ID } from './mapData'
import { type Board, canAttackFrom, enemyNeighbors, findSet, ownedBy, reachable } from './rules'
import { sleep, useGame } from './store'

const get = () => useGame.getState()
const pause = (ms: number) => sleep(ms / get().settings.speed)

const contOf = (id: string) => TERRITORY_BY_ID[id].continent
const contIds = (c: ContinentId) => TERRITORIES.filter((t) => t.continent === c).map((t) => t.id)

/** Continent the AI should focus on: highest owned ratio, favouring small continents. */
function focusContinent(board: Board, p: number): ContinentId {
  let best: ContinentId = 'au'
  let bestScore = -Infinity
  for (const c of Object.keys(CONTINENTS) as ContinentId[]) {
    const ids = contIds(c)
    const mine = ids.filter((id) => board[id].owner === p).length
    if (mine === ids.length) continue
    const enemyArmies = ids.filter((id) => board[id].owner !== p).reduce((s, id) => s + board[id].armies, 0)
    const score = mine / ids.length - enemyArmies / 60 + CONTINENTS[c].bonus / ids.length / 4
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }
  return best
}

function threat(board: Board, id: string) {
  return enemyNeighbors(board, id).reduce((s, n) => s + board[n].armies, 0)
}

function pickReinforceTarget(board: Board, p: number): string {
  const focus = focusContinent(board, p)
  const borders = ownedBy(board, p).filter((id) => enemyNeighbors(board, id).length > 0)
  let best = borders[0] ?? ownedBy(board, p)[0]
  let bestScore = -Infinity
  for (const id of borders) {
    const enemies = enemyNeighbors(board, id)
    const inFocus = enemies.filter((n) => contOf(n) === focus).length
    const weakest = Math.min(...enemies.map((n) => board[n].armies))
    const score = inFocus * 3 + (contOf(id) === focus ? 2 : 0) + board[id].armies * 0.25 - weakest * 0.4 + threat(board, id) * 0.05
    if (score > bestScore) {
      bestScore = score
      best = id
    }
  }
  return best
}

function bestAttack(board: Board, p: number, aggression: number): [string, string] | null {
  const focus = focusContinent(board, p)
  let best: [string, string] | null = null
  let bestScore = -Infinity
  for (const from of ownedBy(board, p)) {
    if (!canAttackFrom(board, from)) continue
    for (const to of enemyNeighbors(board, from)) {
      const ratio = (board[from].armies - 1) / board[to].armies
      if (ratio < aggression) continue
      const c = contOf(to)
      const ids = contIds(c)
      const missing = ids.filter((id) => board[id].owner !== p).length
      const defOwner = board[to].owner
      const breaksContinent = ids.every((id) => board[id].owner === defOwner) ? 3 : 0
      const eliminates = ownedBy(board, defOwner).length === 1 ? 6 : 0
      const score = ratio * 2 + (c === focus ? 3 : 0) + (missing === 1 ? 4 : 0) + breaksContinent + eliminates - board[to].armies * 0.2
      if (score > bestScore) {
        bestScore = score
        best = [from, to]
      }
    }
  }
  return best
}

async function tradeIfPossible(p: number, force: boolean) {
  const s = get()
  const me = s.players[p]
  if (me.cards.length < 3) return
  if (!force && me.cards.length < 4 && me.difficulty !== 'hard') return
  const set = findSet(me.cards, s.board, p)
  if (set) {
    get().trade(set.map((c) => c.id))
    await pause(500)
  }
}

async function reinforce(p: number, gid: number) {
  await tradeIfPossible(p, get().players[p].cards.length >= 5)
  while (get().gameId === gid && get().current === p && get().pool > 0 && (get().phase === 'reinforce' || get().phase === 'deploy')) {
    const s = get()
    const target = pickReinforceTarget(s.board, p)
    const chunk = s.players[p].difficulty === 'easy' ? Math.ceil(s.pool / 3) : Math.ceil(s.pool * 0.7)
    // Easy AIs spread armies randomly, others concentrate.
    const id = s.players[p].difficulty === 'easy' && Math.random() < 0.8 ? ownedBy(s.board, p)[Math.floor(Math.random() * ownedBy(s.board, p).length)] : target
    get().place(id, Math.max(1, Math.min(chunk, s.pool)))
    await pause(260)
  }
}

async function attackPhase(p: number, gid: number) {
  const diff = get().players[p].difficulty
  const aggression = diff === 'easy' ? 0.75 : diff === 'normal' ? 1.25 : 1.1
  let attacks = 0
  while (get().gameId === gid && get().current === p && get().phase === 'attack' && get().winner === null && attacks < 60) {
    const s = get()
    // Must still be able to earn a card: be a bit more willing if nothing conquered yet.
    const threshold = s.conquered ? aggression : Math.min(aggression, 1)
    const target = bestAttack(s.board, p, threshold)
    if (!target) break
    attacks++
    const [from, to] = target
    get().select(from, to)
    await pause(300)
    if (get().gameId !== gid) return
    // Keep attacking this target until conquered or odds drop.
    let won = false
    while (get().gameId === gid && !won) {
      const b = get().board
      if (b[from].armies < 2 || b[to].owner === p || (b[from].armies - 1) / b[to].armies < threshold * 0.7) break
      const before = b[from].armies + b[to].armies
      won = await get().attack(3)
      attacks++
      if (!won && get().board[from].armies + get().board[to].armies === before) break // attack refused
      if (!won) await pause(220)
    }
    if (get().gameId !== gid) return
    if (won) {
      const pm = get().pendingMove
      if (pm) {
        const b = get().board
        const fromThreat = enemyNeighbors(b, from).length
        const move = fromThreat === 0 ? pm.max : Math.floor(pm.max * (diff === 'hard' ? 0.75 : 0.5))
        await pause(250)
        get().confirmMove(move)
      }
      // Forced trade after an elimination.
      if (get().players[p].cards.length >= 5) {
        while (get().players[p].cards.length >= 5) {
          const set = findSet(get().players[p].cards, get().board, p)
          if (!set) break
          get().trade(set.map((c) => c.id))
        }
        await reinforce(p, gid)
      }
      await pause(250)
    }
  }
  if (get().gameId === gid && get().current === p && get().phase === 'attack') get().endAttack()
}

async function fortify(p: number, gid: number) {
  await pause(300)
  const s = get()
  if (s.gameId !== gid || s.phase !== 'fortify') return
  const b = s.board
  // Move the largest idle stack (no enemy neighbours) to the most threatened reachable border.
  const idle = ownedBy(b, p)
    .filter((id) => b[id].armies > 1 && enemyNeighbors(b, id).length === 0)
    .sort((x, y) => b[y].armies - b[x].armies)[0]
  if (idle) {
    const dests = [...reachable(b, idle)].filter((id) => enemyNeighbors(b, id).length > 0)
    const dest = dests.sort((x, y) => threat(b, y) - b[y].armies - (threat(b, x) - b[x].armies))[0]
    if (dest) {
      get().select(idle, dest)
      await pause(350)
      useGame.setState({ pendingMove: { kind: 'fortify', from: idle, to: dest, max: b[idle].armies - 1 } })
      get().confirmMove(b[idle].armies - 1)
      return
    }
  }
  get().endTurn()
}

let running = ''

/** Plays the whole turn of the current AI player, step by step with animations. */
export async function runAI() {
  const s = get()
  const p = s.current
  const key = `${s.gameId}:${s.turn}:${p}:${s.phase}`
  if (running === key || s.screen !== 'game' || s.winner !== null || !s.players[p]?.ai || s.busy) return
  running = key
  const gid = s.gameId
  try {
    await pause(700)
    if (get().phase === 'deploy' || get().phase === 'reinforce') await reinforce(p, gid)
    if (get().gameId !== gid || get().current !== p) return
    if (get().phase === 'attack') await attackPhase(p, gid)
    if (get().gameId !== gid || get().current !== p || get().winner !== null) return
    if (get().phase === 'fortify') await fortify(p, gid)
  } finally {
    if (running === key) running = ''
  }
}

