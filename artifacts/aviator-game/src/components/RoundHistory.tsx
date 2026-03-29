interface RoundHistoryProps {
  history: number[]
}

function getStyle(v: number): { bg: string; text: string } {
  if (v >= 10) return { bg: 'rgba(233,30,99,0.18)', text: '#E91E63' }
  if (v >= 2)  return { bg: 'rgba(255,152,0,0.15)', text: '#FF9800' }
  return         { bg: 'rgba(0,230,118,0.12)',  text: '#00E676' }
}

export function RoundHistory({ history }: RoundHistoryProps) {
  return (
    <div className="flex-shrink-0 bg-[#111111] border-b border-white/8 px-2 py-1.5">
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
        {[...history].reverse().map((v, i) => {
          const { bg, text } = getStyle(v)
          return (
            <div
              key={i}
              className="flex-shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold border"
              style={{ backgroundColor: bg, color: text, borderColor: `${text}55` }}
            >
              {v.toFixed(2)}x
            </div>
          )
        })}
        {history.length === 0 && (
          <span className="text-white/20 text-xs italic">No rounds yet</span>
        )}
      </div>
    </div>
  )
}
