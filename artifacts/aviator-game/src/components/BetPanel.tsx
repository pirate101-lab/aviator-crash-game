import { useState } from 'react'

interface BetPanelProps {
  defaultAmount?: number
  currency?: string
}

const QUICK_AMOUNTS = [10, 100, 1000, 10000] as const
const STEP = 5
const MIN_AMOUNT = 0

type Tab = 'bet' | 'auto'

export default function BetPanel({
  defaultAmount = 10,
  currency = 'KSH',
}: BetPanelProps) {
  const [amount, setAmount] = useState(defaultAmount)
  const [activeTab, setActiveTab] = useState<Tab>('bet')
  const [autoCashout, setAutoCashout] = useState('')

  const decrease = () => setAmount((prev) => Math.max(MIN_AMOUNT, Number((prev - STEP).toFixed(2))))
  const increase = () => setAmount((prev) => Number((prev + STEP).toFixed(2)))

  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-white/8 p-2 min-[769px]:p-3">
      {/* Tab switcher */}
      <div className="flex justify-center mb-2 min-[769px]:mb-3">
        <div className="flex rounded-full bg-[#0d0d0d] border border-white/8 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('bet')}
            className={`px-3 min-[769px]:px-5 py-1 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'bet' ? 'bg-[#2a2a2a] text-white' : 'text-white/35 hover:text-white/55'
            }`}
          >
            Bet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('auto')}
            className={`px-3 min-[769px]:px-5 py-1 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'auto' ? 'bg-[#2a2a2a] text-white' : 'text-white/35 hover:text-white/55'
            }`}
          >
            Auto
          </button>
        </div>
      </div>

      <div className="flex items-stretch gap-2 min-[769px]:gap-3">
        {/* Left: stepper + quick amounts */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 min-[769px]:gap-2">
          {/* Stepper row */}
          <div className="flex items-center gap-1.5 min-[769px]:gap-2">
            <button
              type="button"
              onClick={decrease}
              className="w-7 h-7 min-[769px]:w-9 min-[769px]:h-9 rounded-full border border-white/20 bg-[#0d0d0d] flex items-center justify-center text-white/70 text-sm min-[769px]:text-lg font-bold hover:border-[#00E676]/40 hover:text-white active:scale-95 transition-all flex-shrink-0"
            >
              −
            </button>
            <div className="flex-1 text-center font-mono text-sm min-[769px]:text-base font-bold text-white truncate">
              {amount % 1 === 0 ? amount.toLocaleString() : amount.toFixed(2)}
            </div>
            <button
              type="button"
              onClick={increase}
              className="w-7 h-7 min-[769px]:w-9 min-[769px]:h-9 rounded-full border border-white/20 bg-[#0d0d0d] flex items-center justify-center text-white/70 text-sm min-[769px]:text-lg font-bold hover:border-[#00E676]/40 hover:text-white active:scale-95 transition-all flex-shrink-0"
            >
              +
            </button>
          </div>

          {/* Quick amounts */}
          <div className="grid grid-cols-4 gap-0.5 min-[769px]:gap-1">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(v)}
                className="rounded bg-[#0d0d0d] border border-white/10 py-0.5 min-[769px]:py-1 text-[9px] min-[769px]:text-[10px] font-mono text-white/50 hover:border-[#00E676]/30 hover:text-white/80 transition-all"
              >
                {v >= 1000 ? `${v / 1000}k` : v}
              </button>
            ))}
          </div>

          {activeTab === 'auto' && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-white/40 whitespace-nowrap">Auto at</span>
              <input
                type="number"
                value={autoCashout}
                onChange={e => setAutoCashout(e.target.value)}
                placeholder="2.00x"
                className="flex-1 h-7 px-2 rounded bg-[#0d0d0d] border border-white/10 text-white text-xs font-mono text-center focus:outline-none focus:border-[#00E676]/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          )}
        </div>

        {/* Right: BET button */}
        <button
          type="button"
          className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl bg-[#00E676] px-3 min-[769px]:px-5 py-2 min-[769px]:py-3 hover:brightness-110 hover:scale-[1.02] active:scale-[0.97] transition-all min-w-[70px] min-[769px]:min-w-[90px]"
        >
          <span className="text-base min-[769px]:text-lg font-black text-black leading-tight">BET</span>
          <span className="text-[9px] min-[769px]:text-[11px] font-semibold text-black/75 font-mono leading-tight">
            {amount.toFixed(2)} {currency}
          </span>
        </button>
      </div>
    </div>
  )
}
