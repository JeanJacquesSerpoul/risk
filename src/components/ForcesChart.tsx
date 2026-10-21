import { useLayoutEffect, useRef, useState } from 'react'
import { insigniaOf, insigniaPath } from '../game/insignia'
import type { Player } from '../game/rules'
import type { HistoryPoint } from '../game/store'
import { useResolvedTheme } from '../game/theme'
import { useT } from '../i18n/useT'
import { InsigniaIcon } from './Insignia'

export type Measure = 'armies' | 'territories'

/**
 * Line colour of a player. In the light theme the bright yellow and green fall under 3:1 against the
 * pale panel, so every line is darkened by the same amount there: the hues, and their order, stay the player's.
 */
export const lineColor = (color: string, theme: 'light' | 'dark') => (theme === 'light' ? `color-mix(in oklab, ${color} 78%, black)` : color)

/** A rounded scale maximum with 4 even steps. */
function niceMax(v: number): number {
  const raw = Math.max(v, 4) / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? raw
  return step * 4
}

const M = { top: 10, left: 34, bottom: 22 }

/** Each player's armies or territories at the start of every turn, with a crosshair readout. */
export function ForcesChart({ history, players, measure, height = 220 }: { history: HistoryPoint[]; players: Player[]; measure: Measure; height?: number }) {
  const { t } = useT()
  const theme = useResolvedTheme()
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [at, setAt] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = box.current!
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  if (history.length < 2) return <p className="py-8 text-center text-sm text-fg/55">{t('stats.empty')}</p>

  const last = history.length - 1
  const values = (p: number) => history.map((h) => h[measure][p] ?? 0)
  const max = niceMax(Math.max(...history.flatMap((h) => h[measure])))
  // Direct labels at the line ends while there are few lines and room for them; the legend and readout cover the rest.
  const ending = players.filter((p) => (history[last][measure][p.id] ?? 0) > 0)
  const endLabels = ending.length <= 4 && width >= 420
  const right = endLabels ? 104 : 14
  const w = Math.max(0, width - M.left - right)
  const h = height - M.top - M.bottom
  const x = (i: number) => M.left + (i / last) * w
  const y = (v: number) => M.top + h - (v / max) * h

  // One tick per turn, thinned so labels never collide.
  const turnStarts = history.map((p, i) => (i === 0 || p.turn !== history[i - 1].turn ? i : -1)).filter((i) => i >= 0)
  const every = Math.max(1, Math.ceil(turnStarts.length / Math.max(1, Math.floor(w / 46))))
  const ticks = turnStarts.filter((_, k) => k % every === 0)

  // End labels: sorted by height and pushed apart by at least one line of text.
  const labels = ending
    .map((p) => ({ p, v: history[last][measure][p.id], y: y(history[last][measure][p.id]) }))
    .sort((a, b) => a.y - b.y)
  for (let k = 1; k < labels.length; k++) labels[k].y = Math.max(labels[k].y, labels[k - 1].y + 13)

  const pick = (clientX: number) => {
    const r = box.current!.getBoundingClientRect()
    setAt(Math.max(0, Math.min(last, Math.round(((clientX - r.left - M.left) / w) * last))))
  }
  const point = at === null ? null : history[at]
  const rows = point ? [...players].sort((a, b) => (point[measure][b.id] ?? 0) - (point[measure][a.id] ?? 0)) : []
  const tipLeft = at !== null && x(at) > width / 2

  return (
    <div
      ref={box}
      className="relative select-none outline-none focus-visible:ring-2 focus-visible:ring-neon/50"
      style={{ height }}
      tabIndex={0}
      role="img"
      aria-label={t('stats.aria', { measure: t(`stats.${measure}`), n: players.length, turns: history[last].turn })}
      onPointerMove={(e) => pick(e.clientX)}
      onPointerDown={(e) => pick(e.clientX)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setAt(null)}
      onFocus={() => setAt((a) => a ?? last)}
      onBlur={() => setAt(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') setAt((a) => Math.max(0, (a ?? last) - 1))
        else if (e.key === 'ArrowRight') setAt((a) => Math.min(last, (a ?? 0) + 1))
        else if (e.key === 'Home') setAt(0)
        else if (e.key === 'End') setAt(last)
        else return
        e.preventDefault()
      }}
    >
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible">
          {/* Recessive grid: hairlines and muted labels. */}
          {[0, 1, 2, 3, 4].map((k) => {
            const v = (max / 4) * k
            return (
              <g key={k}>
                <line x1={M.left} x2={M.left + w} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-fg/10" strokeWidth={1} />
                <text x={M.left - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-fg/50 font-display text-[9px]">
                  {v}
                </text>
              </g>
            )
          })}
          {ticks.map((i) => (
            <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="fill-fg/50 font-display text-[9px]">
              {t('stats.tick', { turn: history[i].turn })}
            </text>
          ))}

          {players.map((p) => {
            const vs = values(p.id)
            return (
              <path
                key={p.id}
                d={vs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('')}
                fill="none"
                stroke={lineColor(p.color, theme)}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={at !== null || p.alive ? 1 : 0.55}
              />
            )
          })}

          {/* End markers: each player's shape, ringed with the panel colour. */}
          {players.map((p) => {
            const v = history[last][measure][p.id] ?? 0
            return (
              <path
                key={p.id}
                d={insigniaPath(insigniaOf(p.id), 4.2)}
                transform={`translate(${x(last)} ${y(v)})`}
                fill={lineColor(p.color, theme)}
                stroke="var(--badge-bg)"
                strokeWidth={2}
                paintOrder="stroke"
              />
            )
          })}
          {endLabels &&
            labels.map(({ p, v, y: ly }) => (
              <text key={p.id} x={x(last) + 10} y={ly} dominantBaseline="middle" className="fill-fg text-[11px] font-bold">
                <tspan className="font-display">{v}</tspan>
                <tspan className="fill-fg/60" dx={5}>
                  {p.name.length > 10 ? `${p.name.slice(0, 9)}…` : p.name}
                </tspan>
              </text>
            ))}

          {/* Crosshair: snaps to the nearest turn and shows every player there. */}
          {point && at !== null && (
            <g>
              <line x1={x(at)} x2={x(at)} y1={M.top} y2={M.top + h} stroke="currentColor" className="text-fg/35" strokeWidth={1} />
              {players.map((p) => (
                <path
                  key={p.id}
                  d={insigniaPath(insigniaOf(p.id), 4)}
                  transform={`translate(${x(at)} ${y(point[measure][p.id] ?? 0)})`}
                  fill={lineColor(p.color, theme)}
                  stroke="var(--badge-bg)"
                  strokeWidth={2}
                  paintOrder="stroke"
                />
              ))}
            </g>
          )}
        </svg>
      )}

      {point && at !== null && (
        <div
          className="glass pointer-events-none absolute top-1 z-10 min-w-36 rounded-xl px-2.5 py-2 text-xs"
          style={tipLeft ? { right: width - x(at) + 10 } : { left: x(at) + 10 }}
        >
          <div className="mb-1 font-display text-[10px] font-bold tracking-wider text-fg/60">
            {point.final ? t('stats.final') : t('stats.turnOf', { turn: point.turn, name: players[point.seat]?.name ?? '' })}
          </div>
          {rows.map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-px">
              <svg width={12} height={4} aria-hidden className="shrink-0">
                <line x1={0} x2={12} y1={2} y2={2} stroke={lineColor(p.color, theme)} strokeWidth={2} strokeLinecap="round" />
              </svg>
              <span className="w-8 text-right font-display font-bold">{point[measure][p.id] ?? 0}</span>
              <span className={`truncate text-fg/60 ${p.alive ? '' : 'line-through'}`}>{p.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** The same data as a table: one row per turn, at its start. */
export function ForcesTable({ history, players, measure }: { history: HistoryPoint[]; players: Player[]; measure: Measure }) {
  const { t } = useT()
  const rows = history.filter((p, i) => i === 0 || p.turn !== history[i - 1].turn || p.final)
  return (
    <div className="max-h-64 overflow-auto rounded-xl border border-fg/10">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-[var(--glass-2)] font-display text-[10px] tracking-widest text-fg/55">
          <tr>
            <th className="p-2 text-left">{t('stats.turnCol')}</th>
            {players.map((p) => (
              <th key={p.id} className="p-2">
                <span className="inline-flex items-center gap-1">
                  <InsigniaIcon seat={p.id} color={p.color} size={9} />
                  <span className="max-w-[5rem] truncate">{p.name}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-fg/5 text-center">
              <td className="p-1.5 text-left font-display text-xs text-fg/60">{r.final ? t('stats.final') : t('stats.tick', { turn: r.turn })}</td>
              {players.map((p) => (
                <td key={p.id} className="p-1.5 font-display text-xs">
                  {r[measure][p.id] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
