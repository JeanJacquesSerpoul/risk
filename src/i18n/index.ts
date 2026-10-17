import { CONTINENTS, type ContinentId, TERRITORY_BY_ID } from '../game/mapData'
import { en } from './en'
import { fr, type MessageKey } from './fr'

/**
 * Translations (French, English). Messages are strings with `{name}` parameters;
 * a "singular|plural" form is picked according to the `n` parameter.
 */

export type Lang = 'fr' | 'en'
export const LANGS: Lang[] = ['fr', 'en']
export const LANG_LABEL: Record<Lang, string> = { fr: 'Français', en: 'English' }
export type { MessageKey }
export type Params = Record<string, string | number>

const DICTS: Record<Lang, Record<MessageKey, string>> = { fr, en }

export function translate(lang: Lang, key: MessageKey, params?: Params): string {
  let s: string = DICTS[lang][key] ?? fr[key] ?? key
  if (s.includes('|') && typeof params?.n === 'number') {
    const [one, other] = s.split('|')
    // French: 0 and 1 are singular; English: only 1 is.
    s = (lang === 'fr' ? params.n > 1 : params.n !== 1) ? other : one
  }
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (params?.[k] !== undefined ? String(params[k]) : m))
}

export type T = (key: MessageKey, params?: Params) => string

export const makeT =
  (lang: Lang): T =>
  (key, params) =>
    translate(lang, key, params)

// ── Map names ──

const EN_TERRITORIES: Record<string, string> = {
  alaska: 'Alaska',
  nwt: 'Northwest Territory',
  greenland: 'Greenland',
  alberta: 'Alberta',
  ontario: 'Ontario',
  quebec: 'Quebec',
  westus: 'Western United States',
  eastus: 'Eastern United States',
  centralam: 'Central America',
  venezuela: 'Venezuela',
  peru: 'Peru',
  brazil: 'Brazil',
  argentina: 'Argentina',
  iceland: 'Iceland',
  gb: 'Great Britain',
  scandinavia: 'Scandinavia',
  neurope: 'Northern Europe',
  weurope: 'Western Europe',
  seurope: 'Southern Europe',
  ukraine: 'Ukraine',
  nafrica: 'North Africa',
  egypt: 'Egypt',
  eafrica: 'East Africa',
  congo: 'Congo',
  safrica: 'South Africa',
  madagascar: 'Madagascar',
  ural: 'Ural',
  siberia: 'Siberia',
  yakutsk: 'Yakutsk',
  kamchatka: 'Kamchatka',
  irkutsk: 'Irkutsk',
  mongolia: 'Mongolia',
  japan: 'Japan',
  afghanistan: 'Afghanistan',
  china: 'China',
  middleeast: 'Middle East',
  india: 'India',
  siam: 'Siam',
  indonesia: 'Indonesia',
  newguinea: 'New Guinea',
  waustralia: 'Western Australia',
  eaustralia: 'Eastern Australia',
}

const EN_CONTINENTS: Record<ContinentId, string> = {
  na: 'North America',
  sa: 'South America',
  eu: 'Europe',
  af: 'Africa',
  as: 'Asia',
  au: 'Oceania',
}

export const terrName = (id: string, lang: Lang) => (lang === 'en' ? EN_TERRITORIES[id] : undefined) ?? TERRITORY_BY_ID[id]?.name ?? id
export const contName = (c: ContinentId, lang: Lang) => (lang === 'en' ? EN_CONTINENTS[c] : CONTINENTS[c].name)

/** Default general names, by language (same people, same order). */
export const PLAYER_NAMES: Record<Lang, string[]> = {
  fr: ['Napoléon', 'César', 'Cléopâtre', 'Gengis Khan', 'Jeanne d’Arc', 'Alexandre'],
  en: ['Napoleon', 'Caesar', 'Cleopatra', 'Genghis Khan', 'Joan of Arc', 'Alexander'],
}

// ── Stored messages (log, banners): translated when displayed ──

export type Arg = string | number | { terr: string } | { cont: ContinentId }
export interface Msg {
  k: MessageKey
  p?: Record<string, Arg>
}

export const msg = (k: MessageKey, p?: Record<string, Arg>): Msg => ({ k, p })

export function renderMsg(m: Msg, lang: Lang): string {
  const params: Params = {}
  for (const [key, v] of Object.entries(m.p ?? {}))
    params[key] = typeof v === 'object' ? ('terr' in v ? terrName(v.terr, lang) : contName(v.cont, lang)) : v
  return translate(lang, m.k, params)
}

/** Language offered by default: the browser's if we know it. */
export function detectLang(): Lang {
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'fr'
  return nav?.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}
