import { describe, expect, it } from 'vitest'
import { CONTINENTS, type ContinentId, TERRITORIES } from '../game/mapData'
import { en } from './en'
import { fr, type MessageKey } from './fr'
import { contName, msg, PLAYER_NAMES, renderMsg, terrName, translate } from '.'

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('dictionaries', () => {
  it('have the same keys and parameters in both languages', () => {
    for (const key of Object.keys(fr) as MessageKey[]) {
      expect(en[key], key).toBeTypeOf('string')
      expect(placeholders(en[key]), key).toEqual(placeholders(fr[key]))
      expect(en[key].includes('|'), key).toBe(fr[key].includes('|'))
    }
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
  })

  it('name every territory and continent in English', () => {
    for (const t of TERRITORIES) expect(terrName(t.id, 'en')).not.toBe(t.id)
    for (const c of Object.keys(CONTINENTS) as ContinentId[]) expect(contName(c, 'en')).toBeTruthy()
    expect(terrName('gb', 'fr')).toBe('Grande-Bretagne')
    expect(terrName('gb', 'en')).toBe('Great Britain')
  })

  it('has as many default names in each language', () => {
    expect(PLAYER_NAMES.en).toHaveLength(PLAYER_NAMES.fr.length)
  })
})

describe('translate', () => {
  it('fills parameters and picks the plural form', () => {
    expect(translate('fr', 'move.advance', { n: 1 })).toBe('Avancer 1 armée')
    expect(translate('fr', 'move.advance', { n: 3 })).toBe('Avancer 3 armées')
    expect(translate('en', 'move.advance', { n: 0 })).toBe('Advance 0 armies')
    expect(translate('fr', 'move.advance', { n: 0 })).toBe('Avancer 0 armée')
  })

  it('renders stored messages with map names in the current language', () => {
    const m = msg('log.conquer', { name: 'Ada', terr: { terr: 'egypt' } })
    expect(renderMsg(m, 'fr')).toBe('Ada conquiert Égypte')
    expect(renderMsg(m, 'en')).toBe('Ada captures Egypt')
  })
})
