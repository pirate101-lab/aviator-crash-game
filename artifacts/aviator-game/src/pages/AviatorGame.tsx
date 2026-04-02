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

  const historyEntries = game.roundHistory.map((multiplier, index) => ({
    multiplier,
    timestamp: index,
  }));

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#111111]">
      <StarBackground />

      <div className="relative z-10 flex h-full flex-col">
        <Header balance={0} />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="hidden w-[240px] flex-shrink-0 overflow-hidden border-r border-white/8 min-[1024px]:block">
            <LiveBetsSidebar phase={game.phase} />
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <RoundHistory history={game.roundHistory} />
            <div className="border-b border-white/8 bg-black/10">
              <HistoryBar history={historyEntries} />
            </div>

            <div className="min-h-0 flex-1 p-1">
              <GameCanvas
                phase={game.phase}
                multiplier={game.multiplier}
                crashPoint={game.crashPoint}
                waitProgress={game.waitProgress}
                elapsedMs={game.elapsedMs}
                plane={game.plane}
                betMode={betMode}
                onToggleBetMode={() =>
                  setBetMode((prev) => (prev === "money" ? "freebet" : "money"))
                }
              />
            </div>

            <div className="flex flex-shrink-0 items-center justify-center gap-2 px-2 pb-2">
              <button
                type="button"
                onClick={() => setBetMode("money")}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  betMode === "money"
                    ? "border-[#00E676] bg-[#00E676]/20 text-[#00E676]"
                    : "border-white/20 text-white/60 hover:text-white"
                }`}
              >
                Money
              </button>
              <button
                type="button"
                onClick={() => setBetMode("freebet")}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  betMode === "freebet"
                    ? "border-[#00E676] bg-[#00E676]/20 text-[#00E676]"
                    : "border-white/20 text-white/60 hover:text-white"
                }`}
              >
                Freebet
              </button>
            </div>

            <div className="grid flex-shrink-0 grid-cols-2 gap-2 px-2 pb-2">
              <BetPanel defaultAmount={25} currency="KSH" />
              <BetPanel defaultAmount={18} currency="KSH" />
            </div>

            <div className="min-h-0 flex-1 overflow-hidden min-[1024px]:hidden">
              <LiveBetsSidebar phase={game.phase} variant="bottom" />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
