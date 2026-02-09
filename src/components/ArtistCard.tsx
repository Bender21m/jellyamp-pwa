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
        <div className="relative w-full aspect-square rounded-full overflow-hidden mb-3 bg-card ring-1 ring-white/5 group-hover:ring-neon-pink/30 transition-all duration-300">
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
        <h3 className="text-sm font-semibold text-center truncate w-full group-hover:text-neon-pink transition-colors">
          {name}
        </h3>
      </motion.div>
    </Link>
  )
}
