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
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="group cursor-pointer flex flex-col items-center"
      >
        {/* Gradient ring wrapper */}
        <div className="relative w-full aspect-square mb-3">
          {/* Gradient ring (visible on hover) */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-neon-cyan via-purple to-neon-pink p-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-full h-full rounded-full bg-card" />
          </div>
          {/* Actual image */}
          <div className="absolute inset-[2px] rounded-full overflow-hidden bg-card">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface">
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-text-muted" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>
          {/* Glow effect on hover */}
          <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: '0 0 24px rgba(0, 255, 221, 0.15), 0 0 48px rgba(255, 45, 120, 0.1)' }} />
        </div>
        <h3 className="text-sm font-semibold text-center truncate w-full group-hover:text-neon-cyan transition-colors tracking-[-0.01em]">
          {name}
        </h3>
      </motion.div>
    </Link>
  )
}
