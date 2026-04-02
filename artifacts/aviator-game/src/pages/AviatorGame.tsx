import { useState } from "react";
import { Header } from "@/components/Header";
import { RoundHistory } from "@/components/RoundHistory";
import { GameCanvas } from "@/components/GameCanvas";
import { HistoryBar } from "@/components/HistoryBar";
import { LiveBetsSidebar } from "@/components/LiveBetsSidebar";
import BetPanel from "@/components/BetPanel";
import { StarBackground } from "@/components/StarBackground";
import { useGameState } from "@/hooks/useGameState";

export default function AviatorGame() {
  const game = useGameState();
  const [betMode, setBetMode] = useState<"money" | "freebet">("money");
  const toggleBetMode = () =>
    setBetMode((prev) => (prev === "money" ? "freebet" : "money"));

  const now = Date.now();
  const historyEntries = game.roundHistory.map((multiplier, index) => {
    const ageFromLatest = game.roundHistory.length - index;
    return {
      multiplier,
      timestamp: now - ageFromLatest * 1000,
    };
  });

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#111111]">
      <StarBackground />

      <div className="relative z-10 flex h-full flex-col">
        <Header balance={0} />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="hidden w-[220px] flex-shrink-0 overflow-hidden border-r border-white/8 min-[769px]:block">
            <LiveBetsSidebar phase={game.phase} />
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <RoundHistory history={game.roundHistory} />
            <div className="border-b border-white/8 bg-black/10">
              <HistoryBar history={historyEntries} />
            </div>

            <div className="min-h-0 flex-1 p-2">
              <GameCanvas
                phase={game.phase}
                multiplier={game.multiplier}
                crashPoint={game.crashPoint}
                waitProgress={game.waitProgress}
                elapsedMs={game.elapsedMs}
                plane={game.plane}
                betMode={betMode}
                onToggleBetMode={toggleBetMode}
              />
            </div>

            <div className="grid flex-shrink-0 grid-cols-2 gap-2 px-2 pb-2">
              <BetPanel
                defaultAmount={25}
                currency="KSH"
                phase={game.phase}
                multiplier={game.multiplier}
              />
              <BetPanel
                defaultAmount={18}
                currency="KSH"
                phase={game.phase}
                multiplier={game.multiplier}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-hidden min-[769px]:hidden">
              <LiveBetsSidebar phase={game.phase} variant="bottom" />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
