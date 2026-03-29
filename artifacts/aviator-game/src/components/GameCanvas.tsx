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

const PAD = { left: 44, right: 16, top: 20, bottom: 36 }

const SPRITE_DRAW_W = 90
const SPRITE_NATIVE_ANGLE_RAD = (30 * Math.PI) / 180
const TAIL_OFFSET_X = -6
const TAIL_OFFSET_Y = 0

function toPx(p: CurvePoint, w: number, h: number) {
  const dw = w - PAD.left - PAD.right
  const dh = h - PAD.top - PAD.bottom
  return {
    cx: PAD.left + p.x * dw,
    cy: PAD.top + (1 - p.y) * dh,
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Very dark base
  ctx.fillStyle = '#0e0e0e'
  ctx.fillRect(0, 0, w, h)

  // Radiating rays from graph origin (bottom-left corner)
  const ox = PAD.left
  const oy = h - PAD.bottom
  const maxDist = Math.sqrt(w * w + h * h) * 1.5
  const numRays = 28

  // Fan covers upper-right quadrant plus some extra
  const fanStart = -Math.PI        // pointing left (180°)
  const fanEnd   = -Math.PI * 0.02 // pointing slightly past up (90°)
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

  // Warm golden glow at origin
  const glow = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.min(w, h) * 0.7)
  glow.addColorStop(0, 'rgba(160,110,30,0.28)')
  glow.addColorStop(0.15, 'rgba(120,80,20,0.18)')
  glow.addColorStop(0.4, 'rgba(80,50,10,0.07)')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
}

function drawAxes(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const ox = PAD.left
  const oy = h - PAD.bottom

  ctx.save()
  ctx.strokeStyle = 'rgba(0,230,118,0.55)'
  ctx.lineWidth = 2
  ctx.shadowColor = 'rgba(0,230,118,0.35)'
  ctx.shadowBlur = 6

  // Y-axis
  ctx.beginPath()
  ctx.moveTo(ox, PAD.top)
  ctx.lineTo(ox, oy)
  ctx.stroke()

  // X-axis
  ctx.beginPath()
  ctx.moveTo(ox, oy)
  ctx.lineTo(w - PAD.right, oy)
  ctx.stroke()

  ctx.shadowBlur = 0
  ctx.restore()
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  points: CurvePoint[],
  crashed: boolean
) {
  if (points.length < 2) return
  const ox = PAD.left
  const oy = h - PAD.bottom

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

  // Fill area
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
    g.addColorStop(0, 'rgba(0,230,118,0.9)')
    g.addColorStop(0.25, 'rgba(0,210,100,0.75)')
    g.addColorStop(0.5, 'rgba(0,180,80,0.55)')
    g.addColorStop(0.75, 'rgba(0,140,60,0.3)')
    g.addColorStop(1, 'rgba(0,80,40,0.05)')
    ctx.fillStyle = g
  }
  ctx.fill()

  // Stroke
  if (crashed) {
    ctx.strokeStyle = 'rgba(100,100,100,0.5)'
    ctx.lineWidth = 2.5
    ctx.setLineDash([5, 4])
  } else {
    ctx.strokeStyle = '#00E676'
    ctx.lineWidth = 3.5
    ctx.shadowColor = 'rgba(0,230,118,0.9)'
    ctx.shadowBlur = 14
  }
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.stroke(curvePath)

  if (!crashed) {
    ctx.strokeStyle = 'rgba(160,255,210,0.45)'
    ctx.lineWidth = 1.5
    ctx.shadowBlur = 0
    ctx.stroke(curvePath)
  }

  ctx.setLineDash([])
  ctx.shadowBlur = 0
  ctx.restore()
}

function drawPlaneSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  tipX: number,
  tipY: number,
  angleRad: number
) {
  if (!img.complete || img.naturalWidth === 0) return

  const aspect = img.naturalHeight / img.naturalWidth
  const drawW = SPRITE_DRAW_W
  const drawH = drawW * aspect

  ctx.save()
  ctx.shadowColor = 'rgba(0,230,118,0.5)'
  ctx.shadowBlur = 18
  ctx.translate(tipX, tipY)
  ctx.rotate(-(angleRad - SPRITE_NATIVE_ANGLE_RAD))
  const anchorX = drawW + TAIL_OFFSET_X
  const anchorY = drawH / 2 + TAIL_OFFSET_Y
  ctx.drawImage(img, -anchorX, -anchorY, drawW, drawH)
  ctx.restore()
}

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

  for (let i = 0; i < 10; i++) {
    const offset = (time * 0.004 + i * 0.12) % 1
    const x = -18 - offset * 70
    const y = Math.sin(time * 0.012 + i * 0.8) * 2.5
    const size = (1 - offset) * 5 + 1.5
    const alpha = (1 - offset) * 0.55

    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(0,230,118,${alpha})`
    ctx.fill()
  }

  ctx.restore()
}

// ── JSX Overlays ─────────────────────────────────────────────────────────────

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
      <defs>
        <radialGradient id="nautilusGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00E676" stopOpacity="1" />
          <stop offset="100%" stopColor="#00C853" stopOpacity="0.6" />
        </radialGradient>
      </defs>
      {Array.from({ length: blades }, (_, i) => {
        const step      = (Math.PI * 2) / blades
        const a0        = step * i
        const a1        = step * i + step * 0.88   // wide blade coverage
        const innerR    = 5
        const outerR    = 28
        const outerMidR = 22
        const innerMidR = 10

        // Outer arc: starts at a0, ends at a1
        const ox0 = cx + outerR * Math.cos(a0)
        const oy0 = cy + outerR * Math.sin(a0)
        const ox1 = cx + outerR * Math.cos(a1)
        const oy1 = cy + outerR * Math.sin(a1)

        // Control points for the swirl curve
        const cp1x = cx + outerMidR * Math.cos(a0 + step * 0.6)
        const cp1y = cy + outerMidR * Math.sin(a0 + step * 0.6)

        // Inner arc: ends at a0, starts at a1 (reverse sweep for nautilus)
        const ix0 = cx + innerR * Math.cos(a0)
        const iy0 = cy + innerR * Math.sin(a0)
        const ix1 = cx + innerR * Math.cos(a1)
        const iy1 = cy + innerR * Math.sin(a1)

        const cp2x = cx + innerMidR * Math.cos(a0 + step * 0.2)
        const cp2y = cy + innerMidR * Math.sin(a0 + step * 0.2)

        // Large arc flag depends on whether the arc spans > 180°
        const largeArc = a1 - a0 > Math.PI ? 1 : 0

        const alpha = 0.6 + (i / blades) * 0.4

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
      {/* Centre */}
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

// ── Main Component ───────────────────────────────────────────────────────────

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
  const spriteRef = useRef<HTMLImageElement | null>(null)
  const rafRef    = useRef(0)

  useEffect(() => {
    const img = new Image()
    img.src = `${import.meta.env.BASE_URL}plane-sprite.png`
    img.crossOrigin = 'anonymous'
    spriteRef.current = img
  }, [])

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

      const dw = CW - PAD.left - PAD.right
      const dh = CH - PAD.top  - PAD.bottom
      const originX = PAD.left
      const originY = CH - PAD.bottom

      drawAxes(ctx, CW, CH)

      // WAITING — plane parked at origin
      if (isWaiting && spriteRef.current) {
        const waitAngle = (20 * Math.PI) / 180
        drawPlaneSprite(ctx, spriteRef.current, originX, originY, waitAngle)
      }

      // FLYING — trail + live plane
      if (isFlying && trailPoints.length >= 2) {
        drawTrail(ctx, CW, CH, trailPoints, false)
      }
      if (isFlying && spriteRef.current && !plane.offScreen) {
        const tipX    = PAD.left + plane.nx * dw
        const tipY    = PAD.top  + (1 - plane.ny) * dh
        const angleRad = (plane.angleDeg * Math.PI) / 180
        drawExhaust(ctx, tipX, tipY, angleRad, time)
        drawPlaneSprite(ctx, spriteRef.current, tipX, tipY, angleRad)
      }

      // CRASHING / CRASHED
      if ((isCrashing || isCrashed) && trailPoints.length >= 2) {
        drawTrail(ctx, CW, CH, trailPoints, true)
      }
      if (isCrashing && spriteRef.current && !plane.offScreen) {
        const tipX    = PAD.left + (plane.nx + plane.crashOffsetX) * dw
        const tipY    = PAD.top  + (1 - (plane.ny + plane.crashOffsetY)) * dh
        const angleRad = (plane.angleDeg * Math.PI) / 180
        drawPlaneSprite(ctx, spriteRef.current, tipX, tipY, angleRad)
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
  const waitSecs  = Math.max(0, ((100 - waitProgress) / 100) * 5).toFixed(1)

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
      />

      <DecorationDots />

      {/* Top-left: bet mode toggle + network */}
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
            {/* Progress bar */}
            <div className="mt-2 mx-auto w-40 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
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
          </div>
        </div>
      )}
    </div>
  )
}
