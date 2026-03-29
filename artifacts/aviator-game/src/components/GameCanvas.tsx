import { useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { Phase, CurvePoint, PlaneTransform } from '../hooks/useGameState'

interface GameCanvasProps {
  phase: Phase
  multiplier: number
  crashPoint: number
  waitProgress: number
  trailPoints: CurvePoint[]
  plane: PlaneTransform
  betMode: 'money' | 'freebet'
  onToggleBetMode: () => void
}

const PAD = { left: 44, right: 16, top: 20, bottom: 20 }

const MAX_X = 0.92

function toPx(p: CurvePoint, w: number, h: number, viewOffset = 0) {
  const dw = w - PAD.left - PAD.right
  const dh = h - PAD.top - PAD.bottom
  return {
    cx: PAD.left + (p.x - viewOffset) * dw,
    cy: PAD.top + (1 - p.y) * dh,
  }
}

// ── Background with radiating rays ─────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.fillStyle = '#0e0e0e'
  ctx.fillRect(0, 0, w, h)

  const ox       = PAD.left
  const oy       = h - PAD.bottom
  const maxDist  = Math.sqrt(w * w + h * h) * 1.5
  const numRays  = 36
  const rotOff   = (time * 0.00008) % (Math.PI * 2)

  ctx.save()
  ctx.beginPath()
  ctx.rect(ox, 0, w - ox, oy)
  ctx.clip()

  for (let i = 0; i < numRays; i++) {
    const a1 = (i / numRays) * Math.PI * 2 + rotOff
    const a2 = ((i + 0.45) / numRays) * Math.PI * 2 + rotOff
    ctx.beginPath()
    ctx.moveTo(ox, oy)
    ctx.lineTo(ox + Math.cos(a1) * maxDist, oy + Math.sin(a1) * maxDist)
    ctx.lineTo(ox + Math.cos(a2) * maxDist, oy + Math.sin(a2) * maxDist)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255,255,255,0.018)'
    ctx.fill()
  }

  ctx.restore()

  const glow = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.min(w, h) * 0.7)
  glow.addColorStop(0,    'rgba(160,110,30,0.28)')
  glow.addColorStop(0.15, 'rgba(120,80,20,0.18)')
  glow.addColorStop(0.4,  'rgba(80,50,10,0.07)')
  glow.addColorStop(1,    'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
}

function drawDots(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const ox = PAD.left
  const oy = h - PAD.bottom
  const bLen = w - PAD.left - PAD.right
  const lLen = h - PAD.top - PAD.bottom

  for (let i = 0; i < 16; i++) {
    const t = ((time * 0.00018 + i / 16) % 1)
    const x = ox + (1 - t) * bLen
    const y = oy
    const fade = t > 0.85 ? (1 - t) / 0.15 : 1
    const r = 3 * (0.3 + 0.7 * (1 - t))
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(0,230,118,${0.7 * fade})`
    ctx.fill()
  }

  for (let i = 0; i < 8; i++) {
    const t = ((time * 0.00014 + i / 8) % 1)
    const x = ox
    const y = oy - (1 - t) * lLen
    const fade = t > 0.85 ? (1 - t) / 0.15 : 1
    const r = 3 * (0.3 + 0.7 * (1 - t))
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(0,230,118,${0.7 * fade})`
    ctx.fill()
  }
}

// ── Axes ───────────────────────────────────────────────────────────────────

function drawAxes(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const ox = PAD.left
  const oy = h - PAD.bottom
  ctx.save()
  ctx.strokeStyle = 'rgba(0,230,118,0.55)'
  ctx.lineWidth   = 2
  ctx.shadowColor = 'rgba(0,230,118,0.35)'
  ctx.shadowBlur  = 6
  ctx.beginPath(); ctx.moveTo(ox, PAD.top); ctx.lineTo(ox, oy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(w - PAD.right, oy); ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()
}

// ── Trail curve ────────────────────────────────────────────────────────────

function traceSmoothCurve(target: CanvasRenderingContext2D | Path2D, pts: { cx: number; cy: number }[]) {
  target.moveTo(pts[0].cx, pts[0].cy)
  if (pts.length === 2) { target.lineTo(pts[1].cx, pts[1].cy); return }
  const tangents: { x: number; y: number }[] = []
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) {
      tangents.push({ x: pts[1].cx - pts[0].cx, y: pts[1].cy - pts[0].cy })
    } else if (i === pts.length - 1) {
      tangents.push({ x: pts[i].cx - pts[i - 1].cx, y: pts[i].cy - pts[i - 1].cy })
    } else {
      tangents.push({ x: (pts[i + 1].cx - pts[i - 1].cx) / 2, y: (pts[i + 1].cy - pts[i - 1].cy) / 2 })
    }
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const cp1x = pts[i].cx + tangents[i].x / 3
    const cp1y = pts[i].cy + tangents[i].y / 3
    const cp2x = pts[i + 1].cx - tangents[i + 1].x / 3
    const cp2y = pts[i + 1].cy - tangents[i + 1].y / 3
    target.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, pts[i + 1].cx, pts[i + 1].cy)
  }
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  points: CurvePoint[],
  viewOffset = 0
) {
  if (points.length < 2) return
  const ox  = PAD.left
  const oy  = h - PAD.bottom

  const raw = points[0].x > 0.001 || points[0].y > 0.015
    ? [{ x: 0, y: 0.012 }, ...points]
    : points
  const pts = raw.map((p) => toPx(p, w, h, viewOffset))

  ctx.save()
  ctx.beginPath()
  ctx.rect(ox, PAD.top, w - PAD.left - PAD.right, oy - PAD.top)
  ctx.clip()

  const curvePath = new Path2D()
  traceSmoothCurve(curvePath, pts)

  ctx.beginPath()
  traceSmoothCurve(ctx, pts)
  ctx.lineTo(pts[pts.length - 1].cx, oy)
  ctx.lineTo(pts[0].cx, oy)
  ctx.closePath()

  const g = ctx.createLinearGradient(0, pts[pts.length - 1].cy, 0, oy)
  g.addColorStop(0,    'rgba(0,230,118,0.9)')
  g.addColorStop(0.25, 'rgba(0,210,100,0.75)')
  g.addColorStop(0.5,  'rgba(0,180,80,0.55)')
  g.addColorStop(0.75, 'rgba(0,140,60,0.3)')
  g.addColorStop(1,    'rgba(0,80,40,0.05)')
  ctx.fillStyle = g
  ctx.fill()

  ctx.strokeStyle = '#00E676'
  ctx.lineWidth   = 3.5
  ctx.shadowColor = 'rgba(0,230,118,0.9)'
  ctx.shadowBlur  = 14
  ctx.lineJoin = 'round'
  ctx.lineCap  = 'round'
  ctx.stroke(curvePath)

  ctx.strokeStyle = 'rgba(160,255,210,0.45)'
  ctx.lineWidth   = 1.5
  ctx.shadowBlur  = 0
  ctx.stroke(curvePath)

  ctx.shadowBlur = 0
  ctx.restore()
}

// ── Code-drawn business jet ────────────────────────────────────────────────
//
// Local coordinate system:
//   (0, 0) = nose tip, pointing right (+X)
//   Fuselage extends to the left (−X), wings/fins extend up (−Y)
//   Total span: ~98px left, ~30px up for wings
//
// Call with:
//   ctx.translate(noseTipX, noseTipY)
//   ctx.rotate(−angleRad)   [where angleRad = 0 is horizontal]

function drawPlane(
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  angleRad: number,
  crashed = false
) {
  const bodyFill    = crashed ? 'rgba(120,120,120,0.82)' : 'rgba(248,255,248,0.98)'
  const wingFill    = crashed ? 'rgba(100,100,100,0.75)' : 'rgba(228,248,230,0.97)'
  const stroke      = crashed ? 'rgba(100,100,100,0.55)' : '#00E676'
  const cockpitFill = crashed ? 'rgba(80,80,80,0.5)'     : 'rgba(140,220,160,0.6)'

  ctx.save()
  ctx.translate(tipX, tipY)
  ctx.rotate(-angleRad)

  if (!crashed) {
    ctx.shadowColor = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur  = 6
  }

  ctx.lineJoin  = 'round'
  ctx.lineCap   = 'round'
  ctx.lineWidth = 1.5

  // ── Wing (Path2D — large swept-back delta shape) ─────────────────────
  const wing = new Path2D()
  wing.moveTo(-26, -4.5)
  wing.lineTo(-70, -27)
  wing.lineTo(-75, -22)
  wing.bezierCurveTo(-70, -18, -60, -8, -58, -4.5)
  wing.closePath()
  ctx.fillStyle   = wingFill
  ctx.strokeStyle = stroke
  ctx.fill(wing)
  ctx.stroke(wing)

  // ── Vertical Tail Fin (Path2D) ────────────────────────────────────────
  const vFin = new Path2D()
  vFin.moveTo(-80, -4.5)
  vFin.bezierCurveTo(-80, -10, -83, -17, -86, -24)
  vFin.lineTo(-91, -4.5)
  vFin.closePath()
  ctx.fillStyle   = wingFill
  ctx.strokeStyle = stroke
  ctx.fill(vFin)
  ctx.stroke(vFin)

  // ── Horizontal Stabilizer (Path2D) ────────────────────────────────────
  const hStab = new Path2D()
  hStab.moveTo(-80, -4.5)
  hStab.lineTo(-94, -15)
  hStab.lineTo(-96, -11)
  hStab.bezierCurveTo(-92, -8, -88, -5, -86, -4.5)
  hStab.closePath()
  ctx.fillStyle   = wingFill
  ctx.strokeStyle = stroke
  ctx.fill(hStab)
  ctx.stroke(hStab)

  // ── Fuselage (Path2D — main body drawn over wing/tail roots) ─────────
  const fuselage = new Path2D()
  fuselage.moveTo(0, 0)
  fuselage.bezierCurveTo(-2,  -1.5, -6,  -4.5, -12, -5.2)
  fuselage.bezierCurveTo(-18, -5.8, -22, -6.2, -28, -6)
  fuselage.bezierCurveTo(-35, -5.8, -55, -5.2, -72, -4.8)
  fuselage.bezierCurveTo(-80, -4.5, -87, -3.5, -92, -1.5)
  fuselage.lineTo(-94, 0)
  fuselage.bezierCurveTo(-88,  2,   -75,  3.2, -55, 3.5)
  fuselage.bezierCurveTo(-35,  3.5, -18,  2.8,  -6, 1.2)
  fuselage.bezierCurveTo(-3,   0.6,  -1,  0.2,   0, 0)
  fuselage.closePath()
  ctx.fillStyle   = bodyFill
  ctx.strokeStyle = stroke
  ctx.fill(fuselage)
  ctx.stroke(fuselage)

  // ── Cockpit Window (Path2D — no shadow, translucent tint) ────────────
  ctx.shadowBlur = 0
  const cockpit = new Path2D()
  cockpit.moveTo(-6,  -4.5)
  cockpit.bezierCurveTo(-10, -5.2, -16, -6.5, -24, -6.2)
  cockpit.bezierCurveTo(-27, -6.0, -30, -5.5, -32, -4.8)
  cockpit.lineTo(-10, -4.8)
  cockpit.closePath()
  ctx.fillStyle   = cockpitFill
  ctx.strokeStyle = 'transparent'
  ctx.fill(cockpit)

  // ── Engine Nacelles (Path2D — twin rear-mounted pods, port & starboard) ──
  if (!crashed) {
    ctx.shadowColor = 'rgba(0,0,0,0.7)'
    ctx.shadowBlur  = 4
  }

  // Port nacelle (lower, more visible from side view)
  const enginePort = new Path2D()
  enginePort.ellipse(-70, 3.5, 11, 3.0, -0.08, 0, Math.PI * 2)
  ctx.fillStyle   = wingFill
  ctx.strokeStyle = stroke
  ctx.fill(enginePort)
  ctx.stroke(enginePort)

  // Port intake shadow
  const intakePort = new Path2D()
  intakePort.ellipse(-70, 3.5, 5, 2.0, -0.08, Math.PI, Math.PI * 2)
  ctx.fillStyle   = 'rgba(0,0,0,0.35)'
  ctx.strokeStyle = 'transparent'
  ctx.fill(intakePort)

  // Starboard nacelle (upper, slightly forward — opposite side of fuselage)
  const engineStbd = new Path2D()
  engineStbd.ellipse(-68, -7.5, 10, 2.8, -0.08, 0, Math.PI * 2)
  ctx.fillStyle   = wingFill
  ctx.strokeStyle = stroke
  ctx.fill(engineStbd)
  ctx.stroke(engineStbd)

  // Starboard intake shadow
  const intakeStbd = new Path2D()
  intakeStbd.ellipse(-68, -7.5, 4.5, 1.8, -0.08, Math.PI, Math.PI * 2)
  ctx.fillStyle   = 'rgba(0,0,0,0.35)'
  ctx.strokeStyle = 'transparent'
  ctx.fill(intakeStbd)

  ctx.shadowBlur = 0
  ctx.restore()
}

// ── Exhaust particles ──────────────────────────────────────────────────────

function drawExhaust(
  ctx: CanvasRenderingContext2D,
  tailX: number,
  tailY: number,
  angleRad: number,
  time: number
) {
  ctx.save()
  ctx.translate(tailX, tailY)
  ctx.rotate(-angleRad)

  for (let i = 0; i < 14; i++) {
    const offset = (time * 0.004 + i * 0.085) % 1
    const x      = -offset * 60
    const y      = Math.sin(time * 0.012 + i * 0.9) * 2.5
    const size   = (1 - offset) * 5 + 1
    const alpha  = (1 - offset) * 0.55

    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(0,230,118,${alpha})`
    ctx.fill()
  }

  ctx.restore()
}

// ── JSX Overlays ──────────────────────────────────────────────────────────

function BetModeToggle({
  betMode,
  onToggle,
}: {
  betMode: 'money' | 'freebet'
  onToggle: () => void
}) {
  return (
    <div className="flex items-center rounded-full bg-black/70 p-0.5 border border-white/10 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => betMode !== 'money' && onToggle()}
        className={cn(
          'rounded-full px-3 py-1 text-[11px] font-semibold transition-all duration-200',
          betMode === 'money'
            ? 'bg-[#2a2a2a] text-white'
            : 'text-white/40 hover:text-white/60'
        )}
      >
        Money
      </button>
      <button
        type="button"
        onClick={() => betMode !== 'freebet' && onToggle()}
        className={cn(
          'rounded-full px-3 py-1 text-[11px] font-semibold transition-all duration-200',
          betMode === 'freebet'
            ? 'bg-[#00E676] text-black'
            : 'text-white/40 hover:text-white/60'
        )}
      >
        Use Freebet
      </button>
    </div>
  )
}

function NetworkStatus() {
  return (
    <div className="flex items-center gap-1 text-[11px] text-white/50 mt-0.5">
      <span>Network Status</span>
      <span className="font-bold text-[#00E676]">ON</span>
      <span className="relative flex h-1.5 w-1.5 ml-0.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00E676] opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00E676]" />
      </span>
    </div>
  )
}

function NautilusSpinner() {
  const blades = 9
  const cx = 32
  const cy = 32
  return (
    <svg
      className="animate-spin"
      style={{ animationDuration: '1.6s', animationDirection: 'reverse' }}
      width="80"
      height="80"
      viewBox="0 0 64 64"
      fill="none"
    >
      {Array.from({ length: blades }, (_, i) => {
        const step      = (Math.PI * 2) / blades
        const a0        = step * i
        const a1        = step * i + step * 0.88
        const innerR    = 5
        const outerR    = 28
        const outerMidR = 22
        const innerMidR = 10

        const ox0 = cx + outerR * Math.cos(a0)
        const oy0 = cy + outerR * Math.sin(a0)
        const ox1 = cx + outerR * Math.cos(a1)
        const oy1 = cy + outerR * Math.sin(a1)
        const cp1x = cx + outerMidR * Math.cos(a0 + step * 0.6)
        const cp1y = cy + outerMidR * Math.sin(a0 + step * 0.6)
        const ix0 = cx + innerR * Math.cos(a0)
        const iy0 = cy + innerR * Math.sin(a0)
        const ix1 = cx + innerR * Math.cos(a1)
        const iy1 = cy + innerR * Math.sin(a1)
        const cp2x = cx + innerMidR * Math.cos(a0 + step * 0.2)
        const cp2y = cy + innerMidR * Math.sin(a0 + step * 0.2)
        const largeArc = a1 - a0 > Math.PI ? 1 : 0
        const alpha    = 0.6 + (i / blades) * 0.4

        return (
          <path
            key={i}
            d={[
              `M ${ix0.toFixed(2)} ${iy0.toFixed(2)}`,
              `L ${ox0.toFixed(2)} ${oy0.toFixed(2)}`,
              `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox1.toFixed(2)} ${oy1.toFixed(2)}`,
              `Q ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}`,
              `L ${ix1.toFixed(2)} ${iy1.toFixed(2)}`,
              `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix0.toFixed(2)} ${iy0.toFixed(2)}`,
              'Z',
            ].join(' ')}
            fill="#00E676"
            opacity={alpha}
          />
        )
      })}
      <circle cx={cx} cy={cy} r="5.5" fill="#00E676" />
      <circle cx={cx} cy={cy} r="3"   fill="#0a0a0a" />
    </svg>
  )
}


// ── Main Component ────────────────────────────────────────────────────────

export function GameCanvas({
  phase,
  multiplier,
  crashPoint,
  waitProgress,
  trailPoints,
  plane,
  betMode,
  onToggleBetMode,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef(0)

  const render = useCallback(
    (time: number = 0) => {
      const cvs = canvasRef.current
      if (!cvs) return
      const ctx = cvs.getContext('2d')
      if (!ctx) return

      const CW = cvs.clientWidth
      const CH = cvs.clientHeight
      if (!CW || !CH) {
        rafRef.current = requestAnimationFrame(render)
        return
      }

      const dpr = window.devicePixelRatio || 1
      const pw  = Math.round(CW * dpr)
      const ph  = Math.round(CH * dpr)

      if (cvs.width !== pw || cvs.height !== ph) {
        cvs.width  = pw
        cvs.height = ph
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }

      ctx.clearRect(0, 0, CW, CH)
      drawBackground(ctx, CW, CH, time)

      const isCrashing = phase === 'crashing'
      const isCrashed  = phase === 'crashed'
      const isFlying   = phase === 'flying'
      const isWaiting  = phase === 'waiting'

      const dw      = CW - PAD.left - PAD.right
      const dh      = CH - PAD.top  - PAD.bottom
      const originX = PAD.left
      const originY = CH - PAD.bottom

      drawAxes(ctx, CW, CH)
      drawDots(ctx, CW, CH, time)

      if (isWaiting) {
        const WAIT_ANGLE = 0.433
        const PLANE_LEN  = 94
        const noseX  = originX + PLANE_LEN * Math.cos(WAIT_ANGLE)
        const noseY  = originY - PLANE_LEN * Math.sin(WAIT_ANGLE)
        drawPlane(ctx, noseX, noseY, WAIT_ANGLE, false)
      }

      const viewOffset = Math.max(0, plane.nx - MAX_X * 0.85)

      // ── FLYING: trail + animated plane ──────────────────────────────
      if (isFlying && trailPoints.length >= 2) {
        drawTrail(ctx, CW, CH, trailPoints, viewOffset)
      }
      if (isFlying && !plane.offScreen) {
        const tailX    = PAD.left + (plane.nx - viewOffset) * dw
        const tailY    = PAD.top  + (1 - plane.ny) * dh
        const angleRad = (plane.angleDeg * Math.PI) / 180
        const noseX    = tailX + 94 * Math.cos(angleRad)
        const noseY    = tailY - 94 * Math.sin(angleRad)
        drawExhaust(ctx, tailX, tailY, angleRad, time)
        drawPlane(ctx, noseX, noseY, angleRad, false)
      }

      if (isCrashing && !plane.offScreen) {
        const tailX    = PAD.left + (plane.nx + plane.crashOffsetX - viewOffset) * dw
        const tailY    = PAD.top  + (1 - (plane.ny + plane.crashOffsetY)) * dh
        const angleRad = (plane.angleDeg * Math.PI) / 180
        const noseX    = tailX + 94 * Math.cos(angleRad)
        const noseY    = tailY - 94 * Math.sin(angleRad)
        drawPlane(ctx, noseX, noseY, angleRad, true)
      }

      rafRef.current = requestAnimationFrame(render)
    },
    [phase, trailPoints, plane]
  )

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [render])

  const isCrashed = phase === 'crashed' || phase === 'crashing'
  const isWaiting = phase === 'waiting'

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
      />

      {/* Top-left: bet mode toggle + network status */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-0.5">
        <BetModeToggle betMode={betMode} onToggle={onToggleBetMode} />
        <NetworkStatus />
      </div>

      {/* WAITING overlay */}
      {isWaiting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
          <NautilusSpinner />
          <div className="text-center">
            <div className="text-white font-bold text-sm tracking-widest uppercase">
              WAITING FOR NEXT ROUND
            </div>
            <div className="mt-2 mx-auto w-40 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00E676] rounded-full transition-all"
                style={{ width: `${waitProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* FLYING: large white multiplier */}
      {phase === 'flying' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div
            className="font-black text-white leading-none multiplier-display"
            style={{
              fontSize: 'clamp(2.8rem, 9vw, 5.5rem)',
              textShadow: '0 2px 30px rgba(255,255,255,0.3)',
            }}
          >
            {multiplier.toFixed(2)}x
          </div>
        </div>
      )}

      {/* CRASHED overlay */}
      {isCrashed && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center">
            <div className="text-[#E91E63] text-xs font-bold tracking-widest uppercase mb-1">
              Flew Away!
            </div>
            <div
              className="font-black text-[#E91E63] leading-none"
              style={{ fontSize: 'clamp(2.2rem, 7vw, 4rem)', textShadow: '0 0 20px rgba(233,30,99,0.7)' }}
            >
              {crashPoint > 0 ? `${crashPoint.toFixed(2)}x` : `${multiplier.toFixed(2)}x`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
