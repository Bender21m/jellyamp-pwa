import { Link } from 'react-router-dom'
import JellyImage from '../JellyImage'
import ArtistPlaceholder from '../ArtistPlaceholder'

interface ArtistListRowProps {
  id: string
  name: string
  imageUrl?: string
  albumCount?: number
}

export default function ArtistListRow({ id, name, imageUrl, albumCount }: ArtistListRowProps) {
  return (
    <Link to={`/artist/${id}`} className="flex items-center gap-4 px-4 py-2.5 min-h-[56px] rounded-lg hover:bg-surface transition-colors group cursor-pointer">
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-card shrink-0 ring-1 ring-white/5 group-hover:ring-neon-cyan/30 transition-all">
        {imageUrl ? (
          <JellyImage src={imageUrl} width={48} height={48} maxWidth={80} alt={name} className="w-12 h-12" />
        ) : (
          <ArtistPlaceholder name={name} className="w-12 h-12" textSize="text-sm" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold truncate group-hover:text-neon-cyan transition-colors">{name}</p>
      </div>
      {albumCount !== undefined && (
        <span className="text-[13px] text-text-muted font-mono shrink-0">{albumCount} album{albumCount !== 1 ? 's' : ''}</span>
      )}
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-text-muted/30 group-hover:text-text-muted shrink-0 transition-colors hidden md:block" fill="currentColor">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
      </svg>
    </Link>
  )
}