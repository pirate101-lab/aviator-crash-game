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
  serverSeedHash: string
  nonce: number
  revealedSeed: string
}

const WAIT_MS           = 5000
const CRASH_DISPLAY_MS  = 3000
const FLY_AWAY_MS       = 700
const MAX_HISTORY       = 20
const POINT_INTERVAL_MS = 60

function computeMultiplier(ms: number): number {
  return Math.pow(Math.E, 0.00006 * ms)
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
  const lift = 0.04 * (1 - Math.exp(-8 * t))
  return MAX_Y * Math.pow(p, 1.5) + lift
}

function tiltDeg(ny: number, elapsedMs: number): number {
  const ratio = Math.min(1, ny / MAX_Y)
  const base = 28 * Math.pow(1 - ratio, 1.0) + 2
  const oscStrength = ratio > 0.6 ? (ratio - 0.6) / 0.4 * 1.8 : 0
  const osc = oscStrength * Math.sin(elapsedMs * 0.002)
  return base + osc
}

// ── Provably Fair Algorithm (HMAC-SHA256, Web Crypto API) ─────────────────

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hmacSHA256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// E = 2^52 (max value of a 13-char hex string)
const E = 2 ** 52

async function computeCrashPoint(serverSeed: string, clientSeed: string, nonce: number): Promise<number> {
  const hash = await hmacSHA256Hex(serverSeed, `${clientSeed}:${nonce}`)
  const h    = parseInt(hash.slice(0, 13), 16)
  // 1% house edge: force crash at 1.00x if h < E/100
  if (h < E / 100) return 1.00
  const raw  = Math.floor((100 * E - h) / (E - h)) / 100
  return Math.min(200, Math.max(1.01, raw))
}

// ── Shared client seed (fixed for this browser session) ──────────────────
const SESSION_CLIENT_SEED = randomHex(16)

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

  // Provably fair state
  const [serverSeedHash, setSeedHash]   = useState<string>('')
  const [nonce, setNonce]               = useState<number>(1)
  const [revealedSeed, setRevealedSeed] = useState<string>('')

  const raf          = useRef(0)
  const timeout      = useRef(0)
  const tStart       = useRef(0)
  const cpRef        = useRef(0)
  const phaseRef     = useRef<Phase>('waiting')
  const lastPtMs     = useRef(0)
  const trailBuf     = useRef<CurvePoint[]>([])
  const planeRef     = useRef<PlaneTransform>(DEFAULT_PLANE)
  const nonceRef     = useRef(1)
  const serverSeedRef = useRef<string>('')

  const stop = useCallback(() => {
    if (raf.current) { cancelAnimationFrame(raf.current); raf.current = 0 }
  }, [])

  const startWait = useCallback(() => {
    stop()
    if (timeout.current) { clearTimeout(timeout.current); timeout.current = 0 }
    phaseRef.current = 'waiting'

    // Increment nonce each round
    nonceRef.current += 1
    setNonce(nonceRef.current)

    // Generate new server seed + hash, compute crash point for this round
    const serverSeed = randomHex(32)
    serverSeedRef.current = serverSeed

    // Reset visual state immediately while async work runs
    setPhase('waiting'); setMultiplier(1); setCrashPoint(0); setWaitProg(0)
    setTrail([]); setPlane(DEFAULT_PLANE); setRevealedSeed('')
    trailBuf.current = []

    // Async: hash server seed for display + compute crash point
    const roundNonce = nonceRef.current
    sha256Hex(serverSeed).then(hash => {
      setSeedHash(hash)
      return computeCrashPoint(serverSeed, SESSION_CLIENT_SEED, roundNonce)
    }).then(cp => {
      cpRef.current = cp
      setCrashPoint(cp)
    })

    tStart.current = performance.now()

    const tick = (now: number) => {
      if (phaseRef.current !== 'waiting') return
      const el = now - tStart.current
      setWaitProg(Math.min(100, (el / WAIT_MS) * 100))
      if (el >= WAIT_MS) {
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
    trailBuf.current = [{ x: 0, y: 0.012 }]
    setPhase('flying'); setMultiplier(1)
    setTrail([{ x: 0, y: 0.012 }]); setPlane({ ...DEFAULT_PLANE })
    tStart.current = performance.now()

    const tick = (now: number) => {
      if (phaseRef.current !== 'flying') return
      const el   = now - tStart.current
      const mult = computeMultiplier(el)
      const cp   = cpRef.current

      if (mult >= cp) { setMultiplier(cp); startCrash(); return }

      setMultiplier(mult)

      const FIXED_ANIM_MS = 5000
      const t       = el / FIXED_ANIM_MS
      const nx      = mapX(t)
      const ny      = mapY(mult, cp, t)
      const angle   = tiltDeg(ny, el)

      if (el - lastPtMs.current >= POINT_INTERVAL_MS) {
        lastPtMs.current = el
        const pt: CurvePoint = { x: nx, y: ny }
        trailBuf.current = [...trailBuf.current.slice(-399), pt]
        setTrail([...trailBuf.current])
      }

      const ratio = Math.min(1, ny / MAX_Y)
      const bobStrength = ratio > 0.6 ? (ratio - 0.6) / 0.4 * 0.012 : 0
      const bob = bobStrength * Math.sin(el * 0.0015)
      const planeNy = ny + bob

      const newPlane = { nx, ny: planeNy, angleDeg: angle, crashOffsetX: 0, crashOffsetY: 0, offScreen: false }
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

    // Reveal the server seed so players can verify
    setRevealedSeed(serverSeedRef.current)

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

  return {
    phase, multiplier, crashPoint, waitProgress, roundHistory, trailPoints, plane,
    serverSeedHash, nonce, revealedSeed,
  }
}
