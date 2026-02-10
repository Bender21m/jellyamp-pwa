import React from 'react'
import { Link } from 'react-router-dom'
import { setDragData } from '../lib/dragdrop'
import JellyImage from './JellyImage'

interface ArtistCardProps {
  id: string
  name: string
  imageUrl?: string
}

const ArtistCard = React.memo(function ArtistCard({ id, name, imageUrl }: ArtistCardProps) {
  function handleDragStart(e: React.DragEvent) {
    setDragData(e, { type: 'artist', artistId: id, label: name })
  }

  return (
    <div draggable onDragStart={handleDragStart}>
    <Link to={`/artist/${id}`} draggable={false}>
      <div
        className="group cursor-pointer flex flex-col items-center hover:-translate-y-0.5 transition-transform duration-200"
      >
        <div className="relative w-full aspect-square mb-3 rounded-xl overflow-hidden bg-card ring-1 ring-white/5 group-hover:ring-neon-cyan/30 transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,255,221,0.12)]">
          <JellyImage src={imageUrl} width={300} height={300} maxWidth={300} alt={name} className="w-full h-full transition-transform duration-500 group-hover:scale-105" />
          {/* Play overlay on hover - desktop only */}
          <div className="absolute inset-0 bg-deep-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none hidden md:flex">
            <div className="w-12 h-12 rounded-full bg-neon-cyan flex items-center justify-center shadow-[0_0_24px_rgba(0,255,221,0.5)]">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-deep-black ml-0.5" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
        <h3 className="text-sm font-semibold text-center truncate w-full group-hover:text-neon-cyan transition-colors tracking-[-0.01em]">
          {name}
        </h3>
      </div>
    </Link>
    </div>
  )
})

export default ArtistCard
