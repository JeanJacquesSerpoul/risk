import { GEO } from '../src/game/hexMap'
import { ADJ, TERRITORIES } from '../src/game/mapData'
const bad: string[] = []
for (const k of GEO.touching) {
  const [a, b] = k.split('|')
  if (!ADJ[a].includes(b)) bad.push(k)
}
console.log('NON-ADJACENT TOUCHING:', bad.join(', ') || 'none')
console.log('SEA LANES:', GEO.seaLanes.map((s) => s.a + '-' + s.b).join(', '))
for (const t of TERRITORIES) {
  const g = GEO.territories[t.id]
  if (g.cells.length < 6) console.log('small', t.id, g.cells.length)
}
console.log('cells', TERRITORIES.map(t=>t.id+':'+GEO.territories[t.id].cells.length).join(' '))
