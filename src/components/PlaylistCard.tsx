import React from 'react'
import { Link } from 'react-router-dom'
import JellyImage from './JellyImage'

interface PlaylistCardProps {
  id: string
  name: string
  imageUrl?: string
  trackCount?: number
  onDelete?: (id: string, name: string) => void
}

const PlaylistCard = React.memo(function PlaylistCard({ id, name, imageUrl, trackCount, onDelete }: PlaylistCardProps) {
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
          <JellyImage src={imageUrl} width={300} height={300} maxWidth={300} alt={name} className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
        </div>
        <h3 className="text-sm font-semibold truncate group-hover:text-purple transition-colors">{name}</h3>
        {trackCount !== undefined && (
          <p className="text-xs text-text-muted">{trackCount} track{trackCount !== 1 ? 's' : ''}</p>
        )}
      </div>
    </Link>
  )
})

export default PlaylistCard
