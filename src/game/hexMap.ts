import { ADJ, MAP_H, MAP_W, TERRITORIES, TERRITORY_BY_ID, WRAP_LINKS } from './mapData'

// Pointy-top hex grid, "odd-r" offset layout.
export const HEX_R = 7
const W = Math.sqrt(3) * HEX_R
const ROW_H = 1.5 * HEX_R
const COLS = Math.floor((MAP_W - W / 2) / W)
const ROWS = Math.floor((MAP_H - HEX_R / 2) / ROW_H)

type Pt = [number, number]

interface Cell {
  col: number
  row: number
  x: number
  y: number
  owner: number // territory index, -1 = ocean
}

export interface TerritoryGeo {
  id: string
  /** All hex tiles (slightly inset) as a single path. */
  tiles: string
  /** Outline of the territory (chained boundary loops). */
  outline: string
  /** Label / army badge anchor. */
  center: Pt
  bbox: { x0: number; y0: number; x1: number; y1: number }
  cells: Pt[]
}

export interface SeaLane {
  a: string
  b: string
  d: string
}

export interface MapGeometry {
  territories: Record<string, TerritoryGeo>
  /** Faint hex grid covering the oceans. */
  oceanGrid: string
  /** Coastline (land/ocean boundary). */
  coast: string
  /** Borders between two different continents. */
  continentBorders: string
  seaLanes: SeaLane[]
  /** Pairs of territories that share a land border (for validation). */
  touching: Set<string>
}

const corner = (x: number, y: number, i: number, r = HEX_R): Pt => {
  const a = ((60 * i - 30) * Math.PI) / 180
  return [x + r * Math.cos(a), y + r * Math.sin(a)]
}

const f = (n: number) => Math.round(n * 100) / 100

const hexPath = (x: number, y: number, r: number) => {
  let d = ''
  for (let i = 0; i < 6; i++) {
    const [px, py] = corner(x, y, i, r)
    d += (i === 0 ? 'M' : 'L') + f(px) + ' ' + f(py)
  }
  return d + 'Z'
}

// Edge i (corner i -> corner i+1) faces direction 60*i degrees: E, SE, SW, W, NW, NE.
const DIRS_EVEN: Pt[] = [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]]
const DIRS_ODD: Pt[] = [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]]

/** Chain directed boundary edges into closed loops → compact SVG path. */
function chainEdges(edges: [Pt, Pt][]): string {
  const key = (p: Pt) => `${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`
  const byStart = new Map<string, [Pt, Pt][]>()
  for (const e of edges) {
    const k = key(e[0])
    if (!byStart.has(k)) byStart.set(k, [])
    byStart.get(k)!.push(e)
  }
  const used = new Set<[Pt, Pt]>()
  let d = ''
  for (const e of edges) {
    if (used.has(e)) continue
    used.add(e)
    const start = key(e[0])
    d += `M${f(e[0][0])} ${f(e[0][1])}L${f(e[1][0])} ${f(e[1][1])}`
    let cur = e
    for (let guard = 0; guard < 10000; guard++) {
      const k = key(cur[1])
      if (k === start) break
      const next = byStart.get(k)?.find((n) => !used.has(n))
      if (!next) break
      used.add(next)
      d += `L${f(next[1][0])} ${f(next[1][1])}`
      cur = next
    }
    d += 'Z'
  }
  return d
}

function build(): MapGeometry {
  const grid: Cell[][] = []
  for (let row = 0; row < ROWS; row++) {
    const line: Cell[] = []
    for (let col = 0; col < COLS; col++) {
      const x = col * W + (row & 1 ? W / 2 : 0) + W / 2
      const y = row * ROW_H + HEX_R
      let best = -1
      let bestScore = Infinity
      TERRITORIES.forEach((t, ti) => {
        for (const [sx, sy, sr] of t.seeds) {
          const dist = Math.hypot(x - sx, y - sy)
          if (dist > sr) continue
          const score = dist / sr
          if (score < bestScore) {
            bestScore = score
            best = ti
          }
        }
      })
      line.push({ col, row, x, y, owner: best })
    }
    grid.push(line)
  }

  const cellAt = (col: number, row: number) => (row < 0 || row >= ROWS || col < 0 || col >= COLS ? null : grid[row][col])

  const tiles: string[] = TERRITORIES.map(() => '')
  const outlineEdges: [Pt, Pt][][] = TERRITORIES.map(() => [])
  const cells: Pt[][] = TERRITORIES.map(() => [])
  let oceanGrid = ''
  const coastEdges: [Pt, Pt][] = []
  let continentBorders = ''
  const touching = new Set<string>()

  for (const line of grid)
    for (const c of line) {
      if (c.owner < 0) {
        oceanGrid += hexPath(c.x, c.y, HEX_R * 0.9)
        continue
      }
      tiles[c.owner] += hexPath(c.x, c.y, HEX_R * 0.86)
      cells[c.owner].push([c.x, c.y])
      const dirs = c.row & 1 ? DIRS_ODD : DIRS_EVEN
      for (let i = 0; i < 6; i++) {
        const n = cellAt(c.col + dirs[i][0], c.row + dirs[i][1])
        const nOwner = n ? n.owner : -1
        if (nOwner === c.owner) continue
        const edge: [Pt, Pt] = [corner(c.x, c.y, i), corner(c.x, c.y, (i + 1) % 6)]
        outlineEdges[c.owner].push(edge)
        if (nOwner < 0) coastEdges.push(edge)
        else {
          const a = TERRITORIES[c.owner]
          const b = TERRITORIES[nOwner]
          touching.add([a.id, b.id].sort().join('|'))
          if (a.continent !== b.continent && c.owner < nOwner)
            continentBorders += `M${f(edge[0][0])} ${f(edge[0][1])}L${f(edge[1][0])} ${f(edge[1][1])}`
        }
      }
    }

  const territories: Record<string, TerritoryGeo> = {}
  TERRITORIES.forEach((t, ti) => {
    const cs = cells[ti]
    const cx = cs.reduce((s, p) => s + p[0], 0) / cs.length
    const cy = cs.reduce((s, p) => s + p[1], 0) / cs.length
    // Anchor = cell closest to centroid that also has many same-territory cells nearby.
    let center: Pt = cs[0]
    let bestScore = -Infinity
    for (const p of cs) {
      const crowd = cs.filter((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < HEX_R * 3.2).length
      const score = crowd * 3 - Math.hypot(p[0] - cx, p[1] - cy) / HEX_R
      if (score > bestScore) {
        bestScore = score
        center = p
      }
    }
    territories[t.id] = {
      id: t.id,
      tiles: tiles[ti],
      outline: chainEdges(outlineEdges[ti]),
      center,
      cells: cs,
      bbox: {
        x0: Math.min(...cs.map((p) => p[0])) - HEX_R,
        y0: Math.min(...cs.map((p) => p[1])) - HEX_R,
        x1: Math.max(...cs.map((p) => p[0])) + HEX_R,
        y1: Math.max(...cs.map((p) => p[1])) + HEX_R,
      },
    }
  })

  // Sea lanes: adjacent territories that don't share a land border.
  const seaLanes: SeaLane[] = []
  const wrapKeys = new Set(WRAP_LINKS.map(([a, b]) => [a, b].sort().join('|')))
  for (const a of Object.keys(ADJ))
    for (const b of ADJ[a]) {
      if (a >= b) continue
      const k = [a, b].sort().join('|')
      if (touching.has(k)) continue
      if (wrapKeys.has(k)) {
        // Draw both halves leaving the map edges.
        const left = TERRITORY_BY_ID[a].seeds[0][0] < TERRITORY_BY_ID[b].seeds[0][0] ? a : b
        const right = left === a ? b : a
        const lc = territories[left].cells.reduce((m, p) => (p[0] < m[0] ? p : m))
        const rc = territories[right].cells.reduce((m, p) => (p[0] > m[0] ? p : m))
        seaLanes.push({ a, b, d: `M${f(lc[0])} ${f(lc[1])}L-20 ${f(lc[1] - 6)}M${f(rc[0])} ${f(rc[1])}L${MAP_W + 20} ${f(rc[1] - 6)}` })
        continue
      }
      // Closest pair of cells → short curved lane between the coasts.
      let best: [Pt, Pt] = [territories[a].center, territories[b].center]
      let bd = Infinity
      for (const p of territories[a].cells)
        for (const q of territories[b].cells) {
          const dd = Math.hypot(p[0] - q[0], p[1] - q[1])
          if (dd < bd) {
            bd = dd
            best = [p, q]
          }
        }
      const [p, q] = best
      const mx = (p[0] + q[0]) / 2
      const my = (p[1] + q[1]) / 2
      const nx = -(q[1] - p[1]) * 0.15
      const ny = (q[0] - p[0]) * 0.15
      seaLanes.push({ a, b, d: `M${f(p[0])} ${f(p[1])}Q${f(mx + nx)} ${f(my + ny)} ${f(q[0])} ${f(q[1])}` })
    }

  return {
    territories,
    oceanGrid,
    coast: chainEdges(coastEdges),
    continentBorders,
    seaLanes,
    touching,
  }
}

export const GEO: MapGeometry = build()
