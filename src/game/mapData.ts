// Classic RISK board: 42 territories, 6 continents.
// Each territory is drawn on a hexagonal grid from a few "seed" discs [x, y, radius]
// expressed in a 1000 x 600 world coordinate space.

export type ContinentId = 'na' | 'sa' | 'eu' | 'af' | 'as' | 'au'

export interface Continent {
  id: ContinentId
  name: string
  bonus: number
  color: string
}

export interface TerritoryDef {
  id: string
  name: string
  continent: ContinentId
  seeds: [number, number, number][]
}

export const MAP_W = 1000
export const MAP_H = 600

export const CONTINENTS: Record<ContinentId, Continent> = {
  na: { id: 'na', name: 'Amérique du Nord', bonus: 5, color: '#f59e0b' },
  sa: { id: 'sa', name: 'Amérique du Sud', bonus: 2, color: '#ef4444' },
  eu: { id: 'eu', name: 'Europe', bonus: 5, color: '#3b82f6' },
  af: { id: 'af', name: 'Afrique', bonus: 3, color: '#d97706' },
  as: { id: 'as', name: 'Asie', bonus: 7, color: '#10b981' },
  au: { id: 'au', name: 'Océanie', bonus: 2, color: '#a855f7' },
}

export const TERRITORIES: TerritoryDef[] = [
  // ── North America ──
  { id: 'alaska', name: 'Alaska', continent: 'na', seeds: [[50, 92, 30], [88, 100, 26]] },
  { id: 'nwt', name: 'Territoires du Nord-Ouest', continent: 'na', seeds: [[125, 82, 32], [180, 76, 34], [238, 80, 24]] },
  { id: 'greenland', name: 'Groenland', continent: 'na', seeds: [[325, 48, 26], [358, 58, 24], [342, 92, 20]] },
  { id: 'alberta', name: 'Alberta', continent: 'na', seeds: [[118, 145, 30]] },
  { id: 'ontario', name: 'Ontario', continent: 'na', seeds: [[185, 148, 28], [195, 118, 20], [170, 180, 18]] },
  { id: 'quebec', name: 'Québec', continent: 'na', seeds: [[248, 145, 26], [268, 122, 18]] },
  { id: 'westus', name: 'États-Unis (Ouest)', continent: 'na', seeds: [[128, 205, 36]] },
  { id: 'eastus', name: 'États-Unis (Est)', continent: 'na', seeds: [[208, 212, 28], [245, 188, 20], [228, 246, 15], [186, 246, 16], [172, 222, 16]] },
  { id: 'centralam', name: 'Amérique centrale', continent: 'na', seeds: [[148, 244, 18], [165, 266, 20], [188, 292, 15], [210, 312, 13]] },

  // ── South America ──
  { id: 'venezuela', name: 'Venezuela', continent: 'sa', seeds: [[236, 338, 28], [272, 340, 24]] },
  { id: 'peru', name: 'Pérou', continent: 'sa', seeds: [[240, 392, 26], [248, 438, 18]] },
  { id: 'brazil', name: 'Brésil', continent: 'sa', seeds: [[298, 385, 34], [330, 375, 22], [290, 440, 20]] },
  { id: 'argentina', name: 'Argentine', continent: 'sa', seeds: [[262, 478, 24], [256, 520, 18], [262, 556, 13]] },

  // ── Europe ──
  { id: 'iceland', name: 'Islande', continent: 'eu', seeds: [[408, 98, 17]] },
  { id: 'gb', name: 'Grande-Bretagne', continent: 'eu', seeds: [[430, 162, 17], [424, 138, 12]] },
  { id: 'scandinavia', name: 'Scandinavie', continent: 'eu', seeds: [[492, 82, 24], [520, 66, 22], [480, 112, 15]] },
  { id: 'neurope', name: 'Europe du Nord', continent: 'eu', seeds: [[492, 166, 24], [530, 160, 20]] },
  { id: 'weurope', name: "Europe de l'Ouest", continent: 'eu', seeds: [[452, 228, 24], [466, 196, 18], [485, 212, 16]] },
  { id: 'seurope', name: 'Europe du Sud', continent: 'eu', seeds: [[515, 216, 22], [510, 194, 16], [550, 202, 16]] },
  { id: 'ukraine', name: 'Ukraine', continent: 'eu', seeds: [[565, 90, 28], [578, 150, 32], [592, 200, 22], [620, 120, 26]] },

  // ── Africa ──
  { id: 'nafrica', name: 'Afrique du Nord', continent: 'af', seeds: [[455, 300, 36], [490, 332, 26], [440, 268, 20], [502, 290, 20], [535, 328, 18]] },
  { id: 'egypt', name: 'Égypte', continent: 'af', seeds: [[540, 290, 24], [556, 274, 18]] },
  { id: 'eafrica', name: "Afrique de l'Est", continent: 'af', seeds: [[582, 352, 26], [596, 392, 20], [566, 322, 18], [568, 438, 15], [560, 395, 18]] },
  { id: 'congo', name: 'Congo', continent: 'af', seeds: [[525, 390, 24], [510, 360, 18], [535, 420, 18]] },
  { id: 'safrica', name: 'Afrique du Sud', continent: 'af', seeds: [[540, 466, 28], [545, 505, 18]] },
  { id: 'madagascar', name: 'Madagascar', continent: 'af', seeds: [[622, 466, 14], [628, 446, 10]] },

  // ── Asia ──
  { id: 'ural', name: 'Oural', continent: 'as', seeds: [[650, 110, 26], [665, 160, 24], [685, 95, 22], [650, 180, 16]] },
  { id: 'siberia', name: 'Sibérie', continent: 'as', seeds: [[715, 80, 30], [730, 140, 24], [700, 50, 18], [735, 175, 18]] },
  { id: 'yakutsk', name: 'Iakoutie', continent: 'as', seeds: [[790, 68, 30], [755, 62, 22], [830, 55, 20]] },
  { id: 'kamchatka', name: 'Kamtchatka', continent: 'as', seeds: [[880, 70, 28], [920, 85, 24], [945, 110, 16], [855, 80, 20], [865, 122, 18]] },
  { id: 'irkutsk', name: 'Irkoutsk', continent: 'as', seeds: [[790, 125, 26], [760, 120, 18], [830, 130, 20]] },
  { id: 'mongolia', name: 'Mongolie', continent: 'as', seeds: [[805, 180, 30], [850, 170, 20], [770, 185, 18], [870, 155, 14]] },
  { id: 'japan', name: 'Japon', continent: 'as', seeds: [[926, 178, 14], [916, 208, 14], [900, 232, 10]] },
  { id: 'afghanistan', name: 'Afghanistan', continent: 'as', seeds: [[655, 215, 28], [625, 200, 18], [672, 246, 16]] },
  { id: 'china', name: 'Chine', continent: 'as', seeds: [[745, 225, 34], [792, 242, 26], [740, 270, 20], [700, 228, 22], [695, 185, 20]] },
  { id: 'middleeast', name: 'Moyen-Orient', continent: 'as', seeds: [[605, 265, 28], [578, 232, 16], [575, 262, 14], [635, 295, 20], [640, 250, 16]] },
  { id: 'india', name: 'Inde', continent: 'as', seeds: [[710, 295, 30], [712, 335, 16], [670, 282, 18], [748, 312, 16]] },
  { id: 'siam', name: 'Siam', continent: 'as', seeds: [[790, 300, 18], [805, 330, 14], [785, 272, 14], [770, 305, 12]] },

  // ── Oceania ──
  { id: 'indonesia', name: 'Indonésie', continent: 'au', seeds: [[790, 395, 16], [825, 405, 16], [810, 375, 10]] },
  { id: 'newguinea', name: 'Nouvelle-Guinée', continent: 'au', seeds: [[895, 385, 18], [925, 395, 14]] },
  { id: 'waustralia', name: 'Australie occ.', continent: 'au', seeds: [[845, 478, 34], [860, 450, 18]] },
  { id: 'eaustralia', name: 'Australie or.', continent: 'au', seeds: [[915, 470, 34], [925, 520, 16], [905, 440, 18]] },
]

const ADJ_LIST: [string, string[]][] = [
  ['alaska', ['nwt', 'alberta', 'kamchatka']],
  ['nwt', ['alberta', 'ontario', 'greenland']],
  ['greenland', ['ontario', 'quebec', 'iceland']],
  ['alberta', ['ontario', 'westus']],
  ['ontario', ['westus', 'eastus', 'quebec']],
  ['quebec', ['eastus']],
  ['westus', ['eastus', 'centralam']],
  ['eastus', ['centralam']],
  ['centralam', ['venezuela']],
  ['venezuela', ['peru', 'brazil']],
  ['peru', ['brazil', 'argentina']],
  ['brazil', ['argentina', 'nafrica']],
  ['iceland', ['gb', 'scandinavia']],
  ['gb', ['scandinavia', 'neurope', 'weurope']],
  ['scandinavia', ['neurope', 'ukraine']],
  ['neurope', ['ukraine', 'seurope', 'weurope']],
  ['weurope', ['seurope', 'nafrica']],
  ['seurope', ['ukraine', 'middleeast', 'egypt', 'nafrica']],
  ['ukraine', ['middleeast', 'afghanistan', 'ural']],
  ['nafrica', ['egypt', 'eafrica', 'congo']],
  ['egypt', ['middleeast', 'eafrica']],
  ['eafrica', ['congo', 'safrica', 'madagascar', 'middleeast']],
  ['congo', ['safrica']],
  ['safrica', ['madagascar']],
  ['ural', ['siberia', 'china', 'afghanistan']],
  ['siberia', ['yakutsk', 'irkutsk', 'mongolia', 'china']],
  ['yakutsk', ['kamchatka', 'irkutsk']],
  ['kamchatka', ['irkutsk', 'mongolia', 'japan']],
  ['irkutsk', ['mongolia']],
  ['mongolia', ['china', 'japan']],
  ['afghanistan', ['china', 'india', 'middleeast']],
  ['china', ['siam', 'india']],
  ['middleeast', ['india']],
  ['india', ['siam']],
  ['siam', ['indonesia']],
  ['indonesia', ['newguinea', 'waustralia']],
  ['newguinea', ['waustralia', 'eaustralia']],
  ['waustralia', ['eaustralia']],
]

export const ADJ: Record<string, string[]> = (() => {
  const adj: Record<string, Set<string>> = {}
  for (const t of TERRITORIES) adj[t.id] = new Set()
  for (const [a, bs] of ADJ_LIST)
    for (const b of bs) {
      adj[a].add(b)
      adj[b].add(a)
    }
  return Object.fromEntries(Object.entries(adj).map(([k, v]) => [k, [...v]]))
})()

export const TERRITORY_BY_ID: Record<string, TerritoryDef> = Object.fromEntries(TERRITORIES.map((t) => [t.id, t]))

export const TERRITORY_IDS = TERRITORIES.map((t) => t.id)

export const territoriesOf = (c: ContinentId) => TERRITORIES.filter((t) => t.continent === c).map((t) => t.id)

/** Connections that wrap around the edges of the map (drawn off-screen). */
export const WRAP_LINKS: [string, string][] = [['alaska', 'kamchatka']]
