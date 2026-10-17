import { describe, expect, it } from 'vitest'
import { conquestOdds, rollOutcomes } from './odds'

const p = (a: number, d: number, attLoss: number, defLoss: number) =>
  rollOutcomes(a, d).find((o) => o.attLoss === attLoss && o.defLoss === defLoss)?.p ?? 0

describe('rollOutcomes', () => {
  it('matches the classic single-roll probabilities', () => {
    expect(p(1, 1, 0, 1)).toBeCloseTo(15 / 36)
    expect(p(2, 1, 0, 1)).toBeCloseTo(125 / 216)
    expect(p(3, 1, 0, 1)).toBeCloseTo(855 / 1296)
    expect(p(3, 2, 0, 2)).toBeCloseTo(2890 / 7776)
    expect(p(3, 2, 1, 1)).toBeCloseTo(2611 / 7776)
    expect(p(3, 2, 2, 0)).toBeCloseTo(2275 / 7776)
  })

  it('always sums to 1', () => {
    for (const a of [1, 2, 3]) for (const d of [1, 2]) expect(rollOutcomes(a, d).reduce((s, o) => s + o.p, 0)).toBeCloseTo(1)
  })
})

describe('conquestOdds', () => {
  it('handles the trivial cases', () => {
    expect(conquestOdds(1, 1)).toBe(0)
    expect(conquestOdds(5, 0)).toBe(1)
    expect(conquestOdds(2, 1)).toBeCloseTo(15 / 36)
  })

  it('grows with the attacking armies and shrinks with the defenders', () => {
    expect(conquestOdds(6, 3)).toBeGreaterThan(conquestOdds(4, 3))
    expect(conquestOdds(6, 5)).toBeLessThan(conquestOdds(6, 3))
    expect(conquestOdds(30, 5)).toBeGreaterThan(0.99)
  })

  it('stays a probability', () => {
    for (let a = 1; a < 20; a++)
      for (let d = 1; d < 20; d++) {
        const v = conquestOdds(a, d)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
  })
})
