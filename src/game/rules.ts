import { ADJ, CONTINENTS, type ContinentId, TERRITORIES, TERRITORY_IDS } from './mapData'

export type Phase = 'deploy' | 'reinforce' | 'attack' | 'fortify'
export type CardKind = 'infantry' | 'cavalry' | 'artillery' | 'wild'
export type Difficulty = 'easy' | 'normal' | 'hard'

export interface Card {
  id: number
  territory: string | null
  kind: CardKind
}

export interface Player {
  id: number
  name: string
  color: string
  ai: boolean
  difficulty: Difficulty
  alive: boolean
  cards: Card[]
}

export interface TerritoryState {
  owner: number
  armies: number
}

export type Board = Record<string, TerritoryState>

export const PLAYER_COLORS = ['#ff3b5c', '#2fa8ff', '#2ee59d', '#ffc531', '#b57bff', '#ff8a3d']
export const PLAYER_NAMES = ['Napoléon', 'César', 'Cléopâtre', 'Gengis Khan', 'Jeanne d’Arc', 'Alexandre']

export const START_ARMIES: Record<number, number> = { 2: 40, 3: 35, 4: 30, 5: 25, 6: 20 }

export const rand = (n: number) => Math.floor(Math.random() * n)

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const ownedBy = (board: Board, p: number) => TERRITORY_IDS.filter((id) => board[id].owner === p)

export const continentOwner = (board: Board, c: ContinentId): number | null => {
  const ids = TERRITORIES.filter((t) => t.continent === c).map((t) => t.id)
  const o = board[ids[0]].owner
  return ids.every((id) => board[id].owner === o) ? o : null
}

export interface ReinforcementBreakdown {
  base: number
  continents: { id: ContinentId; bonus: number }[]
  total: number
}

export function reinforcements(board: Board, p: number): ReinforcementBreakdown {
  const base = Math.max(3, Math.floor(ownedBy(board, p).length / 3))
  const continents = (Object.keys(CONTINENTS) as ContinentId[])
    .filter((c) => continentOwner(board, c) === p)
    .map((c) => ({ id: c, bonus: CONTINENTS[c].bonus }))
  return { base, continents, total: base + continents.reduce((s, c) => s + c.bonus, 0) }
}

export const rollDice = (n: number) =>
  Array.from({ length: n }, () => 1 + rand(6)).sort((a, b) => b - a)

export function resolveBattle(att: number[], def: number[]) {
  let attLoss = 0
  let defLoss = 0
  for (let i = 0; i < Math.min(att.length, def.length); i++) {
    if (att[i] > def[i]) defLoss++
    else attLoss++
  }
  return { attLoss, defLoss }
}

// ── Cards ──

export function buildDeck(): Card[] {
  const kinds: CardKind[] = ['infantry', 'cavalry', 'artillery']
  const cards: Card[] = TERRITORY_IDS.map((t, i) => ({ id: i, territory: t, kind: kinds[i % 3] }))
  cards.push({ id: 100, territory: null, kind: 'wild' }, { id: 101, territory: null, kind: 'wild' })
  return shuffle(cards)
}

export function isValidSet(cards: Card[]): boolean {
  if (cards.length !== 3) return false
  const wild = cards.filter((c) => c.kind === 'wild').length
  if (wild > 0) return true
  const kinds = new Set(cards.map((c) => c.kind))
  return kinds.size === 1 || kinds.size === 3
}

/** Best tradable set (prefers sets without jokers and with owned territories). */
export function findSet(cards: Card[], board?: Board, p?: number): Card[] | null {
  let best: Card[] | null = null
  let bestScore = -Infinity
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++)
      for (let k = j + 1; k < cards.length; k++) {
        const set = [cards[i], cards[j], cards[k]]
        if (!isValidSet(set)) continue
        let score = -set.filter((c) => c.kind === 'wild').length * 2
        if (board && p !== undefined && set.some((c) => c.territory && board[c.territory].owner === p)) score += 1
        if (score > bestScore) {
          bestScore = score
          best = set
        }
      }
  return best
}

export const tradeValue = (tradeIndex: number) => {
  const seq = [4, 6, 8, 10, 12, 15]
  return tradeIndex < seq.length ? seq[tradeIndex] : 15 + 5 * (tradeIndex - seq.length + 1)
}

// ── Graph helpers ──

export function reachable(board: Board, from: string): Set<string> {
  const owner = board[from].owner
  const seen = new Set([from])
  const queue = [from]
  while (queue.length) {
    const cur = queue.shift()!
    for (const n of ADJ[cur])
      if (!seen.has(n) && board[n].owner === owner) {
        seen.add(n)
        queue.push(n)
      }
  }
  seen.delete(from)
  return seen
}

export const enemyNeighbors = (board: Board, id: string) => ADJ[id].filter((n) => board[n].owner !== board[id].owner)

export const canAttackFrom = (board: Board, id: string) => board[id].armies >= 2 && enemyNeighbors(board, id).length > 0
