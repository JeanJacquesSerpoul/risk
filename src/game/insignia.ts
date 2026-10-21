// Each seat gets a shape as well as a colour, so players can be told apart
// without relying on colour alone (colour-blindness, grey-scale screens).

export type Insignia = 'circle' | 'diamond' | 'square' | 'triangle' | 'hexagon' | 'shield'

export const INSIGNIA: Insignia[] = ['circle', 'diamond', 'square', 'triangle', 'hexagon', 'shield']

export const insigniaOf = (seat: number): Insignia => INSIGNIA[((seat % INSIGNIA.length) + INSIGNIA.length) % INSIGNIA.length]

const f = (n: number) => Math.round(n * 100) / 100
const poly = (pts: [number, number][]) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`

/** Outline of an insignia centred on the origin. `r` is the radius of a circle of the same visual weight. */
export function insigniaPath(kind: Insignia, r: number): string {
  switch (kind) {
    case 'circle':
      return `M${f(-r)} 0A${f(r)} ${f(r)} 0 1 0 ${f(r)} 0A${f(r)} ${f(r)} 0 1 0 ${f(-r)} 0Z`
    case 'diamond':
      return poly([[0, -1.24 * r], [1.24 * r, 0], [0, 1.24 * r], [-1.24 * r, 0]])
    case 'square': {
      const h = 0.9 * r
      return poly([[-h, -h], [h, -h], [h, h], [-h, h]])
    }
    case 'triangle':
      // Centred on its centroid, so a number drawn at the origin sits inside it.
      return poly([[0, -1.5 * r], [1.3 * r, 0.75 * r], [-1.3 * r, 0.75 * r]])
    case 'hexagon': {
      const R = 1.06 * r
      return poly([0, 1, 2, 3, 4, 5].map((i) => [R * Math.cos((i * Math.PI) / 3), R * Math.sin((i * Math.PI) / 3)]))
    }
    case 'shield': {
      const w = 0.95 * r
      return `M${f(-w)} ${f(-w)}H${f(w)}V${f(0.2 * r)}Q${f(w)} ${f(0.8 * r)} 0 ${f(1.25 * r)}Q${f(-w)} ${f(0.8 * r)} ${f(-w)} ${f(0.2 * r)}Z`
    }
  }
}
