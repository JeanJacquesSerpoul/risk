// Exact battle probabilities (Markov chain over dice rolls).

interface Outcome {
  attLoss: number
  defLoss: number
  p: number
}

const tables = new Map<string, Outcome[]>()

/** Probabilities of every result of a single roll with `a` attacking dice against `d` defending dice. */
export function rollOutcomes(a: number, d: number): Outcome[] {
  const key = `${a}v${d}`
  const cached = tables.get(key)
  if (cached) return cached
  const n = a + d
  const total = 6 ** n
  const counts = new Map<string, number>()
  const dice = new Array<number>(n)
  for (let i = 0; i < total; i++) {
    let x = i
    for (let k = 0; k < n; k++) {
      dice[k] = 1 + (x % 6)
      x = Math.floor(x / 6)
    }
    const att = dice.slice(0, a).sort((p, q) => q - p)
    const def = dice.slice(a).sort((p, q) => q - p)
    let attLoss = 0
    let defLoss = 0
    for (let k = 0; k < Math.min(a, d); k++) {
      if (att[k] > def[k]) defLoss++
      else attLoss++
    }
    const k = `${attLoss},${defLoss}`
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const out = [...counts].map(([k, c]) => {
    const [attLoss, defLoss] = k.split(',').map(Number)
    return { attLoss, defLoss, p: c / total }
  })
  tables.set(key, out)
  return out
}

const memo = new Map<number, number>()

/**
 * Probability that a territory with `attackers` armies captures one defended by
 * `defenders` armies when attacking with as many dice as possible until one side
 * is exhausted (one army always stays home, as in a blitz).
 */
export function conquestOdds(attackers: number, defenders: number): number {
  if (defenders <= 0) return 1
  if (attackers < 2) return 0
  const key = attackers * 10000 + defenders
  const cached = memo.get(key)
  if (cached !== undefined) return cached
  let p = 0
  for (const o of rollOutcomes(Math.min(3, attackers - 1), Math.min(2, defenders)))
    p += o.p * conquestOdds(attackers - o.attLoss, defenders - o.defLoss)
  memo.set(key, p)
  return p
}

/** Rounded percentage for display. */
export const pct = (p: number) => Math.round(p * 100)
