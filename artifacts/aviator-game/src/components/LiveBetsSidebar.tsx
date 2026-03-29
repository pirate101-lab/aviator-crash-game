import { useState } from 'react'

type SidebarTab = 'live' | 'mine'

interface LiveBet {
  id: number
  user: string
  avatarColor: string
  bet: number
  cashout: number | null
  won: number | null
}

const AVATAR_COLORS = [
  '#E91E63', '#9C27B0', '#3F51B5', '#2196F3', '#00BCD4',
  '#4CAF50', '#FF9800', '#FF5722', '#795548', '#607D8B',
]

const MOCK_BETS: LiveBet[] = [
  { id:  1, user: '2**6', avatarColor: '#4CAF50', bet: 7750.00, cashout: null,  won: null },
  { id:  2, user: '2**6', avatarColor: '#E91E63', bet: 6500.00, cashout: null,  won: null },
  { id:  3, user: '2**6', avatarColor: '#9C27B0', bet: 3960.00, cashout: null,  won: null },
  { id:  4, user: '2**4', avatarColor: '#2196F3', bet: 3870.00, cashout: null,  won: null },
  { id:  5, user: '2**4', avatarColor: '#FF9800', bet: 3840.00, cashout: null,  won: null },
  { id:  6, user: '2**2', avatarColor: '#00BCD4', bet: 3270.00, cashout: null,  won: null },
  { id:  7, user: '2**4', avatarColor: '#FF5722', bet: 3160.00, cashout: null,  won: null },
  { id:  8, user: '2**7', avatarColor: '#607D8B', bet: 3130.00, cashout: null,  won: null },
  { id:  9, user: '2**1', avatarColor: '#3F51B5', bet: 3030.00, cashout: null,  won: null },
  { id: 10, user: '2**4', avatarColor: '#795548', bet: 3010.00, cashout: null,  won: null },
  { id: 11, user: '2**9', avatarColor: '#E91E63', bet: 2940.00, cashout: null,  won: null },
  { id: 12, user: '2**3', avatarColor: '#4CAF50', bet: 2820.00, cashout: null,  won: null },
  { id: 13, user: '2**5', avatarColor: '#9C27B0', bet: 2770.00, cashout: null,  won: null },
  { id: 14, user: '2**7', avatarColor: '#2196F3', bet: 2570.00, cashout: null,  won: null },
  { id: 15, user: '2**4', avatarColor: '#FF9800', bet: 2480.00, cashout: null,  won: null },
  { id: 16, user: '2**2', avatarColor: '#00BCD4', bet: 2280.00, cashout: null,  won: null },
]

const FLYING_BETS: LiveBet[] = [
  { id:  1, user: '2**9', avatarColor: '#4CAF50', bet: 5000.00, cashout: 1.19, won: 7021.33 },
  { id:  2, user: '2**3', avatarColor: '#E91E63', bet: 4600.00, cashout: 1.17, won: 5381.76 },
  { id:  3, user: '2**8', avatarColor: '#9C27B0', bet: 4400.00, cashout: 1.10, won: 4839.85 },
  { id:  4, user: '2**6', avatarColor: '#FF5722', bet: 3630.00, cashout: 1.42, won: 5154.82 },
  { id:  5, user: '2**2', avatarColor: '#2196F3', bet: 3600.00, cashout: 1.11, won: 3995.92 },
  { id:  6, user: '2**4', avatarColor: '#607D8B', bet: 3550.00, cashout: 1.32, won: 4685.95 },
  { id:  7, user: '2**2', avatarColor: '#00BCD4', bet: 3510.00, cashout: 1.66, won: 5826.26 },
  { id:  8, user: '2**4', avatarColor: '#795548', bet: 3380.00, cashout: 1.34, won: 4528.98 },
  { id:  9, user: '2**6', avatarColor: '#E91E63', bet: 3250.00, cashout: 1.64, won: 5329.70 },
  { id: 10, user: '2**9', avatarColor: '#FF9800', bet: 3280.00, cashout: 1.11, won: 3585.01 },
  { id: 11, user: '2**7', avatarColor: '#3F51B5', bet: 3070.00, cashout: 1.27, won: 3898.76 },
  { id: 12, user: '2**8', avatarColor: '#4CAF50', bet: 2880.00, cashout: 1.24, won: 3484.57 },
  { id: 13, user: '2**0', avatarColor: '#9C27B0', bet: 2870.00, cashout: 3.39, won: 9051.21 },
  { id: 14, user: '2**4', avatarColor: '#FF5722', bet: 2360.00, cashout: null, won: null },
  { id: 15, user: '2**1', avatarColor: '#2196F3', bet: 2320.00, cashout: 2.62, won: 6078.07 },
  { id: 16, user: '2**3', avatarColor: '#607D8B', bet: 2170.00, cashout: 1.29, won: 2799.46 },
]

function getCashoutStyle(v: number): { bg: string; text: string } {
  if (v >= 5)  return { bg: 'rgba(233,30,99,0.25)',  text: '#E91E63' }
  if (v >= 2)  return { bg: 'rgba(255,152,0,0.25)',  text: '#FF9800' }
  return         { bg: 'rgba(0,230,118,0.2)',   text: '#00E676' }
}

function Avatar({ color, user }: { color: string; user: string }) {
  return (
    <div
      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {user.slice(0, 1).toUpperCase()}
    </div>
  )
}

export function LiveBetsSidebar({ phase }: { phase: string }) {
  const [tab, setTab] = useState<SidebarTab>('live')
  const bets = phase === 'flying' ? FLYING_BETS : MOCK_BETS

  return (
    <div className="flex flex-col h-full bg-[#111111] border-r border-white/8">
      {/* Tabs */}
      <div className="flex flex-shrink-0 border-b border-white/8">
        <button
          type="button"
          onClick={() => setTab('live')}
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
            tab === 'live'
              ? 'text-white bg-[#1a1a1a] border-b-2 border-[#00E676]'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Live Bets
        </button>
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
            tab === 'mine'
              ? 'text-white bg-[#1a1a1a] border-b-2 border-[#00E676]'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          My Bets
        </button>
      </div>

      {/* Column headers */}
      <div className="flex-shrink-0 grid grid-cols-4 px-2 py-1.5 text-[9px] font-semibold uppercase text-white/30 border-b border-white/5">
        <span>User</span>
        <span className="text-right">Bet KSH</span>
        <span className="text-right">Cashout</span>
        <span className="text-right">Won KSH</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {tab === 'live' && bets.map((row) => {
          const cs = row.cashout ? getCashoutStyle(row.cashout) : null
          return (
            <div
              key={row.id}
              className="grid grid-cols-4 items-center px-2 py-1.5 border-b border-white/5 hover:bg-white/3 transition-colors"
            >
              <div className="flex items-center gap-1 min-w-0">
                <Avatar color={row.avatarColor} user={row.user} />
                <span className="text-[10px] text-white/70 font-mono truncate">{row.user}</span>
              </div>
              <span className="text-right text-[10px] text-white/60 font-mono">
                {row.bet.toFixed(2)}
              </span>
              <div className="flex justify-end">
                {row.cashout && cs ? (
                  <span
                    className="rounded px-1 py-0.5 text-[9px] font-bold"
                    style={{ backgroundColor: cs.bg, color: cs.text }}
                  >
                    {row.cashout.toFixed(2)}x
                  </span>
                ) : (
                  <span className="text-[10px] text-white/20">—</span>
                )}
              </div>
              <span className={`text-right text-[10px] font-mono font-semibold ${row.won ? 'text-[#00E676]' : 'text-white/20'}`}>
                {row.won ? row.won.toFixed(2) : '—'}
              </span>
            </div>
          )
        })}

        {tab === 'mine' && (
          <div className="flex items-center justify-center h-20 text-white/30 text-xs">
            No bets this round
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-white/5">
        <div className="text-[10px] text-white/25 text-center">
          This game is ♥ Provably Fair
        </div>
      </div>
    </div>
  )
}
