import { GamePhase } from "@/lib/gameEngine";

interface BetPanelProps {
  betNum: 1 | 2;
  phase: GamePhase;
  amount: string;
  setAmount: (v: string) => void;
  isActive: boolean;
  autoCashOut: string;
  setAutoCashOut: (v: string) => void;
  autoEnabled: boolean;
  setAutoEnabled: (v: boolean) => void;
  cashedOut: { at: number; profit: number } | null;
  balance: number;
  multiplier: number;
  onPlace: () => void;
  onCancel: () => void;
  onCashOut: () => void;
}

const QUICK_AMOUNTS = [200, 500, 1000, 2000];

export function BetPanel({
  betNum, phase, amount, setAmount, isActive,
  autoCashOut, setAutoCashOut, autoEnabled, setAutoEnabled,
  cashedOut, balance, multiplier,
  onPlace, onCancel, onCashOut
}: BetPanelProps) {
  const numAmount = parseFloat(amount) || 0;
  const canPlace = phase === "waiting" && !isActive && numAmount > 0 && numAmount <= balance;
  const canCancel = phase === "waiting" && isActive;
  const canCashOut = phase === "flying" && isActive && !cashedOut;

  const potential = numAmount * multiplier;

  const adjustAmount = (delta: number) => {
    const cur = parseFloat(amount) || 0;
    const next = Math.max(0, cur + delta);
    setAmount(String(next));
  };

  const doubleAmount = () => {
    const cur = parseFloat(amount) || 0;
    setAmount(String(cur * 2));
  };

  const halfAmount = () => {
    const cur = parseFloat(amount) || 0;
    setAmount(String(Math.max(1, Math.round(cur / 2))));
  };

  return (
    <div className="bg-[#111827] rounded-xl border border-white/8 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-xs font-bold text-red-400">
          {betNum}
        </div>
        <span className="text-white/60 text-xs font-medium uppercase tracking-wider">Bet {betNum}</span>
        {cashedOut && (
          <div className="ml-auto bg-green-500/20 border border-green-500/30 rounded px-2 py-0.5 text-green-400 text-xs font-bold fade-in">
            +{cashedOut.profit.toFixed(2)} @ {cashedOut.at.toFixed(2)}x
          </div>
        )}
        {phase === "flying" && isActive && !cashedOut && (
          <div className="ml-auto text-xs text-white/40">
            ≈ {potential.toFixed(2)}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={halfAmount}
          disabled={isActive && phase !== "waiting"}
          className="h-8 px-2 rounded bg-white/5 hover:bg-white/10 text-white/60 text-xs font-mono transition-colors disabled:opacity-40"
        >
          ½
        </button>
        <div className="flex-1 relative">
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            disabled={isActive}
            min={0}
            className="w-full h-8 px-3 rounded bg-white/8 border border-white/10 text-white text-sm font-medium text-center focus:outline-none focus:border-red-500/50 disabled:opacity-60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <button
          onClick={doubleAmount}
          disabled={isActive && phase !== "waiting"}
          className="h-8 px-2 rounded bg-white/5 hover:bg-white/10 text-white/60 text-xs font-mono transition-colors disabled:opacity-40"
        >
          2×
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {QUICK_AMOUNTS.map(a => (
          <button
            key={a}
            onClick={() => setAmount(String(a))}
            disabled={isActive}
            className="flex-1 min-w-[3rem] h-7 rounded bg-white/5 hover:bg-white/10 text-white/50 text-xs transition-colors disabled:opacity-40"
          >
            {a >= 1000 ? `${a / 1000}k` : a}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setAutoEnabled(!autoEnabled)}
          disabled={isActive && phase !== "waiting"}
          className={`flex items-center gap-1.5 text-xs transition-colors ${autoEnabled ? "text-amber-400" : "text-white/40"} disabled:opacity-40`}
        >
          <div className={`w-7 h-4 rounded-full relative transition-colors ${autoEnabled ? "bg-amber-500" : "bg-white/10"}`}>
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${autoEnabled ? "left-3.5" : "left-0.5"}`} />
          </div>
          Auto
        </button>
        {autoEnabled && (
          <div className="flex-1 relative">
            <input
              type="number"
              value={autoCashOut}
              onChange={e => setAutoCashOut(e.target.value)}
              disabled={isActive && phase !== "waiting"}
              placeholder="2.00x"
              min={1.01}
              step={0.1}
              className="w-full h-7 px-2 rounded bg-white/8 border border-amber-500/20 text-amber-300 text-xs font-medium text-center focus:outline-none focus:border-amber-500/50 disabled:opacity-60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        )}
      </div>

      {canPlace && (
        <button
          onClick={onPlace}
          className="w-full h-10 rounded-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold text-sm transition-all active:scale-95"
        >
          BET {numAmount.toFixed(2)}
        </button>
      )}

      {canCancel && (
        <button
          onClick={onCancel}
          className="w-full h-10 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all active:scale-95 border border-white/10"
        >
          CANCEL ({numAmount.toFixed(2)})
        </button>
      )}

      {canCashOut && (
        <button
          onClick={onCashOut}
          className="w-full h-10 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold text-sm transition-all active:scale-95"
          style={{ animation: "none" }}
        >
          CASH OUT {potential.toFixed(2)}
        </button>
      )}

      {phase === "flying" && isActive && cashedOut && (
        <div className="w-full h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 text-sm font-bold">
          ✓ Cashed out @ {cashedOut.at.toFixed(2)}x
        </div>
      )}

      {phase === "flying" && !isActive && (
        <div className="w-full h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/30 text-sm">
          No bet placed
        </div>
      )}

      {phase === "crashed" && isActive && !cashedOut && (
        <div className="w-full h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-sm font-bold">
          ✗ Flew away
        </div>
      )}

      {phase === "crashed" && !isActive && (
        <div className="w-full h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/30 text-sm">
          Round over
        </div>
      )}
    </div>
  );
}
