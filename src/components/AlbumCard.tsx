import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

interface AlbumCardProps {
  id: string
  name: string
  artistName: string
  imageUrl: string
  year?: number
}

export default function AlbumCard({ id, name, artistName, imageUrl, year }: AlbumCardProps) {
  return (
    <Link to={`/album/${id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="group cursor-pointer"
      >
        <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-card ring-1 ring-white/5 group-hover:ring-neon-cyan/40 transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,255,221,0.12)]">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-deep-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              className="w-12 h-12 rounded-full bg-neon-cyan flex items-center justify-center shadow-[0_0_24px_rgba(0,255,221,0.5)]"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-deep-black ml-0.5" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </motion.div>
          </motion.div>
        </div>
        <h3 className="text-sm font-semibold truncate group-hover:text-neon-cyan transition-colors tracking-[-0.01em]">
          {name}
        </h3>
        <p className="text-xs text-text-muted truncate">
          {artistName}{year ? ` · ${year}` : ''}
        </p>
      </motion.div>
    </Link>
  )
}
