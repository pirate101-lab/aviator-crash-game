import { useState } from "react";
import { useGameState } from "@/hooks/useGameState";
import { FlightGraph } from "@/components/FlightGraph";
import { BetPanel } from "@/components/BetPanel";
import { LiveBets } from "@/components/LiveBets";
import { HistoryBar } from "@/components/HistoryBar";
import { StarBackground } from "@/components/StarBackground";

type Tab = "live" | "my" | "top";

export default function AviatorGame() {
  const game = useGameState();
  const [activeTab, setActiveTab] = useState<Tab>("live");

  const tabs: { id: Tab; label: string }[] = [
    { id: "live", label: "All Bets" },
    { id: "my", label: "My Bets" },
    { id: "top", label: "Top" },
  ];

  const totalBetting = game.playerBets.reduce((sum, p) => sum + (!p.cashedOut ? p.amount : 0), 0);
  const totalWon = game.playerBets.reduce((sum, p) => sum + (p.cashedOut && p.cashedOutAt ? p.amount * p.cashedOutAt : 0), 0);

  return (
    <div className="h-screen bg-[#0c1222] text-white overflow-hidden flex flex-col relative">
      <StarBackground />

      {/* Header */}
      <header className="relative z-10 flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/8 bg-[#0c1222]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl">✈️</span>
            <span className="font-black text-lg tracking-tight">
              <span className="text-white">Avia</span><span className="text-red-500">tor</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/8 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="text-white/50 text-xs">Balance</span>
            <span className="text-white font-bold text-sm">{game.balance.toFixed(2)}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-sm font-bold">
            U
          </div>
        </div>
      </header>

      {/* History bar */}
      <div className="relative z-10 flex-shrink-0 bg-[#0c1222]/60 border-b border-white/5">
        <HistoryBar history={game.history} />
      </div>

      {/* Main content - fills remaining space */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

        {/* Left: graph + bets */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Flight graph */}
          <div className="relative flex-1 min-h-0">
            <FlightGraph
              phase={game.phase}
              multiplier={game.multiplier}
              countdown={game.countdown}
            />
          </div>

          {/* Stats strip */}
          {game.phase === "flying" && (
            <div className="flex-shrink-0 flex items-center gap-4 px-4 py-1.5 bg-white/3 border-t border-white/5 text-xs">
              <div className="text-white/40">
                Betting: <span className="text-white/60">{totalBetting.toFixed(0)}</span>
              </div>
              <div className="text-white/40">
                Won: <span className="text-green-400">{totalWon.toFixed(0)}</span>
              </div>
              <div className="ml-auto text-white/40">
                Players: <span className="text-white/60">{game.playerBets.length}</span>
              </div>
            </div>
          )}

          {/* Bet panels */}
          <div className="flex-shrink-0 p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0f1728]/80 border-t border-white/5">
            <BetPanel
              betNum={1}
              phase={game.phase}
              amount={game.bet1Amount}
              setAmount={game.setBet1Amount}
              isActive={game.bet1Active}
              autoCashOut={game.bet1AutoCashOut}
              setAutoCashOut={game.setBet1AutoCashOut}
              autoEnabled={game.bet1AutoEnabled}
              setAutoEnabled={game.setBet1AutoEnabled}
              cashedOut={game.bet1CashedOut}
              balance={game.balance}
              multiplier={game.multiplier}
              onPlace={() => game.placeBet(1)}
              onCancel={() => game.cancelBet(1)}
              onCashOut={() => game.cashOut(1)}
            />
            <BetPanel
              betNum={2}
              phase={game.phase}
              amount={game.bet2Amount}
              setAmount={game.setBet2Amount}
              isActive={game.bet2Active}
              autoCashOut={game.bet2AutoCashOut}
              setAutoCashOut={game.setBet2AutoCashOut}
              autoEnabled={game.bet2AutoEnabled}
              setAutoEnabled={game.setBet2AutoEnabled}
              cashedOut={game.bet2CashedOut}
              balance={game.balance}
              multiplier={game.multiplier}
              onPlace={() => game.placeBet(2)}
              onCancel={() => game.cancelBet(2)}
              onCashOut={() => game.cashOut(2)}
            />
          </div>
        </div>

        {/* Right: live bets sidebar */}
        <div className="flex-shrink-0 w-full lg:w-72 xl:w-80 flex flex-col bg-[#0f1728]/80 border-t lg:border-t-0 lg:border-l border-white/5 max-h-48 lg:max-h-none">
          <div className="flex border-b border-white/5 flex-shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-white border-b-2 border-red-500"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === "live" && (
              <LiveBets playerBets={game.playerBets} multiplier={game.multiplier} />
            )}
            {activeTab === "my" && (
              <div className="flex flex-col gap-2 p-3 overflow-y-auto h-full">
                {game.bet1Active || game.bet1CashedOut ? (
                  <div className="bg-white/5 rounded-lg p-3 text-sm">
                    <div className="text-white/60 text-xs mb-1">Bet 1</div>
                    <div className="text-white font-medium">{parseFloat(game.bet1Amount).toFixed(2)}</div>
                    {game.bet1CashedOut && (
                      <div className="text-green-400 text-xs mt-1">
                        Cashed @ {game.bet1CashedOut.at.toFixed(2)}x • +{game.bet1CashedOut.profit.toFixed(2)}
                      </div>
                    )}
                  </div>
                ) : null}
                {game.bet2Active || game.bet2CashedOut ? (
                  <div className="bg-white/5 rounded-lg p-3 text-sm">
                    <div className="text-white/60 text-xs mb-1">Bet 2</div>
                    <div className="text-white font-medium">{parseFloat(game.bet2Amount).toFixed(2)}</div>
                    {game.bet2CashedOut && (
                      <div className="text-green-400 text-xs mt-1">
                        Cashed @ {game.bet2CashedOut.at.toFixed(2)}x • +{game.bet2CashedOut.profit.toFixed(2)}
                      </div>
                    )}
                  </div>
                ) : null}
                {!game.bet1Active && !game.bet2Active && !game.bet1CashedOut && !game.bet2CashedOut && (
                  <div className="flex-1 flex items-center justify-center text-white/25 text-sm">
                    No bets this round
                  </div>
                )}
              </div>
            )}
            {activeTab === "top" && (
              <div className="overflow-y-auto h-full">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-3 py-1.5 text-white/30 font-medium">#</th>
                      <th className="text-left px-3 py-1.5 text-white/30 font-medium">Player</th>
                      <th className="text-right px-3 py-1.5 text-white/30 font-medium">Winnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...game.playerBets]
                      .filter(p => p.cashedOut && p.cashedOutAt)
                      .sort((a, b) => (b.cashedOutAt || 0) * b.amount - (a.cashedOutAt || 0) * a.amount)
                      .slice(0, 10)
                      .map((p, i) => (
                        <tr key={p.id} className="border-b border-white/3">
                          <td className="px-3 py-1.5 text-white/30">{i + 1}</td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <span>{p.avatar}</span>
                              <span className="text-white/70 truncate max-w-[80px]">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-right text-green-400 font-bold">
                            {((p.cashedOutAt || 1) * p.amount).toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    {game.playerBets.filter(p => p.cashedOut).length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-white/25 text-sm">
                          No winners yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
