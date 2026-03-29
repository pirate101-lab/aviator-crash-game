import { useState } from 'react'
import { useGameState } from '@/hooks/useGameState'
import { GameCanvas } from '@/components/GameCanvas'
import { Header } from '@/components/Header'
import { RoundHistory } from '@/components/RoundHistory'
import BetPanel from '@/components/BetPanel'

export default function AviatorGame() {
  const game = useGameState()
  const [betMode, setBetMode] = useState<'money' | 'freebet'>('money')

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-[#cdd2db] flex flex-col">
      <Header balance={0.0} />
      <RoundHistory history={game.roundHistory} />

      <div className="px-3 py-2" style={{ height: '340px', flexShrink: 0 }}>
        <GameCanvas
          phase={game.phase}
          multiplier={game.multiplier}
          crashPoint={game.crashPoint}
          waitProgress={game.waitProgress}
          trailPoints={game.trailPoints}
          plane={game.plane}
          betMode={betMode}
          onToggleBetMode={() => setBetMode((m) => (m === 'money' ? 'freebet' : 'money'))}
        />
      </div>

      <div className="flex flex-col gap-2 px-3 pb-6">
        <BetPanel defaultAmount={10.84} currency="KSH" />
        <BetPanel defaultAmount={70} currency="KSH" showLiveBets={true} />
      </div>
    </div>
  )
}
