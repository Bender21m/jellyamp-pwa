import type { ArchiveShow } from '../lib/archive'
import ArchiveSourceBadge from './ArchiveSourceBadge'

interface ArchiveShowCardProps {
  show: ArchiveShow
  recordingCount?: number
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
        <svg key={i} viewBox="0 0 24 24" className={`w-3 h-3 ${i <= stars ? 'text-amber-400' : 'text-white/10'}`} fill="currentColor">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  )
}

export { StarRating, formatDate }

export default function ArchiveShowCard({ show, recordingCount, onClick }: ArchiveShowCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface hover:bg-surface-hover rounded-xl p-4 transition-all duration-200 group ring-1 ring-white/5 hover:ring-neon-cyan/20"
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-card shrink-0 ring-1 ring-white/5">
          <img
            src={show.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Date */}
          <p className="text-sm font-semibold text-text-primary group-hover:text-neon-cyan transition-colors truncate">
            {formatDate(show.date)}
          </p>

          {/* Venue */}
          {show.venue && (
            <p className="text-xs text-text-muted truncate mt-0.5">{show.venue}</p>
          )}

          {/* Badges row */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <ArchiveSourceBadge source={show.source} />
            {show.rating != null && <StarRating rating={show.rating} />}
            {recordingCount != null && recordingCount > 1 && (
              <span className="text-xs text-text-muted font-mono">{recordingCount} recordings</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
