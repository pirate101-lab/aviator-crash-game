interface RoundHistoryProps {
  history: number[]
}

function getMultiplierColor(v: number): { bg: string; text: string; border: string } {
  if (v >= 10) return { bg: 'rgba(233,30,99,0.15)', text: '#E91E63', border: 'rgba(233,30,99,0.4)' }
  if (v >= 2)  return { bg: 'rgba(255,152,0,0.12)', text: '#FF9800', border: 'rgba(255,152,0,0.35)' }
  return { bg: 'rgba(0,230,118,0.12)', text: '#00E676', border: 'rgba(0,230,118,0.35)' }
}

export function RoundHistory({ history }: RoundHistoryProps) {
  return (
    <div className="flex-shrink-0 bg-[#0d0d1a] border-b border-[#2a2a3e] px-3 py-1.5">
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
        {[...history].reverse().map((v, i) => {
          const { bg, text, border } = getMultiplierColor(v)
          return (
            <div
              key={i}
              className="flex-shrink-0 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold border"
              style={{ backgroundColor: bg, color: text, borderColor: border }}
            >
              {v.toFixed(2)}x
            </div>
          )
        })}
        {history.length === 0 && (
          <span className="text-muted-foreground text-xs italic">No rounds yet</span>
        )}
      </div>
    </div>
  )
}
