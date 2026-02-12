import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import JellyImage from '../components/JellyImage'
import { getImageUrl } from '../lib/jellyfin'
import type { BaseItemDto } from '../lib/jellyfin'

interface SimilarArtistsProps {
  similarArtists: BaseItemDto[]
  serverUrl: string | null
}

export default function SimilarArtists({ similarArtists, serverUrl }: SimilarArtistsProps) {
  if (similarArtists.length === 0) {
    return null
  }

  return (
    <div className="px-4 md:px-8 pt-8 md:pt-10 pb-4">
      <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-4">Similar Artists</h2>
      <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">
        {similarArtists.map((similar, i) => {
          const similarImageUrl = similar.ImageTags?.Primary && serverUrl
            ? getImageUrl(serverUrl, similar.Id!, similar.ImageTags.Primary, 80)
            : null
          
          return (
            <motion.div 
              key={similar.Id} 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
              className="shrink-0"
            >
              <Link
                to={`/artist/${similar.Id}`}
                className="flex flex-col items-center gap-2 p-2 hover:bg-white/5 rounded-lg transition-colors min-w-[100px]"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden bg-card ring-1 ring-white/5 hover:ring-neon-cyan/40 transition-all">
                  <JellyImage src={similarImageUrl ?? undefined} width={80} height={80} maxWidth={300} alt={similar.Name ?? ''} className="w-full h-full" />
                </div>
                <span className="text-xs text-center font-medium text-text-secondary hover:text-neon-cyan transition-colors max-w-[90px] truncate">
                  {similar.Name ?? 'Unknown Artist'}
                </span>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}