import { useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { Phase, PlaneTransform } from '../hooks/useGameState'
import { computeMultiplier, mapX, mapY, MAX_X } from '../hooks/useGameState'

interface GameCanvasProps {
  phase: Phase
  multiplier: number
  crashPoint: number
  waitProgress: number
  elapsedMs: number
  plane: PlaneTransform
  betMode: 'money' | 'freebet'
  onToggleBetMode: () => void
}

const PAD = { left: 44, right: 16, top: 20, bottom: 20 }

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

const NUM_CURVE_PTS = 60

function traceCatmullRom(
  target: CanvasRenderingContext2D | Path2D,
  pts: { cx: number; cy: number }[]
) {
  target.moveTo(pts[0].cx, pts[0].cy)
  if (pts.length === 2) { target.lineTo(pts[1].cx, pts[1].cy); return }
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1.cx + (p2.cx - p0.cx) / 6
    const cp1y = p1.cy + (p2.cy - p0.cy) / 6
    const cp2x = p2.cx - (p3.cx - p1.cx) / 6
    const cp2y = p2.cy - (p3.cy - p1.cy) / 6
    target.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.cx, p2.cy)
  }
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elMs: number
) {
  if (elMs < 10) return
  const dw = w - PAD.left - PAD.right
  const dh = h - PAD.top - PAD.bottom
  const ox = PAD.left
  const oy = h - PAD.bottom

  const steps = NUM_CURVE_PTS
  const pxPts: { cx: number; cy: number }[] = []

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * elMs
    const nx = mapX(t)
    const mult = computeMultiplier(t)
    const ny = mapY(mult)
    pxPts.push({ cx: ox + nx * dw, cy: PAD.top + (1 - ny) * dh })
    if (nx >= MAX_X) break
  }

  const finalMult = computeMultiplier(elMs)
  const finalNy = mapY(finalMult)
  const finalNx = mapX(elMs)
  const finalPx = { cx: ox + finalNx * dw, cy: PAD.top + (1 - finalNy) * dh }
  const last = pxPts[pxPts.length - 1]
  if (Math.abs(finalPx.cx - last.cx) < 1) {
    last.cy = Math.min(last.cy, finalPx.cy)
  } else if (Math.abs(finalPx.cx - last.cx) > 0.5 || Math.abs(finalPx.cy - last.cy) > 0.5) {
    pxPts.push(finalPx)
  }

  if (pxPts.length < 2) return

  ctx.save()
  ctx.beginPath()
  ctx.rect(ox, PAD.top, dw, dh)
  ctx.clip()

  const curvePath = new Path2D()
  traceCatmullRom(curvePath, pxPts)

  ctx.beginPath()
  traceCatmullRom(ctx, pxPts)
  ctx.lineTo(pxPts[pxPts.length - 1].cx, oy)
  ctx.lineTo(pxPts[0].cx, oy)
  ctx.closePath()

  const g = ctx.createLinearGradient(0, pxPts[pxPts.length - 1].cy, 0, oy)
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

// ── Sprite Plane ────────────────────────────────────────────────────────────

function drawExhaust(
  ctx: CanvasRenderingContext2D,
  tailX: number,
  tailY: number,
  angleRad: number,
  time: number,
  intensity = 1
) {
  ctx.save()
  ctx.translate(tailX, tailY)
  ctx.rotate(-angleRad)

  for (let i = 0; i < 24; i++) {
    const t = ((time * 0.0065 + i * 0.062) % 1.35)
    if (t > 1) continue
    const dist = t * 82
    const spread = Math.sin(time * 0.029 + i) * (3 + t * 2.5)
    const size = (1 - t) * (7.5 + intensity * 4) + 1.8

    ctx.beginPath()
    ctx.arc(-dist, spread, size, 0, Math.PI * 2)
    ctx.fillStyle = i % 4 === 0
      ? `rgba(255, 140, 30, ${(1 - t) * 0.9})`
      : `rgba(100, 230, 255, ${(1 - t) * 0.55})`
    ctx.fill()
  }

  ctx.restore()
}

function drawPlaneSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleRad: number,
  img: HTMLImageElement,
  crashed = false
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-angleRad)

  const scale = crashed ? 0.72 : 0.78
  const w = img.width * scale
  const h = img.height * scale

  ctx.drawImage(img, -w * 0.68, -h / 2, w, h)
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
  elapsedMs,
  plane,
  betMode,
  onToggleBetMode,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef(0)
  const planeImgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.src = '/plane-sprite.png'
    img.onload = () => { planeImgRef.current = img }
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
      drawBackground(ctx, CW, CH, time)

      const isCrashing = phase === 'crashing'
      const isCrashed  = phase === 'crashed'
      const isFlying   = phase === 'flying'

      const dw      = CW - PAD.left - PAD.right
      const dh      = CH - PAD.top  - PAD.bottom

      drawAxes(ctx, CW, CH)
      drawDots(ctx, CW, CH, time)

      if (isFlying && elapsedMs > 10) {
        drawTrail(ctx, CW, CH, elapsedMs)

        const currX = mapX(elapsedMs)
        const currMult = computeMultiplier(elapsedMs)
        const currY = mapY(currMult)

        const tailX = PAD.left + currX * dw
        const tailY = PAD.top + (1 - currY) * dh

        let angleRad = -0.35
        if (elapsedMs > 60) {
          const prevMs = elapsedMs - 26
          const prevMult = computeMultiplier(prevMs)
          const dx = (mapX(elapsedMs) - mapX(prevMs)) * dw
          const dy = (mapY(currMult) - mapY(prevMult)) * dh
          angleRad = Math.atan2(-dy, dx)
        }

        const noseX = tailX + 94 * Math.cos(angleRad)
        const noseY = tailY - 94 * Math.sin(angleRad)

        const img = planeImgRef.current
        drawExhaust(ctx, tailX, tailY, angleRad, time, 1.1)
        if (img) drawPlaneSprite(ctx, noseX, noseY, angleRad, img, false)
      }

      if ((isCrashing || isCrashed) && !plane.offScreen) {
        const currX = mapX(elapsedMs)
        const currMult = computeMultiplier(elapsedMs)
        const currY = mapY(currMult)

        const tailX = PAD.left + (currX + (plane.crashOffsetX || 0)) * dw
        const tailY = PAD.top + (1 - (currY + (plane.crashOffsetY || 0))) * dh

        let angleRad = -0.4
        if (elapsedMs > 60) {
          const prevMs = elapsedMs - 26
          const dx = (mapX(elapsedMs) - mapX(prevMs)) * dw
          const dy = (mapY(currMult) - mapY(computeMultiplier(prevMs))) * dh
          angleRad = Math.atan2(-dy, dx) + 0.6
        }

        const noseX = tailX + 94 * Math.cos(angleRad)
        const noseY = tailY - 94 * Math.sin(angleRad)

        const img = planeImgRef.current
        drawExhaust(ctx, tailX, tailY, angleRad, time, 0.6)
        if (img) drawPlaneSprite(ctx, noseX, noseY, angleRad, img, true)
      }

      rafRef.current = requestAnimationFrame(render)
    },
    [phase, elapsedMs, plane]
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

      {/* FLYING: multiplier above the curve */}
      {phase === 'flying' && (
        <div className="absolute left-[15%] top-[18%] z-10 pointer-events-none">
          <div
            className="font-black text-white leading-none multiplier-display"
            style={{
              fontSize: 'clamp(1.6rem, 5vw, 3.2rem)',
              textShadow: '0 2px 20px rgba(255,255,255,0.25)',
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
