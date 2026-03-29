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

const PAD = { left: 40, right: 20, top: 60, bottom: 40 }

const SPRITE_DRAW_W = 80
const SPRITE_NATIVE_ANGLE_RAD = (30 * Math.PI) / 180
const TAIL_OFFSET_X = -8
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
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
  bgGrad.addColorStop(0, '#0f1923')
  bgGrad.addColorStop(0.5, '#101820')
  bgGrad.addColorStop(1, '#0d1218')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)

  const radGrad = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.6)
  radGrad.addColorStop(0, 'rgba(0, 50, 30, 0.15)')
  radGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = radGrad
  ctx.fillRect(0, 0, w, h)
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const ox = PAD.left
  const oy = h - PAD.bottom
  const dw = w - PAD.left - PAD.right
  const dh = h - PAD.top - PAD.bottom

  ctx.save()

  ctx.strokeStyle = 'rgba(255,255,255,0.03)'
  ctx.lineWidth = 1

  for (let i = 1; i <= 8; i++) {
    const x = ox + (i / 9) * dw
    ctx.beginPath()
    ctx.moveTo(x, PAD.top)
    ctx.lineTo(x, oy)
    ctx.stroke()
  }

  for (let i = 1; i <= 6; i++) {
    const y = oy - (i / 7) * dh
    ctx.beginPath()
    ctx.moveTo(ox, y)
    ctx.lineTo(w - PAD.right, y)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(0,230,118,0.6)'
  ctx.lineWidth = 2
  ctx.shadowColor = 'rgba(0,230,118,0.4)'
  ctx.shadowBlur = 8

  ctx.beginPath()
  ctx.moveTo(ox, PAD.top)
  ctx.lineTo(ox, oy)
  ctx.stroke()

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

  ctx.beginPath()
  ctx.moveTo(pts[0].cx, pts[0].cy)
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].cx + pts[i + 1].cx) / 2
    const my = (pts[i].cy + pts[i + 1].cy) / 2
    ctx.quadraticCurveTo(pts[i].cx, pts[i].cy, mx, my)
  }
  ctx.lineTo(pts[pts.length - 1].cx, pts[pts.length - 1].cy)

  const last = pts[pts.length - 1]
  const first = pts[0]
  ctx.lineTo(last.cx, oy)
  ctx.lineTo(first.cx, oy)
  ctx.closePath()

  if (crashed) {
    ctx.fillStyle = 'rgba(80,80,80,0.15)'
  } else {
    const g = ctx.createLinearGradient(0, last.cy, 0, oy)
    g.addColorStop(0, 'rgba(0,230,118,0.95)')
    g.addColorStop(0.2, 'rgba(0,210,100,0.85)')
    g.addColorStop(0.4, 'rgba(0,180,80,0.65)')
    g.addColorStop(0.6, 'rgba(0,150,60,0.45)')
    g.addColorStop(0.8, 'rgba(0,120,50,0.25)')
    g.addColorStop(1, 'rgba(0,80,40,0.08)')
    ctx.fillStyle = g
  }
  ctx.fill()

  if (crashed) {
    ctx.strokeStyle = 'rgba(120,120,120,0.6)'
    ctx.lineWidth = 3
    ctx.setLineDash([6, 4])
  } else {
    ctx.strokeStyle = '#00E676'
    ctx.lineWidth = 4
    ctx.shadowColor = 'rgba(0,230,118,0.8)'
    ctx.shadowBlur = 12
  }

  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.stroke(curvePath)

  if (!crashed) {
    ctx.strokeStyle = 'rgba(150,255,200,0.5)'
    ctx.lineWidth = 2
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
  ctx.shadowColor = 'rgba(0,230,118,0.6)'
  ctx.shadowBlur = 20
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

  const numParticles = 8
  for (let i = 0; i < numParticles; i++) {
    const offset = (time * 0.003 + i * 0.15) % 1
    const x = -20 - offset * 60
    const y = Math.sin(time * 0.01 + i) * 3
    const size = (1 - offset) * 6 + 2
    const alpha = (1 - offset) * 0.6

    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(0,230,118,${alpha})`
    ctx.fill()
  }

  ctx.restore()
}

function BetModeToggle({
  betMode,
  onToggle,
}: {
  betMode: 'money' | 'freebet'
  onToggle: () => void
}) {
  return (
    <div className="flex items-center rounded-full bg-[#1a1a2e]/95 p-0.5 border border-[#2a2a3e] backdrop-blur-sm">
      <button
        type="button"
        onClick={() => betMode !== 'money' && onToggle()}
        className={cn(
          'rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200',
          betMode === 'money'
            ? 'bg-[#2a2a3e] text-foreground'
            : 'text-muted-foreground hover:text-foreground/70'
        )}
      >
        Money
      </button>
      <button
        type="button"
        onClick={() => betMode !== 'freebet' && onToggle()}
        className={cn(
          'rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200',
          betMode === 'freebet'
            ? 'bg-[#00E676] text-[#0d0d1a]'
            : 'text-muted-foreground hover:text-foreground/70'
        )}
      >
        Use Freebet
      </button>
    </div>
  )
}

function NetworkStatus() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
      <span>Network Status</span>
      <span className="font-bold text-[#00E676]">ON</span>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00E676] opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00E676]" />
      </span>
    </div>
  )
}

function TurbineSpinner() {
  return (
    <svg
      className="animate-spin-reverse"
      width="80"
      height="80"
      viewBox="0 0 64 64"
      fill="none"
    >
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const r = (deg * Math.PI) / 180
        return (
          <path
            key={deg}
            d={`M${32 + 8 * Math.cos(r)},${32 + 8 * Math.sin(r)} Q${32 + 15 * Math.cos(r + 0.4)},${32 + 15 * Math.sin(r + 0.4)} ${32 + 26 * Math.cos(r)},${32 + 26 * Math.sin(r)}`}
            stroke="#00E676"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.8"
          />
        )
      })}
      <circle cx="32" cy="32" r="5" fill="#00E676" />
      <circle cx="32" cy="32" r="2.5" fill="#0d0d1a" />
    </svg>
  )
}

function DecorationDots() {
  return (
    <>
      <div className="absolute bottom-[38px] left-[40px] right-[20px] flex justify-between pointer-events-none z-[2]">
        {Array.from({ length: 14 }, (_, i) => (
          <div
            key={`b-${i}`}
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: '#00E676',
              opacity: 0.7,
              animation: 'dotPulse 2s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      <div className="absolute left-[18px] top-[60px] bottom-[40px] flex flex-col justify-between pointer-events-none z-[2]">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={`l-${i}`}
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: '#00E676',
              opacity: 0.7,
              animation: 'dotPulse 2.5s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </>
  )
}

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
  const timeRef = useRef(0)
  const rafRef = useRef(0)

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

      timeRef.current = time

      const CW = cvs.clientWidth || cvs.width
      const CH = cvs.clientHeight || cvs.height
      const dpr = window.devicePixelRatio || 1
      const pw = Math.round(CW * dpr)
      const ph = Math.round(CH * dpr)

      if (cvs.width !== pw || cvs.height !== ph) {
        cvs.width = pw
        cvs.height = ph
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }

      ctx.clearRect(0, 0, CW, CH)
      drawBackground(ctx, CW, CH)

      const isCrashing = phase === 'crashing'
      const isCrashed = phase === 'crashed'
      const isFlying = phase === 'flying'
      const isWaiting = phase === 'waiting'

      const dw = CW - PAD.left - PAD.right
      const dh = CH - PAD.top - PAD.bottom

      const originX = PAD.left
      const originY = CH - PAD.bottom

      drawGrid(ctx, CW, CH)

      if (isWaiting && spriteRef.current) {
        const waitAngleRad = (20 * Math.PI) / 180
        drawPlaneSprite(ctx, spriteRef.current, originX, originY, waitAngleRad)
      }

      if (isFlying && trailPoints.length >= 2) {
        drawTrail(ctx, CW, CH, trailPoints, false)
      }

      if (isFlying && spriteRef.current && !plane.offScreen) {
        const tipX = PAD.left + plane.nx * dw
        const tipY = PAD.top + (1 - plane.ny) * dh
        const angleRad = (plane.angleDeg * Math.PI) / 180
        drawExhaust(ctx, tipX, tipY, angleRad, time)
        drawPlaneSprite(ctx, spriteRef.current, tipX, tipY, angleRad)
      }

      if ((isCrashing || isCrashed) && trailPoints.length >= 2) {
        drawTrail(ctx, CW, CH, trailPoints, true)
      }

      if (isCrashing && spriteRef.current && !plane.offScreen) {
        const tipX = PAD.left + (plane.nx + plane.crashOffsetX) * dw
        const tipY = PAD.top + (1 - (plane.ny + plane.crashOffsetY)) * dh
        const angleRad = (plane.angleDeg * Math.PI) / 180
        drawPlaneSprite(ctx, spriteRef.current, tipX, tipY, angleRad)
      }

      rafRef.current = requestAnimationFrame(render)
    },
    [phase, trailPoints, plane]
  )

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [render])

  const isCrashed = phase === 'crashed' || phase === 'crashing'
  const isWaiting = phase === 'waiting'
  const waitSecs = Math.max(0, ((100 - waitProgress) / 100) * 5).toFixed(1)

  return (
    <div className="relative w-full h-full game-canvas-bg rounded-xl overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
      />

      <DecorationDots />

      {/* Top-left: bet mode toggle + network status */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        <BetModeToggle betMode={betMode} onToggle={onToggleBetMode} />
        <NetworkStatus />
      </div>

      {/* Center overlay — waiting */}
      {isWaiting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
          <TurbineSpinner />
          <div className="text-center">
            <div className="text-[#cdd2db] text-sm font-medium">WAITING FOR NEXT ROUND</div>
            <div className="text-[#00E676] font-mono text-2xl font-bold mt-1">
              {waitSecs}s
            </div>
          </div>
        </div>
      )}

      {/* Center overlay — flying: multiplier */}
      {phase === 'flying' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center">
            <div
              className="font-mono font-black text-[#00E676] leading-none multiplier-display"
              style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', textShadow: '0 0 30px rgba(0,230,118,0.6)' }}
            >
              {multiplier.toFixed(2)}x
            </div>
          </div>
        </div>
      )}

      {/* Center overlay — crashed */}
      {isCrashed && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div
            className="text-center px-8 py-5 rounded-2xl border border-[#E91E63]/30 crashed-flash"
            style={{ background: 'rgba(233,30,99,0.15)', backdropFilter: 'blur(8px)' }}
          >
            <div className="text-[#E91E63] text-sm font-semibold tracking-widest uppercase mb-1">
              Flew Away!
            </div>
            <div
              className="font-mono font-black text-[#E91E63] leading-none"
              style={{ fontSize: 'clamp(2rem, 7vw, 4rem)', textShadow: '0 0 20px rgba(233,30,99,0.6)' }}
            >
              {crashPoint > 0 ? `${crashPoint.toFixed(2)}x` : `${multiplier.toFixed(2)}x`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
