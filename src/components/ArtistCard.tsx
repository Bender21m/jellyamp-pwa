import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

interface ArtistCardProps {
  id: string
  name: string
  imageUrl?: string
}

export default function ArtistCard({ id, name, imageUrl }: ArtistCardProps) {
  return (
    <Link to={`/artist/${id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="group cursor-pointer flex flex-col items-center"
      >
        <div className="relative w-full aspect-square mb-3 rounded-xl overflow-hidden bg-card ring-1 ring-white/5 group-hover:ring-neon-cyan/30 transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,255,221,0.12)]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-500"
              style={{ transform: 'scale(1)' }}
              loading="lazy"
              onMouseOver={(e) => { if (window.matchMedia('(hover: hover)').matches) (e.target as HTMLElement).style.transform = 'scale(1.05)' }}
              onMouseOut={(e) => { (e.target as HTMLElement).style.transform = 'scale(1)' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface">
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-text-muted/40" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          )}
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
      </motion.div>
    </Link>
  )
}
