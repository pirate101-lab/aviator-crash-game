interface HeaderProps {
  balance?: number
}

export function Header({ balance = 0 }: HeaderProps) {
  return (
    <header className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[#2a2a3e] bg-[#0d0d1a]">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#00E676" opacity="0.15" />
            <path
              d="M6 16L12 10L17 14L22 8"
              stroke="#00E676"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19 8H22V11"
              stroke="#00E676"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-black text-lg tracking-tight">
            <span className="text-foreground">Avia</span>
            <span className="text-[#00E676]">tor</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-3 py-1.5">
          <span className="text-muted-foreground text-xs">Balance</span>
          <span className="text-foreground font-bold font-mono text-sm">
            {balance.toFixed(2)} KSH
          </span>
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[#0d0d1a]"
          style={{ background: 'linear-gradient(135deg, #00E676 0%, #00BFA5 100%)' }}
        >
          U
        </div>
      </div>
    </header>
  )
}
