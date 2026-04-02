import { useEffect, useState } from 'react'

interface BetPanelProps {
  defaultAmount?: number
  currency?: string
  phase: string // 'waiting' | 'flying' | 'crashed'
  multiplier: number
  onCashOut?: (betId: 1 | 2) => void
}

type BetSlot = {
  id: 1 | 2
  amount: number
  autoCashout: string
  active: boolean
  cashedOut: boolean
  cashedOutAt?: number
}

const QUICK_AMOUNTS = [10, 100, 1000, 10000] as const
const STEP = 5
const MIN_AMOUNT = 10

const createInitialBets = (defaultAmount: number): BetSlot[] => [
  { id: 1, amount: Math.max(MIN_AMOUNT, defaultAmount), autoCashout: '', active: false, cashedOut: false },
  { id: 2, amount: Math.max(MIN_AMOUNT, defaultAmount), autoCashout: '', active: false, cashedOut: false },
]

const formatAmount = (amount: number) => (amount % 1 === 0 ? amount.toLocaleString() : amount.toFixed(2))

export default function BetPanel({
  defaultAmount = 50,
  currency = 'KSH',
  phase,
  multiplier,
  onCashOut,
}: BetPanelProps) {
  const [bets, setBets] = useState<BetSlot[]>(() => createInitialBets(defaultAmount))

  useEffect(() => {
    if (phase === 'waiting') {
      setBets((prev) =>
        prev.map((bet) => ({
          ...bet,
          active: false,
          cashedOut: false,
          cashedOutAt: undefined,
        })),
      )
      return
    }

    if (phase === 'crashed' || phase === 'crashing') {
      setBets((prev) =>
        prev.map((bet) => ({
          ...bet,
          active: false,
        })),
      )
    }
  }, [phase])

  const updateBet = (betId: 1 | 2, updater: (bet: BetSlot) => BetSlot) => {
    setBets((prev) => prev.map((bet) => (bet.id === betId ? updater(bet) : bet)))
  }

  const placeBet = (betId: 1 | 2) => {
    if (phase !== 'waiting') return
    updateBet(betId, (bet) => ({
      ...bet,
      active: true,
      cashedOut: false,
      cashedOutAt: undefined,
    }))
  }

  const cancelBet = (betId: 1 | 2) => {
    if (phase !== 'waiting') return
    updateBet(betId, (bet) => ({
      ...bet,
      active: false,
      cashedOut: false,
      cashedOutAt: undefined,
    }))
  }

  const cashOutBet = (betId: 1 | 2) => {
    if (phase !== 'flying') return
    updateBet(betId, (bet) => {
      if (!bet.active || bet.cashedOut) return bet
      return {
        ...bet,
        active: false,
        cashedOut: true,
        cashedOutAt: multiplier,
      }
    })
    onCashOut?.(betId)
  }

  useEffect(() => {
    if (phase !== 'flying') return

    setBets((prev) => {
      let changed = false
      const next = prev.map((bet) => {
        if (!bet.active || bet.cashedOut || !bet.autoCashout.trim()) return bet
        const target = Number.parseFloat(bet.autoCashout)
        if (!Number.isFinite(target) || target <= 1) return bet
        if (multiplier < target) return bet
        changed = true
        onCashOut?.(bet.id)
        return {
          ...bet,
          active: false,
          cashedOut: true,
          cashedOutAt: multiplier,
        }
      })
      return changed ? next : prev
    })
  }, [phase, multiplier, onCashOut])

  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-white/8 p-2 min-[769px]:p-3">
      <div className="grid grid-cols-1 min-[769px]:grid-cols-2 gap-2 min-[769px]:gap-3">
        {bets.map((bet) => {
          const canEdit = phase === 'waiting' && !bet.active
          const canCashOut = phase === 'flying' && bet.active && !bet.cashedOut
          const stakeText = `${bet.amount.toFixed(2)} ${currency}`
          const potentialWin = (bet.amount * multiplier).toFixed(2)

          return (
            <div key={bet.id} className="rounded-lg border border-white/10 bg-[#151515] p-2 min-[769px]:p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-white/70">Bet {bet.id}</div>
                {bet.cashedOut && bet.cashedOutAt ? (
                  <div className="text-[10px] font-mono text-[#00E676]">Cashed @ {bet.cashedOutAt.toFixed(2)}x</div>
                ) : (
                  <div className="text-[10px] font-mono text-white/45">{phase.toUpperCase()}</div>
                )}
              </div>

              <div className="flex items-center gap-1.5 min-[769px]:gap-2 mb-1.5 min-[769px]:mb-2">
                <button
                  type="button"
                  onClick={() =>
                    updateBet(bet.id, (slot) => ({
                      ...slot,
                      amount: Math.max(MIN_AMOUNT, Number((slot.amount - STEP).toFixed(2))),
                    }))
                  }
                  disabled={!canEdit}
                  className="w-7 h-7 min-[769px]:w-8 min-[769px]:h-8 rounded-full border border-white/20 bg-[#0d0d0d] flex items-center justify-center text-white/70 text-sm font-bold hover:border-[#00E676]/40 hover:text-white active:scale-95 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  −
                </button>
                <div className="flex-1 text-center font-mono text-sm font-bold text-white truncate">
                  {formatAmount(bet.amount)}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateBet(bet.id, (slot) => ({
                      ...slot,
                      amount: Number((slot.amount + STEP).toFixed(2)),
                    }))
                  }
                  disabled={!canEdit}
                  className="w-7 h-7 min-[769px]:w-8 min-[769px]:h-8 rounded-full border border-white/20 bg-[#0d0d0d] flex items-center justify-center text-white/70 text-sm font-bold hover:border-[#00E676]/40 hover:text-white active:scale-95 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1 mb-2">
                {QUICK_AMOUNTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => updateBet(bet.id, (slot) => ({ ...slot, amount: v }))}
                    disabled={!canEdit}
                    className="rounded bg-[#0d0d0d] border border-white/10 py-0.5 text-[9px] min-[769px]:text-[10px] font-mono text-white/55 hover:border-[#00E676]/30 hover:text-white/80 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    {v >= 1000 ? `${v / 1000}k` : v}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-white/40 whitespace-nowrap">Auto at</span>
                <input
                  type="number"
                  value={bet.autoCashout}
                  onChange={(e) => updateBet(bet.id, (slot) => ({ ...slot, autoCashout: e.target.value }))}
                  placeholder="2.00x"
                  disabled={!canEdit}
                  className="flex-1 h-7 px-2 rounded bg-[#0d0d0d] border border-white/10 text-white text-xs font-mono text-center focus:outline-none focus:border-[#00E676]/40 disabled:opacity-35 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {phase === 'waiting' && !bet.active && (
                <button
                  type="button"
                  onClick={() => placeBet(bet.id)}
                  className="w-full rounded-xl bg-[#00E676] py-2 hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <span className="text-base font-black text-black leading-tight">BET</span>
                  <span className="block text-[10px] font-semibold text-black/70 font-mono leading-tight">{stakeText}</span>
                </button>
              )}

              {phase === 'waiting' && bet.active && (
                <button
                  type="button"
                  onClick={() => cancelBet(bet.id)}
                  className="w-full rounded-xl bg-[#4a4a4a] py-2 text-white font-bold hover:bg-[#5a5a5a] active:scale-[0.98] transition-all"
                >
                  CANCEL BET
                </button>
              )}

              {canCashOut && (
                <button
                  type="button"
                  onClick={() => cashOutBet(bet.id)}
                  className="w-full rounded-xl bg-[#00E676] py-2 hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <span className="text-base font-black text-black leading-tight">CASH OUT</span>
                  <span className="block text-[10px] font-semibold text-black/70 font-mono leading-tight">
                    {potentialWin} {currency}
                  </span>
                </button>
              )}

              {phase !== 'waiting' && !canCashOut && !bet.cashedOut && (
                <button
                  type="button"
                  disabled
                  className="w-full rounded-xl bg-[#2a2a2a] py-2 text-white/60 font-bold cursor-not-allowed"
                >
                  {bet.active ? 'IN FLIGHT' : 'WAIT NEXT ROUND'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
