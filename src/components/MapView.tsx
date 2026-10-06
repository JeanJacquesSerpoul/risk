import confetti from 'canvas-confetti'
import { useAnimate } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { type ReactZoomPanPinchRef, TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { GEO } from '../game/hexMap'
import { useGame } from '../game/store'
import { MapBoard, VIEW } from './MapBoard'

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export function MapView() {
  const outer = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [scope, animate] = useAnimate()
  const fx = useGame((s) => s.fx)
  const seen = useRef(new Set<number>())
  const tw = useRef<ReactZoomPanPinchRef>(null)
  const battleKey = useGame((s) => s.battle?.key)

  useLayoutEffect(() => {
    const el = outer.current!
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // "contain" fit of the 1000x600 world inside the viewport.
  const fit = size.w && size.h ? Math.min(size.w / VIEW.w, size.h / VIEW.h) : 0
  const fitW = VIEW.w * fit
  const fitH = VIEW.h * fit
  // Start closer on portrait phones ("cover"-ish), capped.
  const cover = fit ? Math.max(size.w / fitW, size.h / fitH) : 1
  const initialScale = clamp(cover, 1, 2.6)

  const applyScale = (scale: number) => {
    const eff = fit * scale
    const el = outer.current
    if (!el) return
    el.style.setProperty('--badge-scale', String(clamp(11 / (9 * eff), 0.72, 1.7)))
    el.style.setProperty('--label-opacity', eff > 1.25 ? '1' : eff > 0.95 ? String((eff - 0.95) / 0.3) : '0')
  }

  useEffect(() => applyScale(initialScale), [fit]) // eslint-disable-line react-hooks/exhaustive-deps

  // Smooth wheel zoom: multiplicative, anchored on the cursor, eased over a few frames.
  useEffect(() => {
    const el = outer.current
    if (!el || !fit) return
    let target = 0
    let anchor = { x: 0, y: 0 }
    let raf = 0

    const place = (cw: number, w: number, x: number) => (cw > w ? clamp(x, w - cw, 0) : (w - cw) / 2)

    const step = () => {
      const ref = tw.current
      if (!ref) return
      const { scale, positionX, positionY } = ref.state
      const done = Math.abs(target - scale) < 0.002
      const next = done ? target : scale + (target - scale) * 0.22
      // Keep the content point under the cursor fixed.
      const cx = (anchor.x - positionX) / scale
      const cy = (anchor.y - positionY) / scale
      const x = place(fitW * next, size.w, anchor.x - cx * next)
      const y = place(fitH * next, size.h, anchor.y - cy * next)
      ref.setTransform(x, y, next, 0)
      raf = done ? 0 : requestAnimationFrame(step)
    }

    const onWheel = (e: WheelEvent) => {
      const ref = tw.current
      if (!ref) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY
      // Pinch-to-zoom on trackpads sends ctrl+wheel with small deltas: amplify a bit.
      const k = e.ctrlKey ? 0.006 : 0.0016
      const base = raf ? target : ref.state.scale
      target = clamp(base * Math.exp(-clamp(dy, -120, 120) * k), 1, 7)
      if (!raf) raf = requestAnimationFrame(step)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      cancelAnimationFrame(raf)
    }
  }, [fit, fitW, fitH, size.w, size.h])

  // Camera follows AI battles happening off-screen.
  useEffect(() => {
    const s = useGame.getState()
    const b = s.battle
    if (!b || !s.players[b.attacker]?.ai || !tw.current || !fit) return
    const { scale, positionX, positionY } = tw.current.state
    const [ax, ay] = GEO.territories[b.from].center
    const [bx, by] = GEO.territories[b.to].center
    const wrap = Math.abs(ax - bx) > 500
    const wx = wrap ? bx : (ax + bx) / 2
    const wy = wrap ? by : (ay + by) / 2
    const k = fit * scale
    const sx = positionX + (wx - VIEW.x) * k
    const sy = positionY + (wy - VIEW.y) * k
    const m = 0.22
    if (sx > size.w * m && sx < size.w * (1 - m) && sy > size.h * m && sy < size.h * (1 - m)) return
    const cw = fitW * scale
    const ch = fitH * scale
    const nx = cw > size.w ? clamp(size.w / 2 - (wx - VIEW.x) * k, size.w - cw, 0) : positionX
    const ny = ch > size.h ? clamp(size.h / 2 - (wy - VIEW.y) * k, size.h - ch, 0) : positionY
    tw.current.setTransform(nx, ny, scale, 450, 'easeOut')
  }, [battleKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Conquest effects: screen shake + particle explosion at the territory.
  useEffect(() => {
    for (const f of fx) {
      if (seen.current.has(f.id) || f.kind !== 'shock') continue
      seen.current.add(f.id)
      if (scope.current) animate(scope.current, { x: [0, -9, 8, -6, 5, -2, 0], y: [0, 5, -6, 4, -3, 1, 0] }, { duration: 0.5 })
      const badge = document.querySelector(`[data-tid="${f.territory}"]`)
      if (badge) {
        const r = badge.getBoundingClientRect()
        const origin = { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
        const opts = { origin, spread: 360, startVelocity: 26, gravity: 0.7, ticks: 110, scalar: 0.8, disableForReducedMotion: true }
        void confetti({ ...opts, particleCount: 70, colors: [f.color, '#ffffff', '#ffd166'], shapes: ['circle', 'square'] })
        void confetti({ ...opts, particleCount: 25, startVelocity: 14, colors: ['#ff6b35', '#ffd166'], shapes: ['circle'], scalar: 1.4 })
      }
    }
  }, [fx, animate, scope])

  return (
    <div ref={outer} className="absolute inset-0 overflow-hidden" style={{ ['--label-opacity' as string]: 0 }}>
      <div ref={scope} className="absolute inset-0">
        {fit > 0 && (
          <TransformWrapper
            ref={tw}
            key={`${Math.round(fitW)}x${Math.round(fitH)}`}
            initialScale={initialScale}
            minScale={1}
            maxScale={7}
            centerOnInit
            limitToBounds
            doubleClick={{ disabled: true }}
            wheel={{ disabled: true }}
            onInit={(ref) => applyScale(ref.state.scale)}
            onTransform={(_, st) => applyScale(st.scale)}
          >
            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: fitW, height: fitH }}>
              <MapBoard width={fitW} height={fitH} />
            </TransformComponent>
          </TransformWrapper>
        )}
      </div>
      {/* Atmosphere overlays */}
      <div className="pointer-events-none absolute inset-0 scanlines" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="sweep" />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(2,6,16,0.75) 100%)' }}
      />
    </div>
  )
}
