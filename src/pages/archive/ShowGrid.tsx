import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { ArchiveShow } from '../../lib/archive'
import ArchiveShowCard from '../../components/ArchiveShowCard'

interface ShowGridProps {
  shows: ArchiveShow[]
  hideArtist?: boolean
}

export default function ShowGrid({ shows, hideArtist }: ShowGridProps) {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {shows.map((show, i) => (
        <motion.div
          key={show.identifier}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.03, 0.3) }}
        >
          <ArchiveShowCard
            show={show}
            hideArtist={hideArtist}
            onClick={() => navigate(`/archive/show/${encodeURIComponent(show.identifier)}`)}
          />
        </motion.div>
      ))}
    </div>
  )
}