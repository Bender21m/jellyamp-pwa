import { Link } from 'react-router-dom'
import JellyImage from '../JellyImage'

interface AlbumListRowProps {
  id: string
  name: string
  artistName: string
  imageUrl: string
  year?: number
  trackCount?: number
}

export default function AlbumListRow({ id, name, artistName, imageUrl, year, trackCount }: AlbumListRowProps) {
  return (
    <Link to={`/album/${id}`} className="flex items-center gap-4 px-4 py-2.5 min-h-[64px] rounded-lg hover:bg-surface transition-colors group cursor-pointer">
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-card shrink-0 ring-1 ring-white/5 group-hover:ring-neon-cyan/30 transition-all">
        <JellyImage src={imageUrl} width={56} height={56} maxWidth={80} alt={name} className="w-14 h-14" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold truncate group-hover:text-neon-cyan transition-colors">{name}</p>
        <p className="text-[13px] text-text-secondary truncate">{artistName}</p>
      </div>
      {year && <span className="text-[13px] text-text-muted font-mono shrink-0 hidden sm:inline">{year}</span>}
      {trackCount !== undefined && (
        <span className="text-[13px] text-text-muted font-mono shrink-0 hidden md:inline">{trackCount} tracks</span>
      )}
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-text-muted/30 group-hover:text-text-muted shrink-0 transition-colors hidden md:block" fill="currentColor">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
      </svg>
    </Link>
  )
}