// Pure planning helpers shared by the computer players and the advisor.
import { CONTINENTS, type ContinentId, TERRITORIES, TERRITORY_BY_ID } from './mapData'
import { type Board, canAttackFrom, enemyNeighbors, ownedBy, reachable } from './rules'

export const contOf = (id: string) => TERRITORY_BY_ID[id].continent
export const contIds = (c: ContinentId) => TERRITORIES.filter((t) => t.continent === c).map((t) => t.id)

/** Continent the player should focus on: highest owned ratio, favouring small continents. */
export function focusContinent(board: Board, p: number): ContinentId {
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

/** Sum of the enemy armies adjacent to a territory. */
export function threat(board: Board, id: string) {
  return enemyNeighbors(board, id).reduce((s, n) => s + board[n].armies, 0)
}

export function pickReinforceTarget(board: Board, p: number): string {
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

/** Most interesting attack whose army ratio is at least `aggression`. */
export function bestAttack(board: Board, p: number, aggression: number): [string, string] | null {
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

/** Moves the largest idle stack (no enemy neighbour) to the most threatened reachable border. */
export function planFortify(board: Board, p: number): { from: string; to: string; n: number } | null {
  const idle = ownedBy(board, p)
    .filter((id) => board[id].armies > 1 && enemyNeighbors(board, id).length === 0)
    .sort((x, y) => board[y].armies - board[x].armies)[0]
  if (!idle) return null
  const dests = [...reachable(board, idle)].filter((id) => enemyNeighbors(board, id).length > 0)
  const dest = dests.sort((x, y) => threat(board, y) - board[y].armies - (threat(board, x) - board[x].armies))[0]
  return dest ? { from: idle, to: dest, n: board[idle].armies - 1 } : null
}
