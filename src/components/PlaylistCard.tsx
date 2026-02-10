import { Link } from 'react-router-dom'

interface PlaylistCardProps {
  id: string
  name: string
  imageUrl?: string
  trackCount?: number
  onDelete?: (id: string, name: string) => void
}

export default function PlaylistCard({ id, name, imageUrl, trackCount, onDelete }: PlaylistCardProps) {
  return (
    <Link
      to={`/playlist/${id}`}
      onContextMenu={(e) => {
        if (!onDelete) return
        e.preventDefault()
        onDelete(id, name)
      }}
    >
      <div
        className="group cursor-pointer relative hover:-translate-y-1 transition-transform duration-200"
      >
        <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-card ring-1 ring-white/5 group-hover:ring-purple/30 transition-all duration-300">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface bg-gradient-to-br from-purple/20 to-neon-pink/20">
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-purple" fill="currentColor">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
              </svg>
            </div>
          )}
        </div>
        <h3 className="text-sm font-semibold truncate group-hover:text-purple transition-colors">{name}</h3>
        {trackCount !== undefined && (
          <p className="text-xs text-text-muted">{trackCount} track{trackCount !== 1 ? 's' : ''}</p>
        )}
      </div>
    </Link>
  )
}
