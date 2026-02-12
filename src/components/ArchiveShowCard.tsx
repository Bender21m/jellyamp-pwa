import React from 'react'
import type { ArchiveShow } from '../lib/archive'
import ArchiveSourceBadge from './ArchiveSourceBadge'

interface ArchiveShowCardProps {
  show: ArchiveShow
  recordingCount?: number
  hideArtist?: boolean
  onClick?: () => void
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function StarRating({ rating }: { rating: number }) {
  const stars = Math.round(rating)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className={`w-3.5 h-3.5 ${i <= stars ? 'text-amber-400' : 'text-white/[0.06]'}`} fill="currentColor">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  )
}

// These utility components/functions are only used in this specific context
// eslint-disable-next-line react-refresh/only-export-components
export { StarRating, formatDate }

const ArchiveShowCard = React.memo(function ArchiveShowCard({ show, recordingCount, hideArtist, onClick }: ArchiveShowCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl p-4 transition-all duration-300 group border border-white/[0.04] hover:border-white/[0.08]"
    >
      <div className="flex gap-4 items-start">
        {/* Thumbnail */}
        <div className="w-[72px] h-[72px] rounded-xl overflow-hidden bg-white/[0.03] shrink-0 ring-1 ring-white/[0.06] shadow-lg shadow-black/40 group-hover:ring-neon-cyan/20 transition-all">
          <img
            src={show.imageUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              const el = e.target as HTMLImageElement
              el.style.display = 'none'
            }}
          />
        </div>

        <div className="flex-1 min-w-0 py-0.5">
          {/* Artist */}
          {!hideArtist && show.artist && (
            <p className="text-[13px] font-semibold text-neon-cyan/80 truncate leading-tight tracking-tight">{show.artist}</p>
          )}

          {/* Date */}
          <p className="text-[15px] font-bold text-text-primary group-hover:text-white transition-colors truncate leading-snug mt-0.5 tracking-[-0.01em]">
            {formatDate(show.date)}
          </p>

          {/* Venue */}
          {show.venue && (
            <p className="text-[13px] text-text-secondary/80 truncate mt-1 leading-snug">{show.venue}</p>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2.5 mt-2.5">
            <ArchiveSourceBadge source={show.source} />
            {show.rating != null && <StarRating rating={show.rating} />}
            {recordingCount != null && recordingCount > 1 && (
              <span className="text-[11px] text-text-muted font-mono">{recordingCount} rec</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
})

export default ArchiveShowCard
