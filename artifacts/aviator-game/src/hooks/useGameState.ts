import { useState, useRef, useEffect, useCallback } from 'react'

export type Phase = 'waiting' | 'flying' | 'crashing' | 'crashed'

export interface CurvePoint {
  x: number
  y: number
}

export interface PlaneTransform {
  nx: number
  ny: number
  angleDeg: number
  crashOffsetX: number
  crashOffsetY: number
  offScreen: boolean
}

export interface GameState {
  phase: Phase
  multiplier: number
  crashPoint: number
  waitProgress: number
  roundHistory: number[]
  trailPoints: CurvePoint[]
  plane: PlaneTransform
}

const WAIT_MS           = 5000
const CRASH_DISPLAY_MS  = 3000
const FLY_AWAY_MS       = 700
const MAX_HISTORY       = 20
const POINT_INTERVAL_MS = 60

function computeMultiplier(ms: number): number {
  return Math.pow(Math.E, 0.00006 * ms)
}

function estimateCrashMs(cp: number): number {
  if (cp <= 1) return 1
  return Math.log(cp) / 0.00006
}

const MAX_X = 0.92
const MAX_Y = 0.85

function mapProgress(t: number): number {
  return 1 - Math.exp(-2.2 * t)
}

function mapX(t: number): number {
  return MAX_X * mapProgress(t)
}

function mapY(_mult: number, _cp: number, t: number): number {
  const p = mapProgress(t)
  return MAX_Y * Math.pow(p, 2.2)
}

function tiltDeg(ny: number): number {
  const ratio = ny / MAX_Y
  return 12 + Math.pow(ratio, 0.8) * 33
}

function generateCrashPoint(): number {
  const r = Math.random()
  const raw = 1 / (1 - r) * 0.97
  return Math.min(200, Math.max(1.02, raw))
}

const INITIAL_HISTORY = [1.89, 25.04, 1.33, 1.27, 4.40, 2.36, 15.64]

const DEFAULT_PLANE: PlaneTransform = {
  nx: 0, ny: 0, angleDeg: 0,
  crashOffsetX: 0, crashOffsetY: 0, offScreen: false,
}

export function useGameState(): GameState {
  const [phase, setPhase]           = useState<Phase>('waiting')
  const [multiplier, setMultiplier] = useState(1.0)
  const [crashPoint, setCrashPoint] = useState(0)
  const [waitProgress, setWaitProg] = useState(0)
  const [roundHistory, setHistory]  = useState<number[]>(INITIAL_HISTORY)
  const [trailPoints, setTrail]     = useState<CurvePoint[]>([])
  const [plane, setPlane]           = useState<PlaneTransform>(DEFAULT_PLANE)

  const raf        = useRef(0)
  const timeout    = useRef(0)
  const tStart     = useRef(0)
  const cpRef      = useRef(0)
  const phaseRef   = useRef<Phase>('waiting')
  const lastPtMs   = useRef(0)
  const trailBuf   = useRef<CurvePoint[]>([])
  const planeRef   = useRef<PlaneTransform>(DEFAULT_PLANE)

  const stop = useCallback(() => {
    if (raf.current) { cancelAnimationFrame(raf.current); raf.current = 0 }
  }, [])

  const startWait = useCallback(() => {
    stop()
    if (timeout.current) { clearTimeout(timeout.current); timeout.current = 0 }
    phaseRef.current = 'waiting'
    setPhase('waiting'); setMultiplier(1); setCrashPoint(0); setWaitProg(0)
    setTrail([]); setPlane(DEFAULT_PLANE)
    trailBuf.current = []
    tStart.current = performance.now()

    const tick = (now: number) => {
      if (phaseRef.current !== 'waiting') return
      const el = now - tStart.current
      setWaitProg(Math.min(100, (el / WAIT_MS) * 100))
      if (el >= WAIT_MS) {
        const cp = generateCrashPoint()
        cpRef.current = cp; setCrashPoint(cp)
        startFly(); return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startFly = useCallback(() => {
    stop()
    phaseRef.current = 'flying'
    lastPtMs.current = 0
    trailBuf.current = [{ x: 0, y: 0 }]
    setPhase('flying'); setMultiplier(1)
    setTrail([{ x: 0, y: 0 }]); setPlane({ ...DEFAULT_PLANE })
    tStart.current = performance.now()

    const tick = (now: number) => {
      if (phaseRef.current !== 'flying') return
      const el   = now - tStart.current
      const mult = computeMultiplier(el)
      const cp   = cpRef.current

      if (mult >= cp) { setMultiplier(cp); startCrash(); return }

      setMultiplier(mult)

      const totalMs = estimateCrashMs(cp)
      const t       = el / totalMs
      const nx      = mapX(t)
      const ny      = mapY(mult, cp, t)
      const angle   = tiltDeg(ny)

      if (el - lastPtMs.current >= POINT_INTERVAL_MS) {
        lastPtMs.current = el
        const pt: CurvePoint = { x: nx, y: ny }
        trailBuf.current = [...trailBuf.current.slice(-399), pt]
        setTrail([...trailBuf.current])
      }

      const newPlane = { nx, ny, angleDeg: angle, crashOffsetX: 0, crashOffsetY: 0, offScreen: false }
      planeRef.current = newPlane
      setPlane(newPlane)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startCrash = useCallback(() => {
    stop()
    phaseRef.current = 'crashing'
    setPhase('crashing')

    const t0 = performance.now()
    const snapNx = planeRef.current.nx
    const snapNy = planeRef.current.ny

    const tick = (now: number) => {
      if (phaseRef.current !== 'crashing') return
      const s = (now - t0) / 1000
      const accel = 1 + s * 5
      const offX  = 1.8 * s * accel
      const offY  = -3.0 * s * accel
      const gone  = (snapNx + offX > 1.5) || (snapNy + offY < -0.5)

      setPlane({
        nx: snapNx, ny: snapNy,
        angleDeg: 42 + s * 40,
        crashOffsetX: offX, crashOffsetY: offY,
        offScreen: gone,
      })

      if (s >= FLY_AWAY_MS / 1000) {
        phaseRef.current = 'crashed'
        setPhase('crashed')
        const cv = cpRef.current
        timeout.current = window.setTimeout(() => {
          setHistory(prev => [...prev, cv].slice(-MAX_HISTORY))
          startWait()
        }, CRASH_DISPLAY_MS)
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startWait()
    return () => { stop(); if (timeout.current) clearTimeout(timeout.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { phase, multiplier, crashPoint, waitProgress, roundHistory, trailPoints, plane }
}
