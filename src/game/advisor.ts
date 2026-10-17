// The military advisor: suggests a move to human players and explains it.
// It relies on the computer players' strategy and on exact battle odds, and only
// uses what the player can see (the board, their own cards, card counts).
import { type Msg, msg } from '../i18n'
import { CONTINENTS } from './mapData'
import { conquestOdds, pct } from './odds'
import { type Board, type Card, continentOwner, enemyNeighbors, findSet, ownedBy, type Phase, type Player, tradeValue } from './rules'
import { bestAttack, contIds, contOf, focusContinent, pickReinforceTarget, planFortify, threat } from './strategy'

export type AdviceAction =
  | { type: 'trade'; cards: number[] }
  | { type: 'place'; terr: string; n: number }
  | { type: 'attack'; from: string; to: string }
  | { type: 'endAttack' }
  | { type: 'fortify'; from: string; to: string; n: number }
  | { type: 'endTurn' }

export interface Advice {
  action: AdviceAction
  headline: Msg
  reasons: Msg[]
  warnings: Msg[]
  /** Territories to highlight on the map. */
  from?: string
  to?: string
  /** Blitz conquest probability, for attacks. */
  odds?: number
}

export interface AdvisorInput {
  board: Board
  players: Player[]
  current: number
  phase: Phase
  pool: number
  conquered: boolean
  trades: number
}

const terr = (id: string) => ({ terr: id })

/** Below this blitz probability, the advisor prefers to stop attacking. */
export const MIN_ODDS = 0.45

function tradeAdvice(s: AdvisorInput, set: Card[]): Pick<Advice, 'action' | 'headline' | 'reasons' | 'to'> {
  const p = s.current
  const me = s.players[p]
  const reasons = [msg('advice.tradeWhy')]
  if (me.cards.length >= 5) reasons.unshift(msg('advice.tradeForced'))
  const bonus = set.find((c) => c.territory && s.board[c.territory].owner === p)
  if (bonus?.territory) reasons.push(msg('advice.tradeBonus', { terr: terr(bonus.territory) }))
  return {
    action: { type: 'trade', cards: set.map((c) => c.id) },
    headline: msg('advice.trade', { n: tradeValue(s.trades) }),
    reasons,
    to: bonus?.territory ?? undefined,
  }
}

function reinforceAdvice(s: AdvisorInput): Pick<Advice, 'action' | 'headline' | 'reasons' | 'to'> {
  const { board, current: p } = s
  const target = pickReinforceTarget(board, p)
  const reasons: Msg[] = []
  const focus = focusContinent(board, p)
  const enemies = enemyNeighbors(board, target)
  if (contOf(target) === focus || enemies.some((n) => contOf(n) === focus))
    reasons.push(msg('advice.reinforceFocus', { cont: { cont: focus }, bonus: CONTINENTS[focus].bonus }))
  if (enemies.length) {
    const weakest = enemies.reduce((a, b) => (board[b].armies < board[a].armies ? b : a))
    reasons.push(msg('advice.reinforceWeak', { terr: terr(weakest), n: board[weakest].armies }))
  }
  const danger = threat(board, target)
  if (danger > board[target].armies) reasons.push(msg('advice.reinforceThreat', { n: danger }))
  return { action: { type: 'place', terr: target, n: s.pool }, headline: msg('advice.reinforce', { terr: terr(target) }), reasons, to: target }
}

function attackAdvice(s: AdvisorInput): Omit<Advice, 'warnings'> {
  const { board, current: p, players } = s
  const best = bestAttack(board, p, s.conquered ? 1.1 : 1)
  const odds = best ? conquestOdds(board[best[0]].armies, board[best[1]].armies) : 0
  if (!best || odds < MIN_ODDS) {
    const reasons = [msg('advice.stopWhy')]
    if (s.conquered) reasons.push(msg('advice.stopCard'))
    return { action: { type: 'endAttack' }, headline: msg('advice.stop'), reasons }
  }
  const [from, to] = best
  const reasons = [msg('advice.odds', { p: pct(odds) })]
  const c = contOf(to)
  const ids = contIds(c)
  const defender = board[to].owner
  const missing = ids.filter((id) => board[id].owner !== p)
  const bonus = CONTINENTS[c].bonus
  if (missing.length === 1) reasons.push(msg('advice.attackComplete', { cont: { cont: c }, bonus }))
  else if (c === focusContinent(board, p)) reasons.push(msg('advice.attackFocus', { cont: { cont: c } }))
  if (continentOwner(board, c) === defender) reasons.push(msg('advice.attackBreak', { cont: { cont: c }, name: players[defender].name }))
  if (ownedBy(board, defender).length === 1) reasons.push(msg('advice.attackEliminate', { name: players[defender].name }))
  if (!s.conquered) reasons.push(msg('advice.attackCard'))
  return { action: { type: 'attack', from, to }, headline: msg('advice.attack', { from: terr(from), to: terr(to) }), reasons, from, to, odds }
}

function fortifyAdvice(s: AdvisorInput): Omit<Advice, 'warnings'> {
  const plan = planFortify(s.board, s.current)
  if (!plan) return { action: { type: 'endTurn' }, headline: msg('advice.endTurn'), reasons: [msg('advice.endTurnWhy')] }
  return {
    action: { type: 'fortify', ...plan },
    headline: msg('advice.fortify', { n: plan.n, from: terr(plan.from), to: terr(plan.to) }),
    reasons: [msg('advice.fortifyIdle', { from: terr(plan.from) }), msg('advice.fortifyThreat', { to: terr(plan.to), n: threat(s.board, plan.to) })],
    from: plan.from,
    to: plan.to,
  }
}

/** What the other generals are up to, and where the player is in danger. */
export function warnings(s: AdvisorInput): Msg[] {
  const { board, current: p, players } = s
  const out: Msg[] = []
  for (const c of Object.keys(CONTINENTS) as (keyof typeof CONTINENTS)[]) {
    const owner = continentOwner(board, c)
    if (owner !== null && owner !== p) {
      out.push(msg('warn.continent', { name: players[owner].name, cont: { cont: c }, bonus: CONTINENTS[c].bonus }))
      continue
    }
    if (owner !== null) continue
    const ids = contIds(c)
    for (const other of players) {
      if (other.id === p || !other.alive) continue
      const missing = ids.filter((id) => board[id].owner !== other.id)
      if (ids.length > 2 && missing.length === 1) out.push(msg('warn.almost', { name: other.name, cont: { cont: c } }))
    }
  }
  const threatened = ownedBy(board, p)
    .map((id) => ({ id, danger: threat(board, id) }))
    .filter(({ id, danger }) => danger >= 4 && danger > board[id].armies * 2)
    .sort((a, b) => b.danger - board[b.id].armies - (a.danger - board[a.id].armies))
    .slice(0, 2)
  for (const { id, danger } of threatened) out.push(msg('warn.threat', { terr: terr(id), n: danger, m: board[id].armies }))
  for (const other of players) if (other.id !== p && other.alive && other.cards.length >= 4) out.push(msg('warn.cards', { name: other.name, n: other.cards.length }))
  return out.slice(0, 5)
}

export function advise(s: AdvisorInput): Advice {
  const me = s.players[s.current]
  const set = findSet(me.cards, s.board, s.current)
  let core: Omit<Advice, 'warnings'>
  if (set && (s.phase === 'reinforce' || (s.phase === 'attack' && me.cards.length >= 5))) core = tradeAdvice(s, set)
  else if (s.phase === 'reinforce' || s.phase === 'deploy') core = reinforceAdvice(s)
  else if (s.phase === 'attack') core = attackAdvice(s)
  else core = fortifyAdvice(s)
  return { ...core, warnings: warnings(s) }
}
