import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useArchiveStore } from '../../stores/archive'

export default function PinnedArtistsSection() {
  const navigate = useNavigate()
  const { pinnedArtists } = useArchiveStore()

  if (pinnedArtists.length === 0) {
    return null
  }

  return (
    <div className="mb-8">
      <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-3">Your Artists</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {pinnedArtists.map((artist, i) => (
          <motion.button
            key={artist.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            onClick={() => navigate(`/archive/artist/${encodeURIComponent(artist.name)}`)}
            className="text-left bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl p-4 transition-all duration-300 group border border-white/[0.04] hover:border-white/[0.08]"
          >
            {artist.imageUrl && (
              <div className="w-full aspect-square rounded-xl overflow-hidden bg-white/[0.03] mb-3 ring-1 ring-white/[0.06] shadow-lg shadow-black/30 group-hover:ring-white/[0.12] transition-all">
                <img src={artist.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
            )}
            <p className="text-sm font-semibold text-text-primary group-hover:text-neon-cyan transition-colors truncate">
              {artist.name}
            </p>
            {artist.showCount != null && (
              <p className="text-xs text-text-muted font-mono mt-0.5">
                {artist.showCount.toLocaleString()} shows
              </p>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}