interface HeaderProps {
  balance?: number
}

export function Header({ balance = 0 }: HeaderProps) {
  return (
    <header className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-[#111111] border-b border-white/8">
      {/* Left: logo */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
            <rect width="32" height="22" rx="4" fill="#00E676" opacity="0.15" />
            <text x="4" y="16" fontSize="13" fontWeight="900" fill="#00E676" fontFamily="sans-serif">A</text>
            <path d="M16 4 L28 11 L16 18" stroke="#00E676" strokeWidth="1.5" fill="none" opacity="0.7" />
          </svg>
          <div className="flex flex-col leading-none">
            <span className="text-[#00E676] font-black text-sm leading-none">Aspire</span>
            <span className="text-white font-black text-sm leading-none">Bet</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[10px] text-white/40 ml-2">
          <span>For Assistance, Whatsapp:</span>
          <span className="text-white/60 font-mono">0713934411</span>
        </div>
      </div>

      {/* Right: balance + deposit */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-white/40">KSH</span>
          <span className="text-white font-bold font-mono text-sm">{balance.toFixed(2)}</span>
        </div>
        <button
          type="button"
          className="px-4 py-1.5 rounded-lg bg-[#00E676] text-black font-bold text-xs hover:brightness-110 transition-all active:scale-95"
        >
          Deposit
        </button>
        <button type="button" className="text-white/40 hover:text-white p-1">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
