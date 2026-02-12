import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { ArchiveShow } from '../../lib/archive'
import { useArchiveStore } from '../../stores/archive'
import ShowGrid from './ShowGrid'
import SkeletonGrid from './SkeletonGrid'
import EmptyState from '../../components/EmptyState'

interface SearchResultsSectionProps {
  query: string
  searchMode: 'artists' | 'shows'
  loading: boolean
  searched: boolean
  results: { name: string; showCount: number }[]
  showResults: ArchiveShow[]
}

export default function SearchResultsSection({
  query,
  searchMode,
  loading,
  searched,
  results,
  showResults,
}: SearchResultsSectionProps) {
  const navigate = useNavigate()
  const { addRecentSearch } = useArchiveStore()

  const handleSelectArtist = (name: string) => {
    addRecentSearch(name)
    navigate(`/archive/artist/${encodeURIComponent(name)}`)
  }

  if (loading) {
    return <SkeletonGrid />
  }

  if (!query.trim()) {
    return null
  }

  if (searchMode === 'shows') {
    if (showResults.length > 0) {
      return <ShowGrid shows={showResults} />
    } else if (searched) {
      return (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          }
          title="No shows found"
          subtitle={`No results for "${query}". Try a different search.`}
        />
      )
    }
    return null
  }

  // Artist search mode
  if (results.length > 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {results.map((artist, i) => (
          <motion.button
            key={artist.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            onClick={() => handleSelectArtist(artist.name)}
            className="text-left bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl p-5 transition-all duration-300 group border border-white/[0.04] hover:border-white/[0.08]"
          >
            <p className="text-sm font-semibold text-text-primary group-hover:text-neon-cyan transition-colors truncate">
              {artist.name}
            </p>
            <p className="text-xs text-text-muted font-mono mt-1">
              {artist.showCount} show{artist.showCount !== 1 ? 's' : ''}
            </p>
          </motion.button>
        ))}
      </div>
    )
  } else if (searched) {
    return (
      <EmptyState
        icon={
          <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        }
        title="No artists found"
        subtitle={`No results for "${query}". Try a different search.`}
      />
    )
  }

  return null
}