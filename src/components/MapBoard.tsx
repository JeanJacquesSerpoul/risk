import { AnimatePresence, motion } from 'motion/react'
import { memo, useMemo } from 'react'
import { GEO } from '../game/hexMap'
import { ADJ, MAP_H, MAP_W, TERRITORIES } from '../game/mapData'
import { canAttackFrom, reachable } from '../game/rules'
import { type Fx, useGame } from '../game/store'

type Mark = 'none' | 'source' | 'target' | 'selected' | 'targeted' | 'dim'

/** Pointer position at pointerdown, used to distinguish a click from a pan. */
export const pointerDown = { x: 0, y: 0 }

/** Visible world box: the map plus margins so the HUD never hides territories. */
export const VIEW = { x: -15, y: -62, w: MAP_W + 30, h: MAP_H + 62 + 105 }

const StaticLayers = memo(function StaticLayers() {
  return (
    <>
      <defs>
        <radialGradient id="ocean" gradientUnits="userSpaceOnUse" cx={500} cy={280} r={720}>
          <stop offset="0%" style={{ stopColor: 'var(--ocean-0)' }} />
          <stop offset="55%" style={{ stopColor: 'var(--ocean-1)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--ocean-2)' }} />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="softglow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <linearGradient id="tileShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.25" />
        </linearGradient>
        <marker id="arrowhead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#fff" />
        </marker>
      </defs>
      <rect x={-3000} y={-3000} width={7000} height={7000} fill="url(#ocean)" />
      <path d={GEO.oceanGrid} fill="none" style={{ stroke: 'var(--map-grid)' }} strokeWidth={0.6} />
      {/* latitude / longitude lines */}
      <g style={{ stroke: 'var(--map-lines)' }} strokeWidth={0.5} strokeDasharray="2 6">
        {[100, 200, 300, 400, 500].map((y) => (
          <line key={y} x1={0} x2={MAP_W} y1={y} y2={y} />
        ))}
        {[125, 250, 375, 500, 625, 750, 875].map((x) => (
          <line key={x} y1={0} y2={MAP_H} x1={x} x2={x} />
        ))}
      </g>
      <path d={GEO.coast} fill="none" style={{ stroke: 'var(--coast-glow)' }} strokeWidth={6} filter="url(#softglow)" />
      <g className="lane" fill="none" style={{ stroke: 'var(--lane)' }} strokeWidth={1.4} strokeDasharray="4 4" strokeLinecap="round">
        {GEO.seaLanes.map((l) => (
          <path key={l.a + l.b} d={l.d} />
        ))}
      </g>
    </>
  )
})

function Territory({ id, color, mark }: { id: string; color: string; mark: Mark }) {
  const g = GEO.territories[id]
  const click = useGame((s) => s.clickTerritory)
  const dim = mark === 'dim'
  return (
    <g
      className="territory"
      onClick={(e) => {
        if (Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y) > 8) return
        click(id)
      }}
    >
      <path
        className="tiles"
        d={g.tiles}
        fill={color}
        style={{ transition: 'fill 0.6s, opacity 0.3s', opacity: dim ? 0.45 : mark === 'selected' ? 1 : 0.86 }}
      />
      <path d={g.tiles} fill="url(#tileShade)" style={{ pointerEvents: 'none', opacity: dim ? 0.3 : 1 }} />
      <path d={g.outline} fill="rgba(0,0,0,0)" style={{ stroke: 'var(--tile-outline)' }} strokeWidth={1.6} strokeLinejoin="round" />
    </g>
  )
}

function Badge({ id, armies, color, active }: { id: string; armies: number; color: string; active: boolean }) {
  const [x, y] = GEO.territories[id].center
  return (
    <g transform={`translate(${x} ${y})`} style={{ pointerEvents: 'none' }} data-tid={id}>
      <g className="keep-scale">
        <motion.g key={armies} initial={{ scale: 1.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
          {active && <circle r={13} fill={color} opacity={0.5} filter="url(#softglow)" />}
          <circle r={8.6} style={{ fill: 'var(--badge-bg)' }} stroke={color} strokeWidth={2.2} />
          <circle r={6.6} fill={color} opacity={0.22} />
          <text
            y={0.4}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="Orbitron, sans-serif"
            fontWeight={700}
            fontSize={armies >= 100 ? 5.4 : armies >= 10 ? 7 : 8.2}
            style={{ fill: 'var(--badge-fg)' }}
          >
            {armies}
          </text>
        </motion.g>
      </g>
    </g>
  )
}

function Label({ id, name }: { id: string; name: string }) {
  const [x, y] = GEO.territories[id].center
  return (
    <g transform={`translate(${x} ${y + 13})`} style={{ pointerEvents: 'none' }} className="map-label">
      <g className="keep-scale">
        <text
          textAnchor="middle"
          fontFamily="Rajdhani, sans-serif"
          fontWeight={700}
          fontSize={5.6}
          style={{ fill: 'var(--label-fill)', stroke: 'var(--label-stroke)' }}
          strokeWidth={1.6}
          paintOrder="stroke"
          letterSpacing={0.3}
        >
          {name.toUpperCase()}
        </text>
      </g>
    </g>
  )
}

function arrowPath(from: string, to: string) {
  const [x1, y1] = GEO.territories[from].center
  let [x2, y2] = GEO.territories[to].center
  // Wrap-around link (Alaska ↔ Kamchatka): aim off the map edge.
  if (Math.abs(x2 - x1) > MAP_W / 2) x2 = x2 > x1 ? x2 - MAP_W : x2 + MAP_W
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  const ex = x2 - (dx / len) * 12
  const ey = y2 - (dy / len) * 12
  const sx = x1 + (dx / len) * 10
  const sy = y1 + (dy / len) * 10
  const cx = (sx + ex) / 2 - dy * 0.25
  const cy = (sy + ey) / 2 + dx * 0.25
  return `M${sx} ${sy}Q${cx} ${cy} ${ex} ${ey}`
}

function FxItem({ fx }: { fx: Fx }) {
  const remove = useGame((s) => s.removeFx)
  const [x, y] = GEO.territories[fx.territory].center
  if (fx.kind === 'float')
    return (
      <g transform={`translate(${x} ${y - 8})`} style={{ pointerEvents: 'none' }}>
        <g className="keep-scale">
          <motion.text
            initial={{ y: 0, opacity: 0, scale: 0.4 }}
            animate={{ y: -22, opacity: [0, 1, 1, 0], scale: [0.4, 1.3, 1, 1] }}
            transition={{ duration: 1.3, ease: 'easeOut' }}
            onAnimationComplete={() => remove(fx.id)}
            textAnchor="middle"
            fontFamily="Orbitron, sans-serif"
            fontWeight={900}
            fontSize={10}
            fill={fx.color}
            stroke="#020617"
            strokeWidth={2}
            paintOrder="stroke"
          >
            {fx.text}
          </motion.text>
        </g>
      </g>
    )
  return (
    <g transform={`translate(${x} ${y})`} style={{ pointerEvents: 'none' }}>
      {[0, 0.15, 0.3].map((d) => (
        <motion.circle
          key={d}
          r={60}
          fill="none"
          stroke={fx.color}
          initial={{ scale: 0.05, opacity: 1, strokeWidth: 8 }}
          animate={{ scale: 1, opacity: 0, strokeWidth: 0.5 }}
          transition={{ duration: 1.1, delay: d, ease: 'easeOut' }}
          onAnimationComplete={d === 0.3 ? () => remove(fx.id) : undefined}
        />
      ))}
      <motion.circle r={22} fill="#fff" initial={{ opacity: 0.9, scale: 0.2 }} animate={{ opacity: 0, scale: 1.4 }} transition={{ duration: 0.5 }} />
    </g>
  )
}

export function MapBoard({ width, height }: { width: number; height: number }) {
  const board = useGame((s) => s.board)
  const players = useGame((s) => s.players)
  const current = useGame((s) => s.current)
  const phase = useGame((s) => s.phase)
  const selected = useGame((s) => s.selected)
  const target = useGame((s) => s.target)
  const fx = useGame((s) => s.fx)
  const battle = useGame((s) => s.battle)
  const human = !players[current]?.ai

  const marks = useMemo(() => {
    const m: Record<string, Mark> = {}
    for (const t of TERRITORIES) m[t.id] = 'none'
    if (!board[TERRITORIES[0].id]) return m
    if (selected) {
      let targets: string[] = []
      if (phase === 'attack') targets = ADJ[selected].filter((n) => board[n].owner !== board[selected].owner)
      else if (phase === 'fortify') targets = [...reachable(board, selected)]
      for (const t of TERRITORIES) m[t.id] = 'dim'
      for (const t of targets) m[t] = 'target'
      m[selected] = 'selected'
      if (target) m[target] = 'targeted'
      return m
    }
    if (!human) return m
    for (const t of TERRITORIES) {
      const own = board[t.id].owner === current
      if (phase === 'reinforce' || phase === 'deploy') m[t.id] = own ? 'source' : 'none'
      else if (phase === 'attack') m[t.id] = own && canAttackFrom(board, t.id) ? 'source' : 'none'
      else if (phase === 'fortify') m[t.id] = own && board[t.id].armies > 1 && reachable(board, t.id).size > 0 ? 'source' : 'none'
    }
    return m
  }, [board, selected, target, phase, current, human])

  if (!board[TERRITORIES[0].id]) return null
  const attackerColor = players[current]?.color ?? '#fff'
  const sourceOutlines = TERRITORIES.filter((t) => marks[t.id] === 'source')
  const targetOutlines = TERRITORIES.filter((t) => marks[t.id] === 'target' || marks[t.id] === 'targeted')

  return (
    <svg
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      width={width}
      height={height}
      style={{ display: 'block', overflow: 'visible' }}
      onPointerDown={(e) => {
        pointerDown.x = e.clientX
        pointerDown.y = e.clientY
      }}
    >
      <StaticLayers />

      {TERRITORIES.map((t) => (
        <Territory key={t.id} id={t.id} color={players[board[t.id].owner]?.color ?? '#555'} mark={marks[t.id]} />
      ))}

      <path d={GEO.continentBorders} fill="none" strokeWidth={1} strokeDasharray="2 2" style={{ pointerEvents: 'none', stroke: 'var(--continent-border)' }} />

      {/* Highlights */}
      <g style={{ pointerEvents: 'none' }}>
        {sourceOutlines.map((t) => (
          <path key={t.id} className="pulse" d={GEO.territories[t.id].outline} fill="none" stroke="#fff" strokeWidth={1.4} strokeOpacity={0.9} />
        ))}
        {targetOutlines.map((t) => (
          <path
            key={t.id}
            className="march"
            d={GEO.territories[t.id].outline}
            fill={marks[t.id] === 'targeted' ? 'rgba(255,255,255,0.18)' : 'none'}
            stroke={phase === 'attack' ? '#ff4d6d' : '#7dffb2'}
            strokeWidth={marks[t.id] === 'targeted' ? 2.6 : 1.6}
            strokeDasharray="5 4"
          />
        ))}
        {selected && (
          <>
            <path d={GEO.territories[selected].outline} fill="none" stroke={attackerColor} strokeWidth={6} opacity={0.8} filter="url(#softglow)" />
            <path d={GEO.territories[selected].outline} fill="none" stroke="#fff" strokeWidth={2.2} />
          </>
        )}
      </g>

      {/* Attack / move arrow */}
      <AnimatePresence>
        {selected && target && (
          <motion.g key={selected + target} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ pointerEvents: 'none' }}>
            <path d={arrowPath(selected, target)} fill="none" stroke={attackerColor} strokeWidth={7} strokeLinecap="round" opacity={0.55} filter="url(#softglow)" />
            <motion.path
              d={arrowPath(selected, target)}
              fill="none"
              stroke="#fff"
              strokeWidth={3}
              strokeLinecap="round"
              markerEnd="url(#arrowhead)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35 }}
            />
            <path
              className="arrow-flow"
              d={arrowPath(selected, target)}
              fill="none"
              stroke={attackerColor}
              strokeWidth={1.6}
              strokeDasharray="6 9"
              strokeLinecap="round"
            />
          </motion.g>
        )}
      </AnimatePresence>

      {/* Battle flash on defender */}
      {battle && !battle.rolling && battle.defLoss > 0 && (
        <motion.circle
          key={battle.key}
          cx={GEO.territories[battle.to].center[0]}
          cy={GEO.territories[battle.to].center[1]}
          r={18}
          fill="#ffb347"
          initial={{ opacity: 0.9, scale: 0.3 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 0.45 }}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {TERRITORIES.map((t) => (
        <Label key={t.id} id={t.id} name={t.name} />
      ))}
      {TERRITORIES.map((t) => (
        <Badge
          key={t.id}
          id={t.id}
          armies={board[t.id].armies}
          color={players[board[t.id].owner]?.color ?? '#888'}
          active={t.id === selected || t.id === target}
        />
      ))}

      {fx.map((f) => (
        <FxItem key={f.id} fx={f} />
      ))}
    </svg>
  )
}
