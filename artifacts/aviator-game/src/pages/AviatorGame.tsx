import { useState } from 'react'
import { useGameState } from '@/hooks/useGameState'
import { GameCanvas } from '@/components/GameCanvas'
import { Header } from '@/components/Header'
import { RoundHistory } from '@/components/RoundHistory'
import { LiveBetsSidebar } from '@/components/LiveBetsSidebar'
import BetPanel from '@/components/BetPanel'

export default function AviatorGame() {
  const game = useGameState()
  const [betMode, setBetMode] = useState<'money' | 'freebet'>('money')

  const toggleBetMode = () =>
    setBetMode((prev) => (prev === 'money' ? 'freebet' : 'money'))

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: '100dvh', minHeight: 0, background: '#111111' }}
    >
      {/* Header */}
      <Header balance={0.0} />

      {/* Body: sidebar + right content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left sidebar: live bets */}
        <div className="flex-shrink-0 overflow-hidden" style={{ width: '220px' }}>
          <LiveBetsSidebar phase={game.phase} />
        </div>

        {/* Right column: history + canvas + bet panels */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">

          {/* Multiplier history bar */}
          <RoundHistory history={game.roundHistory} />

          {/* Game canvas */}
          <div className="flex-1 min-h-0 p-1">
            <GameCanvas
              phase={game.phase}
              multiplier={game.multiplier}
              crashPoint={game.crashPoint}
              waitProgress={game.waitProgress}
              trailPoints={game.trailPoints}
              plane={game.plane}
              betMode={betMode}
              onToggleBetMode={toggleBetMode}
            />
          </div>

          {/* Bet panels — two side by side */}
          <div className="flex-shrink-0 grid grid-cols-2 gap-2 px-2 pb-2">
            <BetPanel defaultAmount={25} currency="KSH" />
            <BetPanel defaultAmount={18} currency="KSH" />
          </div>
        </div>
      </div>
    </div>
  )
}
