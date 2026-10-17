import { netRole } from '../net/netStore'
import { enemyNeighbors, findSet, ownedBy } from './rules'
import { sleep, useGame } from './store'
import { bestAttack, pickReinforceTarget, planFortify } from './strategy'

const get = () => useGame.getState()
const pause = (ms: number) => sleep(ms / get().settings.speed)

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
  const plan = planFortify(s.board, p)
  if (plan) {
    get().select(plan.from, plan.to)
    await pause(350)
    get().fortify(plan.from, plan.to, plan.n)
    return
  }
  get().endTurn()
}

let running = ''

/** Plays the whole turn of the current AI player, step by step with animations. */
export async function runAI() {
  const s = get()
  const p = s.current
  const key = `${s.gameId}:${s.turn}:${p}:${s.phase}`
  if (running === key || netRole() === 'guest' || s.screen !== 'game' || s.winner !== null || !s.players[p]?.ai || s.busy || s.handoff !== null) return
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

