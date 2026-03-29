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
  serverSeedHash: string
  nonce: number
  revealedSeed: string
}

const PAD = { left: 44, right: 16, top: 20, bottom: 36 }

function toPx(p: CurvePoint, w: number, h: number) {
  const dw = w - PAD.left - PAD.right
  const dh = h - PAD.top - PAD.bottom
  return {
    cx: PAD.left + p.x * dw,
    cy: PAD.top + (1 - p.y) * dh,
  }
}

// ── Background with radiating rays ─────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#0e0e0e'
  ctx.fillRect(0, 0, w, h)

  const ox       = PAD.left
  const oy       = h - PAD.bottom
  const maxDist  = Math.sqrt(w * w + h * h) * 1.5
  const numRays  = 28
  const fanStart = -Math.PI
  const fanEnd   = -Math.PI * 0.02
  const fanSpan  = fanEnd - fanStart

  for (let i = 0; i < numRays; i++) {
    const a1 = fanStart + (i / numRays) * fanSpan
    const a2 = fanStart + ((i + 0.45) / numRays) * fanSpan
    ctx.beginPath()
    ctx.moveTo(ox, oy)
    ctx.lineTo(ox + Math.cos(a1) * maxDist, oy + Math.sin(a1) * maxDist)
    ctx.lineTo(ox + Math.cos(a2) * maxDist, oy + Math.sin(a2) * maxDist)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255,255,255,0.018)'
    ctx.fill()
  }

  const glow = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.min(w, h) * 0.7)
  glow.addColorStop(0,    'rgba(160,110,30,0.28)')
  glow.addColorStop(0.15, 'rgba(120,80,20,0.18)')
  glow.addColorStop(0.4,  'rgba(80,50,10,0.07)')
  glow.addColorStop(1,    'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
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

function drawTrail(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  points: CurvePoint[],
  crashed: boolean
) {
  if (points.length < 2) return
  const ox  = PAD.left
  const oy  = h - PAD.bottom
  const pts = points.map((p) => toPx(p, w, h))

  ctx.save()
  ctx.beginPath()
  ctx.rect(ox, PAD.top, w - PAD.left - PAD.right, oy - PAD.top)
  ctx.clip()

  const curvePath = new Path2D()
  curvePath.moveTo(pts[0].cx, pts[0].cy)
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].cx + pts[i + 1].cx) / 2
    const my = (pts[i].cy + pts[i + 1].cy) / 2
    curvePath.quadraticCurveTo(pts[i].cx, pts[i].cy, mx, my)
  }
  curvePath.lineTo(pts[pts.length - 1].cx, pts[pts.length - 1].cy)

  // Fill area under curve
  ctx.beginPath()
  ctx.moveTo(pts[0].cx, pts[0].cy)
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].cx + pts[i + 1].cx) / 2
    const my = (pts[i].cy + pts[i + 1].cy) / 2
    ctx.quadraticCurveTo(pts[i].cx, pts[i].cy, mx, my)
  }
  ctx.lineTo(pts[pts.length - 1].cx, pts[pts.length - 1].cy)
  ctx.lineTo(pts[pts.length - 1].cx, oy)
  ctx.lineTo(pts[0].cx, oy)
  ctx.closePath()

  if (crashed) {
    ctx.fillStyle = 'rgba(80,80,80,0.12)'
  } else {
    const g = ctx.createLinearGradient(0, pts[pts.length - 1].cy, 0, oy)
    g.addColorStop(0,    'rgba(0,230,118,0.9)')
    g.addColorStop(0.25, 'rgba(0,210,100,0.75)')
    g.addColorStop(0.5,  'rgba(0,180,80,0.55)')
    g.addColorStop(0.75, 'rgba(0,140,60,0.3)')
    g.addColorStop(1,    'rgba(0,80,40,0.05)')
    ctx.fillStyle = g
  }
  ctx.fill()

  if (crashed) {
    ctx.strokeStyle = 'rgba(100,100,100,0.5)'
    ctx.lineWidth   = 2.5
    ctx.setLineDash([5, 4])
  } else {
    ctx.strokeStyle = '#00E676'
    ctx.lineWidth   = 3.5
    ctx.shadowColor = 'rgba(0,230,118,0.9)'
    ctx.shadowBlur  = 14
  }
  ctx.lineJoin = 'round'
  ctx.lineCap  = 'round'
  ctx.stroke(curvePath)

  if (!crashed) {
    ctx.strokeStyle = 'rgba(160,255,210,0.45)'
    ctx.lineWidth   = 1.5
    ctx.shadowBlur  = 0
    ctx.stroke(curvePath)
  }

  ctx.setLineDash([])
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
  const bodyFill    = crashed ? 'rgba(120,120,120,0.82)' : 'rgba(215,230,215,0.92)'
  const wingFill    = crashed ? 'rgba(100,100,100,0.75)' : 'rgba(195,218,195,0.88)'
  const stroke      = crashed ? 'rgba(100,100,100,0.55)' : '#00E676'
  const cockpitFill = crashed ? 'rgba(80,80,80,0.5)'     : 'rgba(100,200,140,0.5)'

  ctx.save()
  ctx.translate(tipX, tipY)
  ctx.rotate(-angleRad)

  if (!crashed) {
    ctx.shadowColor = '#00E676'
    ctx.shadowBlur  = 18
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
    ctx.shadowColor = '#00E676'
    ctx.shadowBlur  = 6
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
  tipX: number,
  tipY: number,
  angleRad: number,
  time: number
) {
  ctx.save()
  ctx.translate(tipX, tipY)
  ctx.rotate(-angleRad)

  for (let i = 0; i < 12; i++) {
    const offset = (time * 0.004 + i * 0.1) % 1
    const x      = -94 - offset * 55
    const y      = Math.sin(time * 0.012 + i * 0.9) * 2
    const size   = (1 - offset) * 4.5 + 1
    const alpha  = (1 - offset) * 0.5

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

function DecorationDots() {
  return (
    <>
      <div className="absolute bottom-[34px] left-[44px] right-[16px] flex justify-between pointer-events-none z-[2]">
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={`b-${i}`}
            className="h-[6px] w-[6px] rounded-full"
            style={{
              backgroundColor: '#00E676',
              opacity: 0.65,
              animation: 'dotPulse 2s ease-in-out infinite',
              animationDelay: `${i * 0.08}s`,
            }}
          />
        ))}
      </div>
      <div className="absolute left-[16px] top-[20px] bottom-[36px] flex flex-col justify-between pointer-events-none z-[2]">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={`l-${i}`}
            className="h-[6px] w-[6px] rounded-full"
            style={{
              backgroundColor: '#00E676',
              opacity: 0.65,
              animation: 'dotPulse 2.5s ease-in-out infinite',
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
    </>
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
  serverSeedHash,
  nonce,
  revealedSeed,
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
      drawBackground(ctx, CW, CH)

      const isCrashing = phase === 'crashing'
      const isCrashed  = phase === 'crashed'
      const isFlying   = phase === 'flying'
      const isWaiting  = phase === 'waiting'

      const dw      = CW - PAD.left - PAD.right
      const dh      = CH - PAD.top  - PAD.bottom
      const originX = PAD.left
      const originY = CH - PAD.bottom

      drawAxes(ctx, CW, CH)

      // ── WAITING: plane rests with tail at origin, nose tilted upper-right ──
      if (isWaiting) {
        const WAIT_ANGLE = 0.26          // ~15° upward tilt in radians
        const PLANE_LEN  = 94            // nose-to-tail length in local px
        const noseX = originX + PLANE_LEN * Math.cos(WAIT_ANGLE)
        const noseY = originY - PLANE_LEN * Math.sin(WAIT_ANGLE)
        drawPlane(ctx, noseX, noseY, WAIT_ANGLE, false)
      }

      // ── FLYING: trail + animated plane ──────────────────────────────
      if (isFlying && trailPoints.length >= 2) {
        drawTrail(ctx, CW, CH, trailPoints, false)
      }
      if (isFlying && !plane.offScreen) {
        const tipX     = PAD.left + plane.nx * dw
        const tipY     = PAD.top  + (1 - plane.ny) * dh
        const angleRad = (plane.angleDeg * Math.PI) / 180
        drawExhaust(ctx, tipX, tipY, angleRad, time)
        drawPlane(ctx, tipX, tipY, angleRad, false)
      }

      // ── CRASHING / CRASHED ───────────────────────────────────────────
      if ((isCrashing || isCrashed) && trailPoints.length >= 2) {
        drawTrail(ctx, CW, CH, trailPoints, true)
      }
      if (isCrashing && !plane.offScreen) {
        const tipX     = PAD.left + (plane.nx + plane.crashOffsetX) * dw
        const tipY     = PAD.top  + (1 - (plane.ny + plane.crashOffsetY)) * dh
        const angleRad = (plane.angleDeg * Math.PI) / 180
        drawPlane(ctx, tipX, tipY, angleRad, true)
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

      <DecorationDots />

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
            <div className="mt-2 mx-auto w-40 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${waitProgress}%` }}
              />
            </div>
          </div>
          {/* Provably fair: server seed hash + nonce */}
          {serverSeedHash && (
            <div className="text-center px-3 py-1.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.45)' }}>
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">
                Round #{nonce} · Provably Fair
              </div>
              <div
                className="text-[9px] font-mono text-[#00E676]/70 break-all"
                style={{ maxWidth: '320px', lineHeight: 1.5 }}
                title="SHA-256 hash of this round's server seed — verify after the round"
              >
                {serverSeedHash}
              </div>
            </div>
          )}
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
          <div
            className="text-center px-8 py-4 rounded-2xl border border-[#E91E63]/30 crashed-flash"
            style={{ background: 'rgba(233,30,99,0.12)', backdropFilter: 'blur(6px)' }}
          >
            <div className="text-[#E91E63] text-xs font-bold tracking-widest uppercase mb-1">
              Flew Away!
            </div>
            <div
              className="font-black text-[#E91E63] leading-none"
              style={{ fontSize: 'clamp(2.2rem, 7vw, 4rem)', textShadow: '0 0 20px rgba(233,30,99,0.7)' }}
            >
              {crashPoint > 0 ? `${crashPoint.toFixed(2)}x` : `${multiplier.toFixed(2)}x`}
            </div>
            {/* Provably fair: reveal server seed for verification */}
            {revealedSeed && (
              <div className="mt-3 border-t border-[#E91E63]/20 pt-2">
                <div className="text-[9px] text-[#E91E63]/50 uppercase tracking-widest mb-0.5">
                  Server Seed (verify)
                </div>
                <div className="text-[8px] font-mono text-[#E91E63]/60 break-all" style={{ maxWidth: '260px' }}>
                  {revealedSeed}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
