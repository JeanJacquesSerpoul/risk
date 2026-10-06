const realST = globalThis.setTimeout
;(globalThis as any).setTimeout = (fn: () => void, ms?: number) => (ms !== undefined && ms > 1000 ? realST(fn, ms) : setImmediate(fn))
import { runAI } from '../src/game/ai'
import { TERRITORY_IDS } from '../src/game/mapData'
import { useGame } from '../src/game/store'

const G = () => useGame.getState()
G().updateSettings({ sound: false, speed: 5000 })

const diffs = ['easy', 'normal', 'hard'] as const
for (let game = 0; game < 12; game++) {
  const t0 = Date.now()
  const n = 2 + (game % 5)
  G().newGame(
    Array.from({ length: n }, (_, i) => ({ name: `P${i}`, color: '#fff', ai: true, difficulty: diffs[(i + game) % 3] })),
    game % 2 === 1,
  )
  let steps = 0
  let lastKey = ''
  let stuck = 0
  while (G().winner === null && G().turn < 400 && steps < 20000) {
    await runAI()
    steps++
    const s = G()
    for (const id of TERRITORY_IDS) {
      const t = s.board[id]
      if (t.armies < 1 || !s.players[t.owner]?.alive) throw new Error(`bad territory ${id} ${JSON.stringify(t)} turn ${s.turn}`)
    }
    const key = `${s.turn}:${s.current}:${s.phase}:${s.pool}`
    stuck = key === lastKey ? stuck + 1 : 0
    lastKey = key
    if (steps % 200 === 0) console.log(`  step ${steps} turn ${s.turn} alive=${s.players.filter((p) => p.alive).length} ${((Date.now() - t0) / 1000).toFixed(0)}s`)
    if (stuck > 50) throw new Error('stuck at ' + key + ' busy=' + s.busy + ' pm=' + JSON.stringify(s.pendingMove))
  }
  const s = G()
  console.log(`game ${game} players=${n} manual=${game % 2 === 1} winner=${s.winner === null ? 'none' : s.players[s.winner].difficulty} turns=${s.turn} trades=${s.trades}`)
}
