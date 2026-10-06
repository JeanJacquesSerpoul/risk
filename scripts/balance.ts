const realST = globalThis.setTimeout
;(globalThis as any).setTimeout = (fn: () => void, ms?: number) => (ms !== undefined && ms > 1000 ? realST(fn, ms) : setImmediate(fn))
import { runAI } from '../src/game/ai'
import { useGame } from '../src/game/store'
const G = () => useGame.getState()
G().updateSettings({ sound: false, speed: 5000 })
const wins: Record<string, number> = { easy: 0, normal: 0, hard: 0, none: 0 }
const diffs = ['easy', 'normal', 'hard'] as const
for (let g = 0; g < 45; g++) {
  const order = [0, 1, 2].map((i) => diffs[(i + g) % 3])
  G().newGame(order.map((d) => ({ name: d, color: '#fff', ai: true, difficulty: d })), false)
  while (G().winner === null && G().turn < 150) await runAI()
  const w = G().winner
  wins[w === null ? 'none' : G().players[w].difficulty]++
}
console.log(wins)
