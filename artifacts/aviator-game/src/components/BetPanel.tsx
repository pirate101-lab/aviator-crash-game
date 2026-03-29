import { useState } from 'react'

interface BetPanelProps {
  defaultAmount?: number
  currency?: string
  showLiveBets?: boolean
}

const QUICK_AMOUNTS = [10, 100, 1000, 10000] as const
const STEP = 10
const MIN_AMOUNT = 0

type Tab = 'bet' | 'auto'
type LiveTab = 'live' | 'mine'

const MOCK_LIVE_BETS = [
  { id: 1, user: '2**2', bet: 3680.00, cashout: 12.56, won: 46222.78, high: true },
  { id: 2, user: '2**4', bet: 3620.00, cashout: 1.45, won: 5248.77, high: false },
  { id: 3, user: '2**9', bet: 3590.00, cashout: 1.31, won: 4702.77, high: false },
  { id: 4, user: '2**0', bet: 3580.00, cashout: 1.70, won: 6085.71, high: false },
  { id: 5, user: '2**8', bet: 3570.00, cashout: 1.10, won: 3926.88, high: false },
  { id: 6, user: '2**9', bet: 3300.00, cashout: 1.63, won: 5379.00, high: false },
  { id: 7, user: '2**7', bet: 3270.00, cashout: 1.37, won: 4479.67, high: false },
  { id: 8, user: '2**3', bet: 3140.00, cashout: 10.24, won: 32152.26, high: true },
  { id: 9, user: '2**8', bet: 2310.00, cashout: 1.37, won: 3164.35, high: false },
  { id: 10, user: '2**5', bet: 1990.00, cashout: 1.36, won: 2706.28, high: false },
  { id: 11, user: '2**8', bet: 1420.00, cashout: 5.45, won: 7738.88, high: true },
  { id: 12, user: '2**6', bet: 1390.00, cashout: 1.38, won: 1918.31, high: false },
]

function getCashoutColor(v: number): string {
  if (v >= 10) return '#E91E63'
  if (v >= 2) return '#FF9800'
  return '#cdd2db'
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-all duration-200 ${
        active
          ? 'bg-[#00E676] text-[#0d0d1a]'
          : 'text-muted-foreground hover:text-foreground/70'
      }`}
    >
      {label}
    </button>
  )
}

export default function BetPanel({
  defaultAmount = 10,
  currency = 'KSH',
  showLiveBets = false,
}: BetPanelProps) {
  const [amount, setAmount] = useState(defaultAmount)
  const [activeTab, setActiveTab] = useState<Tab>('bet')
  const [liveTab, setLiveTab] = useState<LiveTab>('live')
  const [autoCashout, setAutoCashout] = useState('')

  const decrease = () => setAmount((prev) => Math.max(MIN_AMOUNT, Number((prev - STEP).toFixed(2))))
  const increase = () => setAmount((prev) => Number((prev + STEP).toFixed(2)))

  return (
    <div className="flex flex-col gap-0">
      <div className="rounded-xl border border-[#2a2a3e] bg-[#1a1a2e] p-4">
        {/* Tab Switcher */}
        <div className="mx-auto mb-4 flex w-[220px] rounded-full bg-[#12121f] p-1">
          <TabButton label="Bet" active={activeTab === 'bet'} onClick={() => setActiveTab('bet')} />
          <TabButton label="Auto" active={activeTab === 'auto'} onClick={() => setActiveTab('auto')} />
        </div>

        {activeTab === 'bet' ? (
          /* Bet Tab */
          <div className="flex flex-row gap-4">
            {/* Left — Amount Controls */}
            <div className="flex flex-col flex-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={decrease}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3a3a4e] bg-[#2a2a3e] text-lg font-bold text-foreground transition-colors hover:border-[#00E676]/30 active:scale-95"
                >
                  −
                </button>
                <span className="min-w-[70px] text-center font-mono text-lg font-bold text-foreground">
                  {amount % 1 === 0 ? amount.toLocaleString() : amount.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={increase}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3a3a4e] bg-[#2a2a3e] text-lg font-bold text-foreground transition-colors hover:border-[#00E676]/30 active:scale-95"
                >
                  +
                </button>
              </div>
              {/* Quick Amount Grid */}
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(value)}
                    className="rounded-md border border-[#2a2a3e] bg-[#12121f] px-2 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-[#00E676]/30 hover:text-foreground"
                  >
                    {value >= 1000 ? `${value / 1000}k` : value}
                  </button>
                ))}
              </div>
            </div>

            {/* Right — BET Button */}
            <button
              type="button"
              className="flex flex-col items-center justify-center rounded-xl bg-[#00E676] px-6 py-4 transition-all duration-150 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] min-w-[90px]"
            >
              <span className="text-xl font-bold text-[#0d0d1a]">BET</span>
              <span className="text-xs font-medium text-[#0d0d1a]/80 font-mono">
                {amount.toFixed(2)} {currency}
              </span>
            </button>
          </div>
        ) : (
          /* Auto Tab */
          <div className="flex flex-row gap-4">
            <div className="flex flex-col flex-1 gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={decrease}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3a3a4e] bg-[#2a2a3e] text-lg font-bold text-foreground transition-colors hover:border-[#00E676]/30 active:scale-95"
                >
                  −
                </button>
                <span className="min-w-[70px] text-center font-mono text-lg font-bold text-foreground">
                  {amount % 1 === 0 ? amount.toLocaleString() : amount.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={increase}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3a3a4e] bg-[#2a2a3e] text-lg font-bold text-foreground transition-colors hover:border-[#00E676]/30 active:scale-95"
                >
                  +
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Auto cash out at</span>
                <input
                  type="number"
                  value={autoCashout}
                  onChange={e => setAutoCashout(e.target.value)}
                  placeholder="2.00x"
                  min={1.01}
                  step={0.1}
                  className="flex-1 h-8 px-2 rounded-lg bg-[#12121f] border border-[#2a2a3e] text-foreground text-xs font-mono text-center focus:outline-none focus:border-[#00E676]/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            <button
              type="button"
              className="flex flex-col items-center justify-center rounded-xl bg-[#00E676] px-6 py-4 transition-all duration-150 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] min-w-[90px]"
            >
              <span className="text-xl font-bold text-[#0d0d1a]">AUTO</span>
              <span className="text-xs font-medium text-[#0d0d1a]/80 font-mono">
                {amount.toFixed(2)} {currency}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Live Bets Panel */}
      {showLiveBets && (
        <div className="rounded-xl border border-[#2a2a3e] bg-[#1a1a2e] overflow-hidden mt-1">
          {/* Sub-tabs */}
          <div className="flex border-b border-[#2a2a3e]">
            <button
              type="button"
              onClick={() => setLiveTab('live')}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                liveTab === 'live'
                  ? 'text-[#00E676] border-b-2 border-[#00E676]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Bets
            </button>
            <button
              type="button"
              onClick={() => setLiveTab('mine')}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                liveTab === 'mine'
                  ? 'text-[#00E676] border-b-2 border-[#00E676]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Bets
            </button>
          </div>

          {liveTab === 'live' && (
            <div className="overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-4 px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground border-b border-[#2a2a3e]/50">
                <span>User</span>
                <span className="text-right">Bet ({currency})</span>
                <span className="text-right">Cash Out</span>
                <span className="text-right">Won ({currency})</span>
              </div>
              <div className="max-h-48 overflow-y-auto hide-scrollbar">
                {MOCK_LIVE_BETS.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-4 px-3 py-1.5 text-xs border-b border-[#2a2a3e]/30 hover:bg-[#2a2a3e]/20 transition-colors"
                  >
                    <span className="text-foreground font-mono">{row.user}</span>
                    <span className="text-right text-muted-foreground font-mono">
                      {row.bet.toFixed(2)}
                    </span>
                    <span
                      className="text-right font-mono font-semibold"
                      style={{ color: getCashoutColor(row.cashout) }}
                    >
                      {row.cashout.toFixed(2)}x
                    </span>
                    <span
                      className="text-right font-mono font-bold"
                      style={{ color: row.high ? '#E91E63' : '#00E676' }}
                    >
                      {row.won.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {liveTab === 'mine' && (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
              No bets this round
            </div>
          )}
        </div>
      )}
    </div>
  )
}
